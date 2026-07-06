import { Document, Packer, Paragraph, PageBreak, TextRun } from "docx";

/**
 * DOCX with monospace lines so column alignment from OCR is preserved.
 */
export async function buildStructuredDocx(pages) {
  const pageTexts = Array.isArray(pages) ? pages : [pages];
  const children = [];

  for (let i = 0; i < pageTexts.length; i++) {
    if (i > 0) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }

    const lines = String(pageTexts[i] || "")
      .split(/\n/)
      .map((l) => l.replace(/\t/g, "    "));

    for (const line of lines) {
      children.push(
        new Paragraph({
          spacing: { before: 0, after: 0, line: 276 },
          children: [
            new TextRun({
              text: line.length ? line : " ",
              font: "Courier New",
              size: 18,
            }),
          ],
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
