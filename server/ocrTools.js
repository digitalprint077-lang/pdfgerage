import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { execFile } from "child_process";
import { promisify } from "util";
import Tesseract from "tesseract.js";
import pdfParse from "pdf-parse";
import { pdf } from "pdf-to-img";
import { resolvePythonCommand } from "./pdf2docx.js";
import { buildFormDocx } from "./ocrDocx.js";
import { buildSearchableOcrPdf } from "./ocrPdfOutput.js";
import { structuredTextFromTsv, structuredTextFromTesseractData } from "./ocrLayout.js";
import {
  OCR_FAST,
  getOcrPreprocessVariants,
  preprocessForOcr,
  preprocessForWatermarkDocument,
} from "./ocrPreprocess.js";
import { getOcrLanguageAttempts, scoreOcrText } from "./ocrQuality.js";
import { setOcrProgress, clearOcrProgress } from "./ocrProgress.js";
import { envInt } from "./perf.js";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OCR_SCRIPT = path.join(__dirname, "scripts", "ocr.py");

const IMAGE_EXT = new Set([
  "3fr", "arw", "avif", "bmp", "cr2", "cr3", "crw", "dcr", "dng", "erf", "gif", "heic", "heif", "ico",
  "jfif", "jpeg", "jpg", "mos", "mrw", "nef", "orf", "pef", "png", "ppm", "raf", "raw", "rw2", "tga",
  "tif", "tiff", "webp", "x3f",
]);

const PDF_SCALE = envInt("OCR_PDF_SCALE", OCR_FAST ? 3 : 5);
const QUICK_PSM = ["4", "6", "3"];
const FULL_PSM = OCR_FAST ? ["4", "6", "3"] : ["4", "6", "3", "11"];
const GOOD_SCORE = OCR_FAST ? 120 : 180;
const PYTHON_TIMEOUT_MS = 90_000;
const TESSERACT_CALL_MS = 120_000;
const SYSTEM_TESSERACT_MS = 90_000;

const LANG_MAP = {
  eng: "eng",
  urd: "urd",
  ara: "ara",
  hin: "hin",
  fra: "fra",
  deu: "deu",
  spa: "spa",
  chi_sim: "chi_sim",
  jpn: "jpn",
  por: "por",
  ita: "ita",
  rus: "rus",
  kor: "kor",
  tur: "tur",
  nld: "nld",
  pol: "pol",
};

let cachedTesseractExe = null;
let tesseractChecked = false;

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)), ms);
    }),
  ]);
}

async function findSystemTesseract() {
  if (tesseractChecked) return cachedTesseractExe;
  tesseractChecked = true;
  const candidates =
    process.platform === "win32"
      ? [
          "C:\\Program Files\\Tesseract-OCR\\tesseract.exe",
          "C:\\Program Files (x86)\\Tesseract-OCR\\tesseract.exe",
        ]
      : ["tesseract", "/usr/bin/tesseract", "/usr/local/bin/tesseract"];

  for (const exe of candidates) {
    try {
      await execFileAsync(exe, ["--version"], { timeout: 5000 });
      cachedTesseractExe = exe;
      return exe;
    } catch {
      /* try next */
    }
  }
  return null;
}

function resolveLang(lang) {
  const code = LANG_MAP[lang] || lang || "eng";
  return code;
}

function isScriptLang(tesseractLang) {
  return /urd|ara|hin|fas|pus|uig/i.test(tesseractLang);
}

function pickBest(candidates) {
  const ranked = candidates
    .filter((c) => c.text?.trim() || c.structured?.trim())
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (!best) return { text: "", structured: "", tsvRaw: null };
  return {
    text: best.text?.trim() || best.structured?.trim() || "",
    structured: best.structured?.trim() || best.text?.trim() || "",
    tsvRaw: best.tsvRaw || null,
  };
}

function bestScore(candidates) {
  return candidates.reduce((max, c) => Math.max(max, c.score || 0), 0);
}

