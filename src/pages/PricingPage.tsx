import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SitePageShell from "../components/SitePageShell";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../i18n/I18nContext";
import CreditsCalculatorModal from "../components/CreditsCalculatorModal";
import {
  CREDIT_ROWS,
  CREDIT_TYPE_ROWS,
  FEATURE_ROWS,
  PLAN_COLUMNS,
  PRICING_FAQ,
  VOLUME_CREDIT_TIERS,
  formatCredits,
  packagePriceForCredits,
  subscriptionPriceForCredits,
  type CellValue,
  type PlanColumn,
  type PlanId,
} from "../data/pricing";

function RedCheck() {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand">
      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
      </svg>
    </span>
  );
}

function InfoHint({ text }: { text: string }) {
  return (
    <span className="group relative ml-1 inline-flex cursor-help align-middle">
      <span className="flex h-4 w-4 items-center justify-center rounded-full border border-gray-600 text-[10px] text-gray-500">
        i
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden w-44 -translate-x-1/2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2 py-1.5 text-xs text-[rgb(var(--foreground))] shadow-lg group-hover:block">
        {text}
      </span>
    </span>
  );
}

function VolumeSlider({
  value,
  onChange,
  compact = false,
}: {
  value: number;
  onChange: (v: number) => void;
  compact?: boolean;
}) {
  const max = VOLUME_CREDIT_TIERS.length - 1;
  const pct = max > 0 ? (value / max) * 100 : 0;

  return (
    <div className={compact ? "relative pt-1" : "relative pt-2"}>
      <div className={`relative rounded-full bg-[rgb(var(--border)/0.5)] ${compact ? "h-1.5" : "h-2"}`}>
        <div className="absolute h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
      </div>
      <input
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        aria-label="Select credit volume"
      />
      <div
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-full bg-brand shadow transition-all ${
          compact ? "h-3.5 w-3.5" : "h-4 w-4"
        }`}
        style={{ left: `calc(${pct}% - ${compact ? 7 : 8}px)` }}
      />
      {!compact ? (
        <div className="mt-3 flex justify-between text-xs text-[rgb(var(--muted))]">
          <span>500</span>
          <span>1,000,000</span>
        </div>
      ) : null}
    </div>
  );
}

function CellContent({
  value,
  volumeIndex,
  onVolumeChange,
  subscriptionCredits,
}: {
  value: CellValue;
  volumeIndex: number;
  onVolumeChange: (v: number) => void;
  subscriptionCredits: number;
}) {
  const credits = VOLUME_CREDIT_TIERS[volumeIndex];

  if (value === "slider-package") {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">{formatCredits(credits)}</p>
        <VolumeSlider value={volumeIndex} onChange={onVolumeChange} compact />
      </div>
    );
  }
  if (value === "slider-subscription") {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">min. {formatCredits(subscriptionCredits)}</p>
        <VolumeSlider
          value={Math.max(1, volumeIndex)}
          onChange={(v) => onVolumeChange(Math.max(1, v))}
          compact
        />
      </div>
    );
  }
  if (value === true) return <RedCheck />;
  if (value === false || value === "dash") return <span className="text-[rgb(var(--muted))]">—</span>;
  return <span className="text-sm">{value}</span>;
}

function PlanButton({ plan, user }: { plan: PlanColumn; user: boolean }) {
  const href = user && plan.id === "free" ? "/profile" : plan.ctaHref;
  const label = user && plan.id === "free" ? "Current plan" : plan.cta;

  const className =
    plan.ctaVariant === "primary"
      ? "btn-primary w-full rounded-xl py-2.5"
      : plan.ctaVariant === "light"
        ? "btn-secondary w-full rounded-xl py-2.5"
        : "btn-secondary w-full rounded-xl border-brand/30 py-2.5 text-brand hover:bg-brand/5";

  return (
    <Link
      to={href}
      className={`block text-center text-sm font-semibold transition ${className}`}
    >
      {label}
    </Link>
  );
}

function CreditsExplainerSection() {
  const [calculatorOpen, setCalculatorOpen] = useState(false);

  return (
    <>
      <section className="mt-16 grid gap-10 lg:grid-cols-[1fr_380px] lg:items-start">
        <div>
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">What are conversion credits?</h2>
          <div className="mt-6 space-y-4 text-sm leading-relaxed text-[rgb(var(--muted))] md:text-base">
            <p>
              The longer a conversion takes, the more resources it consumes and the more expensive it
              becomes. Our packages and subscriptions typically consume{" "}
              <strong className="font-semibold text-[rgb(var(--foreground))]">
                one credit per minute of conversion time.
              </strong>
            </p>
            <p>
              Depending on the conversion type, each conversion also has{" "}
              <strong className="font-semibold text-[rgb(var(--foreground))]">a base credit cost</strong>.
              By default, conversions consume{" "}
              <strong className="font-semibold text-[rgb(var(--foreground))]">at least one credit</strong>,
              with additional credits charged for every extra minute if the conversion takes longer than
              one minute. We also offer a few{" "}
              <strong className="font-semibold text-[rgb(var(--foreground))]">premium conversion types</strong>{" "}
              that require more resources and therefore have a higher minimum base cost. Of course, only
              successful conversions are charged.
            </p>
          </div>
        </div>

        <div className="modern-card overflow-hidden">
          <div className="grid grid-cols-2 border-b border-[rgb(var(--border))] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
            <span>Conversion type</span>
            <span className="text-right">Base credits</span>
          </div>
          <ul>
            {CREDIT_TYPE_ROWS.map((row) => (
              <li
                key={row.type}
                className="grid grid-cols-2 border-b border-[rgb(var(--border)/0.5)] px-5 py-3.5 last:border-b-0"
              >
                <span className="text-sm">{row.type}</span>
                <span className="text-right text-sm font-semibold tabular-nums text-brand">
                  {row.baseCredits}
                </span>
              </li>
            ))}
          </ul>
          <div className="border-t border-[rgb(var(--border))] p-4">
            <button
              type="button"
              onClick={() => setCalculatorOpen(true)}
              className="btn-secondary flex w-full items-center justify-center gap-2 py-2.5 text-sm"
            >
              <svg className="h-4 w-4 text-[rgb(var(--muted))]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              Credits calculator
            </button>
          </div>
        </div>
      </section>

      <CreditsCalculatorModal open={calculatorOpen} onClose={() => setCalculatorOpen(false)} />
    </>
  );
}

function getHeaderPrice(
  planId: PlanId,
  volumeIndex: number,
  packagePrice: number,
  subscriptionPrice: number | null
): string {
  if (planId === "free") return "$0";
  if (planId === "enterprise") return "Custom";
  if (planId === "package") return `$${packagePrice}`;
  if (planId === "subscription") return subscriptionPrice !== null ? `$${subscriptionPrice}` : "...";
  return "";
}

export default function PricingPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [volumeIndex, setVolumeIndex] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const credits = VOLUME_CREDIT_TIERS[volumeIndex];
  const packagePrice = packagePriceForCredits(credits);
  const subscriptionCredits = Math.max(1000, credits);
  const subscriptionPrice =
    volumeIndex >= 1 ? subscriptionPriceForCredits(subscriptionCredits) : null;

  const allRows = useMemo(() => [...CREDIT_ROWS, ...FEATURE_ROWS], []);

  useEffect(() => {
    document.title = `${t("pricing")} — PDF Gerage`;
    return () => {
      document.title = "PDF Gerage";
    };
  }, [t]);

  return (
    <SitePageShell>
      <div className="mx-auto max-w-7xl px-4 py-10 md:py-14">
        {/* Hero — title left, volume card right */}
        <header className="mb-12 grid gap-10 lg:grid-cols-[1fr_340px] lg:items-start">
          <div>
            <Link
              to="/"
              className="mb-6 inline-flex items-center gap-1 text-sm text-[rgb(var(--muted))] transition hover:text-brand"
            >
              ← {t("backToHome")}
            </Link>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">Pricing</h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-[rgb(var(--muted))] md:text-lg">
              Pay only for what you need. Use the slider to choose the number of conversion credits you want, and
              see prices update instantly.
            </p>
          </div>

          <div className="modern-card p-6 shadow-glow-sm">
            <p className="section-eyebrow">Select your volume</p>
            <p className="mt-3 text-3xl font-bold tabular-nums">
              {formatCredits(credits)}{" "}
              <span className="text-lg font-normal text-[rgb(var(--muted))]">credits</span>
            </p>
            <div className="mt-6">
              <VolumeSlider value={volumeIndex} onChange={setVolumeIndex} />
            </div>
            <p className="mt-5 text-sm text-[rgb(var(--muted))]">
              Packages from <span className="font-semibold text-[rgb(var(--foreground))]">${packagePrice}</span>
            </p>
          </div>
        </header>

        {/* Comparison table */}
        <div className="modern-card overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Plan headers */}
            <div className="grid grid-cols-[200px_repeat(4,1fr)] border-b border-[rgb(var(--border))]">
              <div className="border-r border-[rgb(var(--border))] p-6" />
              {PLAN_COLUMNS.map((plan) => (
                <div
                  key={plan.id}
                  className={`border-r border-[rgb(var(--border))] p-6 last:border-r-0 ${
                    plan.id === "package" ? "bg-brand/5" : ""
                  }`}
                >
                  <h2 className="text-lg font-bold">{plan.name}</h2>
                  <p className="mt-2 min-h-[40px] text-xs leading-relaxed text-[rgb(var(--muted))]">
                    {plan.description}
                  </p>
                  <p className="mt-4 text-3xl font-bold tabular-nums">
                    {plan.priceDisplay === "slider"
                      ? getHeaderPrice(plan.id, volumeIndex, packagePrice, subscriptionPrice)
                      : plan.priceDisplay === "custom"
                        ? "Custom"
                        : plan.priceDisplay}
                    {plan.id === "subscription" && subscriptionPrice !== null ? (
                      <span className="text-base font-normal text-[rgb(var(--muted))]"> /mo</span>
                    ) : null}
                  </p>
                  <div className="mt-5">
                    <PlanButton plan={plan} user={!!user} />
                  </div>
                </div>
              ))}
            </div>

            {/* Rows */}
            {allRows.map((row, rowIndex) => {
              if (row.isSection) {
                return (
                  <div
                    key={row.label}
                    className="grid grid-cols-[200px_repeat(4,1fr)] border-b border-[rgb(var(--border))] bg-[rgb(var(--card-hover)/0.5)]"
                  >
                    <div className="col-span-5 px-6 py-3 text-sm font-semibold">{row.label}</div>
                  </div>
                );
              }

              const stripe = rowIndex % 2 === 1 ? "bg-[rgb(var(--card-hover)/0.35)]" : "";

              return (
                <div
                  key={row.label}
                  className={`grid grid-cols-[200px_repeat(4,1fr)] border-b border-[rgb(var(--border))] last:border-b-0 ${stripe}`}
                >
                  <div className="flex items-center border-r border-[rgb(var(--border))] px-6 py-4 text-sm text-[rgb(var(--muted))]">
                    {row.label}
                    {row.hint ? <InfoHint text={row.hint} /> : null}
                  </div>
                  {(["free", "package", "subscription", "enterprise"] as PlanId[]).map((col) => (
                    <div
                      key={col}
                      className={`flex items-center border-r border-[rgb(var(--border))] px-6 py-4 last:border-r-0 ${
                        col === "package" ? "bg-brand/5" : ""
                      }`}
                    >
                      <CellContent
                        value={row[col]}
                        volumeIndex={volumeIndex}
                        onVolumeChange={setVolumeIndex}
                        subscriptionCredits={subscriptionCredits}
                      />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        <CreditsExplainerSection />

        {/* FAQ */}
        <section className="mx-auto mt-16 max-w-3xl">
          <h2 className="mb-6 text-center text-xl font-bold">FAQ</h2>
          <div className="space-y-2">
            {PRICING_FAQ.map((item, i) => (
              <div key={item.q} className="modern-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between px-5 py-3.5 text-left text-sm font-medium transition hover:bg-[rgb(var(--card-hover))]"
                >
                  {item.q}
                  <svg
                    className={`h-4 w-4 shrink-0 text-[rgb(var(--muted))] transition ${openFaq === i ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === i ? (
                  <div className="border-t border-[rgb(var(--border))] px-5 py-3.5 text-sm leading-relaxed text-[rgb(var(--muted))]">
                    {item.a}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </div>
    </SitePageShell>
  );
}
