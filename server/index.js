import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import os from "os";
import { fileURLToPath } from "url";
import { batchPdfToImages, convertFile, isPdfToImageConversion, packBatchResults } from "./converter.js";
import { isPdf2DocxAvailable } from "./pdf2docx.js";
import { mergePdfs, compressPdf, compressImage } from "./pdfTools.js";
import { createZipArchive, extractZip } from "./archiveTools.js";
import { runOcr, isTesseractAvailable, isOcrInputFormat, getOcrEngineInfo } from "./ocrTools.js";
import { translateFile, translateText, TRANSLATE_LANGUAGES, OCR_LANGUAGES } from "./translateTools.js";
import { getTranslateProviderStatus } from "./translateProviders.js";
import {
  setTranslateProgress,
  getTranslateProgress,
  clearTranslateProgress,
} from "./translateProgress.js";
import { mountAuthRoutes, optionalAuth } from "./auth.js";
import { recordUserActivity } from "./userActivity.js";
import { assertWithinDailyLimit, getUsageSnapshot, recordSuccessfulJob } from "./usageLimits.js";
import { saveContactMessage } from "./db.js";
import { buildStatusSnapshot } from "./statusMonitor.js";

const SUPPORT_EMAIL = process.env.CONTACT_EMAIL || "support@pdfgerage.app";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

function corsOriginList() {
  const list = [];
  if (process.env.CLIENT_ORIGIN) {
    list.push(...process.env.CLIENT_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean));
  }
  const appUrl = process.env.APP_URL?.replace(/\/$/, "");
  if (appUrl) {
    list.push(appUrl);
    try {
      const u = new URL(appUrl);
      if (u.hostname.startsWith("www.")) {
        list.push(`${u.protocol}//${u.hostname.slice(4)}`);
      } else {
        list.push(`${u.protocol}//www.${u.hostname}`);
      }
    } catch {
      /* ignore */
    }
  }
  return [...new Set(list)];
}

function isAllowedCorsOrigin(origin) {
  if (!origin) return true;
  const allowed = corsOriginList();
  if (allowed.includes(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    // Vercel production + preview deploys for this project
    if (/^pdfgerage(-[a-z0-9-]+)*\.vercel\.app$/i.test(host)) return true;
  } catch {
    /* ignore */
  }
  return false;
}

app.use(
  cors({
    origin(origin, callback) {
      callback(null, isAllowedCorsOrigin(origin));
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));

mountAuthRoutes(app);

const distPath = path.join(__dirname, "..", "dist");

app.get("/api/status", async (_req, res) => {
  try {
    const libreOffice = await detectLibreOffice();
    const pdf2docx = await isPdf2DocxAvailable();
    const tesseract = await isTesseractAvailable();
    const translate = await getTranslateProviderStatus().catch(() => null);
    const webOk = true;
    const apiOk = true;
    res.json(
      buildStatusSnapshot({
        apiOk,
        webOk,
        libreOffice,
        pdf2docx,
        tesseract,
        translate,
      })
    );
  } catch (err) {
    sendError(res, err);
  }
});

app.get("/api/health", async (_req, res) => {
  const libreOffice = await detectLibreOffice();
  const pdf2docx = await isPdf2DocxAvailable();
  const tesseract = await isTesseractAvailable();
  const ocr = await getOcrEngineInfo();
  res.json({ ok: true, libreOffice, pdf2docx, tesseract, ocr });
});

app.get("/api/languages", (_req, res) => {
  res.json({ ui: null, ocr: OCR_LANGUAGES, translate: TRANSLATE_LANGUAGES });
});

app.get("/api/translate/progress/:id", (req, res) => {
  const progress = getTranslateProgress(req.params.id);
  if (!progress) return res.status(404).json({ error: "Progress not found" });
  res.json({
    phase: progress.phase,
    done: progress.done,
    total: progress.total,
  });
});

app.get("/api/translate/status", async (_req, res) => {
  try {
    res.json(await getTranslateProviderStatus());
  } catch (err) {
    sendError(res, err);
  }
});

app.get("/api/contact/config", (_req, res) => {
  res.json({ supportEmail: SUPPORT_EMAIL });
});

app.post("/api/contact", (req, res) => {
  const name = String(req.body?.name || "").trim();
  const email = String(req.body?.email || "").trim();
  const account = String(req.body?.account || "").trim();
  const subject = String(req.body?.subject || "").trim();
  const message = String(req.body?.message || "").trim();

  if (!name) return res.status(400).json({ error: "Name is required" });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "A valid email address is required" });
  }
  if (!subject) return res.status(400).json({ error: "Please select a subject" });
  if (!message) return res.status(400).json({ error: "Message is required" });
  if (message.length > 5000) return res.status(400).json({ error: "Message is too long (max 5000 characters)" });

  try {
    saveContactMessage({ name, email, account, subject, message });
    res.json({ ok: true, message: "Your message has been sent. We will get back to you soon." });
  } catch (err) {
    sendError(res, err);
  }
});

