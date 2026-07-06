import { useEffect, useRef, useState } from "react";
import SitePageShell from "../components/SitePageShell";
import { useI18n } from "../i18n/I18nContext";
import {
  createPdfChatSession,
  endPdfChatSession,
  fetchPdfChatConfig,
  sendPdfChatMessage,
  type ChatMessage,
} from "../utils/pdfChatApi";

function ChatBubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-brand text-white"
            : "border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--foreground))]"
        }`}
      >
        {content}
      </div>
    </div>
  );
}

export default function ChatPdfPage() {
  const { t } = useI18n();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = `${t("chatPdfTitle")} — PDF Gerage`;
    fetchPdfChatConfig().then((c) => {
      setConfigured(c.available);
      setConfigError(c.error ?? null);
    });
    return () => {
      document.title = "PDF Gerage";
    };
  }, [t]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    return () => {
      if (sessionId) endPdfChatSession(sessionId);
    };
  }, [sessionId]);

  const handleUpload = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      if (sessionId) await endPdfChatSession(sessionId);
      const session = await createPdfChatSession(file);
      setSessionId(session.sessionId);
      setFileName(session.fileName);
      setMessages([]);
      setSuggestions(session.suggestedQuestions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !sessionId || sending) return;

    setError(null);
    setSending(true);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);

    try {
      const data = await sendPdfChatMessage(sessionId, trimmed);
      setMessages(data.history.filter((m) => m.role === "user" || m.role === "assistant"));
      setSuggestions([]);
    } catch (err) {
      setMessages((prev) => prev.slice(0, -1));
      setInput(trimmed);
      setError(err instanceof Error ? err.message : "Message failed");
    } finally {
      setSending(false);
    }
  };

  const resetChat = async () => {
    if (sessionId) await endPdfChatSession(sessionId);
    setSessionId(null);
    setFileName(null);
    setMessages([]);
    setSuggestions([]);
    setInput("");
    setError(null);
  };

  return (
    <SitePageShell>
      <div className="mx-auto flex max-w-3xl flex-col px-4 py-8 md:py-12">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">AI</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{t("chatPdfTitle")}</h1>
          <p className="mt-2 text-sm text-[rgb(var(--muted))] md:text-base">{t("chatPdfSubtitle")}</p>
          <p className="mt-2 text-xs text-[rgb(var(--muted))]">{t("filesRemovedNote")}</p>
        </div>

        {configured === false ? (
          <div className="modern-card p-6 text-center text-sm text-[rgb(var(--muted))]">
            {configError || t("chatPdfNotConfigured")}
          </div>
        ) : null}

        {!sessionId ? (
          <section className="modern-card p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/15 text-brand">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            <h2 className="mt-4 text-lg font-semibold">{t("chatPdfUploadTitle")}</h2>
            <p className="mt-2 text-sm text-[rgb(var(--muted))]">{t("chatPdfUploadHint")}</p>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={uploading || configured === false}
              onClick={() => fileRef.current?.click()}
              className="btn-primary mt-6 rounded-xl px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {uploading ? t("working") : t("chatPdfSelectPdf")}
            </button>
          </section>
        ) : (
          <section className="modern-card flex min-h-[28rem] flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-[rgb(var(--border))] px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{fileName}</p>
                <p className="text-xs text-[rgb(var(--muted))]">{t("chatPdfReady")}</p>
              </div>
              <button type="button" onClick={resetChat} className="btn-ghost shrink-0 text-xs">
                {t("chatPdfNewFile")}
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {messages.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-[rgb(var(--muted))]">{t("chatPdfAskAnything")}</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => sendMessage(q)}
                        className="rounded-full border border-[rgb(var(--border))] px-3 py-1.5 text-xs transition hover:border-brand/40 hover:bg-brand/5"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m, i) => <ChatBubble key={`${i}-${m.role}`} role={m.role} content={m.content} />)
              )}
              {sending ? (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-3 text-sm text-[rgb(var(--muted))]">
                    {t("chatPdfThinking")}
                  </div>
                </div>
              ) : null}
              <div ref={chatEndRef} />
            </div>

            <form
              className="border-t border-[rgb(var(--border))] p-4"
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
            >
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t("chatPdfPlaceholder")}
                  disabled={sending}
                  className="input-modern flex-1"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || sending}
                  className="btn-primary shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
                >
                  {t("chatPdfSend")}
                </button>
              </div>
            </form>
          </section>
        )}

        {error ? <p className="mt-4 text-center text-sm text-red-400">{error}</p> : null}
      </div>
    </SitePageShell>
  );
}
