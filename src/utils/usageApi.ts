import { apiUrl } from "./api";

export interface UsageSnapshot {
  plan: string;
  limit: number;
  used: number;
  remaining: number;
  maxFileSizeMb: number;
  creditBalance?: number;
}

export async function fetchUsage(): Promise<UsageSnapshot> {
  const res = await fetch(apiUrl("/api/usage"), { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not load usage");
  return data as UsageSnapshot;
}