function pushCandidate(candidates, text, confidence = 0, structured = null, tsvRaw = null) {
  const trimmed = (text || "").trim();
  const layout = (structured || trimmed).trim();
  if (!layout) return;
  candidates.push({
    text: trimmed || layout,
    structured: layout,
    tsvRaw: tsvRaw || null,
    score: scoreOcrText(layout, confidence),
  });
}

async function ocrWithSystemTesseractOnBuffer(
  imageBuffer,
  tesseractLang,
  tmpDir,
  tag,
  { quick = false, watermark = false } = {}
) {
  const exe = await findSystemTesseract();
  if (!exe) return null;

  const scriptDoc = isScriptLang(tesseractLang);
  const variants = await getOcrPreprocessVariants(imageBuffer, quick, {
    includeAggressive: !scriptDoc,
    watermark: watermark || (!scriptDoc && tesseractLang === "eng"),
  });
  const psms = quick ? QUICK_PSM : FULL_PSM;
  let best = { text: "", structured: "", score: 0, tsvRaw: null };

  for (let vi = 0; vi < variants.length; vi++) {
    const prep = variants[vi];
    const imgPath = path.join(tmpDir, `ocr-${tag}-v${vi}.png`);
    const outBase = path.join(tmpDir, `ocr-out-${tag}-v${vi}`);
    await fs.writeFile(imgPath, prep);

    for (const psm of psms) {
      const args = [
        imgPath,
        outBase,
        "-l",
        tesseractLang,
        "--oem",
        "1",
        "--psm",
        psm,
        "-c",
        "preserve_interword_spaces=1",
      ];

      try {
        await withTimeout(
          execFileAsync(exe, [...args, "tsv"], {
            timeout: SYSTEM_TESSERACT_MS,
            maxBuffer: 30 * 1024 * 1024,
          }),
          SYSTEM_TESSERACT_MS + 5000,
          "System OCR"
        );
        const tsvRaw = await fs.readFile(`${outBase}.tsv`, "utf-8").catch(() => "");
        const structured = structuredTextFromTsv(tsvRaw, scriptDoc ? 45 : 55);
        const plain = structured.replace(/ {2,}/g, " ").trim();
        const tsvScore = scoreOcrText(structured);
        if (tsvScore > best.score) best = { text: plain, structured, score: tsvScore, tsvRaw };
        if (best.score >= GOOD_SCORE) {
          return { text: best.text, structured: best.structured, tsvRaw: best.tsvRaw };
        }
      } catch {
        /* try txt fallback */
      }

      try {
        await withTimeout(
          execFileAsync(exe, [...args, "txt"], {
            timeout: SYSTEM_TESSERACT_MS,
            maxBuffer: 30 * 1024 * 1024,
          }),
          SYSTEM_TESSERACT_MS + 5000,
          "System OCR"
        );
        const text = await fs.readFile(`${outBase}.txt`, "utf-8").catch(() => "");
        const plain = text.trim();
        const s = scoreOcrText(plain);
        if (s > best.score) best = { text: plain, structured: plain, score: s, tsvRaw: best.tsvRaw };
        if (best.score >= GOOD_SCORE) {
          return { text: best.text, structured: best.structured, tsvRaw: best.tsvRaw };
        }
      } catch {
        /* next psm */
      }
    }
  }

  if (!best.text && !best.structured) return null;
  return { text: best.text, structured: best.structured || best.text, tsvRaw: best.tsvRaw };
}

async function createOcrWorker(ocrLang) {
  const langs = getOcrLanguageAttempts(ocrLang)[0] || "eng";
  const primary = langs.split("+")[0] || "eng";
  const worker = await Tesseract.createWorker(primary, 1, { logger: () => {} });

  if (langs.includes("+")) {
    try {
      for (const pack of langs.split("+")) {
        await worker.loadLanguage(pack);
      }
      await worker.initialize(langs);
    } catch {
      /* wasm pack may be missing */
    }
  }

  return worker;
}

