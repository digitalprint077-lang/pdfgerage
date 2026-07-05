import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { extractTextFromPdfBuffer } from "../server/pdfRender.js";

const d = await PDFDocument.create();
const p = d.addPage();
const f = await d.embedFont(StandardFonts.Helvetica);
p.drawText("PDF Gerage tool test", { x: 72, y: 700, size: 18, font: f, color: rgb(0.1, 0.1, 0.1) });
const b = Buffer.from(await d.save());
try {
  const text = await extractTextFromPdfBuffer(b);
  console.log("OK:", JSON.stringify(text));
} catch (e) {
  console.log("FAIL:", e.message);
}
