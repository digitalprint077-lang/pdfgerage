import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { execFile } from "child_process";
import { promisify } from "util";
import Tesseract from "tesseract.js";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { pdf } from "pdf-to-img";
import { resolvePythonCommand } from "./pdf2docx.js";
import { preprocessForOcr, preprocessForOcrAggressive } from "./ocrPreprocess.js";
import { envBool, envInt } from "./perf.js";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OCR_SCRIPT = path.join(__dirname, "scripts", "ocr.py");

const IMAGE_EXT = new Set([
  "3fr", "arw", "avif", "bmp", "cr2", "cr3", "crw", "dcr", "dng", "erf", "gif", "heic", "heif", "ico",
  "jfif", "jpeg", "jpg", "mos", "mrw", "nef", "orf", "pef", "png", "ppm", "raf", "raw", "rw2", "tga",
  "tif", "tiff", "webp", "x3f",
]);
const PDF_SCALE = envInt("OCR_PDF_SCALE", 3);
const OCR_FAST = envBool("OCR_FAST", true);
const PSM_MODES = OCR_FAST ? ["6", "3"] : ["3", "6", "11"];

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
};

/** Bilingual packs improve mixed documents (e.g. Urdu + English forms). */
const LANG_BOOST = {
  urd: "urd+eng",
  ara: "ara+eng",
  hin: "hin+eng",
};

let cachedTesseractExe = null;
let tesseractChecked = false;

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
  const words = trimmed.split(/\s+/).length;
  const alnum = (trimmed.match(/[\p{L}\p{N}]/gu) || []).length;
  return alnum * 2 + words * 5 + confidence * 0.5;
}

async function ocrWithSystemTesseract(imageBuffer, lang, tmpDir, tag) {
  const exe = await findSystemTesseract();
  if (!exe) return null;

  const prep = await preprocessForOcr(imageBuffer);
  const imgPath = path.join(tmpDir, `ocr-${tag}.png`);
  const outBase = path.join(tmpDir, `ocr-out-${tag}`);
  await fs.writeFile(imgPath, prep);

  const langs = resolveLang(lang);
  let best = { text: "", score: 0 };

  for (const psm of PSM_MODES) {
    try {
      await execFileAsync(
        exe,
        [imgPath, outBase, "-l", langs, "--oem", "1", "--psm", psm, "-c", "preserve_interword_spaces=1", "txt"],
        { timeout: 180000, maxBuffer: 30 * 1024 * 1024 }
      );
      const txtPath = `${outBase}.txt`;
      const text = await fs.readFile(txtPath, "utf-8").catch(() => "");
      const s = scoreResult(text);
      if (s > best.score) best = { text: text.trim(), score: s };
      if (OCR_FAST && s > 120) return best.text;
    } catch {
      /* try next psm */
    }
  }

  return best.text || null;
}

async function ocrWithTesseractJs(imageBuffer, lang, worker) {
  const langs = resolveLang(lang);
  const variants = OCR_FAST
    ? [await preprocessForOcr(imageBuffer)]
    : [await preprocessForOcr(imageBuffer), await preprocessForOcrAggressive(imageBuffer)];

  let best = { text: "", score: 0 };

  for (const buf of variants) {
    for (const psm of PSM_MODES) {
      try {
        await worker.setParameters({
          tessedit_pageseg_mode: psm,
          tessedit_ocr_engine_mode: "1",
          preserve_interword_spaces: "1",
        });
        const { data } = await worker.recognize(buf);
        const text = (data.text || "").trim();
        const s = scoreResult(text, data.confidence || 0);
        if (s > best.score) best = { text, score: s };
        if (OCR_FAST && s > 120) return best.text;
      } catch {
        /* next */
      }
    }
  }

  return best.text;
}

