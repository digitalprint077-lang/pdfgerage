import { useCallback, useEffect, useState } from "react";
import { fetchUsage, type UsageSnapshot } from "../utils/usageApi";

export type UsageBlockVariant = "daily" | "no_credits";

export function useUsageSnapshot() {
  const [usage, setUsage] = useState<UsageSnapshot | null>(null);

  const refresh = useCallback(async () => {
    try {
      setUsage(await fetchUsage());
    } catch {
      /* usage banner is optional */
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isBlocked = usage !== null && usage.remaining <= 0;
  const blockVariant: UsageBlockVariant =
    usage?.plan === "package" && (usage.creditBalance ?? 0) <= 0 ? "no_credits" : "daily";

  const applyUsageResponse = useCallback((snapshot?: UsageSnapshot, code?: string) => {
    if (snapshot) setUsage(snapshot);
    if (code === "NO_CREDITS") {
      setUsage((prev) =>
        prev
          ? { ...prev, remaining: 0, creditBalance: 0, plan: "package" }
          : { plan: "package", limit: 0, used: 0, remaining: 0, maxFileSizeMb: 100, creditBalance: 0 }
      );
    }
    if (code === "DAILY_LIMIT") {
      setUsage((prev) =>
        prev
          ? { ...prev, remaining: 0, used: prev.limit }
          : { plan: "free", limit: 15, used: 15, remaining: 0, maxFileSizeMb: 100, creditBalance: 0 }
      );
    }
  }, []);

  return {
    usage,
    refresh,
    isBlocked,
    blockVariant,
    limit: usage?.limit ?? 15,
    applyUsageResponse,
  };
}
