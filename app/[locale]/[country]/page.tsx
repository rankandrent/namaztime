import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CountryIntro, CountryCityTimesIntro } from "@/components/hub/CountryIntro";
import { HubCityTimes } from "@/components/hub/HubCityTimes";
import { Link } from "@/lib/i18n/navigation";
import { getCountryBySlug, getStatesForCountry, getTopCitiesForCountry } from "@/lib/data/queries";
import { getAllCountryParams } from "@/lib/data/static-params";
import { buildAlternates } from "@/lib/seo/metadata";
import { countryDisplayName } from "@/lib/data/names";
import { locales, type Locale } from "@/lib/i18n/config";
import { store } from "@/lib/data/store";
import { getHubFacts } from "@/lib/prayer-times/hub-facts";
import { localePath } from "@/lib/i18n/paths";
import { breadcrumbJsonLd, countryPageJsonLd } from "@/lib/seo/json-ld";

export const dynamicParams = true;
export const revalidate = 86400; // geographic hubs change rarely

export function generateStaticParams() {
  return getAllCountryParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; country: string }>;
}): Promise<Metadata> {
  const { locale, country: countrySlug } = await params;
  const country = await getCountryBySlug(countrySlug);
  if (!country) return {};
  const t = await getTranslations({ locale, namespace: "country" });
  const countryName = countryDisplayName(country, locale);
  return {
    // metaTitle/metaDescription, not the <h1> key — the title has a ~60
    // character SERP budget and a different job. See messages/en.json.
    title: t("metaTitle", { country: countryName }),
    description: t("metaDescription", { country: countryName }),
    alternates: buildAlternates(locale, `/${country.slug}`),
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export default async function CountryPage({
  params,
}: {
  params: Promise<{ locale: string; country: string }>;
}) {
  const { locale, country: countrySlug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("country");
  const tContent = await getTranslations("countryContent");
  const tNav = await getTranslations("nav");
  const tLang = await getTranslations("languages");
  const tContinent = await getTranslations("continents");

  const country = await getCountryBySlug(countrySlug);
  if (!country) notFound();

  const countryName = countryDisplayName(country, locale);
  // GeoNames stores continents as two-letter codes ("AS"); showing that
  // raw read as "Pakistan is in AS".
  const continentName = tContinent(country.continent);
  const states = getStatesForCountry(country.code);
  // Top cities only — getHubFacts uses 8 of them, and loading every
  // city in the country to do that was 565KB of JSON for China.
  const cities = await getTopCitiesForCountry(country.code);
  const facts = getHubFacts({ cities, countryCode: country.code });

  // Only languages we actually have a translated name for. GeoNames
  // lists minority codes (Pakistan has "brh") that our `languages`
  // namespace — which covers just the 17 site locales — has no entry
  // for. Membership is tested against that list rather than try/catch:
  // next-intl does not throw on a missing key, it returns the key path,
  // so a try/catch silently "succeeds" and renders `languages.brh` onto
  // the page.
  const languageNames = country.languages
    .filter((code): code is Locale => (locales as readonly string[]).includes(code))
    .map((code) => tLang(code));

  const neighbours = country.neighbours
    .map((code) => store.countryByCode.get(code))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  const sortedStates = states.slice().sort((a, b) => a.name.localeCompare(b.name));
  const basePath = `/${country.slug}`;

  const jsonLd = [
    breadcrumbJsonLd([
      { name: tNav("home"), path: localePath(locale) },
      { name: countryName, path: localePath(locale, basePath) },
    ]),
    countryPageJsonLd({
      name: t("heading", { country: countryName }),
      description: tContent("cityCount", {
        cityCount: String(cities.length),
        country: countryName,
      }),
      path: localePath(locale, basePath),
      locale,
      country,
      children: (country.hasAdmin1 ? sortedStates : cities.slice(0, 100)).map((child) => ({
        name: child.name,
        path: localePath(locale, `${basePath}/${child.slug}`),
      })),
    }),
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="space-y-4">
        <Breadcrumbs
          items={[
            { label: tNav("home"), href: "/" },
            { label: countryName, href: "#" },
          ]}
        />
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-ink">
            {t("heading", { country: countryName })}
          </h1>
          <p className="text-sm text-ink-subtle">
            {t("capitalLine", { capital: country.capital, continent: continentName })}
          </p>
        </div>
      </div>

      <CountryIntro
        country={country}
        countryName={countryName}
        continentName={continentName}
        stateCount={states.length}
        cityCount={cities.length}
        facts={facts}
        languageNames={languageNames}
      />

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight text-ink">
          {tContent("largestCitiesHeading", { country: countryName })}
        </h2>
        <CountryCityTimesIntro facts={facts} />
        <HubCityTimes
          namespace="countryContent"
          entries={facts.cityTimes}
          nameFor={(e) => e.city.name}
          hrefFor={(e) => {
            const state = e.city.admin1Id ? store.admin1ById.get(e.city.admin1Id) : null;
            return state
              ? `${basePath}/${state.slug}/${e.city.slug}`
              : `${basePath}/${e.city.slug}`;
          }}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight text-ink">
          {country.hasAdmin1 ? t("statesHeading") : t("citiesHeading")}
        </h2>
        {/* Every child is linked, never a truncated "top N" — a child with
            no inbound link is a page a crawler can't reach, however
            faithfully the sitemap lists it. */}
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(country.hasAdmin1 ? sortedStates : cities).map((child) => (
            <li key={"id" in child ? child.id : child.geonameId}>
              <Link
                href={`${basePath}/${child.slug}`}
                className="block rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink hover:border-accent hover:text-accent-strong"
              >
                {child.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {neighbours.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            {tContent("neighboursHeading")}
          </h2>
          <p className="text-sm text-ink-muted">
            {tContent("neighboursIntro", { country: countryName })}
          </p>
          <ul className="flex flex-wrap gap-2">
            {neighbours.map((n) => (
              <li key={n.code}>
                <Link
                  href={`/${n.slug}`}
                  className="inline-block rounded-full border border-line px-3 py-1 text-sm text-ink hover:border-accent hover:text-accent-strong"
                >
                  {countryDisplayName(n, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
