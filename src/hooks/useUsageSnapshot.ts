import { useCallback, useEffect, useState } from "react";
import {
  fetchUsage,
  loadStoredUsage,
  mergeUsage,
  parseUsageHeaders,
  saveStoredUsage,
  type UsageSnapshot,
} from "../utils/usageApi";

export type UsageBlockVariant = "daily" | "no_credits";

function persistUsage(snapshot: UsageSnapshot) {
  saveStoredUsage(snapshot);
  return snapshot;
}

export function useUsageSnapshot() {
  const [usage, setUsage] = useState<UsageSnapshot | null>(() => loadStoredUsage());

  const commitUsage = useCallback((next: UsageSnapshot | null) => {
    if (!next) {
      setUsage(null);
      return null;
    }
    const merged = mergeUsage(loadStoredUsage(), next);
    if (merged) persistUsage(merged);
    setUsage(merged);
    return merged;
  }, []);

  const refresh = useCallback(async () => {
    try {
      const remote = await fetchUsage();
      commitUsage(remote);
    } catch {
      const stored = loadStoredUsage();
      if (stored) setUsage(stored);
    }
  }, [commitUsage]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isBlocked = usage !== null && usage.remaining <= 0;
  const blockVariant: UsageBlockVariant =
    usage?.plan === "package" && (usage.creditBalance ?? 0) <= 0 ? "no_credits" : "daily";

  const applyUsageResponse = useCallback(
    (snapshot?: UsageSnapshot, code?: string) => {
      if (snapshot) {
        commitUsage(snapshot);
        return;
      }
      if (code === "NO_CREDITS") {
        commitUsage({
          plan: "package",
          limit: usage?.limit ?? 0,
          used: usage?.limit ?? 0,
          remaining: 0,
          maxFileSizeMb: 100,
          creditBalance: 0,
        });
      }
      if (code === "DAILY_LIMIT") {
        const limit = usage?.limit ?? 15;
        commitUsage({
          plan: "free",
          limit,
          used: limit,
          remaining: 0,
          maxFileSizeMb: 100,
          creditBalance: 0,
        });
      }
    },
    [commitUsage, usage?.limit]
  );

  const applyUsageFromResponse = useCallback(
    (res: Response, code?: string) => {
      const fromHeaders = parseUsageHeaders(res);
      if (fromHeaders) {
        commitUsage(fromHeaders);
        return;
      }
      applyUsageResponse(undefined, code);
    },
    [applyUsageResponse, commitUsage]
  );

  return {
    usage,
    refresh,
    isBlocked,
    blockVariant,
    limit: usage?.limit ?? 15,
    applyUsageResponse,
    applyUsageFromResponse,
  };
}
