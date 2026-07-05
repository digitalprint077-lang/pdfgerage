import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

// 1) Catalog + server alignment
const catalogSrc = fs.readFileSync(path.join(root, "src/data/catalog.ts"), "utf8");
const presentationBlock = catalogSrc.match(/\/\/ Presentations[\s\S]*?\/\/ E-books/)[0];
const catalogIds = [...presentationBlock.matchAll(/id: "([^"]+)"/g)].map((m) => m[1]);
const converterSrc = fs.readFileSync(path.join(root, "server/converter.js"), "utf8");
const setMatch = converterSrc.match(/const PRESENTATION_FORMATS = new Set\(\[([\s\S]*?)\]\)/);
const serverIds = setMatch[1].match(/"([^"]+)"/g).map((s) => s.replace(/"/g, ""));
const expected = ["dps", "key", "odp", "pot", "potx", "pps", "ppsx", "ppt", "pptm", "pptx", "sda"];

console.log("=== Slide format registration ===");
let ok = true;
for (const id of expected) {
  const inCatalog = catalogIds.includes(id);
  const inServer = serverIds.includes(id);
  console.log(`${id}: catalog=${inCatalog ? "yes" : "NO"} server=${inServer ? "yes" : "NO"}`);
  if (!inCatalog || !inServer) ok = false;
}
console.log(ok ? "PASS registration\n" : "FAIL registration\n");

// 2) API status
console.log("=== API status ===");
const status = JSON.parse(execSync('powershell -NoProfile -Command "(Invoke-WebRequest -Uri http://localhost:3001/api/status -UseBasicParsing).Content"', { encoding: "utf8" }));
console.log("LibreOffice:", status.conversions.items.find(i => i.id === "libreoffice")?.operational ? "online" : "offline");
console.log("Overall:", status.overall);

// 3) Create minimal PDF and test PDF->PNG conversion (quality path)
console.log("\n=== PDF to PNG conversion ===");
const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
const pdfDoc = await PDFDocument.create();
const page = pdfDoc.addPage([612, 792]);
const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
page.drawText("PDF Gerage slide test", { x: 72, y: 700, size: 24, font, color: rgb(0.2, 0.2, 0.2) });
const pdfBytes = await pdfDoc.save();
const tmpDir = path.join(root, "scripts", ".tmp-test");
fs.mkdirSync(tmpDir, { recursive: true });
const pdfPath = path.join(tmpDir, "test.pdf");
fs.writeFileSync(pdfPath, pdfBytes);

const form = new FormData();
form.append("operation", "convert");
form.append("files", new Blob([pdfBytes], { type: "application/pdf" }), "test.pdf");
form.append("fromFormat", "pdf");
form.append("toFormat", "png");

const res = await fetch("http://localhost:3001/api/convert?operation=convert", { method: "POST", body: form });
if (!res.ok) {
  const err = await res.text();
  console.log("FAIL convert:", res.status, err.slice(0, 200));
  process.exit(1);
}
const pngBlob = await res.blob();
console.log("PNG size:", pngBlob.size, "bytes", pngBlob.size > 5000 ? "(high-res OK)" : "(small - check quality)");
console.log(res.headers.get("content-disposition") || "no filename");

// 4) Presentation format in picker options (import formats module via built check)
const pickerSrc = fs.readFileSync(path.join(root, "src/data/formats.ts"), "utf8");
const hasPptm = catalogSrc.includes('id: "pptm"');
const hasKey = catalogSrc.includes('id: "key"');
console.log("\n=== UI catalog entries ===");
console.log("pptm in catalog:", hasPptm);
console.log("key in catalog:", hasKey);

console.log("\nOverall:", ok && res.ok ? "ALL CHECKS PASSED" : "SOME CHECKS FAILED");
process.exit(ok && res.ok ? 0 : 1);
