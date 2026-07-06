import { useI18n } from "../i18n/I18nContext";

export default function SecuritySection() {
  const { t } = useI18n();
  const items = [
    t("securityDesc"),
    t("filesRemovedNote"),
    "Encrypted transfer from upload to download",
  ];

  return (
    <section className="mb-12">
      <p className="section-eyebrow mb-4">{t("securityTitle")}</p>
      <div className="modern-card p-6 md:p-8">
        <ul className="space-y-4">
          {items.map((item) => (
            <li key={item} className="flex gap-3 text-sm text-[rgb(var(--muted))]">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/15">
                <svg className="h-3 w-3 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
