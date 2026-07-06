import path from "path";
import fs from "fs/promises";
import os from "os";
import { createWriteStream } from "fs";
import { PDFDocument } from "pdf-lib";
import pdfParse from "pdf-parse";
import PDFDocumentKit from "pdfkit";
import sharp from "sharp";
import archiver from "archiver";
import { pdf } from "pdf-to-img";
import libre from "libreoffice-convert";
import mammoth from "mammoth";
import PptxGenJS from "pptxgenjs";
import ExcelJS from "exceljs";
import { promisify } from "util";
import { convertPdfToDocxEditable, convertDocxToDoc } from "./pdf2docx.js";
import { renderPdfToPngPages, PDF_RENDER_SCALE, PDF_IMAGE_ENCODE, extractTextFromPdfBuffer } from "./pdfRender.js";
import { isArchiveFormat, convertArchiveFormat } from "./archiveTools.js";
import { libreOfficeConvertBuffer as libreOfficeCliConvert } from "./libreOffice.js";
import { envInt, mapConcurrent } from "./perf.js";

const libreConvert = promisify(libre.convert);
const BATCH_CONCURRENCY = envInt("CONVERT_BATCH_CONCURRENCY", 3);
const ZIP_LEVEL = envInt("ZIP_COMPRESSION_LEVEL", 1);

const IMAGE_FORMATS = new Set([
  "3fr", "arw", "avif", "bmp", "cr2", "cr3", "crw", "dcr", "dng", "eps", "erf", "gif", "heic", "heif",
  "icns", "ico", "jfif", "jpeg", "jpg", "mos", "mrw", "nef", "odd", "odg", "orf", "pef", "png", "ppm",
  "ps", "psb", "psd", "pub", "raf", "raw", "rw2", "tga", "tif", "tiff", "webp", "x3f", "xcf", "xps",
]);
const VECTOR_FORMATS = new Set([
  "ai", "cdr", "cgm", "emf", "sk", "sk1", "svg", "svgz", "vsd", "wmf",
]);
const EBOOK_FORMATS = new Set([
  "azw", "azw3", "azw4", "cbc", "cbr", "cbz", "chm", "epub", "fb2", "htmlz",
  "lit", "lrf", "mobi", "oeb", "pdb", "pml", "prc", "rb", "snb", "tcr", "txtz",
]);
const PRESENTATION_FORMATS = new Set([
  "dps", "key", "odp", "pot", "potx", "pps", "ppsx", "ppt", "pptm", "pptx", "sda",
]);
const DOCUMENT_FORMATS = new Set([
  "abw", "djvu", "doc", "docm", "docx", "dot", "dotx", "html", "hwp", "hwpx", "lwp", "md", "odt",
  "pages", "pdf", "rst", "rtf", "sdw", "tex", "txt", "wpd", "wps", "zabw",
]);
const WORD_DOCUMENT_FORMATS = new Set(["doc", "docx", "docm", "dot", "dotx"]);
const CAD_FORMATS = new Set(["dwf", "dwg", "dxf"]);
const OFFICE_FORMATS = new Set([
  ...PRESENTATION_FORMATS,
  ...EBOOK_FORMATS,
  ...VECTOR_FORMATS,
  ...CAD_FORMATS,
  ...[...DOCUMENT_FORMATS].filter((f) => f !== "pdf"),
  "xls", "xlsx", "csv", "ods",
]);
const PDF_TO_OFFICE = new Set(["docx", "doc", "pptx", "ppt", "xlsx", "xls", "odt", "odp", "ods", "rtf"]);

