import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SitePageShell from "../components/SitePageShell";
import { loadStatusPageData, type StatusData } from "../utils/statusApi";

function CheckIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function StatusIcon({ ok, className = "h-4 w-4" }: { ok: boolean; className?: string }) {
  if (ok) {
    return (
      <span className="text-emerald-400">
        <CheckIcon className={className} />
      </span>
    );
  }
  return (
    <span className="text-red-400">
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </span>
  );
}

function OperationalBadge({ operational }: { operational: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium ${
        operational
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          : "border-red-500/30 bg-red-500/10 text-red-400"
      }`}
    >
      <CheckIcon className="h-3.5 w-3.5" />
      {operational ? "Operational" : "Degraded"}
    </span>
  );
}

function UptimeBar({ history }: { history: boolean[] }) {
  return (
    <div className="mt-3">
      <div className="flex h-8 gap-px overflow-hidden rounded-sm">
        {history.map((up, i) => (
          <div
            key={i}
            className={`min-w-0 flex-1 ${up ? "bg-emerald-500" : "bg-red-500"}`}
            title={up ? "Operational" : "Incident"}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-[rgb(var(--muted))]">
        <span>90 days ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  operational,
  open,
  onToggle,
}: {
  title: string;
  operational: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-[rgb(var(--card-hover))]"
    >
      <span className="font-semibold">{title}</span>
      <div className="flex items-center gap-3">
        <OperationalBadge operational={operational} />
        <svg
          className={`h-4 w-4 text-[rgb(var(--muted))] transition ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </button>
  );
}

function formatUpdatedAt(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function StatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [endpointsOpen, setEndpointsOpen] = useState(true);
  const [regionsOpen, setRegionsOpen] = useState(false);
  const [conversionsOpen, setConversionsOpen] = useState(false);

  useEffect(() => {
    document.title = "Status — PDF Gerage";
    return () => {
      document.title = "PDF Gerage";
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadStatusPageData()
      .then((json) => {
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Status check failed");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const allOperational = data?.overall === "operational";

  return (
    <SitePageShell>
      <div className="mx-auto max-w-2xl px-4 py-12 md:py-16">
        <Link
          to="/"
          className="mb-10 inline-flex items-center gap-1 text-sm text-[rgb(var(--muted))] transition hover:text-brand"
        >
          ← Back to PDF Gerage
        </Link>

        {loading ? (
          <p className="text-center text-[rgb(var(--muted))]">Checking services…</p>
        ) : error ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 text-red-400">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold">Services unavailable</h1>
            <p className="mt-3 text-[rgb(var(--muted))]">{error}</p>
            <p className="mt-4 text-sm text-[rgb(var(--muted))]">
              {import.meta.env.VITE_API_URL ? (
                <>Check that your API server is running and <code className="text-gray-400">VITE_API_URL</code> is set correctly on Vercel.</>
              ) : (
                <>Run <code className="text-gray-400">npm run dev</code> and refresh.</>
              )}
            </p>
          </div>
        ) : data ? (
          <>
            <header className="mb-10 text-center">
              <div
                className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full ${
                  allOperational ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"
                }`}
              >
                {allOperational ? (
                  <CheckIcon className="h-7 w-7" />
                ) : (
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )}
              </div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{data.overallLabel}</h1>
              <p className="mt-2 text-sm text-[rgb(var(--muted))]">Last updated on {formatUpdatedAt(data.updatedAt)}</p>
            </header>

            <div className="modern-card overflow-hidden">
              <div className="border-b border-[rgb(var(--border))]">
                <SectionHeader
                  title="Endpoints"
                  operational={data.endpoints.operational}
                  open={endpointsOpen}
                  onToggle={() => setEndpointsOpen((o) => !o)}
                />
                {endpointsOpen ? (
                  <div className="space-y-0 border-t border-[rgb(var(--border))] px-5 pb-5">
                    {data.endpoints.items.map((item) => (
                      <div key={item.id} className="border-b border-[rgb(var(--border)/0.5)] py-5 last:border-0">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <StatusIcon ok={item.operational} />
                            <span className="font-medium">{item.name}</span>
                          </div>
                          <span
                            className={`text-sm font-medium ${
                              item.operational ? "text-emerald-400" : "text-red-400"
                            }`}
                          >
                            {item.uptimePercent.toFixed(3)}% uptime
                          </span>
                        </div>
                        <UptimeBar history={item.history} />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="border-b border-[rgb(var(--border))]">
                <SectionHeader
                  title="Regions"
                  operational={data.regions.operational}
                  open={regionsOpen}
                  onToggle={() => setRegionsOpen((o) => !o)}
                />
                {regionsOpen ? (
                  <div className="border-t border-[rgb(var(--border))] px-5 pb-4">
                    {data.regions.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between border-b border-[rgb(var(--border)/0.5)] py-4 last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <StatusIcon ok={item.operational} />
                          <div>
                            <p className="font-medium">{item.name}</p>
                            {item.detail ? <p className="text-xs text-[rgb(var(--muted))]">{item.detail}</p> : null}
                          </div>
                        </div>
                        <OperationalBadge operational={item.operational} />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div>
                <SectionHeader
                  title="Conversions"
                  operational={data.conversions.operational}
                  open={conversionsOpen}
                  onToggle={() => setConversionsOpen((o) => !o)}
                />
                {conversionsOpen ? (
                  <div className="border-t border-[rgb(var(--border))] px-5 pb-5">
                    {data.conversions.history?.length ? (
                      <div className="border-b border-[rgb(var(--border)/0.5)] py-5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[rgb(var(--muted))]">Overall conversion uptime</span>
                          <span className="text-sm font-medium text-emerald-400">
                            {data.conversions.uptimePercent.toFixed(3)}% uptime
                          </span>
                        </div>
                        <UptimeBar history={data.conversions.history} />
                      </div>
                    ) : null}
                    {data.conversions.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between border-b border-[rgb(var(--border)/0.5)] py-4 last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <StatusIcon ok={item.operational} />
                          <div>
                            <p className="font-medium">{item.name}</p>
                            {item.detail ? <p className="text-xs text-[rgb(var(--muted))]">{item.detail}</p> : null}
                          </div>
                        </div>
                        <span
                          className={`text-xs font-medium ${
                            item.operational ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {item.operational ? "Online" : "Offline"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-[rgb(var(--muted))]">
              Status reflects the live PDF Gerage service. Uptime history is updated as checks run.
            </p>
          </>
        ) : null}
      </div>
    </SitePageShell>
  );
}
