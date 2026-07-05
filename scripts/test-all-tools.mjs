/**
 * End-to-end smoke test for every PDF Gerage tool (CloudConvert parity check).
 * Usage: node scripts/test-all-tools.mjs [baseUrl]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import sharp from "sharp";
import ExcelJS from "exceljs";
import PptxGenJS from "pptxgenjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const BASE = process.argv[2] || "http://localhost:3002";

const tmpDir = path.join(root, "scripts", ".tmp-all-tools");
fs.mkdirSync(tmpDir, { recursive: true });

const results = [];

async function apiPost(formFields, files = [], query = "") {
  const form = new FormData();
  for (const [k, v] of Object.entries(formFields)) {
    if (v != null) form.append(k, String(v));
  }
  for (const f of files) {
    form.append("files", new Blob([f.buffer], { type: f.mime || "application/octet-stream" }), f.name);
  }
  const url = `${BASE}/api/convert${query ? `?operation=${query}` : ""}`;
  const res = await fetch(url, { method: "POST", body: form });
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    const body = ct.includes("json") ? JSON.stringify(await res.json()) : (await res.text()).slice(0, 300);
    return { ok: false, status: res.status, error: body };
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const disp = res.headers.get("content-disposition") || "";
  const fnMatch = disp.match(/filename="([^"]+)"/);
  return { ok: true, size: buf.length, contentType: ct, filename: fnMatch?.[1] || "", buffer: buf };
}

function record(tool, test, status, detail = "") {
  results.push({ tool, test, status, detail });
  const icon = status === "pass" ? "✓" : status === "skip" ? "○" : status === "warn" ? "!" : "✗";
  console.log(`${icon} [${tool}] ${test}${detail ? `: ${detail}` : ""}`);
}

// --- Fixture generators ---
async function makePdf(name = "test.pdf") {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  page.drawText("PDF Gerage tool test", { x: 72, y: 700, size: 18, font, color: rgb(0.1, 0.1, 0.1) });
  const bytes = await pdfDoc.save();
  const p = path.join(tmpDir, name);
  fs.writeFileSync(p, bytes);
  return { name, buffer: bytes, mime: "application/pdf" };
}

async function makePng(name = "test.png") {
  const buf = await sharp({ create: { width: 200, height: 100, channels: 3, background: { r: 40, g: 120, b: 200 } } })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(tmpDir, name), buf);
  return { name, buffer: buf, mime: "image/png" };
}

async function makeJpg(name = "test.jpg") {
  const buf = await sharp({ create: { width: 200, height: 100, channels: 3, background: { r: 200, g: 80, b: 40 } } })
    .jpeg({ quality: 90 })
    .toBuffer();
  fs.writeFileSync(path.join(tmpDir, name), buf);
  return { name, buffer: buf, mime: "image/jpeg" };
}

async function makeTxt(name = "test.txt") {
  const buf = Buffer.from("Hello PDF Gerage\nLine two for translate test.\n", "utf8");
  fs.writeFileSync(path.join(tmpDir, name), buf);
  return { name, buffer: buf, mime: "text/plain" };
}

async function makeSvg(name = "test.svg") {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#336699"/></svg>`;
  const buf = Buffer.from(svg, "utf8");
  fs.writeFileSync(path.join(tmpDir, name), buf);
  return { name, buffer: buf, mime: "image/svg+xml" };
}

async function makeXlsx(name = "test.xlsx") {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Sheet1");
  ws.addRow(["Name", "Value"]);
  ws.addRow(["Alpha", 1]);
  ws.addRow(["Beta", 2]);
  const p = path.join(tmpDir, name);
  await wb.xlsx.writeFile(p);
  const buffer = fs.readFileSync(p);
  return { name, buffer, mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
}

async function makePptx(name = "test.pptx") {
  const pptx = new PptxGenJS();
  const slide = pptx.addSlide();
  slide.addText("PDF Gerage slide test", { x: 0.5, y: 0.5, w: 9, h: 1, fontSize: 24 });
  const p = path.join(tmpDir, name);
  await pptx.writeFile({ fileName: p });
  const buffer = fs.readFileSync(p);
  return { name, buffer, mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation" };
}

async function makeZip(name = "test.zip") {
  const { default: archiver } = await import("archiver");
  const { createWriteStream } = await import("fs");
  const p = path.join(tmpDir, name);
  await new Promise((resolve, reject) => {
    const out = createWriteStream(p);
    const archive = archiver("zip");
    out.on("close", resolve);
    archive.on("error", reject);
    archive.pipe(out);
    archive.append("zip inner content", { name: "inner.txt" });
    archive.finalize();
  });
  const buffer = fs.readFileSync(p);
  return { name, buffer, mime: "application/zip" };
}

async function makeHtml(name = "test.html") {
  const buf = Buffer.from("<!DOCTYPE html><html><body><h1>Test</h1><p>Document convert</p></body></html>", "utf8");
  fs.writeFileSync(path.join(tmpDir, name), buf);
  return { name, buffer: buf, mime: "text/html" };
}

async function checkHealth() {
  try {
    const res = await fetch(`${BASE}/api/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    record("system", "API health", "pass", JSON.stringify({ lo: data.libreOffice, tess: data.tesseract, pdf2docx: data.pdf2docx }));
    return data;
  } catch (e) {
    record("system", "API health", "fail", e.message);
    process.exit(1);
  }
}

async function testConvert(tool, file, from, to, expectExt) {
  const r = await apiPost({ operation: "convert", fromFormat: from, toFormat: to }, [file], "convert");
  if (!r.ok) {
    record(tool, `${from}→${to}`, "fail", `${r.status} ${r.error}`);
    return false;
  }
  const ext = (r.filename || "").split(".").pop()?.toLowerCase();
  const valid = r.size > 50 && (!expectExt || ext === expectExt || r.filename.endsWith(expectExt));
  record(tool, `${from}→${to}`, valid ? "pass" : "warn", `${r.size}B ${r.filename || r.contentType}`);
  return valid;
}

async function testMulti(tool, files, from, to) {
  const r = await apiPost({ operation: "convert", fromFormat: from, toFormat: to }, files, "convert");
  if (!r.ok) {
    record(tool, `multi ${from}→${to}`, "fail", `${r.status} ${r.error}`);
    return false;
  }
  const isZip = r.contentType.includes("zip") || r.filename.endsWith(".zip");
  record(tool, `multi ${from}→${to}`, isZip || r.size > 50 ? "pass" : "warn", `${files.length} files → ${r.size}B ${r.filename}`);
  return true;
}

async function main() {
  console.log(`\n=== PDF Gerage tool audit @ ${BASE} ===\n`);
  const health = await checkHealth();
  const hasLO = health.libreOffice === true || health.libreOffice === "true";
  const hasTess = health.tesseract === true || health.tesseract === "true";

  const pdf = await makePdf();
  const pdf2 = await makePdf("test2.pdf");
  const png = await makePng();
  const jpg = await makeJpg();
  const txt = await makeTxt();
  const svg = await makeSvg();
  const xlsx = await makeXlsx();
  const pptx = await makePptx();
  const zip = await makeZip();
  const html = await makeHtml();

  // 1. Home / general convert
  await testConvert("home", pdf, "pdf", "png", "png");
  await testConvert("home", pdf, "pdf", "txt", "txt");
  if (hasLO) await testConvert("home", pdf, "pdf", "docx", "docx");
  else record("home", "pdf→docx", "skip", "LibreOffice offline");

  // 2. Document converter
  await testConvert("document", txt, "txt", "pdf", "pdf");
  if (hasLO) {
    await testConvert("document", html, "html", "pdf", "pdf");
  } else record("document", "html→pdf", "skip", "LibreOffice offline");

  // 3. Image converter
  await testConvert("image", png, "png", "jpg", "jpg");
  await testConvert("image", png, "png", "webp", "webp");
  await testConvert("image", svg, "svg", "png", "png");

  // 4. Spreadsheet converter
  if (hasLO) {
    await testConvert("spreadsheet", xlsx, "xlsx", "csv", "csv");
    await testConvert("spreadsheet", xlsx, "xlsx", "pdf", "pdf");
  } else {
    record("spreadsheet", "xlsx→csv", "skip", "LibreOffice offline");
  }

  // 5. Presentation converter
  if (hasLO) {
    await testConvert("presentation", pptx, "pptx", "pdf", "pdf");
    await testMulti("presentation", [pptx, await makePptx("test-b.pptx")], "pptx", "pdf");
  } else {
    record("presentation", "pptx→pdf", "skip", "LibreOffice offline");
  }

  // 6. Ebook - epub needs real file; test txt→pdf as fallback
  await testConvert("ebook", txt, "txt", "pdf", "pdf");

  // 7. Archive converter - zip listing only creates zip output
  {
    const r = await apiPost({ operation: "convert", fromFormat: "zip", toFormat: "zip", baseName: "archive-out" }, [zip], "convert");
    if (r.ok && r.size > 50) record("archive", "zip passthrough/convert", "pass", `${r.size}B`);
    else record("archive", "zip convert", r.ok ? "warn" : "fail", r.error || `${r.size}B`);
  }

  // 8. Vector converter
  await testConvert("vector", svg, "svg", "png", "png");
  if (hasLO) await testConvert("vector", svg, "svg", "pdf", "pdf");
  else record("vector", "svg→pdf", "skip", "LibreOffice offline");

  // 9. Compress PDF
  {
    const r = await apiPost({ operation: "compress", fromFormat: "pdf", toFormat: "pdf", quality: "80" }, [pdf], "compress");
    record("compress-pdf", "compress", r.ok && r.size > 100 ? "pass" : "fail", r.ok ? `${r.size}B` : r.error);
  }

  // 10. Compress PNG
  {
    const r = await apiPost({ operation: "compress", fromFormat: "png", toFormat: "png", quality: "60" }, [png], "compress");
    record("compress-png", "compress", r.ok && r.size > 50 ? "pass" : "fail", r.ok ? `${r.size}B` : r.error);
  }

  // 11. Compress JPG
  {
    const r = await apiPost({ operation: "compress", fromFormat: "jpg", toFormat: "jpg", quality: "60" }, [jpg], "compress");
    record("compress-jpg", "compress", r.ok && r.size > 50 ? "pass" : "fail", r.ok ? `${r.size}B` : r.error);
  }

  // 12. Merge PDF
  {
    const r = await apiPost({ operation: "merge", baseName: "merged" }, [pdf, pdf2], "merge");
    const valid = r.ok && r.buffer?.slice(0, 4).toString() === "%PDF";
    record("merge-pdf", "merge 2 PDFs", valid ? "pass" : "fail", r.ok ? `${r.size}B PDF` : r.error);
  }

  // 13. Create archive
  {
    const r = await apiPost({ operation: "create-archive", baseName: "bundle" }, [txt, png], "create-archive");
    record("create-archive", "zip bundle", r.ok && r.contentType.includes("zip") ? "pass" : "fail", r.ok ? `${r.size}B` : r.error);
  }

  // 14. Extract archive
  {
    const r = await apiPost({ operation: "extract", fromFormat: "zip" }, [zip], "extract");
    record("extract-archive", "extract zip", r.ok && r.contentType.includes("zip") ? "pass" : "fail", r.ok ? `${r.size}B` : r.error);
  }

  // 15. PDF OCR
  if (hasTess) {
    const r = await apiPost({ operation: "ocr", fromFormat: "pdf", toFormat: "txt", ocrLang: "eng" }, [pdf], "ocr");
    record("pdf-ocr", "ocr→txt", r.ok && r.size > 0 ? "pass" : "fail", r.ok ? `${r.size}B` : r.error);
  } else record("pdf-ocr", "ocr", "skip", "Tesseract offline");

  // 16. Image OCR — use PNG rendered from PDF so text is readable
  if (hasTess) {
    const pdfForOcr = await makePdf("ocr-source.pdf");
    const ocrPngRes = await apiPost({ operation: "convert", fromFormat: "pdf", toFormat: "png" }, [pdfForOcr], "convert");
    if (ocrPngRes.ok) {
      const ocrFile = { name: "ocr-page.png", buffer: ocrPngRes.buffer, mime: "image/png" };
      const r = await apiPost({ operation: "ocr", fromFormat: "png", toFormat: "txt", ocrLang: "eng" }, [ocrFile], "ocr");
      record("image-ocr", "ocr→txt", r.ok && r.size > 10 ? "pass" : "fail", r.ok ? `${r.size}B` : r.error);
    } else record("image-ocr", "ocr→txt", "fail", "could not render PDF to PNG for OCR test");
  } else record("image-ocr", "ocr", "skip", "Tesseract offline");

  // 17. Translate document
  {
    const r = await apiPost(
      { operation: "translate", fromFormat: "txt", toFormat: "txt", translateFrom: "en", translateTo: "es" },
      [txt],
      "translate"
    );
    if (r.ok) record("translate-doc", "en→es", "pass", `${r.size}B`);
    else record("translate-doc", "en→es", health.translate ? "fail" : "warn", r.error || "no translate provider");
  }

  // Summary
  const pass = results.filter((r) => r.status === "pass").length;
  const fail = results.filter((r) => r.status === "fail").length;
  const warn = results.filter((r) => r.status === "warn").length;
  const skip = results.filter((r) => r.status === "skip").length;
  console.log(`\n=== Summary: ${pass} pass, ${fail} fail, ${warn} warn, ${skip} skip ===\n`);

  const reportPath = path.join(tmpDir, "report.json");
  fs.writeFileSync(reportPath, JSON.stringify({ base: BASE, health, results, summary: { pass, fail, warn, skip } }, null, 2));
  console.log(`Report: ${reportPath}`);

  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
