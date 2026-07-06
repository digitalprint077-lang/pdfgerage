import sharp from "sharp";
import {
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { parseFormFields } from "./ocrFormFields.js";

const CELL_BORDER = {
  top: { style: BorderStyle.SINGLE, size: 1, color: "333333" },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: "333333" },
  left: { style: BorderStyle.SINGLE, size: 1, color: "333333" },
  right: { style: BorderStyle.SINGLE, size: 1, color: "333333" },
};

const DOCX_MAX_IMAGE_WIDTH = 580;

async function imageRun(imageBuffer) {
  const meta = await sharp(imageBuffer).metadata();
  const width = meta.width || 800;
  const height = meta.height || 1100;
  const scale = Math.min(1, DOCX_MAX_IMAGE_WIDTH / width);

  return new ImageRun({
    data: imageBuffer,
    transformation: {
      width: Math.round(width * scale),
      height: Math.round(height * scale),
    },
  });
}

function textCell(text, { bold = false, widthPct = 50 } = {}) {
  return new TableCell({
    borders: CELL_BORDER,
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [
      new Paragraph({
        children: [new TextRun({ text: text || " ", bold, size: 20 })],
      }),
    ],
  });
}

function buildFieldTable(fields) {
  if (!fields.length) return null;

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [textCell("Field", { bold: true, widthPct: 42 }), textCell("Value", { bold: true, widthPct: 58 })],
      }),
      ...fields.map(
        (f) =>
          new TableRow({
            children: [textCell(f.label, { widthPct: 42 }), textCell(f.value, { widthPct: 58 })],
          })
      ),
    ],
  });
}

function buildTranscriptionTable(lines) {
  if (!lines.length) return null;

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: lines.map(
      (line) =>
        new TableRow({
          children: [
            new TableCell({
              borders: CELL_BORDER,
              width: { size: 100, type: WidthType.PERCENTAGE },
              margins: { top: 40, bottom: 40, left: 100, right: 100 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: line || " ",
                      font: "Courier New",
                      size: 18,
                    }),
                  ],
                }),
              ],
            }),
          ],
        })
    ),
  });
}

/**
 * DOCX with scan image + bordered field table + bordered line transcription.
 */
export async function buildFormDocx(pages) {
  const pageList = Array.isArray(pages) ? pages : [{ structured: String(pages || "") }];
  const children = [];

  for (let i = 0; i < pageList.length; i++) {
    if (i > 0) children.push(new Paragraph({ children: [new PageBreak()] }));

    const page = pageList[i];
    const structured = page.structured || page.plain || "";

    if (page.imageBuffer) {
      children.push(
        new Paragraph({
          spacing: { after: 200 },
          children: [await imageRun(page.imageBuffer)],
        })
      );
    }

    const fields = parseFormFields(structured);
    if (fields.length) {
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 120 },
          children: [new TextRun({ text: "Extracted fields", bold: true, size: 24 })],
        })
      );
      children.push(buildFieldTable(fields));
    }

    const lines = structured.split(/\n/).map((l) => l.trimEnd()).filter(Boolean);
    if (lines.length) {
      children.push(
        new Paragraph({
          spacing: { before: 240, after: 120 },
          children: [new TextRun({ text: "Full transcription (layout preserved)", bold: true, size: 24 })],
        })
      );
      const transcription = buildTranscriptionTable(lines);
      if (transcription) children.push(transcription);
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}

/** @deprecated use buildFormDocx */
export async function buildStructuredDocx(pages) {
  const normalized = (Array.isArray(pages) ? pages : [pages]).map((p) =>
    typeof p === "string" ? { structured: p } : p
  );
  return buildFormDocx(normalized);
}