const MIME = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
  tiff: "image/tiff",
  tif: "image/tiff",
  heic: "image/heic",
  heif: "image/heif",
  psd: "image/vnd.adobe.photoshop",
  psb: "application/vnd.3gpp.pic-bw-large",
  eps: "application/postscript",
  icns: "image/icns",
  tga: "image/tga",
  xps: "application/vnd.ms-xpsdocument",
  txt: "text/plain",
  md: "text/markdown",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  dot: "application/msword",
  djvu: "image/vnd.djvu",
  hwp: "application/x-hwp",
  hwpx: "application/hwp+zip",
  wpd: "application/vnd.wordperfect",
  pages: "application/x-iwork-pages-sffpages",
  abw: "application/x-abiword",
  zabw: "application/x-abiword-compressed",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ppt: "application/vnd.ms-powerpoint",
  pptm: "application/vnd.ms-powerpoint.presentation.macroEnabled.12",
  pps: "application/vnd.ms-powerpoint",
  ppsx: "application/vnd.openxmlformats-officedocument.presentationml.slideshow",
  pot: "application/vnd.ms-powerpoint",
  potx: "application/vnd.openxmlformats-officedocument.presentationml.template",
  odp: "application/vnd.oasis.opendocument.presentation",
  dps: "application/octet-stream",
  key: "application/x-iwork-keynote-sffkey",
  sda: "application/vnd.stardivision.draw",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  rtf: "application/rtf",
  csv: "text/csv",
  epub: "application/epub+zip",
  mobi: "application/x-mobipocket-ebook",
  azw: "application/vnd.amazon.ebook",
  azw3: "application/vnd.amazon.mobi8-ebook",
  azw4: "application/vnd.amazon.mobi8-ebook",
  fb2: "application/x-fictionbook+xml",
  chm: "application/vnd.ms-htmlhelp",
  cbr: "application/x-cbr",
  cbz: "application/x-cbz",
  svg: "image/svg+xml",
  svgz: "image/svg+xml",
  emf: "image/emf",
  wmf: "image/wmf",
  cgm: "image/cgm",
  ai: "application/postscript",
  cdr: "application/vnd.corel-draw",
  vsd: "application/vnd.visio",
  zip: "application/zip",
};

export async function convertFile({ buffer, originalName, fromFormat, toFormat, tmpDir, options = {} }) {
  const baseName = path.basename(originalName, path.extname(originalName));
  const from = fromFormat.toLowerCase();
  const to = toFormat.toLowerCase();

  if (from === "pdf") {
    return convertFromPdf(buffer, baseName, to, tmpDir);
  }

  if (to === "pdf") {
    return convertToPdf(buffer, baseName, from, tmpDir);
  }

  if (IMAGE_FORMATS.has(from) && IMAGE_FORMATS.has(to)) {
    return convertImageToImage(buffer, baseName, from, to, options);
  }

  if (from === "svg" && IMAGE_FORMATS.has(to)) {
    return convertSvgToRaster(buffer, baseName, to);
  }

  if (from === "svgz" && IMAGE_FORMATS.has(to)) {
    return convertSvgToRaster(buffer, baseName, to);
  }

  if (IMAGE_FORMATS.has(from) && (to === "txt" || to === "md" || to === "docx")) {
    throw new Error(
      "Cannot extract text from images with the standard converter. Use Tools → Image OCR instead."
    );
  }

  if (OFFICE_FORMATS.has(from) && OFFICE_FORMATS.has(to)) {
    return libreOfficeConvert(buffer, baseName, `.${from}`, `.${to}`, tmpDir);
  }

  if (OFFICE_FORMATS.has(from) || OFFICE_FORMATS.has(to)) {
    return libreOfficeConvert(buffer, baseName, `.${from}`, `.${to}`, tmpDir);
  }

  if (isArchiveFormat(from) && isArchiveFormat(to)) {
    return convertArchiveFormat(buffer, baseName, from, to, tmpDir);
  }

  throw new Error(`Conversion from ${from.toUpperCase()} to ${to.toUpperCase()} is not supported yet`);
}

async function convertImageToImage(buffer, baseName, from, to, options) {
  const fmt = to === "jpg" ? "jpeg" : to === "tif" ? "tiff" : to;
  let img = sharp(buffer);
  if (options.quality && (fmt === "jpeg" || fmt === "webp" || fmt === "png")) {
    if (fmt === "jpeg") img = img.jpeg({ quality: options.quality, mozjpeg: true });
    else if (fmt === "webp") img = img.webp({ quality: options.quality });
    else img = img.png({ quality: options.quality, compressionLevel: 9 });
  } else {
    img = img.toFormat(fmt);
  }
  const out = await img.toBuffer();
  const ext = to === "jpeg" ? "jpg" : to;
  return { buffer: out, filename: `${baseName}.${ext}`, mimeType: MIME[ext] || MIME.png };
}

