import { apiUrl } from "./api";

export interface DashboardActivity {
  id: number;
  operation: string;
  fromFormat: string;
  toFormat: string;
  fileName: string;
  status: string;
  createdAt: string;
}

export interface DashboardData {
  stats: {
    totalConversions: number;
    thisMonth: number;
    usedToday: number;
    ocrJobs: number;
    translateJobs: number;
    mergeJobs: number;
  };
  plan: {
    name: string;
    id?: string;
    dailyLimit: number;
    usedToday: number;
    remainingToday: number;
    maxFileSizeMb: number;
    creditBalance?: number;
  };
  recentActivity: DashboardActivity[];
  operationBreakdown: Array<{ operation: string; count: number }>;
  supportMessages: number;
  lastActivityAt: string | null;
  security: {
    authProvider: "email" | "google";
    hasPassword: boolean;
    googleConnected: boolean;
  };
}

export async function fetchDashboard(): Promise<DashboardData> {
  const res = await fetch(apiUrl("/api/auth/dashboard"), { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not load dashboard");
  return data as DashboardData;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const res = await fetch(apiUrl("/api/auth/change-password"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not change password");
}
