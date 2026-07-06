/**
 * Rebuild OCR output with horizontal spacing from Tesseract TSV coordinates.
 */

function parseTsvWords(tsvRaw, minConf = 55) {
  const rows = tsvRaw.split(/\r?\n/).slice(1);
  const words = [];

  for (const row of rows) {
    const cols = row.split("\t");
    if (cols.length < 12) continue;
    if (cols[0] !== "5") continue; // word level

    const conf = Number.parseInt(cols[10], 10);
    const text = (cols[11] || "").trim();
    if (!text || text === "-") continue;
    if (!Number.isFinite(conf) || conf < minConf) continue;

    words.push({
      page: cols[1],
      block: cols[2],
      par: cols[3],
      line: cols[4],
      left: Number.parseInt(cols[6], 10) || 0,
      top: Number.parseInt(cols[7], 10) || 0,
      width: Number.parseInt(cols[8], 10) || 0,
      height: Number.parseInt(cols[9], 10) || 0,
      text,
    });
  }

  return words;
}

function lineKey(w) {
  return `${w.page}:${w.block}:${w.par}:${w.line}`;
}

/** Plain lines grouped by Tesseract line (minimal structure). */
export function textFromTsv(tsvRaw, minConf = 55) {
  return structuredTextFromTsv(tsvRaw, minConf);
}

/** Preserve columns/spacing using word bounding boxes. */
export function structuredTextFromTsv(tsvRaw, minConf = 55, pxPerChar = 11) {
  const words = parseTsvWords(tsvRaw, minConf);
  if (!words.length) return "";

  const groups = new Map();
  for (const w of words) {
    const key = lineKey(w);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(w);
  }

  const sortedKeys = [...groups.keys()].sort((a, b) => {
    const aw = groups.get(a)[0];
    const bw = groups.get(b)[0];
    if (aw.page !== bw.page) return Number(aw.page) - Number(bw.page);
    if (aw.top !== bw.top) return aw.top - bw.top;
    return aw.left - bw.left;
  });

  const lines = [];
  for (const key of sortedKeys) {
    const row = groups.get(key).sort((a, b) => a.left - b.left);
    let line = "";
    let cursorCol = 0;

    for (const w of row) {
      const col = Math.max(0, Math.floor(w.left / pxPerChar));
      const gap = col - cursorCol;
      if (gap > 0) {
        line += " ".repeat(Math.min(gap, 48));
        cursorCol = col;
      } else if (line.length > 0 && !line.endsWith(" ")) {
        line += "  ";
        cursorCol += 2;
      }
      line += w.text;
      cursorCol += w.text.length;
    }

    const trimmed = line.trimEnd();
    if (trimmed) lines.push(trimmed);
  }

  return lines.join("\n");
}

export { parseTsvWords };

/** Build layout lines from tesseract.js recognize() output. */
export function structuredTextFromTesseractData(data, pxPerChar = 11) {
  const lines = data?.lines || [];
  if (!lines.length) return (data?.text || "").trim();

  const sorted = [...lines].sort((a, b) => (a.bbox?.y0 || 0) - (b.bbox?.y0 || 0));
  const out = [];

  for (const line of sorted) {
    const words = line.words?.length
      ? [...line.words].sort((a, b) => (a.bbox?.x0 || 0) - (b.bbox?.x0 || 0))
      : null;

    if (!words?.length) {
      if (line.text?.trim()) out.push(line.text.trim());
      continue;
    }

    let text = "";
    let cursorCol = 0;
    for (const w of words) {
      const col = Math.max(0, Math.floor((w.bbox?.x0 || 0) / pxPerChar));
      const gap = col - cursorCol;
      if (gap > 0) {
        text += " ".repeat(Math.min(gap, 48));
        cursorCol = col;
      } else if (text.length > 0) {
        text += "  ";
        cursorCol += 2;
      }
      text += w.text;
      cursorCol += (w.text || "").length;
    }
    const trimmed = text.trimEnd();
    if (trimmed) out.push(trimmed);
  }

  return out.join("\n");
}

export function splitStructuredPages(text) {
  const parts = text.split(/\n--- Page \d+ ---\n/);
  if (parts.length <= 1) return [text.trim()].filter(Boolean);
  return parts.map((p) => p.trim()).filter(Boolean);
}
