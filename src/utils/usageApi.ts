import { apiUrl } from "./api";

export interface UsageSnapshot {
  plan: string;
  limit: number;
  used: number;
  remaining: number;
  maxFileSizeMb: number;
  creditBalance?: number;
}

const STORAGE_PREFIX = "pg_usage_";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function loadStoredUsage(): UsageSnapshot | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${todayKey()}`);
    if (!raw) return null;
    return JSON.parse(raw) as UsageSnapshot;
  } catch {
    return null;
  }
}

export function saveStoredUsage(snapshot: UsageSnapshot) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${todayKey()}`, JSON.stringify(snapshot));
  } catch {
    /* quota */
  }
}

export function mergeUsage(a: UsageSnapshot | null, b: UsageSnapshot | null): UsageSnapshot | null {
  if (!a) return b;
  if (!b) return a;
  const limit = Math.max(a.limit, b.limit);
  const used = Math.max(a.used, b.used);
  return {
    plan: b.plan || a.plan,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    maxFileSizeMb: b.maxFileSizeMb || a.maxFileSizeMb,
    creditBalance: Math.max(a.creditBalance ?? 0, b.creditBalance ?? 0),
  };
}

export function parseUsageHeaders(res: Response): UsageSnapshot | null {
  const used = res.headers.get("X-Usage-Used");
  const limit = res.headers.get("X-Usage-Limit");
  const remaining = res.headers.get("X-Usage-Remaining");
  const plan = res.headers.get("X-Usage-Plan");
  if (used == null || limit == null || remaining == null) return null;

  const remainingNum = Number(remaining);
  const planId = plan || "free";
  return {
    plan: planId,
    limit: Number(limit),
    used: Number(used),
    remaining: remainingNum,
    maxFileSizeMb: 100,
    creditBalance: planId === "package" ? remainingNum : 0,
  };
}

export async function fetchUsage(): Promise<UsageSnapshot> {
  const res = await fetch(apiUrl("/api/usage"), { credentials: "include" });
  const fromHeaders = parseUsageHeaders(res);
  const data = (await res.json().catch(() => ({}))) as UsageSnapshot & { error?: string };
  if (!res.ok) throw new Error(data.error || "Could not load usage");
  return mergeUsage(fromHeaders, data) || data;
}
