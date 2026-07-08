import type { DashboardData } from "../../utils/dashboardApi";

interface DashboardAccountSummaryProps {
  dashboard: DashboardData;
  memberSince: string;
  email: string;
  authProvider: "email" | "google";
}

function formatLastActive(iso: string | null) {
  if (!iso) return "Never";
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function DashboardAccountSummary({
  dashboard,
  memberSince,
  email,
  authProvider,
}: DashboardAccountSummaryProps) {
  const { stats, lastActivityAt, supportMessages } = dashboard;

  const items = [
    { label: "Total conversions", value: stats.totalConversions.toLocaleString(), accent: "text-emerald-500" },
    { label: "This month", value: stats.thisMonth.toLocaleString(), accent: "" },
    { label: "OCR jobs", value: stats.ocrJobs.toLocaleString(), accent: "" },
    { label: "Support messages", value: supportMessages.toLocaleString(), accent: "" },
  ];

  return (
    <section className="cc-dash-card p-6">
      <h2 className="mb-4 text-sm font-medium text-[rgb(var(--foreground))]">Account overview</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background)/0.5)] px-4 py-3">
            <p className="text-xs text-[rgb(var(--muted))]">{item.label}</p>
            <p className={`mt-1 text-2xl font-semibold tabular-nums ${item.accent}`}>{item.value}</p>
          </div>
        ))}
      </div>
      <dl className="mt-6 grid gap-3 border-t border-[rgb(var(--border))] pt-6 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-[rgb(var(--muted))]">Email</dt>
          <dd className="mt-0.5 truncate font-medium">{email}</dd>
        </div>
        <div>
          <dt className="text-[rgb(var(--muted))]">Sign-in</dt>
          <dd className="mt-0.5 font-medium">{authProvider === "google" ? "Google" : "Email & password"}</dd>
        </div>
        <div>
          <dt className="text-[rgb(var(--muted))]">Member since</dt>
          <dd className="mt-0.5 font-medium">{memberSince}</dd>
        </div>
        <div>
          <dt className="text-[rgb(var(--muted))]">Last activity</dt>
          <dd className="mt-0.5 font-medium">{formatLastActive(lastActivityAt)}</dd>
        </div>
      </dl>
    </section>
  );
}
