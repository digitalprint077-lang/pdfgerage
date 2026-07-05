import { apiUrl } from "./api";

interface HealthData {
  ok?: boolean;
  libreOffice?: boolean;
  pdf2docx?: boolean;
  tesseract?: boolean;
  ocr?: { available?: boolean; engine?: string };
}

interface TranslateStatus {
  primary?: string;
  google?: { available?: boolean };
  mymemory?: { available?: boolean };
  emailSet?: boolean;
  libretranslate?: { available?: boolean };
}

export interface StatusData {
  overall: string;
  overallLabel: string;
  updatedAt: string;
  endpoints: {
    operational: boolean;
    items: Array<{
      id: string;
      name: string;
      operational: boolean;
      uptimePercent: number;
      history: boolean[];
    }>;
  };
  regions: {
    operational: boolean;
    items: Array<{ id: string; name: string; operational: boolean; detail?: string }>;
  };
  conversions: {
    operational: boolean;
    uptimePercent: number;
    history: boolean[];
    items: Array<{ id: string; name: string; operational: boolean; detail?: string }>;
  };
}

async function fetchJson<T>(url: string): Promise<T | null> {
  let res: Response;
  try {
    res = await fetch(apiUrl(url), { credentials: "include" });
  } catch {
    throw new Error(
      import.meta.env.VITE_API_URL
        ? `Cannot reach API at ${import.meta.env.VITE_API_URL}. Check Railway is running and CORS allows ${window.location.origin}.`
        : "Could not reach the API. Run npm run dev and refresh."
    );
  }
  const type = res.headers.get("content-type") || "";
  if (!res.ok || !type.includes("application/json")) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function historyBars(ok: boolean) {
  return Array.from({ length: 90 }, () => ok);
}

function uptimePercent(history: boolean[]) {
  const up = history.filter(Boolean).length;
  return Math.round((up / history.length) * 100000) / 1000;
}

export function buildStatusFromHealth(health: HealthData, translate: TranslateStatus | null): StatusData {
  const webOk = true;
  const apiOk = health.ok === true;
  const conversionsOk = !!(health.libreOffice && health.tesseract);
  const allOk = webOk && apiOk && conversionsOk;

  const webHistory = historyBars(webOk);
  const apiHistory = historyBars(apiOk);
  const convHistory = historyBars(conversionsOk);

  return {
    overall: allOk ? "operational" : apiOk ? "degraded" : "outage",
    overallLabel: allOk
      ? "All services are online"
      : apiOk
        ? "Some services are degraded"
        : "Service outage",
    updatedAt: new Date().toISOString(),
    endpoints: {
      operational: webOk && apiOk,
      items: [
        {
          id: "webinterface",
          name: "Web interface",
          operational: webOk,
          uptimePercent: uptimePercent(webHistory),
          history: webHistory,
        },
        {
          id: "api",
          name: "API",
          operational: apiOk,
          uptimePercent: uptimePercent(apiHistory),
          history: apiHistory,
        },
      ],
    },
    regions: {
      operational: apiOk,
      items: [
        {
          id: "primary",
          name: "Primary region",
          operational: apiOk,
          detail: "PDF Gerage cloud infrastructure",
        },
      ],
    },
    conversions: {
      operational: conversionsOk,
      uptimePercent: uptimePercent(convHistory),
      history: convHistory,
      items: [
        {
          id: "libreoffice",
          name: "LibreOffice",
          operational: !!health.libreOffice,
          detail: "Documents & Office formats",
        },
        {
          id: "tesseract",
          name: "Tesseract OCR",
          operational: !!health.tesseract,
          detail: health.ocr?.engine ? `Engine: ${health.ocr.engine}` : "Scan & image text",
        },
        {
          id: "pdf2docx",
          name: "pdf2docx",
          operational: !!health.pdf2docx,
          detail: "PDF to Word (Python)",
        },
        {
          id: "translate",
          name: "Translation",
          operational: !!(translate?.google?.available || translate?.primary),
          detail: translate?.primary ? `Primary: ${translate.primary}` : "Translation providers",
        },
      ],
    },
  };
}

export async function loadStatusPageData(): Promise<StatusData> {
  const status = await fetchJson<StatusData>("/api/status");
  if (status) return status;

  const health = await fetchJson<HealthData>("/api/health");
  if (!health) {
    throw new Error(
      import.meta.env.VITE_API_URL
        ? "Could not reach the API server. Check VITE_API_URL and that the backend is running."
        : "Could not reach the API. Run npm run dev and refresh."
    );
  }

  const translate = await fetchJson<TranslateStatus>("/api/translate/status");
  return buildStatusFromHealth(health, translate);
}