app.post("/api/translate", async (req, res) => {
  const { text, fromLang, toLang } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: "text is required" });
  if (!toLang) return res.status(400).json({ error: "toLang is required" });
  try {
    const translated = await translateText(text, fromLang || "auto", toLang);
    res.json({ translated });
  } catch (err) {
    sendError(res, err);
  }
});

app.get("/api/formats", (_req, res) => {
  res.json({
    categories: [
      "document", "image", "spreadsheet",
      "presentation", "ebook", "archive", "vector", "cad", "font",
    ],
    operations: ["convert", "merge", "compress", "extract", "create-archive", "ocr", "translate"],
  });
});

app.get("/api/usage", optionalAuth, (req, res) => {
  res.json(getUsageSnapshot(req, res));
});

app.post(
  "/api/convert",
  optionalAuth,
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "files", maxCount: 30 },
  ]),
  async (req, res) => {
    try {
      assertWithinDailyLimit(req, res);
    } catch (err) {
      if (err.code === "DAILY_LIMIT") {
        return res.status(429).json({ error: err.message, code: err.code, usage: err.usage });
      }
      return sendError(res, err);
    }

    const operation = String(req.query.operation || req.body?.operation || "convert").toLowerCase();
    const fromFormat = String(req.body?.fromFormat || "").toLowerCase();
    const toFormat = String(req.body?.toFormat || "").toLowerCase();
    const quality = req.body?.quality ? Number(req.body.quality) : undefined;
    const ocrLang = String(req.body?.ocrLang || req.query.ocrLang || "eng").toLowerCase();
    const translateFrom = String(req.body?.translateFrom || "auto").toLowerCase();
    const translateTo = String(req.body?.translateTo || "en").toLowerCase();
    const wantsOcr =
      operation === "ocr" ||
      Boolean(req.body?.ocrLang && operation !== "translate" && operation !== "merge");

    const uploadFiles = getUploadFiles(req);
    const resolvedFromFormat =
      fromFormat ||
      path.extname(uploadFiles[0]?.originalname || "")
        .slice(1)
        .toLowerCase();

    if (uploadFiles.length === 0) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    if (operation === "merge") {
      if (uploadFiles.length < 2) {
        return res.status(400).json({ error: "Upload at least 2 PDF files to merge" });
      }
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pdfcvt-"));
      try {
        const baseName = req.body.baseName || "merged";
        const result = await mergePdfs(
          uploadFiles.map((f) => f.buffer),
          baseName
        );
        logAndSendFile(req, res, result, {
          operation: "merge",
          fromFormat: "pdf",
          toFormat: "pdf",
          fileName: `${baseName}.pdf`,
        });
      } catch (err) {
        sendError(res, err);
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      }
      return;
    }

    if (operation === "create-archive") {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pdfcvt-"));
      try {
        const result = await createZipArchive(
          uploadFiles.map((f) => ({ buffer: f.buffer, originalName: f.originalname })),
          tmpDir,
          req.body.baseName || "archive"
        );
        logAndSendFile(req, res, result, {
          operation: "create-archive",
          fromFormat: "zip",
          toFormat: "zip",
          fileName: `${req.body.baseName || "archive"}.zip`,
        });
      } catch (err) {
        sendError(res, err);
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      }
      return;
    }

    const allPdf = uploadFiles.every((f) => fileFormat(f) === "pdf");
    if (
      operation === "convert" &&
      toFormat &&
      isPdfToImageConversion(resolvedFromFormat, toFormat) &&
      allPdf
    ) {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pdfcvt-"));
      try {
        const result = await batchPdfToImages(
          uploadFiles.map((f) => ({ buffer: f.buffer, originalName: f.originalname })),
          toFormat,
          tmpDir,
          req.body.baseName || "converted"
        );
        logAndSendFile(req, res, result, {
          operation: "convert",
          fromFormat: "pdf",
          toFormat,
          fileName: result.filename,
        });
      } catch (err) {
        sendError(res, err);
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      }
      return;
    }

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pdfcvt-"));
    const progressId = String(req.body?.progressId || "").trim();
    const fileCtx = {
      operation,
      fromFormat,
      toFormat,
      quality,
      ocrLang,
      translateFrom,
      translateTo,
      wantsOcr,
      progressId,
      baseName: req.body.baseName || "converted",
    };

    try {
      if (uploadFiles.length === 1) {
        const file = uploadFiles[0];
        const { result, loggedOperation, fmt } = await processSingleFile(file, {
          ...fileCtx,
          tmpDir,
        });
        logAndSendFile(req, res, result, {
          operation: loggedOperation,
          fromFormat: fmt,
          toFormat: toFormat || result.filename?.split(".").pop() || "",
          fileName: file.originalname,
        });
        return;
      }

      const result = await processBatchFiles(uploadFiles, fileCtx, tmpDir);
      logAndSendFile(req, res, result, {
        operation,
        fromFormat: resolvedFromFormat,
        toFormat: toFormat || result.filename?.split(".").pop() || "",
        fileName: `${uploadFiles.length} files`,
      });
    } catch (err) {
      sendError(res, err);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }
);