async function convertSvgToRaster(buffer, baseName, to) {
  const fmt = to === "jpg" ? "jpeg" : to;
  const out = await sharp(buffer).toFormat(fmt).toBuffer();
  const ext = to === "jpeg" ? "jpg" : to;
  return { buffer: out, filename: `${baseName}.${ext}`, mimeType: MIME[ext] || MIME.png };
}

async function convertFromPdf(buffer, baseName, toFormat, tmpDir) {
  if (IMAGE_FORMATS.has(toFormat)) {
    return pdfToImages(buffer, baseName, toFormat, tmpDir);
  }

  if (toFormat === "txt" || toFormat === "md") {
    return pdfToText(buffer, baseName, toFormat);
  }

  if (toFormat === "docx") {
    return pdfToDocx(buffer, baseName, tmpDir);
  }

  if (toFormat === "doc") {
    return pdfToDoc(buffer, baseName, tmpDir);
  }

  if (toFormat === "pptx") {
    return pdfToPptx(buffer, baseName, tmpDir);
  }

  if (toFormat === "xlsx") {
    return pdfToXlsx(buffer, baseName);
  }

  if (toFormat === "rtf") {
    return pdfToRtf(buffer, baseName);
  }

  if (PDF_TO_OFFICE.has(toFormat)) {
    return libreOfficeConvert(buffer, baseName, ".pdf", `.${toFormat}`, tmpDir);
  }

  throw new Error(`PDF to ${toFormat.toUpperCase()} conversion is not available`);
}

async function convertToPdf(buffer, baseName, fromFormat, tmpDir) {
  if (IMAGE_FORMATS.has(fromFormat)) {
    return imagesToPdf([buffer], baseName);
  }

  if (fromFormat === "txt" || fromFormat === "md") {
    return textToPdf(buffer, baseName);
  }

  if (WORD_DOCUMENT_FORMATS.has(fromFormat)) {
    return docxToPdf(buffer, baseName, fromFormat);
  }

  if (PRESENTATION_FORMATS.has(fromFormat)) {
    return presentationToPdf(buffer, baseName, fromFormat);
  }

  if (EBOOK_FORMATS.has(fromFormat)) {
    return ebookToPdf(buffer, baseName, fromFormat);
  }

  if (VECTOR_FORMATS.has(fromFormat)) {
    return vectorToPdf(buffer, baseName, fromFormat);
  }

  if (CAD_FORMATS.has(fromFormat)) {
    return cadToPdf(buffer, baseName, fromFormat);
  }

  if (fromFormat === "xlsx" || fromFormat === "xls") {
    return xlsxToPdf(buffer, baseName, fromFormat);
  }

  if (fromFormat === "html" || fromFormat === "htm") {
    return htmlToPdf(buffer, baseName);
  }

  if (OFFICE_FORMATS.has(fromFormat)) {
    return libreOfficeConvert(buffer, baseName, `.${fromFormat}`, ".pdf", tmpDir);
  }

  throw new Error(`${fromFormat.toUpperCase()} to PDF conversion is not available`);
}

async function pdfToText(buffer, baseName, toFormat) {
  try {
    const data = await pdfParse(buffer);
    const text = (data.text || "").trim();
    if (text) {
      return {
        buffer: Buffer.from(text, "utf-8"),
        filename: `${baseName}.${toFormat}`,
        mimeType: MIME[toFormat],
      };
    }
  } catch {
    /* pdf-parse can fail on some PDF generators */
  }

  try {
    const text = (await extractTextFromPdfBuffer(buffer)).trim();
    if (text) {
      return {
        buffer: Buffer.from(text, "utf-8"),
        filename: `${baseName}.${toFormat}`,
        mimeType: MIME[toFormat],
      };
    }
  } catch {
    /* fall through */
  }

  try {
    return await libreOfficeConvert(buffer, baseName, ".pdf", `.${toFormat}`);
  } catch {
    throw new Error("Could not extract text from this PDF. Try PDF OCR for scanned documents.");
  }
}

