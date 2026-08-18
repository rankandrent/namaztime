import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { searchPlaces } from "@/lib/data/search";

// Query-dependent, near-duplicate content across every possible search
// term — a classic thin-content case, so it's excluded from indexing
// rather than competing with the actual city/country pages it links to.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "search" });
  return { title: t("heading"), robots: { index: false, follow: true } };
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { q = "" } = await searchParams;
  const results = await searchPlaces(q, 30);
  const t = await getTranslations("search");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">
        {q ? t("resultsFor", { query: q }) : t("heading")}
      </h1>
      {q && results.length === 0 && <p className="text-ink-muted">{t("noResults", { query: q })}</p>}
      <ul className="divide-y divide-line">
        {results.map((r) => (
          <li key={r.href}>
            <Link
              href={r.href}
              className="flex items-baseline justify-between gap-2 py-3 hover:text-accent-strong"
            >
              <span>
                {r.label}
                {r.type === "country" && (
                  <span className="ms-1.5 text-xs text-ink-subtle">{t("countryLabel")}</span>
                )}
              </span>
              <span className="text-ink-subtle text-sm shrink-0">{r.sublabel}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
