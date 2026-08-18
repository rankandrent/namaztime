import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { FOUNDED_YEAR } from "@/lib/site-config";

/**
 * Site-wide footer.
 *
 * Beyond the obvious navigation job, this is the surface AdSense
 * reviewers look for: Google's Publisher Policies expect a site to make
 * its identity, contact route and privacy practices reachable from any
 * page, and a footer is where reviewers (and visitors) expect to find
 * them. Keeping the links in the layout means every one of the ~54,000
 * pages satisfies that, not just the home page.
 *
 * The copyright year is derived from FOUNDED_YEAR rather than
 * `new Date()`: these pages are statically generated, so a "current year"
 * read at build time silently goes stale on 1 January and then claims a
 * year that hasn't been rebuilt.
 */
export async function SiteFooter() {
  const t = await getTranslations("footer");
  const tNav = await getTranslations("nav");
  const site = tNav("siteName");

  const explore = [
    { href: "/", label: t("home") },
    { href: "/search", label: t("search") },
  ];
  const about = [
    { href: "/about", label: t("about") },
    { href: "/contact", label: t("contact") },
  ];
  const legal = [
    { href: "/privacy", label: t("privacy") },
    { href: "/terms", label: t("terms") },
    { href: "/disclaimer", label: t("disclaimer") },
  ];

  const column = (heading: string, links: { href: string; label: string }[]) => (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
        {heading}
      </h2>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-sm text-ink-muted hover:text-accent-strong">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <footer className="mt-auto border-t border-line bg-surface-band">
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <p className="font-semibold">🕌 {site}</p>
            <p className="mt-2 text-sm text-ink-muted leading-relaxed">{t("tagline")}</p>
          </div>
          {column(t("exploreHeading"), explore)}
          {column(t("siteHeading"), about)}
          {column(t("legalHeading"), legal)}
        </div>

        <div className="mt-8 border-t border-line pt-6 space-y-1.5">
          <p className="text-xs text-ink-subtle">
            {t("copyright", { year: FOUNDED_YEAR, site })}
          </p>
          <p className="text-xs text-ink-subtle">
            {t.rich("dataCredit", {
              geonames: (chunks) => (
                <a
                  href="https://www.geonames.org/"
                  className="underline hover:text-accent-strong"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {chunks}
                </a>
              ),
            })}
          </p>
        </div>
      </div>
    </footer>
  );
}
