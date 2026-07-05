/** Test PPTX → PDF conversion via API (LibreOffice path) */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PptxGenJS from "pptxgenjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmpDir = path.join(__dirname, ".tmp-test");
fs.mkdirSync(tmpDir, { recursive: true });

const pptx = new PptxGenJS();
const slide = pptx.addSlide();
slide.addText("PDF Gerage presentation test", { x: 0.5, y: 0.5, w: 9, h: 1, fontSize: 28 });
const buffer = await pptx.write({ outputType: "nodebuffer" });
const pptxPath = path.join(tmpDir, "test.pptx");
fs.writeFileSync(pptxPath, buffer);

const form = new FormData();
form.append("operation", "convert");
form.append("files", new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" }), "test.pptx");
form.append("fromFormat", "pptx");
form.append("toFormat", "pdf");

const res = await fetch("http://localhost:3001/api/convert?operation=convert", { method: "POST", body: form });
if (!res.ok) {
  console.error("FAIL PPTX→PDF:", res.status, (await res.text()).slice(0, 300));
  process.exit(1);
}
const pdf = Buffer.from(await res.arrayBuffer());
const header = pdf.subarray(0, 5).toString();
console.log("PPTX→PDF: OK");
console.log("Output size:", pdf.length, "bytes");
console.log("PDF header:", header === "%PDF-" ? "%PDF- (valid)" : header);
process.exit(header.startsWith("%PDF") ? 0 : 1);
