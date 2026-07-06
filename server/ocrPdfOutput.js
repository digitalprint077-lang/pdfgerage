import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import sharp from "sharp";
import { parseTsvWords } from "./ocrLayout.js";

/**
 * Searchable PDF: original scan as background + invisible text at word positions.
 */
export async function buildSearchableOcrPdf(pages) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (const page of pages) {
    if (!page?.imageBuffer) continue;

    const meta = await sharp(page.imageBuffer).metadata();
    const width = meta.width || 800;
    const height = meta.height || 1100;
    const pdfPage = doc.addPage([width, height]);

    const isJpeg = meta.format === "jpeg" || meta.format === "jpg";
    const embedded = isJpeg
      ? await doc.embedJpg(page.imageBuffer)
      : await doc.embedPng(page.imageBuffer);

    pdfPage.drawImage(embedded, { x: 0, y: 0, width, height });

    if (page.tsvRaw) {
      const words = parseTsvWords(page.tsvRaw, 40);
      for (const word of words) {
        const fontSize = Math.max(5, Math.min((word.height || 12) * 0.9, 16));
        const x = word.left;
        const y = height - word.top - fontSize * 0.85;

        try {
          pdfPage.drawText(word.text, {
            x,
            y,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
            opacity: 0,
          });
        } catch {
          /* skip unsupported glyphs */
        }
      }
    }
  }

  return Buffer.from(await doc.save());
}
