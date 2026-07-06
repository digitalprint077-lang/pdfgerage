import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { execFile } from "child_process";
import { promisify } from "util";
import Tesseract from "tesseract.js";
import pdfParse from "pdf-parse";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { pdf } from "pdf-to-img";
import { resolvePythonCommand } from "./pdf2docx.js";
import {
  OCR_FAST,
  getOcrPreprocessVariants,
  preprocessForOcr,
} from "./ocrPreprocess.js";
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

const PDF_SCALE = envInt("OCR_PDF_SCALE", OCR_FAST ? 3 : 4);
const QUICK_PSM = ["6", "3"];
const FULL_PSM = OCR_FAST ? ["6", "3"] : ["3", "6", "11"];
const GOOD_SCORE = OCR_FAST ? 80 : 100;
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

const LANG_BOOST = {
  urd: "urd+eng",
  ara: "ara+eng",
  hin: "hin+eng",
  chi_sim: "chi_sim+eng",
  jpn: "jpn+eng",
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
  return LANG_BOOST[code] || code;
}

function scoreResult(text, confidence = 0) {
  const trimmed = (text || "").trim();
  if (!trimmed) return 0;
  const words = trimmed.split(/\s+/).filter(Boolean).length;
  const alnum = (trimmed.match(/[\p{L}\p{N}]/gu) || []).length;
  const ratio = alnum / Math.max(trimmed.length, 1);
  const quality = ratio < 0.25 && trimmed.length > 40 ? 0.55 : 1;
  return (alnum * 2 + words * 8 + confidence * 0.8) * quality;
}

function pickBest(candidates) {
  const ranked = candidates.filter((c) => c.text?.trim()).sort((a, b) => b.score - a.score);
  return ranked[0]?.text?.trim() || "";
}

function bestScore(candidates) {
  return candidates.reduce((max, c) => Math.max(max, c.score || 0), 0);
}

async function ocrWithSystemTesseractOnBuffer(imageBuffer, lang, tmpDir, tag, { quick = false } = {}) {
  const exe = await findSystemTesseract();
  if (!exe) return null;

  const variants = await getOcrPreprocessVariants(imageBuffer, quick);
  const psms = quick ? QUICK_PSM : FULL_PSM;
  const langs = resolveLang(lang);
  let best = { text: "", score: 0 };

  for (let vi = 0; vi < variants.length; vi++) {
    const prep = variants[vi];
    const imgPath = path.join(tmpDir, `ocr-${tag}-v${vi}.png`);
    const outBase = path.join(tmpDir, `ocr-out-${tag}-v${vi}`);
    await fs.writeFile(imgPath, prep);

    for (const psm of psms) {
      try {
        await withTimeout(
          execFileAsync(
            exe,
            [imgPath, outBase, "-l", langs, "--oem", "1", "--psm", psm, "-c", "preserve_interword_spaces=1", "txt"],
            { timeout: SYSTEM_TESSERACT_MS, maxBuffer: 30 * 1024 * 1024 }
          ),
          SYSTEM_TESSERACT_MS + 5000,
          "System OCR"
        );
        const txtPath = `${outBase}.txt`;
        const text = await fs.readFile(txtPath, "utf-8").catch(() => "");
        const s = scoreResult(text);
        if (s > best.score) best = { text: text.trim(), score: s };
        if (best.score >= GOOD_SCORE) return best.text;
      } catch {
        /* try next psm */
      }
    }
  }

  return best.text || null;
}

async function createOcrWorker(ocrLang) {
  const langs = resolveLang(ocrLang);
  const primary = langs.split("+")[0] || "eng";
  const worker = await Tesseract.createWorker(primary, 1, { logger: () => {} });

  if (langs !== primary) {
    try {
      for (const pack of langs.split("+")) {
        await worker.loadLanguage(pack);
      }
      await worker.initialize(langs);
    } catch {
      /* wasm language pack may be unavailable — keep primary */
    }
  }

  return worker;
}

