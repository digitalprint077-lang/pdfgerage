import { createRequire } from "node:module";
import path from "node:path";
import { strict as invariant } from "node:assert";
import Canvas from "canvas";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { envInt, mapConcurrent } from "./perf.js";

/** Target resolution for PDF → image (72 PDF points per inch × scale). Default 200 DPI for speed. */
export const PDF_RENDER_DPI = envInt("PDF_RENDER_DPI", 200);
export const PDF_RENDER_SCALE = PDF_RENDER_DPI / 72;
export const PDF_PAGE_CONCURRENCY = envInt("PDF_PAGE_CONCURRENCY", 4);

/** Encode settings — tuned for speed with good visual quality. */
export const PDF_IMAGE_ENCODE = {
  jpeg: { quality: 88, mozjpeg: true, chromaSubsampling: "4:2:0" },
  webp: { quality: 85, effort: 2 },
  avif: { quality: 80, effort: 3 },
  heic: { quality: 85 },
  png: { compressionLevel: 2 },
  tiff: { compression: "lzw" },
};

const { AnnotationMode } = pdfjs;

class NodeCanvasFactory {
  create(width, height) {
    invariant(width > 0 && height > 0, "Invalid canvas size");
    const canvas = Canvas.createCanvas(width, height);
    const context = canvas.getContext("2d");
    return { canvas, context };
  }

  reset(canvasAndContext, width, height) {
    invariant(width > 0 && height > 0, "Invalid canvas size");
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }

  destroy(canvasAndContext) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

/**
 * Render PDF pages with print intent + annotations so permits,
 * QR codes, and filled fields match desktop PDF viewers.
 */
export async function renderPdfToPngPages(pdfPath, scale = PDF_RENDER_SCALE) {
  const pdfjsPath = path.dirname(createRequire(import.meta.url).resolve("pdfjs-dist/package.json"));
  const canvasFactory = new NodeCanvasFactory();

  const pdfDocument = await pdfjs.getDocument({
    standardFontDataUrl: path.join(pdfjsPath, `standard_fonts${path.sep}`),
    cMapUrl: path.join(pdfjsPath, `cmaps${path.sep}`),
    cMapPacked: true,
    isEvalSupported: false,
    canvasFactory,
    url: pdfPath,
  }).promise;

  const pages = [];

  await mapConcurrent(
    Array.from({ length: pdfDocument.numPages }, (_, i) => i + 1),
    PDF_PAGE_CONCURRENCY,
    async (pageNumber) => {
      const page = await pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const { canvas, context } = canvasFactory.create(viewport.width, viewport.height);

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, viewport.width, viewport.height);

      await page.render({
        canvasContext: context,
        viewport,
        intent: "print",
        annotationMode: AnnotationMode.ENABLE,
      }).promise;

      pages[pageNumber - 1] = canvas.toBuffer("image/png");
    }
  );

  return pages;
}

/** Extract text via pdf.js (works on PDFs that pdf-parse rejects). */
export async function extractTextFromPdfBuffer(buffer) {
  const pdfjsPath = path.dirname(createRequire(import.meta.url).resolve("pdfjs-dist/package.json"));
  const pdfDocument = await pdfjs.getDocument({
    data: buffer instanceof Uint8Array && !Buffer.isBuffer(buffer) ? buffer : new Uint8Array(buffer),
    standardFontDataUrl: path.join(pdfjsPath, `standard_fonts${path.sep}`),
    cMapUrl: path.join(pdfjsPath, `cmaps${path.sep}`),
    cMapPacked: true,
    isEvalSupported: false,
  }).promise;

  const parts = [];
  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
    const page = await pdfDocument.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (pageText) parts.push(pageText);
  }
  return parts.join("\n\n");
}
