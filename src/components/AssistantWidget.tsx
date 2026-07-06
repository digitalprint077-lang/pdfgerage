import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext";
import {
  fetchAssistantConfig,
  getAssistantSessionId,
  resetAssistantSession,
  sendAssistantMessage,
  type AssistantMessage,
} from "../utils/assistantApi";

type HubTopic = {
  id: string;
  titleKey: "assistantTileConvert" | "assistantTileOcr" | "assistantTileChatPdf" | "assistantTileBilling";
  subKey: "assistantTileConvertSub" | "assistantTileOcrSub" | "assistantTileChatPdfSub" | "assistantTileBillingSub";
  promptKey?: "assistantSuggestConvert" | "assistantSuggestOcr";
  href?: string;
};

const HUB_TOPICS: HubTopic[] = [
  {
    id: "convert",
    titleKey: "assistantTileConvert",
    subKey: "assistantTileConvertSub",
    promptKey: "assistantSuggestConvert",
    href: "/",
  },
  {
    id: "ocr",
    titleKey: "assistantTileOcr",
    subKey: "assistantTileOcrSub",
    promptKey: "assistantSuggestOcr",
    href: "/tool/pdf-ocr",
  },
  {
    id: "chat-pdf",
    titleKey: "assistantTileChatPdf",
    subKey: "assistantTileChatPdfSub",
    href: "/tool/chat-pdf",
  },
  {
    id: "billing",
    titleKey: "assistantTileBilling",
    subKey: "assistantTileBillingSub",
    href: "/pricing",
  },
];

function ChatBubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[92%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-brand text-white"
            : "border border-[rgb(var(--border))] bg-[rgb(var(--card-hover)/0.45)] text-[rgb(var(--foreground))]"
        }`}
      >
        {content}
      </div>
    </div>
  );
}

function TopicIcon({ id }: { id: string }) {
  const cls = "h-4 w-4 text-brand";
  switch (id) {
    case "ocr":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case "chat-pdf":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      );
    case "billing":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 12v-2m9-4a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      );
  }
}

export default function AssistantWidget() {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [sessionId, setSessionId] = useState(() => getAssistantSessionId());
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hideOnPage = location.pathname === "/tool/chat-pdf";

  useEffect(() => {
    fetchAssistantConfig().then((c) => setConfigured(c.available));
  }, []);

  useEffect(() => {
    if (open) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [open, messages, sending]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending || !configured) return;

    setError(null);
    setSending(true);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);

    try {
      const data = await sendAssistantMessage(sessionId, trimmed);
      setSessionId(data.sessionId);
      try {
        localStorage.setItem("pdfgerage-assistant-session", data.sessionId);
      } catch {
        /* ignore */
      }
      setMessages(data.history.filter((m) => m.role === "user" || m.role === "assistant"));
    } catch (err) {
      setMessages((prev) => prev.slice(0, -1));
      setInput(trimmed);
      setError(err instanceof Error ? err.message : "Message failed");
    } finally {
      setSending(false);
    }
  };

  const handleNewChat = async () => {
    await resetAssistantSession(sessionId);
    const next = getAssistantSessionId();
    setSessionId(next);
    setMessages([]);
    setError(null);
    setInput("");
  };

  const handleTopic = (topic: HubTopic) => {
    if (topic.promptKey && configured) {
      sendMessage(t(topic.promptKey));
      return;
    }
    if (topic.href) {
      setOpen(false);
      navigate(topic.href);
    }
  };

  if (hideOnPage) return null;

  return createPortal(
    <div className="pointer-events-none fixed bottom-4 right-4 z-[250] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open ? (
        <div
          className="pointer-events-auto flex w-[min(100vw-2rem,360px)] flex-col overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-soft-lg"
          role="dialog"
          aria-label={t("assistantHubTitle")}
        >
          <div className="flex items-center justify-between gap-2 border-b border-[rgb(var(--border))] px-4 py-3">
            <p className="text-sm font-semibold">{t("assistantHubTitle")}</p>
            <div className="flex shrink-0 items-center gap-1">
              {messages.length > 0 ? (
                <button
                  type="button"
                  onClick={handleNewChat}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-[rgb(var(--muted))] transition hover:bg-[rgb(var(--card-hover))] hover:text-brand"
                >
                  {t("assistantNewChat")}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-[rgb(var(--muted))] transition hover:bg-[rgb(var(--card-hover))] hover:text-[rgb(var(--foreground))]"
                aria-label={t("assistantClose")}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex max-h-[min(62vh,460px)] flex-col">
            <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3 picker-scroll">
              {configured === false ? (
                <p className="text-center text-xs text-[rgb(var(--muted))]">
                  {t("assistantNotConfigured")}{" "}
                  <Link to="/contact" className="text-brand hover:underline" onClick={() => setOpen(false)}>
                    {t("assistantContact")}
                  </Link>
                </p>
              ) : null}

              <div className="grid grid-cols-2 gap-2">
                {HUB_TOPICS.map((topic) => (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => handleTopic(topic)}
                    disabled={sending}
                    className="flex flex-col items-start gap-1 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card-hover)/0.4)] px-3 py-2.5 text-left transition hover:border-brand/35 hover:bg-[rgb(var(--card-hover))] disabled:opacity-50"
                  >
                    <TopicIcon id={topic.id} />
                    <span className="text-xs font-semibold text-[rgb(var(--foreground))]">{t(topic.titleKey)}</span>
                    <span className="text-[10px] leading-snug text-[rgb(var(--muted))]">{t(topic.subKey)}</span>
                  </button>
                ))}
              </div>

              {messages.length > 0 ? (
                <div className="space-y-2 border-t border-[rgb(var(--border))] pt-3">
                  {messages.map((m, i) => (
                    <ChatBubble key={`${m.role}-${i}`} role={m.role} content={m.content} />
                  ))}
                </div>
              ) : null}

              {sending ? (
                <div className="flex justify-start">
                  <div className="rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-xs text-[rgb(var(--muted))]">
                    {t("assistantThinking")}
                  </div>
                </div>
              ) : null}

              {error ? <p className="text-center text-xs text-red-400">{error}</p> : null}
              <div ref={chatEndRef} />
            </div>

            <form
              className="border-t border-[rgb(var(--border))] p-3"
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
            >
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={!configured || sending}
                  placeholder={configured ? t("assistantPlaceholder") : t("assistantUnavailable")}
                  className="input-modern h-10 flex-1 py-2 text-sm disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!configured || sending || !input.trim()}
                  className="btn-primary shrink-0 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t("assistantAsk")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-brand text-white shadow-glow transition hover:scale-105 active:scale-95"
        aria-label={open ? t("assistantClose") : t("assistantOpen")}
        aria-expanded={open}
      >
        {open ? (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        ) : (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
      </button>
    </div>,
    document.body
  );
}