async function pdfToDoc(buffer, baseName, tmpDir) {
  const pdfPath = path.join(tmpDir, "input.pdf");
  const docxPath = path.join(tmpDir, "editable.docx");
  const docPath = path.join(tmpDir, "output.doc");

  await fs.writeFile(pdfPath, buffer);
  await convertPdfToDocxEditable(pdfPath, docxPath);

  try {
    await convertDocxToDoc(docxPath, docPath);
    const docBuffer = await fs.readFile(docPath);
    return {
      buffer: docBuffer,
      filename: `${baseName}.doc`,
      mimeType: MIME.doc,
    };
  } catch {
    try {
      const docxBuffer = await fs.readFile(docxPath);
      return await libreOfficeConvert(docxBuffer, baseName, ".docx", ".doc");
    } catch {
      throw new Error(
        "PDF to DOC needs LibreOffice or Microsoft Word to finalize the .doc file. " +
          "The editable content is ready — try PDF to DOCX instead, or install LibreOffice from https://www.libreoffice.org/download/"
      );
    }
  }
}

async function pdfToDocx(buffer, baseName, tmpDir) {
  const pdfPath = path.join(tmpDir, "input.pdf");
  const docxPath = path.join(tmpDir, "output.docx");
  await fs.writeFile(pdfPath, buffer);

  try {
    await convertPdfToDocxEditable(pdfPath, docxPath);
    const docxBuffer = await fs.readFile(docxPath);
    return {
      buffer: docxBuffer,
      filename: `${baseName}.docx`,
      mimeType: MIME.docx,
    };
  } catch (pdf2docxErr) {
    try {
      return await libreOfficeConvert(buffer, baseName, ".pdf", ".docx", tmpDir);
    } catch {
      const hint =
        pdf2docxErr instanceof Error ? pdf2docxErr.message : "Conversion failed";
      throw new Error(
        `Could not create an editable DOCX. ${hint} For scanned/image PDFs, OCR is required — try LibreOffice or re-save the PDF with selectable text.`
      );
    }
  }
}

async function pdfToPptx(buffer, baseName, tmpDir) {
  try {
    return await libreOfficeConvert(buffer, baseName, ".pdf", ".pptx");
  } catch {
    return pdfToPptxFromPages(buffer, baseName, tmpDir);
  }
}

async function pdfToPptxFromPages(buffer, baseName, tmpDir) {
  const pdfPath = path.join(tmpDir, "input.pdf");
  await fs.writeFile(pdfPath, buffer);

  const document = await pdf(pdfPath, { scale: PDF_RENDER_SCALE });
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  let count = 0;

  for await (const pageBuffer of document) {
    const slide = pptx.addSlide();
    slide.addImage({
      data: `image/png;base64,${pageBuffer.toString("base64")}`,
      x: 0,
      y: 0,
      w: "100%",
      h: "100%",
    });
    count++;
  }

  if (count === 0) {
    const data = await pdfParse(buffer);
    const slide = pptx.addSlide();
    slide.addText(data.text || "Empty PDF", { x: 0.5, y: 0.5, w: 9, h: 5, fontSize: 14 });
  }

  const out = await pptx.write({ outputType: "nodebuffer" });
  return {
    buffer: Buffer.from(out),
    filename: `${baseName}.pptx`,
    mimeType: MIME.pptx,
  };
}

async function pdfToXlsx(buffer, baseName) {
  try {
    return await libreOfficeConvert(buffer, baseName, ".pdf", ".xlsx");
  } catch {
    const data = await pdfParse(buffer);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Content");
    sheet.getColumn(1).width = 80;

    const lines = (data.text || "").split(/\r?\n/);
    if (lines.length === 0 || (lines.length === 1 && !lines[0].trim())) {
      sheet.getCell(1, 1).value = "(No extractable text in PDF)";
    } else {
      lines.forEach((line, i) => {
        sheet.getCell(i + 1, 1).value = line;
      });
    }

    const xlsxBuffer = await workbook.xlsx.writeBuffer();
    return {
      buffer: Buffer.from(xlsxBuffer),
      filename: `${baseName}.xlsx`,
      mimeType: MIME.xlsx,
    };
  }
}

async function cadToPdf(buffer, baseName, fromFormat) {
  const ext = fromFormat.toLowerCase();
  try {
    return await libreOfficeConvert(buffer, baseName, `.${ext}`, ".pdf");
  } catch {
    throw new Error(
      `Could not convert ${ext.toUpperCase()} to PDF. Install LibreOffice for CAD format support.`
    );
  }
}

