import type { Metadata } from "next";
import { getTranslations, setRequestLocale, getLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { store } from "@/lib/data/store";
import { SearchBox } from "@/components/SearchBox";
import { HubCityTimes } from "@/components/hub/HubCityTimes";
import { buildAlternates } from "@/lib/seo/metadata";
import { websiteJsonLd, faqJsonLd } from "@/lib/seo/json-ld";
import { getHubFacts } from "@/lib/prayer-times/hub-facts";
import { countryDisplayName } from "@/lib/data/names";
import { formatNumber, formatDate } from "@/lib/format";
import { locales } from "@/lib/i18n/config";
import type { City } from "@/lib/data/types";
import { readRuntimeJson } from "@/lib/data/runtime-fetch";
import stats from "@/data/processed/stats.json";

/** Continents in the order they're listed, not alphabetically by code —
 * grouping is for a reader scanning for their own region. */
const CONTINENT_ORDER = ["AS", "AF", "EU", "NA", "SA", "OC", "AN"] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: buildAlternates(locale, "") };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  setRequestLocale(localeParam);
  const t = await getTranslations("home");
  const tFaq = await getTranslations("homeFaq");
  const tMeta = await getTranslations("meta");
  const tContinent = await getTranslations("continents");
  const locale = await getLocale();

  const cityCount = stats.cities;
  const countryCount = stats.countries;

  // The world's most-populous cities, with today's real times — the same
  // "say something true, not just link" principle as the hub pages.
  // Read at runtime rather than statically imported: the page needs 8
  // rows, and inlining all 1,788 cost ~496KB in the Workers bundle.
  const topCities = (await readRuntimeJson<City[]>("top-cities.json")) ?? [];
  const worldCities = topCities
    .slice()
    .sort((a, b) => b.population - a.population)
    .slice(0, 8);
  // countryCode is only used to pick a default method; these cities span
  // many countries, so each row's own country still decides its method
  // inside getHubFacts via the per-city compute.
  const facts = getHubFacts({ cities: worldCities, countryCode: "", limit: 8 });

  const byContinent = CONTINENT_ORDER.map((code) => ({
    code,
    countries: store.countries
      .filter((c) => c.continent === code)
      .sort((a, b) => a.name.localeCompare(b.name)),
  })).filter((group) => group.countries.length > 0);

  const faqItems = [
    {
      question: tFaq("coverageQuestion"),
      answer: tFaq("coverageAnswer", {
        cities: formatNumber(cityCount, locale),
        countries: formatNumber(countryCount, locale),
      }),
    },
    { question: tFaq("accuracyQuestion"), answer: tFaq("accuracyAnswer") },
    { question: tFaq("methodQuestion"), answer: tFaq("methodAnswer") },
    { question: tFaq("qiblaQuestion"), answer: tFaq("qiblaAnswer") },
  ];

  const jsonLd = [
    websiteJsonLd({
      name: tMeta("title"),
      description: tMeta("description"),
      locale,
    }),
    faqJsonLd(faqItems),
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 space-y-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="space-y-5 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          {t("heading")}
        </h1>
        <p className="mx-auto max-w-xl text-base leading-relaxed text-ink-muted">
          {t("subheading")}
        </p>
        <p className="font-mono text-xs uppercase tracking-wider text-ink-subtle tabular">
          {t("statLine", {
            cities: formatNumber(cityCount, locale),
            countries: formatNumber(countryCount, locale),
            languages: formatNumber(locales.length, locale),
          })}
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="sr-only">{t("searchLabel")}</h2>
        <SearchBox autoFocus />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight text-ink">
          {t("popularCitiesHeading")}
        </h2>
        <p className="text-sm text-ink-muted">
          {t("popularCitiesIntro", { date: formatDate(facts.date, locale) })}
        </p>
        <HubCityTimes
          namespace="countryContent"
          entries={facts.cityTimes}
          nameFor={(e) => e.city.name}
          hrefFor={(e) => {
            const country = store.countryByCode.get(e.city.countryCode);
            const state = e.city.admin1Id ? store.admin1ById.get(e.city.admin1Id) : null;
            if (!country) return "/";
            return state
              ? `/${country.slug}/${state.slug}/${e.city.slug}`
              : `/${country.slug}/${e.city.slug}`;
          }}
        />
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            {t("browseByCountry")}
          </h2>
          <p className="text-sm text-ink-muted">{t("browseIntro")}</p>
        </div>
        {/* Every country, grouped — not a "popular 24" slice. This is the
            home page's job in the internal link graph: it is the one page
            guaranteed to be crawled, so every country hub should be one
            hop from it rather than reachable only via search. */}
        <div className="space-y-6">
          {byContinent.map((group) => (
            <div key={group.code} className="space-y-2">
              <h3 className="font-mono text-xs uppercase tracking-wider text-ink-subtle">
                {tContinent(group.code)}
              </h3>
              <ul className="flex flex-wrap gap-1.5">
                {group.countries.map((c) => (
                  <li key={c.code}>
                    <Link
                      href={`/${c.slug}`}
                      className="inline-block rounded-md border border-line bg-surface px-2.5 py-1 text-sm text-ink hover:border-accent hover:text-accent-strong"
                    >
                      {countryDisplayName(c, locale)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight text-ink">
          {t("aboutHeading")}
        </h2>
        <div className="space-y-3 text-sm leading-relaxed text-ink-muted">
          <p>{t("aboutBody")}</p>
          <p>{t("aboutMethods")}</p>
          <p>{t("aboutAccuracy")}</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight text-ink">
          {t("faqHeading")}
        </h2>
        <div className="space-y-4">
          {faqItems.map((item) => (
            <div key={item.question} className="space-y-1">
              <h3 className="text-sm font-medium text-ink">{item.question}</h3>
              <p className="text-sm leading-relaxed text-ink-muted">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
