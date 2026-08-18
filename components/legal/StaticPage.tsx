import type { ReactNode } from "react";
import { getTranslations, getLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { localePath } from "@/lib/i18n/paths";
import { breadcrumbJsonLd } from "@/lib/seo/json-ld";
import { formatDate } from "@/lib/format";
import { DateTime } from "luxon";

/**
 * Shared shell for the About / Contact / Privacy / Terms / Disclaimer
 * pages — breadcrumb, title, "last updated" line, prose column.
 *
 * `lastUpdated` is a fixed ISO date passed in per page, not `new Date()`:
 * a policy page that silently claims to have been updated today, every
 * day, is telling the reader something untrue about a legal document.
 * Bump the constant in the page when the text actually changes.
 */
export async function StaticPage({
  title,
  intro,
  updatedIso,
  path,
  children,
}: {
  title: string;
  intro: string;
  updatedIso: string;
  path: string;
  children: ReactNode;
}) {
  const t = await getTranslations("pages");
  const tNav = await getTranslations("nav");
  const locale = await getLocale();

  const jsonLd = breadcrumbJsonLd([
    { name: tNav("home"), path: localePath(locale) },
    { name: title, path: localePath(locale, path) },
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 space-y-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumbs
        items={[
          { label: tNav("home"), href: "/" },
          { label: title, href: "#" },
        ]}
      />
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-ink-muted">{intro}</p>
        <p className="text-xs text-ink-subtle">
          {t("lastUpdated", { date: formatDate(DateTime.fromISO(updatedIso), locale) })}
        </p>
      </header>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

/** One titled prose block. Kept here so all five pages share one rhythm. */
export function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{heading}</h2>
      {children}
    </section>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return <p className="text-sm text-ink-muted leading-relaxed">{children}</p>;
}