async function vectorToPdf(buffer, baseName, fromFormat) {
  const ext = fromFormat.toLowerCase();
  if (ext === "svg" || ext === "svgz") {
    try {
      const png = await sharp(buffer).png().toBuffer();
      return imagesToPdf([png], baseName);
    } catch {
      /* fall through to LibreOffice */
    }
  }
  try {
    return await libreOfficeConvert(buffer, baseName, `.${ext}`, ".pdf");
  } catch {
    throw new Error(
      `Could not convert ${ext.toUpperCase()} to PDF. Install LibreOffice or Inkscape for vector format support.`
    );
  }
}

async function ebookToPdf(buffer, baseName, fromFormat) {
  const ext = fromFormat.toLowerCase();
  try {
    return await libreOfficeConvert(buffer, baseName, `.${ext}`, ".pdf");
  } catch {
    throw new Error(
      `Could not convert ${ext.toUpperCase()} to PDF. Install LibreOffice or Calibre for full e-book support.`
    );
  }
}

async function presentationToPdf(buffer, baseName, fromFormat) {
  const ext = fromFormat.toLowerCase();
  try {
    return await libreOfficeConvert(buffer, baseName, `.${ext}`, ".pdf");
  } catch {
    if (["pptx", "pptm", "ppsx", "potx"].includes(ext)) {
      const text = await extractTextFromOfficeZip(buffer, "ppt/slides/slide");
      return textToPdf(Buffer.from(text || "Empty presentation", "utf-8"), baseName);
    }
    throw new Error(
      `Could not convert ${ext.toUpperCase()} to PDF. Install LibreOffice for full slide support.`
    );
  }
}

async function xlsxToPdf(buffer, baseName, fromFormat) {
  try {
    return await libreOfficeConvert(buffer, baseName, `.${fromFormat}`, ".pdf");
  } catch {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const lines = [];
    workbook.eachSheet((sheet) => {
      lines.push(`--- ${sheet.name} ---`);
      sheet.eachRow((row) => {
        const vals = row.values
          .slice(1)
          .map((v) => (v == null ? "" : String(v)))
          .filter(Boolean);
        if (vals.length) lines.push(vals.join("\t"));
      });
    });
    return textToPdf(Buffer.from(lines.join("\n") || "Empty spreadsheet", "utf-8"), baseName);
  }
}

async function extractTextFromOfficeZip(buffer, pathPrefix) {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(buffer);
  const texts = [];
  const entries = Object.keys(zip.files)
    .filter((n) => n.startsWith(pathPrefix) && n.endsWith(".xml"))
    .sort();
  for (const name of entries) {
    const xml = await zip.files[name].async("string");
    const plain = xml.replace(/<a:t[^>]*>([^<]*)<\/a:t>/g, "$1 ").replace(/<[^>]+>/g, " ");
    texts.push(plain.replace(/\s+/g, " ").trim());
  }
  return texts.filter(Boolean).join("\n\n");
}

async function pdfToRtf(buffer, baseName) {
  const data = await pdfParse(buffer);
  const text = (data.text || "").replace(/\\/g, "\\\\").replace(/[{}]/g, "\\$&");
  const rtf = `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Arial;}}\\f0\\fs24 ${text.replace(/\n/g, "\\par ")}}`;
  return {
    buffer: Buffer.from(rtf, "utf-8"),
    filename: `${baseName}.rtf`,
    mimeType: MIME.rtf,
  };
}

async function docxToPdf(buffer, baseName, fromFormat) {
  try {
    return await libreOfficeConvert(buffer, baseName, `.${fromFormat}`, ".pdf");
  } catch {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value?.trim() || "Empty document";
    return textToPdf(Buffer.from(text, "utf-8"), baseName);
  }
}

async function htmlToPdf(buffer, baseName) {
  const html = buffer.toString("utf-8");
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return textToPdf(Buffer.from(text || "Empty HTML", "utf-8"), baseName);
}

export function isPdfToImageConversion(fromFormat, toFormat) {
  if (!fromFormat || !toFormat) return false;
  if (fromFormat.toLowerCase() !== "pdf") return false;
  return IMAGE_FORMATS.has(toFormat.toLowerCase());
}