async function ocrWithTesseractJs(imageBuffer, lang, worker, { quick = false } = {}) {
  const variants = await getOcrPreprocessVariants(imageBuffer, quick);
  const psms = quick ? QUICK_PSM : FULL_PSM;
  let best = { text: "", score: 0 };

  for (const buf of variants) {
    for (const psm of psms) {
      try {
        await worker.setParameters({
          tessedit_pageseg_mode: psm,
          preserve_interword_spaces: "1",
        });
        const { data } = await withTimeout(
          worker.recognize(buf),
          TESSERACT_CALL_MS,
          "Browser OCR"
        );
        const text = (data.text || "").trim();
        const s = scoreResult(text, data.confidence || 0);
        if (s > best.score) best = { text, score: s };
        if (best.score >= GOOD_SCORE) return best.text;
      } catch {
        /* next */
      }
    }
  }

  return best.text;
}

async function ocrWithPythonBuffer(imageBuffer, lang, tmpDir, tag) {
  const python = await resolvePythonCommand();
  if (!python) return null;

  const inputPath = path.join(tmpDir, `py-${tag}.png`);
  const txtPath = path.join(tmpDir, `py-${tag}.txt`);
  await fs.writeFile(inputPath, await preprocessForOcr(imageBuffer));

  try {
    await withTimeout(
      execFileAsync(python.cmd, [...python.args, OCR_SCRIPT, inputPath, txtPath, resolveLang(lang)], {
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

async function powerOcrImageBuffer(buffer, lang, tmpDir, tag, worker) {
  const candidates = [];

  const sysQuick = await ocrWithSystemTesseractOnBuffer(buffer, lang, tmpDir, `${tag}-sys`, { quick: true });
  if (sysQuick) candidates.push({ text: sysQuick, score: scoreResult(sysQuick) });
  if (bestScore(candidates) >= GOOD_SCORE) return pickBest(candidates);

  const sysFull = await ocrWithSystemTesseractOnBuffer(buffer, lang, tmpDir, `${tag}-sysf`, { quick: false });
  if (sysFull) candidates.push({ text: sysFull, score: scoreResult(sysFull) });
  if (bestScore(candidates) >= GOOD_SCORE) return pickBest(candidates);

  const hasSystem = Boolean(await findSystemTesseract());
  if (!hasSystem || bestScore(candidates) < GOOD_SCORE) {
    const js = await ocrWithTesseractJs(buffer, lang, worker, { quick: bestScore(candidates) >= 50 });
    if (js) candidates.push({ text: js, score: scoreResult(js) });
    if (bestScore(candidates) >= GOOD_SCORE) return pickBest(candidates);
  }

  if (bestScore(candidates) < 50) {
    const py = await ocrWithPythonBuffer(buffer, lang, tmpDir, tag);
    if (py) candidates.push({ text: py, score: scoreResult(py) });
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
    const text = await powerOcrImageBuffer(pageBuf, lang, tmpDir, `p${pageNum}`, worker);
    parts.push(`--- Page ${pageNum} ---\n${text}`);
    pageNum++;
  }

  if (progressId) {
    setOcrProgress(progressId, { phase: "done", done: pageNum - 1, total: pageNum - 1 });
  }

  return parts.join("\n\n");
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

  try {
    if (ext === "pdf") {
      text = await powerOcrPdfBuffer(buffer, tmpDir, ocrLang, worker, progressId);
    } else if (IMAGE_EXT.has(ext)) {
      if (progressId) setOcrProgress(progressId, { phase: "ocr", done: 0, total: 1 });
      text = await powerOcrImageBuffer(buffer, ocrLang, tmpDir, "img", worker);
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
      "OCR found no text. Use a sharper scan, pick the correct language, or try a smaller file."
    );
  }

  if (toFormat === "docx") {
    const doc = new Document({
      sections: [
        {
          children: text.split(/\n/).map((line) => new Paragraph({ children: [new TextRun(line || " ")] })),
        },
      ],
    });
    const docxBuffer = await Packer.toBuffer(doc);
    return {
      buffer: docxBuffer,
      filename: `${baseName}_ocr.docx`,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
  }

  return {
    buffer: Buffer.from(text, "utf-8"),
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