async function ocrWithTesseractJs(imageBuffer, tesseractLang, worker, { quick = false, watermark = false } = {}) {
  const scriptDoc = isScriptLang(tesseractLang);
  const variants = await getOcrPreprocessVariants(imageBuffer, quick, {
    includeAggressive: !scriptDoc,
    watermark: watermark || (!scriptDoc && tesseractLang === "eng"),
  });
  const psms = quick ? QUICK_PSM : FULL_PSM;
  let best = { text: "", structured: "", score: 0, tsvRaw: null };

  for (const buf of variants) {
    for (const psm of psms) {
      try {
        await worker.setParameters({
          tessedit_pageseg_mode: psm,
          preserve_interword_spaces: "1",
        });
        const { data } = await withTimeout(worker.recognize(buf), TESSERACT_CALL_MS, "Browser OCR");
        const structured = structuredTextFromTesseractData(data);
        const plain = (data.text || "").trim() || structured.replace(/ {2,}/g, " ");
        const s = scoreOcrText(structured, data.confidence || 0);
        if (s > best.score) best = { text: plain, structured, score: s, tsvRaw: best.tsvRaw };
        if (best.score >= GOOD_SCORE) {
          return { text: best.text, structured: best.structured, tsvRaw: best.tsvRaw };
        }
      } catch {
        /* next */
      }
    }
  }

  if (!best.text && !best.structured) return null;
  return { text: best.text, structured: best.structured || best.text, tsvRaw: best.tsvRaw };
}

async function ocrWithPythonBuffer(imageBuffer, tesseractLang, tmpDir, tag) {
  const python = await resolvePythonCommand();
  if (!python) return null;

  const inputPath = path.join(tmpDir, `py-${tag}.png`);
  const txtPath = path.join(tmpDir, `py-${tag}.txt`);
  await fs.mkdir(tmpDir, { recursive: true });
  const prep =
    !isScriptLang(tesseractLang) && tesseractLang === "eng"
      ? await preprocessForWatermarkDocument(imageBuffer)
      : await preprocessForOcr(imageBuffer);
  await fs.writeFile(inputPath, prep);

  try {
    await withTimeout(
      execFileAsync(python.cmd, [...python.args, OCR_SCRIPT, inputPath, txtPath, tesseractLang], {
        timeout: PYTHON_TIMEOUT_MS,
        maxBuffer: 30 * 1024 * 1024,
      }),
      PYTHON_TIMEOUT_MS + 5000,
      "Python OCR"
    );
    const text = await fs.readFile(txtPath, "utf-8");
    return text?.trim() || null;
  } catch {
    return null;
  }
}

function pushOcrResult(candidates, result, confidence = 0) {
  if (!result) return;
  if (typeof result === "string") {
    pushCandidate(candidates, result, confidence);
    return;
  }
  pushCandidate(candidates, result.text, confidence, result.structured);
}

async function ocrWatermarkFastPass(buffer, tesseractLang, tmpDir, tag, worker) {
  if (tesseractLang !== "eng" && !tesseractLang.startsWith("eng+")) return null;

  const prep = await preprocessForWatermarkDocument(buffer);
  const candidates = [];

  const exe = await findSystemTesseract();
  if (exe) {
    const imgPath = path.join(tmpDir, `wm-${tag}.png`);
    const outBase = path.join(tmpDir, `wm-out-${tag}`);
    await fs.writeFile(imgPath, prep);
    for (const psm of ["4", "6"]) {
      try {
        await withTimeout(
          execFileAsync(
            exe,
            [imgPath, outBase, "-l", "eng", "--oem", "1", "--psm", psm, "-c", "preserve_interword_spaces=1", "tsv"],
            { timeout: SYSTEM_TESSERACT_MS, maxBuffer: 30 * 1024 * 1024 }
          ),
          SYSTEM_TESSERACT_MS + 5000,
          "Watermark OCR"
        );
        const tsvRaw = await fs.readFile(`${outBase}.tsv`, "utf-8").catch(() => "");
        const structured = structuredTextFromTsv(tsvRaw, 55);
        const plain = structured.replace(/ {2,}/g, " ").trim();
        pushCandidate(candidates, plain, 0, structured, tsvRaw);
      } catch {
        /* next */
      }
    }
  }

  try {
    await worker.setParameters({ tessedit_pageseg_mode: "4", preserve_interword_spaces: "1" });
    const { data } = await withTimeout(worker.recognize(prep), TESSERACT_CALL_MS, "Watermark OCR");
    const structured = structuredTextFromTesseractData(data);
    pushCandidate(candidates, data.text, data.confidence || 0, structured);
  } catch {
    /* ignore */
  }

  const best = pickBest(candidates);
  if (!best.text && !best.structured) return null;
  return best;
}