async function getPdfImagePageBuffers(buffer, format, tmpDir, workId = "default") {
  const normalized = format === "jpg" ? "jpeg" : format === "tif" ? "tiff" : format;
  const workDir = path.join(tmpDir, workId);
  await fs.mkdir(workDir, { recursive: true });
  const pdfPath = path.join(workDir, "input.pdf");
  await fs.writeFile(pdfPath, buffer);

  const pngPages = await renderPdfToPngPages(pdfPath, PDF_RENDER_SCALE);

  const pages = await mapConcurrent(pngPages, envInt("PDF_ENCODE_CONCURRENCY", 4), async (page) => {
    const image = sharp(page);
    if (normalized === "jpeg") {
      return image.jpeg(PDF_IMAGE_ENCODE.jpeg).toBuffer();
    }
    if (normalized === "webp") {
      return image.webp(PDF_IMAGE_ENCODE.webp).toBuffer();
    }
    if (normalized === "png") {
      return image.png(PDF_IMAGE_ENCODE.png).toBuffer();
    }
    if (normalized === "avif") {
      return image.avif(PDF_IMAGE_ENCODE.avif).toBuffer();
    }
    if (normalized === "heic") {
      return image.heic(PDF_IMAGE_ENCODE.heic).toBuffer();
    }
    if (normalized === "tiff") {
      return image.tiff(PDF_IMAGE_ENCODE.tiff).toBuffer();
    }
    return image.toFormat(normalized, { quality: 90 }).toBuffer();
  });

  if (pages.length === 0) {
    throw new Error("PDF has no pages to convert");
  }

  return pages;
}

function imageExtension(format) {
  const f = format.toLowerCase();
  if (f === "jpeg" || f === "jpg") return "jpg";
  if (f === "tif") return "tiff";
  return f;
}

function dedupeEntryNames(entries) {
  const used = new Set();
  return entries.map((entry) => {
    let name = entry.name;
    if (!used.has(name)) {
      used.add(name);
      return entry;
    }
    const dot = name.lastIndexOf(".");
    const stem = dot >= 0 ? name.slice(0, dot) : name;
    const ext = dot >= 0 ? name.slice(dot) : "";
    let n = 2;
    while (used.has(`${stem} (${n})${ext}`)) n++;
    name = `${stem} (${n})${ext}`;
    used.add(name);
    return { ...entry, name };
  });
}

async function createZipFromNamedEntries(zipPath, entries) {
  await new Promise((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: ZIP_LEVEL } });

    output.on("close", resolve);
    archive.on("error", reject);

    archive.pipe(output);
    for (const { name, buffer } of entries) {
      archive.append(buffer, { name });
    }
    archive.finalize();
  });
}

export async function packBatchResults(entries, zipBaseName, tmpDir) {
  if (!entries.length) {
    throw new Error("No output files produced");
  }

  const normalized = dedupeEntryNames(
    entries.map((entry) => ({
      name: entry.filename || entry.name,
      buffer: entry.buffer,
    }))
  );

  if (normalized.length === 1) {
    const match =
      entries.find((entry) => (entry.filename || entry.name) === normalized[0].name) || entries[0];
    return {
      buffer: normalized[0].buffer,
      filename: normalized[0].name,
      mimeType: match.mimeType || "application/octet-stream",
    };
  }

  const zipPath = path.join(tmpDir, "batch-output.zip");
  await createZipFromNamedEntries(zipPath, normalized);
  const zipBuffer = await fs.readFile(zipPath);
  return {
    buffer: zipBuffer,
    filename: `${zipBaseName}.zip`,
    mimeType: MIME.zip,
  };
}

