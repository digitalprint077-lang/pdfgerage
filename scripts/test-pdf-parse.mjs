import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import pdfParse from "pdf-parse";

const d = await PDFDocument.create();
const p = d.addPage();
const f = await d.embedFont(StandardFonts.Helvetica);
p.drawText("PDF Gerage tool test", { x: 72, y: 700, size: 18, font: f, color: rgb(0.1, 0.1, 0.1) });
const b = await d.save();
try {
  const r = await pdfParse(Buffer.from(b));
  console.log("OK text:", JSON.stringify(r.text));
} catch (e) {
  console.log("FAIL:", e.message);
}
