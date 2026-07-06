import { apiUrl } from "./api";

export interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
}

const SESSION_KEY = "pdfgerage-assistant-session";

export function getAssistantSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function clearAssistantSessionId(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export async function fetchAssistantConfig(): Promise<{
  available: boolean;
  provider: string | null;
  error?: string;
}> {
  try {
    const res = await fetch(apiUrl("/api/assistant/config"));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        available: false,
        provider: null,
        error: typeof data.error === "string" ? data.error : "Could not load assistant settings.",
      };
    }
    return { available: Boolean(data.available), provider: data.provider || null };
  } catch {
    return {
      available: false,
      provider: null,
      error: "Could not reach the API server.",
    };
  }
}

export async function sendAssistantMessage(
  sessionId: string,
  message: string
): Promise<{
  sessionId: string;
  reply: string;
  history: AssistantMessage[];
  suggestedQuestions: string[];
}> {
  const res = await fetch(apiUrl("/api/assistant/message"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, message }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not send message");
  return data;
}

export async function resetAssistantSession(sessionId: string): Promise<void> {
  await fetch(apiUrl(`/api/assistant/session/${encodeURIComponent(sessionId)}`), {
    method: "DELETE",
    credentials: "include",
  }).catch(() => {});
  clearAssistantSessionId();
}