async function ocrWithPython(inputPath, txtPath, lang) {
  const python = await resolvePythonCommand();
  if (!python) return null;
  await execFileAsync(python.cmd, [...python.args, OCR_SCRIPT, inputPath, txtPath, resolveLang(lang)], {
    timeout: 600000,
    maxBuffer: 30 * 1024 * 1024,
  });
  return fs.readFile(txtPath, "utf-8");
}

async function powerOcrImageBuffer(buffer, lang, tmpDir, tag, worker) {
  const sys = await ocrWithSystemTesseract(buffer, lang, tmpDir, `${tag}-sys`);
  if (sys && sys.trim()) {
    const sysScore = scoreResult(sys);
    if (OCR_FAST && sysScore > 80) return sys;
    if (!OCR_FAST) {
      const js = await ocrWithTesseractJs(buffer, lang, worker);
      if (js && scoreResult(js) > sysScore) return js;
      return sys;
    }
  }

  const js = await ocrWithTesseractJs(buffer, lang, worker);
  if (js) return js;
  return sys || "";
}

async function powerOcrPdfBuffer(buffer, tmpDir, lang, worker) {
  const pdfPath = path.join(tmpDir, "ocr-input.pdf");
  await fs.writeFile(pdfPath, buffer);

  const document = await pdf(pdfPath, { scale: PDF_SCALE });
  const parts = [];
  let pageNum = 1;

  for await (const page of document) {
    const pageBuf = Buffer.isBuffer(page) ? page : Buffer.from(page);
    let text = await powerOcrImageBuffer(pageBuf, lang, tmpDir, `p${pageNum}`, worker);

    if (!text.trim()) {
      const inputPath = path.join(tmpDir, `page-${pageNum}.png`);
      const txtPath = path.join(tmpDir, `page-${pageNum}.txt`);
      await fs.writeFile(inputPath, await preprocessForOcr(pageBuf));
      try {
        const py = await ocrWithPython(inputPath, txtPath, lang);
        if (py) text = py.trim();
      } catch {
        /* ignore */
      }
    }

    parts.push(`--- Page ${pageNum} ---\n${text}`);
    pageNum++;
  }

  return parts.join("\n\n");
}

export async function isTesseractAvailable() {
  const sys = await findSystemTesseract();
  return Boolean(sys) || true;
}

export async function runOcr({ buffer, originalName, tmpDir, ocrLang = "eng", toFormat = "txt" }) {
  const baseName = path.basename(originalName, path.extname(originalName));
  const ext = (path.extname(originalName).slice(1).toLowerCase() || "pdf").replace("jpeg", "jpg");

  const worker = await Tesseract.createWorker("eng", 1, { logger: () => {} });
  const langs = resolveLang(ocrLang);
  if (langs !== "eng") {
    try {
      await worker.loadLanguage(langs);
      await worker.initialize(langs);
    } catch {
      /* wasm language pack may be unavailable — keep eng */
    }
  }

  let text = "";

  try {
    if (ext === "pdf") {
      text = await powerOcrPdfBuffer(buffer, tmpDir, ocrLang, worker);
    } else if (IMAGE_EXT.has(ext)) {
      text = await powerOcrImageBuffer(buffer, ocrLang, tmpDir, "img", worker);

      if (!text.trim()) {
        const inputPath = path.join(tmpDir, `input.${ext}`);
        const txtPath = path.join(tmpDir, "ocr.txt");
        await fs.writeFile(inputPath, buffer);
        try {
          const py = await ocrWithPython(inputPath, txtPath, ocrLang);
          if (py) text = py.trim();
        } catch {
          /* optional Python OCR fallback — missing pytesseract is OK */
        }
      }
    } else {
      throw new Error(`OCR supports PDF and images (PNG, JPG, etc.) — not ${ext.toUpperCase()}`);
    }
  } finally {
    await worker.terminate().catch(() => {});
  }

  if (!text.trim()) {
    throw new Error(
      "OCR found no text. Use a sharper scan, pick the correct language, or install Tesseract with language packs: https://github.com/UB-Mannheim/tesseract/wiki"
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
  };
}