async function powerOcrImageBuffer(buffer, ocrLang, tmpDir, tag, worker) {
  const langAttempts = getOcrLanguageAttempts(ocrLang);
  const candidates = [];

  pushOcrResult(candidates, await ocrWatermarkFastPass(buffer, langAttempts[0], tmpDir, tag, worker));
  if (bestScore(candidates) >= GOOD_SCORE) return pickBest(candidates);

  for (const tLang of langAttempts.slice(0, ocrLang === "eng" ? 1 : 2)) {
    pushOcrResult(candidates, await ocrWithPythonBuffer(buffer, tLang, tmpDir, `${tag}-py-${tLang}`));
    if (bestScore(candidates) >= GOOD_SCORE) return pickBest(candidates);
  }

  for (const tLang of langAttempts) {
    pushOcrResult(
      candidates,
      await ocrWithSystemTesseractOnBuffer(buffer, tLang, tmpDir, `${tag}-${tLang}-q`, {
        quick: true,
        watermark: tLang === "eng",
      })
    );
    if (bestScore(candidates) >= GOOD_SCORE) break;

    pushOcrResult(
      candidates,
      await ocrWithSystemTesseractOnBuffer(buffer, tLang, tmpDir, `${tag}-${tLang}-f`, {
        quick: false,
        watermark: tLang === "eng",
      })
    );
    if (bestScore(candidates) >= GOOD_SCORE) break;
  }

  if (bestScore(candidates) < GOOD_SCORE) {
    pushOcrResult(
      candidates,
      await ocrWithTesseractJs(buffer, langAttempts[0], worker, {
        quick: bestScore(candidates) >= 80,
        watermark: langAttempts[0] === "eng",
      })
    );
  }

  return pickBest(candidates);
}

async function countPdfPages(buffer) {
  try {
    const parsed = await pdfParse(buffer);
    return parsed.numpages || 0;
  } catch {
    return 0;
  }
}

async function powerOcrPdfBuffer(buffer, tmpDir, lang, worker, progressId) {
  const pdfPath = path.join(tmpDir, "ocr-input.pdf");
  await fs.writeFile(pdfPath, buffer);

  const totalPages = await countPdfPages(buffer);
  if (progressId) {
    setOcrProgress(progressId, { phase: "ocr", done: 0, total: totalPages || 0 });
  }

  const document = await pdf(pdfPath, { scale: PDF_SCALE });
  const parts = [];
  const structuredPages = [];
  let pageNum = 1;

  for await (const page of document) {
    if (progressId) {
      setOcrProgress(progressId, {
        phase: "ocr",
        done: pageNum - 1,
        total: totalPages || pageNum,
      });
    }

    const pageBuf = Buffer.isBuffer(page) ? page : Buffer.from(page);
    const pageResult = await powerOcrImageBuffer(pageBuf, lang, tmpDir, `p${pageNum}`, worker);
    parts.push(`--- Page ${pageNum} ---\n${pageResult.text}`);
    structuredPages.push({
      structured: pageResult.structured || pageResult.text,
      plain: pageResult.text,
      imageBuffer: pageBuf,
      tsvRaw: pageResult.tsvRaw || null,
    });
    pageNum++;
  }

  if (progressId) {
    setOcrProgress(progressId, { phase: "done", done: pageNum - 1, total: pageNum - 1 });
  }

  return { text: parts.join("\n\n"), structuredPages };
}

