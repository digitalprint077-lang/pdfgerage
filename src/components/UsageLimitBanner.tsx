import { Link } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext";

interface UsageLimitBannerProps {
  variant?: "daily" | "no_credits";
  limit?: number;
}

export default function UsageLimitBanner({ variant = "daily", limit = 15 }: UsageLimitBannerProps) {
  const { t } = useI18n();

  const message =
    variant === "no_credits"
      ? t("usageLimitNoCredits")
      : t("usageLimitDaily").replace("{limit}", String(limit));

  return (
    <div className="rounded-xl border border-red-500/30 bg-red-950/35 px-4 py-4 dark:bg-red-950/50 sm:px-5">
      <div className="flex gap-3">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-500 dark:text-red-400"
          aria-hidden
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-red-600 dark:text-red-400">{t("usageLimitTitle")}</p>
          <p className="mt-1 text-sm leading-relaxed text-red-700/90 dark:text-red-300/90">{message}</p>
          <Link
            to="/pricing"
            className="mt-3 inline-flex rounded-lg bg-red-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-red-500 dark:bg-red-500 dark:hover:bg-red-400"
          >
            {t("buyCredits")}
          </Link>
        </div>
      </div>
    </div>
  );
}
