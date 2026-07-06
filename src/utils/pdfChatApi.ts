import { apiUrl } from "./api";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface PdfChatSession {
  sessionId: string;
  fileName: string;
  charCount: number;
  suggestedQuestions: string[];
}

export async function fetchPdfChatConfig(): Promise<{
  available: boolean;
  provider: string | null;
  error?: string;
}> {
  let res: Response;
  try {
    res = await fetch(apiUrl("/api/pdf-chat/config"));
  } catch {
    return {
      available: false,
      provider: null,
      error: "Could not reach the API server. Check that the backend is running.",
    };
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 404) {
      return {
        available: false,
        provider: null,
        error: "Chat with PDF AI is not deployed on the server yet. Redeploy the latest API build.",
      };
    }
    return {
      available: false,
      provider: null,
      error: typeof data.error === "string" ? data.error : "Could not load AI chat settings.",
    };
  }

  return { available: Boolean(data.available), provider: data.provider || null };
}

export async function createPdfChatSession(file: File): Promise<PdfChatSession> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(apiUrl("/api/pdf-chat/session"), {
    method: "POST",
    body: form,
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not upload PDF for chat");
  return data as PdfChatSession;
}

export async function sendPdfChatMessage(
  sessionId: string,
  message: string
): Promise<{ reply: string; history: ChatMessage[] }> {
  const res = await fetch(apiUrl("/api/pdf-chat/message"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, message }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not send message");
  return data as { reply: string; history: ChatMessage[] };
}

export async function endPdfChatSession(sessionId: string): Promise<void> {
  await fetch(apiUrl(`/api/pdf-chat/session/${encodeURIComponent(sessionId)}`), {
    method: "DELETE",
    credentials: "include",
  }).catch(() => {});
}
