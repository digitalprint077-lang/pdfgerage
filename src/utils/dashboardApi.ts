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
  usageChart?: {
    range: string;
    granularity: string;
    points: Array<{ label: string; success: number; failed: number; total: number }>;
    successful: number;
    failed: number;
    creditsConsumed: number;
  };
  security: {
    authProvider: "email" | "google";
    hasPassword: boolean;
    googleConnected: boolean;
  };
  settings?: UserSettings;
}

export interface UserSettings {
  notifyUsageAlerts: boolean;
  notifyProductUpdates: boolean;
  notifyBilling: boolean;
  updatedAt?: string;
}

export interface Invoice {
  orderId: string;
  planType: string;
  credits: number;
  amountUsd: number;
  currency: string;
  provider: string;
  status: string;
  createdAt: string;
}

export async function fetchDashboard(opts?: {
  range?: string;
  granularity?: string;
}): Promise<DashboardData> {
  const params = new URLSearchParams();
  if (opts?.range) params.set("range", opts.range);
  if (opts?.granularity) params.set("granularity", opts.granularity);
  const qs = params.toString();
  const res = await fetch(apiUrl(`/api/auth/dashboard${qs ? `?${qs}` : ""}`), { credentials: "include" });
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

export async function fetchSettings(): Promise<UserSettings> {
  const res = await fetch(apiUrl("/api/auth/settings"), { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not load settings");
  return data.settings as UserSettings;
}

export async function updateSettings(patch: Partial<UserSettings>): Promise<UserSettings> {
  const res = await fetch(apiUrl("/api/auth/settings"), {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not save settings");
  return data.settings as UserSettings;
}

export async function fetchInvoices(): Promise<Invoice[]> {
  const res = await fetch(apiUrl("/api/auth/invoices"), { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not load invoices");
  return data.invoices as Invoice[];
}

export function activityExportUrl(): string {
  return apiUrl("/api/auth/activity/export");
}

export async function deleteAccount(emailConfirm: string, password?: string): Promise<void> {
  const res = await fetch(apiUrl("/api/auth/account"), {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emailConfirm, password: password || "" }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not delete account");
}