app.post("/api/fetch-url", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "url is required" });
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch URL (${response.status})`);
    const buffer = Buffer.from(await response.arrayBuffer());
    const name = decodeURIComponent(url.split("/").pop()?.split("?")[0] || "download");
    res.json({
      name,
      size: buffer.length,
      dataUrl: `data:application/octet-stream;base64,${buffer.toString("base64")}`,
    });
  } catch (err) {
    sendError(res, err);
  }
});

function getUploadFiles(req) {
  const multi = req.files?.files || [];
  const single = req.files?.file?.[0];
  if (multi.length > 0) return multi;
  if (single) return [single];
  return [];
}

function fileFormat(file, fallback = "") {
  return path.extname(file.originalname).slice(1).toLowerCase() || fallback;
}

async function processSingleFile(file, ctx) {
  const {
    operation,
    fromFormat,
    toFormat,
    quality,
    ocrLang,
    translateFrom,
    translateTo,
    wantsOcr,
    tmpDir,
    progressId,
  } = ctx;
  const fmt = fromFormat || fileFormat(file);
  const baseName = path.basename(file.originalname, path.extname(file.originalname));
  let loggedOperation = operation;
  let result;

  if (operation === "compress") {
    if (fmt === "pdf") {
      result = await compressPdf(file.buffer, baseName, quality);
    } else if (["png", "jpg", "jpeg", "webp"].includes(fmt)) {
      result = await compressImage(file.buffer, fmt, baseName, quality || 80);
    } else {
      throw new Error("Compress supports PDF, PNG, and JPG only");
    }
  } else if (operation === "extract") {
    result = await extractZip(file.buffer, tmpDir);
  } else if (wantsOcr) {
    loggedOperation = "ocr";
    result = await runOcr({
      buffer: file.buffer,
      originalName: file.originalname,
      tmpDir,
      ocrLang,
      toFormat: toFormat || "txt",
    });
  } else if (operation === "translate") {
    if (progressId) {
      setTranslateProgress(progressId, { phase: "extracting", done: 0, total: 0 });
    }
    try {
      result = await translateFile({
        buffer: file.buffer,
        originalName: file.originalname,
        fromFormat: fmt,
        fromLang: translateFrom,
        toLang: translateTo,
        toFormat: toFormat || "txt",
        onProgress: progressId ? (p) => setTranslateProgress(progressId, p) : undefined,
      });
    } finally {
      if (progressId) clearTranslateProgress(progressId);
    }
  } else if (
    operation === "convert" &&
    isOcrInputFormat(fromFormat || fileFormat(file)) &&
    (fromFormat || fileFormat(file)) !== "pdf" &&
    ["txt", "docx"].includes(toFormat)
  ) {
    loggedOperation = "ocr";
    result = await runOcr({
      buffer: file.buffer,
      originalName: file.originalname,
      tmpDir,
      ocrLang: ocrLang || "eng",
      toFormat,
    });
  } else {
    if (!fromFormat || !toFormat) {
      const err = new Error("fromFormat and toFormat are required");
      err.status = 400;
      throw err;
    }
    result = await convertFile({
      buffer: file.buffer,
      originalName: file.originalname,
      fromFormat,
      toFormat,
      tmpDir,
      options: { quality },
    });
  }

  return { result, loggedOperation, fmt };
}

async function processBatchFiles(files, ctx, tmpDir) {
  const outputs = [];
  const progressId = String(ctx.progressId || "").trim();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const subDir = path.join(tmpDir, `item-${i}`);
    await fs.mkdir(subDir, { recursive: true });

    if (ctx.operation === "translate" && progressId) {
      setTranslateProgress(progressId, {
        phase: "translating",
        done: i,
        total: files.length,
      });
    }

    const perFileCtx = {
      ...ctx,
      tmpDir: subDir,
      fromFormat: ctx.fromFormat || fileFormat(file),
      progressId: files.length === 1 ? progressId : undefined,
    };
    const { result } = await processSingleFile(file, perFileCtx);
    outputs.push(result);
  }

  if (progressId && files.length > 1) {
    clearTranslateProgress(progressId);
  }

  return packBatchResults(outputs, ctx.baseName || "converted", tmpDir);
}

function sendFile(res, result) {
  res.setHeader("Content-Type", result.mimeType);
  res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
  res.send(result.buffer);
}

function logAndSendFile(req, res, result, meta) {
  if (meta) {
    if (req.user?.id) {
      recordUserActivity({
        userId: req.user.id,
        operation: meta.operation,
        fromFormat: meta.fromFormat,
        toFormat: meta.toFormat,
        fileName: meta.fileName,
      });
    } else {
      recordSuccessfulJob(req, res);
    }
  }
  sendFile(res, result);
}

function sendError(res, err) {
  const message = err instanceof Error ? err.message : "Conversion failed";
  const status = err.status && err.status >= 400 ? err.status : 400;
  res.status(status).json({ error: message });
}

app.use(express.static(distPath));

app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "API route not found" });
  }
  res.sendFile(path.join(distPath, "index.html"), (err) => {
    if (err) res.status(404).send("Run npm run dev for development");
  });
});

async function detectLibreOffice() {
  const candidates =
    process.platform === "win32"
      ? [
          "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
          "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
        ]
      : ["soffice", "/usr/bin/soffice", "/usr/bin/libreoffice", "/Applications/LibreOffice.app/Contents/MacOS/soffice"];

  for (const candidate of candidates) {
    try {
      if (process.platform === "win32") {
        await fs.access(candidate);
        return true;
      }
      const { execSync } = await import("child_process");
      execSync(`which ${candidate}`, { stdio: "ignore" });
      return true;
    } catch {
      /* try next */
    }
  }
  return false;
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`PDF Gerage API running on http://localhost:${PORT}`);
});
