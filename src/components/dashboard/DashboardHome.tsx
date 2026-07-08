import { Link } from "react-router-dom";
import type { DashboardData } from "../../utils/dashboardApi";
import UsageLineChart from "./UsageLineChart";
import DashboardAccountSummary from "./DashboardAccountSummary";

export type ChartRange = "24h" | "month" | "year" | "all";
export type ChartGranularity = "hourly" | "daily" | "monthly";

interface DashboardHomeProps {
  dashboard: DashboardData;
  range: ChartRange;
  granularity: ChartGranularity;
  onRangeChange: (range: ChartRange) => void;
  onGranularityChange: (g: ChartGranularity) => void;
  onRefresh: () => void;
  refreshing?: boolean;
  memberSince: string;
  email: string;
  authProvider: "email" | "google";
}

const RANGE_OPTIONS: { id: ChartRange; label: string }[] = [
  { id: "24h", label: "Last 24h" },
  { id: "month", label: "Last Month" },
  { id: "year", label: "Last Year" },
  { id: "all", label: "All Time" },
];

const GRANULARITY_OPTIONS: { id: ChartGranularity; label: string }[] = [
  { id: "hourly", label: "Hourly" },
  { id: "daily", label: "Daily" },
  { id: "monthly", label: "Monthly" },
];

export default function DashboardHome({
  dashboard,
  range,
  granularity,
  onRangeChange,
  onGranularityChange,
  onRefresh,
  refreshing,
  memberSince,
  email,
  authProvider,
}: DashboardHomeProps) {
  const { plan, usageChart } = dashboard;
  const creditsRemaining =
    plan.creditBalance && plan.creditBalance > 0 ? plan.creditBalance : plan.remainingToday;
  const creditsTotal =
    plan.creditBalance && plan.creditBalance > 0 ? plan.creditBalance + (plan.usedToday || 0) : plan.dailyLimit;
  const pctRemaining = creditsTotal > 0 ? Math.min(100, Math.round((creditsRemaining / creditsTotal) * 100)) : 0;

  const rangeLabel = RANGE_OPTIONS.find((r) => r.id === range)?.label || "Last 24h";

  return (
    <div className="space-y-6">
      <DashboardAccountSummary
        dashboard={dashboard}
        memberSince={memberSince}
        email={email}
        authProvider={authProvider}
      />

      {/* Credits remaining — CloudConvert style */}
      <section className="cc-dash-card overflow-hidden p-0">
        <div className="flex items-start justify-between border-b border-[rgb(var(--border))] px-6 py-4">
          <div>
            <p className="text-5xl font-light tabular-nums text-red-500 md:text-6xl">{creditsRemaining}</p>
            <p className="mt-2 text-sm text-red-400/90">
              Conversion credits remaining.{" "}
              <Link to="/profile?tab=plan" className="underline hover:text-red-300">
                More details
              </Link>
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="rounded-lg p-2 text-[rgb(var(--muted))] transition hover:bg-[rgb(var(--card-hover))] hover:text-[rgb(var(--foreground))] disabled:opacity-50"
            title="Refresh"
            aria-label="Refresh dashboard"
          >
            <svg className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        <div className="h-1.5 bg-[rgb(var(--border)/0.4)]">
          <div className="h-full bg-red-500 transition-all" style={{ width: `${pctRemaining}%` }} />
        </div>
      </section>

      {/* Usage chart */}
      <section className="cc-dash-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-[rgb(var(--foreground))]">{rangeLabel}</h2>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="rounded p-1.5 text-[rgb(var(--muted))] hover:bg-[rgb(var(--card-hover))]"
            aria-label="Refresh chart"
          >
            <svg className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        <div className="h-[220px] w-full">
          <UsageLineChart
            points={(usageChart?.points || []).map((p) => ({ label: p.label, total: p.total }))}
          />
        </div>
      </section>

      {/* Filters + stats */}
      <section className="cc-dash-card p-6">
        <div className="flex flex-col gap-4 border-b border-[rgb(var(--border))] pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-4">
            {RANGE_OPTIONS.map((opt) => (
              <label key={opt.id} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="chart-range"
                  checked={range === opt.id}
                  onChange={() => onRangeChange(opt.id)}
                  className="accent-red-500"
                />
                <span className={range === opt.id ? "font-medium text-red-500" : "text-[rgb(var(--muted))]"}>
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-4">
            {GRANULARITY_OPTIONS.map((opt) => (
              <label key={opt.id} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="chart-granularity"
                  checked={granularity === opt.id}
                  onChange={() => onGranularityChange(opt.id)}
                  className="accent-red-500"
                />
                <span className={granularity === opt.id ? "font-medium text-red-500" : "text-[rgb(var(--muted))]"}>
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-4">
          <div>
            <p className="text-xs text-[rgb(var(--muted))]">Successful conversions</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-500">
              {usageChart?.successful ?? 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-[rgb(var(--muted))]">Failed conversions</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-red-500">{usageChart?.failed ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-[rgb(var(--muted))]">Credits consumed</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{usageChart?.creditsConsumed ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-[rgb(var(--muted))]">File size converted</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-[rgb(var(--muted))]">—</p>
          </div>
        </div>
      </section>
    </div>
  );
}
