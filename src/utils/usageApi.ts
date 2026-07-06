import { apiUrl } from "./api";

export interface UsageSnapshot {
  plan: string;
  limit: number;
  used: number;
  remaining: number;
  maxFileSizeMb: number;
  creditBalance?: number;
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
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not load usage");
  return data as UsageSnapshot;
}