export async function isTesseractAvailable() {
  const sys = await findSystemTesseract();
  return Boolean(sys) || true;
}

export async function runOcr({
  buffer,
  originalName,
  tmpDir,
  ocrLang = "eng",
  toFormat = "txt",
  progressId,
}) {
  const baseName = path.basename(originalName, path.extname(originalName));
  const ext = (path.extname(originalName).slice(1).toLowerCase() || "pdf").replace("jpeg", "jpg");

  if (progressId) {
    setOcrProgress(progressId, { phase: "starting", done: 0, total: 0 });
  }

  const worker = await createOcrWorker(ocrLang);
  let text = "";
  let structuredPages = [];

  try {
    if (ext === "pdf") {
      const pdfResult = await powerOcrPdfBuffer(buffer, tmpDir, ocrLang, worker, progressId);
      text = pdfResult.text;
      structuredPages = pdfResult.structuredPages;
    } else if (IMAGE_EXT.has(ext)) {
      if (progressId) setOcrProgress(progressId, { phase: "ocr", done: 0, total: 1 });
      const pageResult = await powerOcrImageBuffer(buffer, ocrLang, tmpDir, "img", worker);
      text = pageResult.text;
      structuredPages = [
        {
          structured: pageResult.structured || pageResult.text,
          plain: pageResult.text,
          imageBuffer: buffer,
          tsvRaw: pageResult.tsvRaw || null,
        },
      ];
      if (progressId) setOcrProgress(progressId, { phase: "done", done: 1, total: 1 });
    } else {
      throw new Error(`OCR supports PDF and images (PNG, JPG, etc.) — not ${ext.toUpperCase()}`);
    }
  } finally {
    await worker.terminate().catch(() => {});
    if (progressId) {
      setTimeout(() => clearOcrProgress(progressId), 60_000);
    }
  }

  if (!text.trim()) {
    throw new Error(
      "OCR found no text. Pick the correct language (Urdu for Urdu documents), use a sharper scan, or try TXT output first."
    );
  }

  if (toFormat === "docx") {
    const docxBuffer = await buildFormDocx(structuredPages.length ? structuredPages : [{ structured: text }]);
    return {
      buffer: docxBuffer,
      filename: `${baseName}_ocr.docx`,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
  }

  if (toFormat === "pdf") {
    const pdfBuffer = await buildSearchableOcrPdf(
      structuredPages.length ? structuredPages : [{ structured: text, imageBuffer: buffer }]
    );
    return {
      buffer: pdfBuffer,
      filename: `${baseName}_ocr.pdf`,
      mimeType: "application/pdf",
    };
  }

  const pageText = (p) => (typeof p === "string" ? p : p.structured || p.plain || "");
  const txtBody =
    structuredPages.length > 0
      ? structuredPages
          .map((p, i) => (structuredPages.length > 1 ? `--- Page ${i + 1} ---\n${pageText(p)}` : pageText(p)))
          .join("\n\n")
      : text;

  return {
    buffer: Buffer.from(txtBody, "utf-8"),
    filename: `${baseName}_ocr.txt`,
    mimeType: "text/plain",
  };
}

export function isOcrInputFormat(fmt) {
  const f = (fmt || "").toLowerCase().replace("jpeg", "jpg");
  return f === "pdf" || IMAGE_EXT.has(f);
}

export async function getOcrEngineInfo() {
  const sys = await findSystemTesseract();
  const python = await resolvePythonCommand();
  return {
    systemTesseract: Boolean(sys),
    tesseractJs: true,
    pythonOcr: Boolean(python),
    pdfDpi: PDF_SCALE * 72,
    accuracyMode: !OCR_FAST,
  };
}
