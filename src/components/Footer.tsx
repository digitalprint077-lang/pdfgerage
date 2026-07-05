import { Link } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext";
import { FOOTER_LINKS } from "../data/sitePages";
import LegalLinks from "./LegalLinks";

function FooterLink({ to, label }: { to: string; label: string }) {
  return (
    <li>
      <Link to={to} className="text-sm text-[rgb(var(--muted))] transition hover:text-brand">
        {label}
      </Link>
    </li>
  );
}

export default function Footer() {
  const { t } = useI18n();
  return (
    <footer className="relative mt-auto border-t border-[rgb(var(--border)/0.5)] bg-[rgb(var(--card)/0.5)] backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="font-bold">
                PDF <span className="text-gradient">Gerage</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[rgb(var(--muted))]">{t("footerLocal")}</p>
          </div>
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[rgb(var(--foreground))]">Company</h4>
            <ul className="space-y-2.5">
              {FOOTER_LINKS.company.map((link) => (
                <FooterLink key={link.path} to={link.path} label={link.label} />
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[rgb(var(--foreground))]">Resources</h4>
            <ul className="space-y-2.5">
              {FOOTER_LINKS.resources.map((link) => (
                <FooterLink key={link.path} to={link.path} label={link.label} />
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[rgb(var(--foreground))]">Legal</h4>
            <ul className="space-y-2.5">
              {FOOTER_LINKS.legal.map((link) => (
                <FooterLink key={link.path} to={link.path} label={link.label} />
              ))}
              {FOOTER_LINKS.contact.map((link) => (
                <FooterLink key={link.path} to={link.path} label={link.label} />
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-[rgb(var(--border)/0.5)] pt-8 sm:flex-row">
          <p className="text-xs text-[rgb(var(--muted))]">© {new Date().getFullYear()} PDF Gerage</p>
          <LegalLinks className="text-[rgb(var(--muted))]" />
        </div>
      </div>
    </footer>
  );
}
