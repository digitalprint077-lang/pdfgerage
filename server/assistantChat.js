import crypto from "crypto";
import { askAi, getAiProvider, isAiConfigured } from "./aiClient.js";

const SESSION_TTL_MS = 4 * 60 * 60 * 1000;
const MAX_HISTORY = 20;
const MAX_MESSAGE_CHARS = 2000;

/** @type {Map<string, { id: string, history: Array<{ role: string, content: string }>, createdAt: number, userId: number | null }>} */
const sessions = new Map();

const SITE_KNOWLEDGE = `
PDF Gerage (https://pdfgerage.com) is an online file conversion and PDF toolkit.

Main tools (Tools menu):
- Document/Image/Spreadsheet/Presentation/Ebook/Archive/Vector converters — upload a file, pick output format, click Convert
- Compress PDF / PNG / JPG — reduce file size
- Merge PDF — combine multiple PDFs
- Create Archive (ZIP) / Extract Archive
- PDF OCR & Image OCR — extract text from scans; output TXT, bordered DOCX (scan + field tables), or searchable PDF; use English for English documents
- Translate Document — PDF, DOCX, TXT to another language
- Chat with PDF AI — upload a PDF at /tool/chat-pdf and ask questions about its content

How to convert:
1. Go to home page or a tool page (e.g. /tool/document)
2. Upload file(s) or drag and drop
3. After upload, use the From → To format pickers in the file row
4. Click Convert

Popular conversions: PDF→DOCX, DOCX→PDF, PNG→JPG, XLSX→CSV, PPTX→PDF

Account & billing: /pricing for plans, /profile for dashboard, /login to sign in

Support: /contact page, Privacy / Terms / Security in footer

Rules for you:
- Help users use PDF Gerage only. Be friendly and concise.
- When a tool fits, mention its name and path like /tool/pdf-ocr
- Do not claim to convert files yourself — guide the user through the UI
- For document Q&A about file contents, suggest Chat with PDF AI at /tool/chat-pdf
- If unsure, suggest Contact page or trying the relevant tool from the Tools menu
`.trim();

function pruneSessions() {
  const cutoff = Date.now() - SESSION_TTL_MS;
  for (const [id, session] of sessions) {
    if (session.createdAt < cutoff) sessions.delete(id);
  }
}

function getOrCreateSession(sessionId, userId) {
  pruneSessions();
  let session = sessions.get(sessionId);
  if (!session) {
    session = {
      id: sessionId,
      history: [],
      createdAt: Date.now(),
      userId: userId ?? null,
    };
    sessions.set(sessionId, session);
  }
  session.createdAt = Date.now();
  return session;
}

export function assistantConfigHandler(_req, res) {
  res.json({
    available: isAiConfigured(),
    provider: getAiProvider(),
  });
}

export async function assistantMessageHandler(req, res) {
  try {
    if (!isAiConfigured()) {
      return res.status(503).json({
        error: "Assistant is not configured yet. Add OPENAI_API_KEY or GEMINI_API_KEY on the server.",
      });
    }

    let sessionId = String(req.body?.sessionId || "").trim();
    const message = String(req.body?.message || "").trim();

    if (!message) {
      return res.status(400).json({ error: "message is required" });
    }
    if (message.length > MAX_MESSAGE_CHARS) {
      return res.status(400).json({ error: "Message is too long (max 2000 characters)" });
    }

    if (!sessionId) {
      sessionId = crypto.randomBytes(16).toString("hex");
    }

    const session = getOrCreateSession(sessionId, req.user?.id ?? null);
    session.history.push({ role: "user", content: message });
    if (session.history.length > MAX_HISTORY) {
      session.history = session.history.slice(-MAX_HISTORY);
    }

    const systemPrompt = `You are the PDF Gerage Assistant — a helpful support chatbot for the PDF Gerage web app.

${SITE_KNOWLEDGE}`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...session.history.map((m) => ({ role: m.role, content: m.content })),
    ];

    const reply = await askAi(messages, { temperature: 0.4, maxTokens: 1024 });
    session.history.push({ role: "assistant", content: reply });

    res.json({
      sessionId,
      reply,
      history: session.history,
      suggestedQuestions: [
        "How do I convert PDF to Word?",
        "How does OCR work on scanned documents?",
        "Where is Chat with PDF AI?",
      ],
    });
  } catch (err) {
    console.error("assistant chat error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Could not get assistant reply" });
  }
}

export function deleteAssistantSessionHandler(req, res) {
  sessions.delete(req.params.sessionId);
  res.json({ ok: true });
}
