import crypto from "crypto";
import pdfParse from "pdf-parse";
import { extractTextFromPdfBuffer } from "./pdfRender.js";
import { askAi, getAiProvider, isAiConfigured } from "./aiClient.js";

const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_DOC_CHARS = 100_000;
const MAX_HISTORY = 24;

/** @type {Map<string, { id: string, fileName: string, text: string, history: Array<{ role: string, content: string }>, createdAt: number, userId: number | null }>} */
const sessions = new Map();

function pruneSessions() {
  const cutoff = Date.now() - SESSION_TTL_MS;
  for (const [id, session] of sessions) {
    if (session.createdAt < cutoff) sessions.delete(id);
  }
}

export function isPdfChatConfigured() {
  return isAiConfigured();
}

export function pdfChatConfigHandler(_req, res) {
  res.json({
    available: isAiConfigured(),
    provider: getAiProvider(),
  });
}

async function extractPdfText(buffer) {
  let text = "";

  try {
    const parsed = await pdfParse(buffer);
    text = (parsed.text || "").trim();
  } catch {
    /* fall through */
  }

  if (text.length < 80) {
    try {
      text = (await extractTextFromPdfBuffer(buffer)).trim();
    } catch {
      /* fall through */
    }
  }

  return text.slice(0, MAX_DOC_CHARS);
}

function trimForPrompt(text) {
  if (text.length <= MAX_DOC_CHARS) return text;
  const head = text.slice(0, Math.floor(MAX_DOC_CHARS * 0.7));
  const tail = text.slice(-Math.floor(MAX_DOC_CHARS * 0.25));
  return `${head}\n\n[... middle section omitted for length ...]\n\n${tail}`;
}

export async function createPdfChatSessionHandler(req, res) {
  try {
    if (!isPdfChatConfigured()) {
      return res.status(503).json({
        error: "Chat with PDF AI is not configured yet. Add OPENAI_API_KEY or GEMINI_API_KEY on the server.",
      });
    }

    const file = req.file;
    if (!file?.buffer) {
      return res.status(400).json({ error: "Upload a PDF file" });
    }
    if (file.size > MAX_FILE_BYTES) {
      return res.status(400).json({ error: "PDF must be 25 MB or smaller for chat" });
    }
    const name = file.originalname || "document.pdf";
    if (!name.toLowerCase().endsWith(".pdf") && file.mimetype !== "application/pdf") {
      return res.status(400).json({ error: "Only PDF files are supported for AI chat" });
    }

    pruneSessions();

    const text = await extractPdfText(file.buffer);
    if (!text || text.length < 40) {
      return res.status(400).json({
        error:
          "Could not read enough text from this PDF. If it is scanned, run PDF OCR first, then try again with the text export.",
      });
    }

    const sessionId = crypto.randomBytes(16).toString("hex");
    const session = {
      id: sessionId,
      fileName: name,
      text,
      history: [],
      createdAt: Date.now(),
      userId: req.user?.id ?? null,
    };
    sessions.set(sessionId, session);

    res.json({
      sessionId,
      fileName: name,
      charCount: text.length,
      suggestedQuestions: [
        "Summarize this document in 5 bullet points",
        "What are the main topics covered?",
        "List any dates, deadlines, or action items",
        "Explain this document in simple terms",
      ],
    });
  } catch (err) {
    console.error("pdf chat session error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Could not start chat session" });
  }
}

export async function pdfChatMessageHandler(req, res) {
  try {
    if (!isPdfChatConfigured()) {
      return res.status(503).json({ error: "AI chat is not configured" });
    }

    const sessionId = String(req.body?.sessionId || "").trim();
    const message = String(req.body?.message || "").trim();
    if (!sessionId || !message) {
      return res.status(400).json({ error: "sessionId and message are required" });
    }
    if (message.length > 4000) {
      return res.status(400).json({ error: "Message is too long (max 4000 characters)" });
    }

    pruneSessions();
    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Chat session expired. Please upload your PDF again." });
    }

    session.history.push({ role: "user", content: message });
    if (session.history.length > MAX_HISTORY) {
      session.history = session.history.slice(-MAX_HISTORY);
    }

    const docContext = trimForPrompt(session.text);
    const systemPrompt = `You are PDF Gerage AI — a helpful assistant that answers questions about the user's PDF document.
Rules:
- Answer ONLY using the document text below. If the answer is not in the document, say you cannot find it in this PDF.
- Be concise and accurate. Use bullet points when listing items.
- Do not invent facts, quotes, or page numbers.

Document filename: ${session.fileName}

--- DOCUMENT START ---
${docContext}
--- DOCUMENT END ---`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...session.history.map((m) => ({ role: m.role, content: m.content })),
    ];

    const reply = await askAi(messages);
    session.history.push({ role: "assistant", content: reply });

    res.json({ reply, history: session.history });
  } catch (err) {
    console.error("pdf chat message error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Could not get AI reply" });
  }
}

export function deletePdfChatSessionHandler(req, res) {
  sessions.delete(req.params.sessionId);
  res.json({ ok: true });
}

export function getPdfChatSession(sessionId) {
  return sessions.get(sessionId) || null;
}