export async function batchPdfToImages(files, toFormat, tmpDir, zipBaseName = "converted") {
  const format = toFormat.toLowerCase();
  const ext = imageExtension(format);

  const batchResults = await mapConcurrent(files, BATCH_CONCURRENCY, async (file, i) => {
    const { buffer, originalName } = file;
    const baseName = path.basename(originalName, path.extname(originalName));
    const pages = await getPdfImagePageBuffers(buffer, format, tmpDir, `batch-${i}`);
    if (pages.length === 1) {
      return [{ name: `${baseName}.${ext}`, buffer: pages[0] }];
    }
    return pages.map((pageBuf, pageIndex) => ({
      name: `${baseName}-page-${pageIndex + 1}.${ext}`,
      buffer: pageBuf,
    }));
  });

  let entries = dedupeEntryNames(batchResults.flat());

  if (entries.length === 1) {
    return {
      buffer: entries[0].buffer,
      filename: entries[0].name,
      mimeType: MIME[format] || MIME.png,
    };
  }

  const zipPath = path.join(tmpDir, "batch-output.zip");
  await createZipFromNamedEntries(zipPath, entries);
  const zipBuffer = await fs.readFile(zipPath);
  return {
    buffer: zipBuffer,
    filename: `${zipBaseName}.zip`,
    mimeType: MIME.zip,
  };
}

async function pdfToImages(buffer, baseName, format, tmpDir) {
  const pages = await getPdfImagePageBuffers(buffer, format, tmpDir);
  const ext = imageExtension(format);

  if (pages.length === 1) {
    return {
      buffer: pages[0],
      filename: `${baseName}.${ext}`,
      mimeType: MIME[format] || MIME.png,
    };
  }

  const zipPath = path.join(tmpDir, "output.zip");
  await createZip(zipPath, pages, baseName, format);

  const zipBuffer = await fs.readFile(zipPath);
  return {
    buffer: zipBuffer,
    filename: `${baseName}.zip`,
    mimeType: MIME.zip,
  };
}

async function createZip(zipPath, pages, baseName, format) {
  const ext = format === "jpeg" ? "jpg" : format;

  await new Promise((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: ZIP_LEVEL } });

    output.on("close", resolve);
    archive.on("error", reject);

    archive.pipe(output);
    pages.forEach((page, i) => {
      archive.append(page, { name: `${baseName}-page-${i + 1}.${ext}` });
    });
    archive.finalize();
  });
}

async function imagesToPdf(buffers, baseName) {
  const doc = await PDFDocument.create();

  for (const buf of buffers) {
    const metadata = await sharp(buf).metadata();
    const { width = 800, height = 600 } = metadata;

    let embedBuffer = buf;
    let image;

    if (metadata.format === "jpeg" || metadata.format === "jpg") {
      image = await doc.embedJpg(embedBuffer);
    } else if (metadata.format === "png") {
      image = await doc.embedPng(embedBuffer);
    } else {
      embedBuffer = await sharp(buf).png().toBuffer();
      image = await doc.embedPng(embedBuffer);
    }

    const page = doc.addPage([width, height]);
    page.drawImage(image, { x: 0, y: 0, width, height });
  }

  const pdfBytes = await doc.save();
  return {
    buffer: Buffer.from(pdfBytes),
    filename: `${baseName}.pdf`,
    mimeType: MIME.pdf,
  };
}

async function textToPdf(buffer, baseName) {
  const text = buffer.toString("utf-8");

  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocumentKit({ margin: 50 });
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => {
      resolve({
        buffer: Buffer.concat(chunks),
        filename: `${baseName}.pdf`,
        mimeType: MIME.pdf,
      });
    });
    doc.on("error", reject);

    doc.fontSize(12).text(text, { align: "left" });
    doc.end();
  });
}

async function libreOfficeConvert(buffer, baseName, fromExt, toExt, tmpDir) {
  const outExt = toExt.replace(".", "");
  const workDir = tmpDir || (await fs.mkdtemp(path.join(os.tmpdir(), "lo-")));
  const ownedDir = !tmpDir;

  try {
    const converted = await libreOfficeCliConvert(buffer, baseName, fromExt, toExt, workDir);
    return {
      buffer: converted,
      filename: `${baseName}.${outExt}`,
      mimeType: MIME[outExt] || "application/octet-stream",
    };
  } catch {
    try {
      const converted = await libreConvert(buffer, toExt, undefined);
      return {
        buffer: converted,
        filename: `${baseName}.${outExt}`,
        mimeType: MIME[outExt] || "application/octet-stream",
      };
    } catch {
      const inExt = fromExt.replace(".", "").toUpperCase();
      throw new Error(
        `${inExt} to ${outExt.toUpperCase()} could not be converted. Try DOCX, PPTX, XLSX, PNG, or TXT.`
      );
    }
  } finally {
    if (ownedDir) {
      await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
