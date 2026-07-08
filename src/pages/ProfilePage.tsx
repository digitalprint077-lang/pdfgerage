import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import SitePageShell from "../components/SitePageShell";
import RequireAuth from "../components/RequireAuth";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../i18n/I18nContext";
import {
  activityExportUrl,
  changePassword,
  fetchDashboard,
  type DashboardActivity,
  type DashboardData,
} from "../utils/dashboardApi";

import DashboardShell, { type DashboardSection } from "../components/dashboard/DashboardShell";
import DashboardHome, { type ChartGranularity, type ChartRange } from "../components/dashboard/DashboardHome";
import AccountNotifications from "../components/dashboard/AccountNotifications";
import AccountInvoices from "../components/dashboard/AccountInvoices";
import AccountDelete from "../components/dashboard/AccountDelete";

type Tab = DashboardSection;


function formatDateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function operationLabel(op: string) {
  const labels: Record<string, string> = {
    convert: "Convert",
    merge: "Merge PDF",
    compress: "Compress",
    extract: "Extract",
    "create-archive": "Create ZIP",
    ocr: "OCR",
    translate: "Translate",
  };
  return labels[op] || op;
}

const inputClass = "input-modern";

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function UsageBar({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span className="text-[rgb(var(--muted))]">
          {used} / {limit}
        </span>
        <span className="text-[rgb(var(--muted))]">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[rgb(var(--border)/0.5)]">
        <div
          className={`h-full rounded-full transition-all ${pct >= 90 ? "bg-amber-500" : "bg-brand"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ActivityTable({
  rows,
  t,
  onExport,
}: {
  rows: DashboardActivity[];
  t: (k: import("../i18n/translations").TranslationKey) => string;
  onExport: () => void;
}) {
  if (!rows.length) {
    return (
      <div className="cc-dash-card border-dashed py-12 text-center">
        <p className="font-medium text-[rgb(var(--muted))]">{t("dashNoActivity")}</p>
        <p className="mt-2 text-sm text-[rgb(var(--muted))]">{t("dashNoActivityHint")}</p>
        <Link to="/" className="mt-4 inline-block text-sm text-brand hover:underline">
          {t("profileStartConverting")} →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[rgb(var(--muted))]">{rows.length} entries</p>
        <button type="button" onClick={onExport} className="btn-secondary py-2 text-sm">
          Export CSV
        </button>
      </div>
      <div className="cc-dash-card overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-[rgb(var(--border))] bg-[rgb(var(--card-hover)/0.5)] text-xs uppercase tracking-wide text-[rgb(var(--muted))]">
          <tr>
            <th className="px-4 py-3 font-medium">{t("dashFile")}</th>
            <th className="px-4 py-3 font-medium">{t("dashOperation")}</th>
            <th className="px-4 py-3 font-medium">{t("dashFormat")}</th>
            <th className="px-4 py-3 font-medium">{t("dashDate")}</th>
            <th className="px-4 py-3 font-medium">{t("dashStatus")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[rgb(var(--border)/0.5)]">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-[rgb(var(--card-hover)/0.5)]">
              <td className="max-w-[200px] truncate px-4 py-3" title={row.fileName}>
                {row.fileName || "—"}
              </td>
              <td className="px-4 py-3 text-[rgb(var(--muted))]">{operationLabel(row.operation)}</td>
              <td className="px-4 py-3 text-[rgb(var(--muted))]">
                {row.fromFormat && row.toFormat
                  ? `${row.fromFormat.toUpperCase()} → ${row.toFormat.toUpperCase()}`
                  : row.toFormat?.toUpperCase() || "—"}
              </td>
              <td className="px-4 py-3 text-[rgb(var(--muted))]">{formatDateTime(row.createdAt)}</td>
              <td className="px-4 py-3">
                {row.status === "success" ? (
                  <span className="inline-flex rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                    {t("dashSuccess")}
                  </span>
                ) : (
                  <span className="inline-flex rounded-md bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
                    Failed
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function ProfileDashboard() {
  const { t } = useI18n();
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [chartRange, setChartRange] = useState<ChartRange>("24h");
  const [chartGranularity, setChartGranularity] = useState<ChartGranularity>("hourly");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [dashError, setDashError] = useState<string | null>(null);
  const [purchaseNotice, setPurchaseNotice] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    document.title = `${t("profile")} — PDF Gerage`;
    return () => {
      document.title = "PDF Gerage";
    };
  }, [t]);

  useEffect(() => {
    if (user) setName(user.name);
  }, [user]);

  useEffect(() => {
    const urlTab = searchParams.get("tab");
    const mapped =
      urlTab === "overview" ? "dashboard" : urlTab;
    if (
      mapped === "dashboard" ||
      mapped === "profile" ||
      mapped === "plan" ||
      mapped === "activity" ||
      mapped === "security" ||
      mapped === "notifications" ||
      mapped === "invoices" ||
      mapped === "delete"
    ) {
      setTab(mapped);
    }
    if (searchParams.get("purchase") === "success") {
      setTab("plan");
      setPurchaseNotice("Payment successful — your credits have been added to your account.");
      setSearchParams({}, { replace: true });
      fetchDashboard()
        .then((data) => {
          setDashboard(data);
          setDashError(null);
        })
        .catch(() => {});
    }
  }, [searchParams, setSearchParams]);

  const loadDashboard = (range = chartRange, granularity = chartGranularity) =>
    fetchDashboard({ range, granularity });

  useEffect(() => {
    let cancelled = false;
    setDashLoading(true);
    loadDashboard()
      .then((data) => {
        if (!cancelled) {
          setDashboard(data);
          setDashError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setDashError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setDashLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, chartRange, chartGranularity]);

  if (!user) return null;

  const displayName = user.name || user.email.split("@")[0];

  const sectionTitle: Record<Tab, string> = {
    dashboard: "Dashboard",
    profile: "Profile",
    activity: "Activity Logs",
    security: "Security",
    notifications: "Notifications",
    delete: "Delete Account",
    plan: "Plan",
    invoices: "Invoices",
  };

  const exportActivity = () => {
    window.open(activityExportUrl(), "_blank", "noopener,noreferrer");
  };

  const handleSectionChange = (section: Tab) => {
    setTab(section);
    setSearchParams(section === "dashboard" ? {} : { tab: section }, { replace: true });
  };

  const refreshDashboard = () => {
    setDashLoading(true);
    loadDashboard()
      .then((data) => {
        setDashboard(data);
        setDashError(null);
      })
      .catch((err) => setDashError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setDashLoading(false));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveMessage(null);
    setSaving(true);
    try {
      await updateProfile(name.trim());
      setSaveMessage(t("profileSaved"));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t("profileSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);
    setPasswordSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordMessage(t("dashPasswordUpdated"));
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : t("dashPasswordFailed"));
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/");
    }
  };

  return (
    <SitePageShell bare>
      <DashboardShell
        section={tab}
        onSectionChange={handleSectionChange}
        title={sectionTitle[tab]}
        topRight={
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-[rgb(var(--muted))] sm:inline">{user.email}</span>
            <button type="button" onClick={handleLogout} className="btn-secondary py-2 text-sm">
              {t("logout")}
            </button>
          </div>
        }
      >
        {dashLoading && !dashboard ? (
          <p className="py-16 text-center text-[rgb(var(--muted))]">{t("dashLoading")}</p>
        ) : (
          <>
            {dashError ? (
              <p className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                {dashError}. Restart the dev server if you just updated the app.
              </p>
            ) : null}

            {dashboard ? (
              <>
                {tab === "dashboard" && (
                  <DashboardHome
                    dashboard={dashboard}
                    range={chartRange}
                    granularity={chartGranularity}
                    onRangeChange={setChartRange}
                    onGranularityChange={setChartGranularity}
                    onRefresh={refreshDashboard}
                    refreshing={dashLoading}
                    memberSince={formatDate(user.createdAt)}
                    email={user.email}
                    authProvider={dashboard.security.authProvider}
                  />
                )}

                {tab === "profile" && (
                  <div className="mx-auto max-w-2xl space-y-6">
                    <section className="cc-dash-card p-6">
                      <h2 className="mb-1 text-lg font-semibold">{t("profileDetails")}</h2>
                      <p className="mb-6 text-sm text-[rgb(var(--muted))]">
                        {t("profileWelcome")} {displayName}
                      </p>
                      <dl className="mb-6 space-y-3 border-b border-[rgb(var(--border))] pb-6 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-[rgb(var(--muted))]">{t("memberSince")}</dt>
                          <dd>{formatDate(user.createdAt)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-[rgb(var(--muted))]">{t("profileSignInMethod")}</dt>
                          <dd>
                            {user.authProvider === "google" ? t("profileGoogleAccount") : t("profileEmailAccount")}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-[rgb(var(--muted))]">{t("profileUserId")}</dt>
                          <dd className="font-mono text-xs text-[rgb(var(--muted))]">#{user.id}</dd>
                        </div>
                      </dl>
                      <form onSubmit={handleSave} className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label htmlFor="profile-name" className="mb-1.5 block text-sm font-medium text-[rgb(var(--muted))]">
                              {t("name")}
                            </label>
                            <input
                              id="profile-name"
                              type="text"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              maxLength={80}
                              className={inputClass}
                              placeholder={t("profileNamePlaceholder")}
                            />
                          </div>
                          <div>
                            <label htmlFor="profile-email" className="mb-1.5 block text-sm font-medium text-[rgb(var(--muted))]">
                              {t("email")}
                            </label>
                            <input
                              id="profile-email"
                              type="email"
                              value={user.email}
                              readOnly
                              className={`${inputClass} cursor-not-allowed opacity-70`}
                            />
                          </div>
                        </div>
                        {saveError ? (
                          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{saveError}</p>
                        ) : null}
                        {saveMessage ? (
                          <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">{saveMessage}</p>
                        ) : null}
                        <button
                          type="submit"
                          disabled={saving}
                          className="btn-primary disabled:opacity-50"
                        >
                          {saving ? t("working") : t("profileSaveChanges")}
                        </button>
                      </form>
                    </section>
                  </div>
                )}

                {tab === "activity" && (
                  <section>
                    <ActivityTable rows={dashboard.recentActivity} t={t} onExport={exportActivity} />
                  </section>
                )}

                {tab === "notifications" && <AccountNotifications initial={dashboard.settings} />}

                {tab === "invoices" && <AccountInvoices />}

                {tab === "delete" && (
                  <AccountDelete email={user.email} hasPassword={dashboard.security.hasPassword} />
                )}

                {tab === "security" && (
                <div className="space-y-6">
                  <section className="cc-dash-card p-6">
                    <h2 className="mb-4 text-lg font-semibold">{t("dashAccountStatus")}</h2>
                    <ul className="space-y-3 text-sm">
                      <li className="flex items-center justify-between rounded-lg border border-[rgb(var(--border))] px-4 py-3">
                        <span className="text-[rgb(var(--muted))]">{t("profileSignInMethod")}</span>
                        <span className="font-medium text-[rgb(var(--foreground))]">
                          {dashboard.security.authProvider === "google"
                            ? t("profileGoogleAccount")
                            : t("profileEmailAccount")}
                        </span>
                      </li>
                      <li className="flex items-center justify-between rounded-lg border border-[rgb(var(--border))] px-4 py-3">
                        <span className="text-[rgb(var(--muted))]">{t("dashEmailVerified")}</span>
                        <span className="font-medium text-emerald-400">✓</span>
                      </li>
                      {dashboard.security.googleConnected ? (
                        <li className="flex items-center justify-between rounded-lg border border-[rgb(var(--border))] px-4 py-3">
                          <span className="text-[rgb(var(--muted))]">{t("dashGoogleConnected")}</span>
                          <span className="font-medium text-emerald-400">✓</span>
                        </li>
                      ) : null}
                      <li className="flex items-center justify-between rounded-lg border border-[rgb(var(--border))] px-4 py-3">
                        <span className="text-[rgb(var(--muted))]">{t("memberSince")}</span>
                        <span className="text-[rgb(var(--foreground))]">{formatDate(user.createdAt)}</span>
                      </li>
                    </ul>
                  </section>

                  {dashboard.security.hasPassword ? (
                    <section className="cc-dash-card p-6">
                      <h2 className="mb-4 text-lg font-semibold">{t("dashChangePassword")}</h2>
                      <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
                        <div>
                          <label htmlFor="current-pw" className="mb-1.5 block text-sm font-medium text-[rgb(var(--muted))]">
                            {t("dashCurrentPassword")}
                          </label>
                          <input
                            id="current-pw"
                            type="password"
                            autoComplete="current-password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label htmlFor="new-pw" className="mb-1.5 block text-sm font-medium text-[rgb(var(--muted))]">
                            {t("dashNewPassword")}
                          </label>
                          <input
                            id="new-pw"
                            type="password"
                            autoComplete="new-password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            minLength={8}
                            className={inputClass}
                          />
                          <p className="mt-1 text-xs text-[rgb(var(--muted))]">{t("passwordHint")}</p>
                        </div>
                        {passwordError ? (
                          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{passwordError}</p>
                        ) : null}
                        {passwordMessage ? (
                          <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
                            {passwordMessage}
                          </p>
                        ) : null}
                        <button
                          type="submit"
                          disabled={passwordSaving}
                          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-50"
                        >
                          {passwordSaving ? t("working") : t("dashChangePassword")}
                        </button>
                      </form>
                    </section>
                  ) : null}

                  <section className="cc-dash-card p-6">
                    <h2 className="mb-2 text-lg font-semibold">{t("profilePrivacyNote")}</h2>
                    <p className="mb-4 text-sm leading-relaxed text-[rgb(var(--muted))]">{t("profilePrivacyDesc")}</p>
                    <Link to="/security" className="text-sm text-brand hover:underline">
                      {t("profileSecurityInfo")} →
                    </Link>
                  </section>
                </div>
              )}

              {tab === "plan" && (
                <div className="space-y-6">
                  {purchaseNotice ? (
                    <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-300">
                      {purchaseNotice}
                    </div>
                  ) : null}
                  <section className="rounded-xl border border-brand/20 bg-brand/5 p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-brand">{t("dashCurrentPlan")}</p>
                        <h2 className="mt-1 text-2xl font-bold">{dashboard.plan.name}</h2>
                        <p className="mt-2 text-sm text-[rgb(var(--muted))]">
                          {dashboard.plan.creditBalance && dashboard.plan.creditBalance > 0
                            ? `${dashboard.plan.creditBalance.toLocaleString()} conversion credits — never expire`
                            : t("dashPlanDesc")}
                        </p>
                      </div>
                      <Link
                        to="/pricing"
                        className="self-start rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
                      >
                        View plans
                      </Link>
                    </div>
                  </section>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <section className="cc-dash-card p-6">
                      <h3 className="mb-4 font-semibold">
                        {dashboard.plan.creditBalance && dashboard.plan.creditBalance > 0
                          ? "Credit balance"
                          : t("dashUsageToday")}
                      </h3>
                      {dashboard.plan.creditBalance && dashboard.plan.creditBalance > 0 ? (
                        <p className="text-3xl font-bold tabular-nums text-brand">
                          {dashboard.plan.creditBalance.toLocaleString()}
                          <span className="ml-2 text-base font-normal text-[rgb(var(--muted))]">credits left</span>
                        </p>
                      ) : (
                        <UsageBar used={dashboard.plan.usedToday} limit={dashboard.plan.dailyLimit} />
                      )}
                      <ul className="mt-4 space-y-2 text-sm text-[rgb(var(--muted))]">
                        {dashboard.plan.creditBalance && dashboard.plan.creditBalance > 0 ? (
                          <li className="flex justify-between">
                            <span>Plan type</span>
                            <span className="text-[rgb(var(--foreground))]">Package</span>
                          </li>
                        ) : (
                          <>
                            <li className="flex justify-between">
                              <span>{t("dashDailyLimit")}</span>
                              <span className="text-[rgb(var(--foreground))]">{dashboard.plan.dailyLimit}</span>
                            </li>
                            <li className="flex justify-between">
                              <span>{t("dashRemaining")}</span>
                              <span className="text-[rgb(var(--foreground))]">{dashboard.plan.remainingToday}</span>
                            </li>
                          </>
                        )}
                        <li className="flex justify-between">
                          <span>{t("dashMaxFileSize")}</span>
                          <span className="text-[rgb(var(--foreground))]">{dashboard.plan.maxFileSizeMb} MB</span>
                        </li>
                      </ul>
                    </section>

                    <section className="cc-dash-card p-6">
                      <h3 className="mb-4 font-semibold">{t("dashBreakdown")}</h3>
                      {dashboard.operationBreakdown.length ? (
                        <ul className="space-y-3">
                          {dashboard.operationBreakdown.map((item) => (
                            <li key={item.operation} className="flex items-center justify-between text-sm">
                              <span className="text-[rgb(var(--muted))]">{operationLabel(item.operation)}</span>
                              <span className="font-medium tabular-nums text-[rgb(var(--foreground))]">{item.count}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-[rgb(var(--muted))]">{t("dashNoActivityHint")}</p>
                      )}
                    </section>
                  </div>

                  <section className="cc-dash-card p-6">
                    <h3 className="mb-3 font-semibold">{t("profileQuickActions")}</h3>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Link
                        to="/"
                        className="modern-card-hover px-4 py-3 text-center text-sm"
                      >
                        {t("profileStartConverting")}
                      </Link>
                      <Link
                        to="/contact"
                        className="modern-card-hover px-4 py-3 text-center text-sm"
                      >
                        {t("profileContactSupport")}
                      </Link>
                      <Link
                        to="/privacy"
                        className="modern-card-hover px-4 py-3 text-center text-sm"
                      >
                        Privacy
                      </Link>
                    </div>
                  </section>
                </div>
              )}
              </>
            ) : !dashLoading ? (
              <section className="cc-dash-card p-6">
                <h2 className="mb-4 text-lg font-semibold">{t("profileAccount")}</h2>
                <p className="mb-4 text-sm text-[rgb(var(--muted))]">
                  Dashboard stats are unavailable. Your account is still active — edit your profile below.
                </p>
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="profile-name-fallback" className="mb-1.5 block text-sm font-medium text-[rgb(var(--muted))]">
                        {t("name")}
                      </label>
                      <input
                        id="profile-name-fallback"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={80}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="profile-email-fallback" className="mb-1.5 block text-sm font-medium text-[rgb(var(--muted))]">
                        {t("email")}
                      </label>
                      <input
                        id="profile-email-fallback"
                        type="email"
                        value={user.email}
                        readOnly
                        className={`${inputClass} cursor-not-allowed opacity-70`}
                      />
                    </div>
                  </div>
                  {saveError ? (
                    <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{saveError}</p>
                  ) : null}
                  {saveMessage ? (
                    <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">{saveMessage}</p>
                  ) : null}
                  <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
                    {saving ? t("working") : t("profileSaveChanges")}
                  </button>
                </form>
              </section>
            ) : null}
          </>
        )}
      </DashboardShell>
    </SitePageShell>
  );
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileDashboard />
    </RequireAuth>
  );
}
