/**
 * Score OCR output — prefer readable text over random character soup.
 */
export function scoreOcrText(text, confidence = 0) {
  const trimmed = (text || "").trim();
  if (!trimmed) return 0;

  const words = trimmed.split(/\s+/).filter(Boolean);
  const letters = (trimmed.match(/[\p{L}]/gu) || []).length;
  const digits = (trimmed.match(/\d/g) || []).length;
  const alnum = letters + digits;
  const len = trimmed.length;
  const alnumRatio = alnum / Math.max(len, 1);

  if (alnumRatio < 0.45) return alnum * 0.25;

  const shortWords = words.filter((w) => w.replace(/[^\p{L}\p{N}]/gu, "").length <= 2).length;
  if (words.length > 8 && shortWords / words.length > 0.6) return alnum * 0.35;

  const realWords = words.filter((w) => /[\p{L}]{3,}/u.test(w)).length;
  const titleWords = words.filter((w) => /^[A-Z][a-zA-Z]{2,}/.test(w)).length;
  const urduWords = words.filter((w) => /[\u0600-\u06FF]{2,}/u.test(w)).length;

  let score = letters * 2.5 + digits + realWords * 14 + titleWords * 6 + urduWords * 16;
  score += confidence * 1.5;

  const lower = trimmed.toLowerCase();
  for (const kw of ["transport", "permit", "vehicle", "registration", "route", "peshawar", "carrier", "attock"]) {
    if (lower.includes(kw)) score += 30;
  }
  if (/khair|ullah|tad-\d+|hino/i.test(trimmed)) score += 50;

  if (realWords + urduWords < 3 && len > 80) score *= 0.4;

  return score;
}

/** Rebuild text from Tesseract TSV, dropping low-confidence tokens. */
export function textFromTsv(tsvRaw, minConf = 55) {
  const lines = tsvRaw.split(/\r?\n/).slice(1);
  const byLine = new Map();

  for (const row of lines) {
    const cols = row.split("\t");
    if (cols.length < 12) continue;
    const conf = Number.parseInt(cols[10], 10);
    const word = (cols[11] || "").trim();
    if (!word || word === "-") continue;
    if (!Number.isFinite(conf) || conf < minConf) continue;

    const lineKey = `${cols[1]}:${cols[4]}`;
    if (!byLine.has(lineKey)) byLine.set(lineKey, []);
    byLine.get(lineKey).push({ left: Number.parseInt(cols[6], 10) || 0, word });
  }

  const sortedLines = [...byLine.entries()]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([, words]) =>
      words
        .sort((a, b) => a.left - b.left)
        .map((w) => w.word)
        .join(" ")
        .trim()
    )
    .filter(Boolean);

  return sortedLines.join("\n");
}

export function getOcrLanguageAttempts(ocrLang) {
  const code = (ocrLang || "eng").toLowerCase();
  const attempts = new Set();

  const map = {
    eng: ["eng"],
    urd: ["urd+eng", "urd"],
    ara: ["ara+eng", "ara"],
    hin: ["hin+eng", "hin"],
    chi_sim: ["chi_sim+eng", "chi_sim"],
    jpn: ["jpn+eng", "jpn"],
  };

  if (map[code]) {
    for (const l of map[code]) attempts.add(l);
  } else {
    attempts.add(code);
    attempts.add(`${code}+eng`);
  }

  return [...attempts];
}
