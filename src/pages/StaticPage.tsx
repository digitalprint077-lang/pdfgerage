import { useEffect } from "react";
import { Link } from "react-router-dom";
import SitePageShell from "../components/SitePageShell";
import { SITE_PAGES } from "../data/sitePages";

interface StaticPageProps {
  pageId: keyof typeof SITE_PAGES;
}

export default function StaticPage({ pageId }: StaticPageProps) {
  const page = SITE_PAGES[pageId];

  useEffect(() => {
    if (!page) return;
    document.title = `${page.title} — PDF Gerage`;
    return () => {
      document.title = "PDF Gerage";
    };
  }, [page]);

  if (!page) return null;

  return (
    <SitePageShell>
      <article className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-[rgb(var(--muted))] transition hover:text-brand"
        >
          ← Back to PDF Gerage
        </Link>
        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{page.title}</h1>
          {page.subtitle ? (
            <p className="mt-3 text-lg text-[rgb(var(--muted))]">{page.subtitle}</p>
          ) : null}
        </header>
        <div className="space-y-10">
          {page.sections.map((section, index) => (
            <section key={section.heading || `section-${index}`}>
              {section.heading ? (
                <h2 className="mb-3 text-xl font-semibold">{section.heading}</h2>
              ) : null}
              {(section.paragraphs ?? []).map((p, pIndex) => (
                <p key={pIndex} className="mb-3 leading-relaxed text-[rgb(var(--muted))]">
                  {p.includes("Contact page") ? (
                    <>
                      {p.split("Contact page")[0]}
                      <Link to="/contact" className="text-brand hover:underline">
                        Contact page
                      </Link>
                      {p.split("Contact page")[1]}
                    </>
                  ) : (
                    p
                  )}
                </p>
              ))}
              {section.bullets ? (
                <ul className="mt-2 list-disc space-y-2 pl-5 text-[rgb(var(--muted))]">
                  {section.bullets.map((item) => (
                    <li key={item} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </article>
    </SitePageShell>
  );
}
