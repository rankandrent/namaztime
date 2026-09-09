import { getTranslations, getLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Pagination } from "@/components/Pagination";
import { HubCityTimes } from "@/components/hub/HubCityTimes";
import { Link } from "@/lib/i18n/navigation";
import { localePath } from "@/lib/i18n/paths";
import { breadcrumbJsonLd, statePageJsonLd } from "@/lib/seo/json-ld";
import { countryDisplayName, admin1DisplayName } from "@/lib/data/names";
import { getHubFacts } from "@/lib/prayer-times/hub-facts";
import { PrayerTimesTable } from "@/components/PrayerTimesTable";
import { getAdmin1Fallback } from "@/lib/data/store";
import {
  defaultMethodForCountry,
  defaultMadhabKeyForCountry,
} from "@/lib/prayer-times/method-by-country";
import { formatNumber, formatDate, formatCoordinate } from "@/lib/format";
import type { City, Country, Admin1 } from "@/lib/data/types";

// Some states have hundreds of cities (England: 746) — an unpaginated list
// that long is bad UX and can itself hurt crawlability. See plan
// §Internal Linking: every city must still be linked from *some* page
// (never truncated to "top N only"), just spread across pages.
export const PAGE_SIZE = 120;

export async function StateHubContent({
  country,
  state,
  cities,
  currentPage,
}: {
  country: Country;
  state: Admin1;
  cities: City[];
  currentPage: number;
}) {
  const t = await getTranslations("state");
  const tContent = await getTranslations("stateContent");
  const tMethod = await getTranslations("methodSelector");
  const tNav = await getTranslations("nav");
  const locale = await getLocale();

  const countryName = countryDisplayName(country, locale);
  const stateName = admin1DisplayName(state, locale);

  const sorted = cities.slice().sort((a, b) => b.population - a.population);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, currentPage), totalPages);
  const pageCities = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const basePath = `/${country.slug}/${state.slug}`;

  const facts = getHubFacts({ cities, countryCode: country.code });

  // Every state page shows a full prayer-times table, computed at one
  // named place inside it.
  //
  // Which place depends on what we have: the state's largest city when it
  // has one, otherwise the most populous locality GeoNames knows there
  // (28.5% of states contain no city in cities15000 at all). Either way
  // the place is named in the text below rather than implying a whole
  // province shares one clock.
  //
  // This used to run only for the no-city states, which left the far more
  // common case worse off: a state with cities showed nothing but a
  // "Fajr … · Maghrib …" line per city, so a page titled "Prayer Times in
  // Pafos" never actually printed the five prayers.
  const fallback = cities.length === 0 ? getAdmin1Fallback(state.id) : null;
  const timesAt = fallback
    ? { lat: fallback.lat, lon: fallback.lon, timezone: fallback.timezone, place: fallback.place }
    : sorted[0]
      ? {
          lat: sorted[0].lat,
          lon: sorted[0].lon,
          timezone: sorted[0].timezone,
          place: sorted[0].name,
        }
      : null;

  // Prose is built sentence-by-sentence and only from data that exists,
  // so a one-city state gets a shorter paragraph rather than a sentence
  // with an empty slot in it.
  const sentences: string[] = [
    // "…where we cover 0 populated places" is both unhelpful and, now
    // that these pages DO show times via the fallback locality, actively
    // contradicts the table below it. Drop the count when there is none.
    cities.length === 0
      ? tContent("introNoCities", { state: stateName, country: countryName })
      : tContent("intro", {
          state: stateName,
          country: countryName,
          cityCount: formatNumber(cities.length, locale),
        }),
  ];
  const largest = sorted[0];
  if (largest && largest.population > 0) {
    sentences.push(
      tContent("introLargest", {
        city: largest.name,
        population: formatNumber(largest.population, locale),
      })
    );
  }
  // Only claim a north/south difference when the span is wide enough for
  // one to actually exist — under ~1° it is not a real effect.
  if (facts.latitudeRange && facts.latitudeRange.north - facts.latitudeRange.south >= 1) {
    sentences.push(
      tContent("introSpan", {
        south: formatCoordinate(facts.latitudeRange.south, locale),
        north: formatCoordinate(facts.latitudeRange.north, locale),
      })
    );
  }
  if (facts.timezones.length === 1) {
    sentences.push(tContent("timezone", { state: stateName, timezone: facts.timezones[0] }));
  }
  sentences.push(
    tContent("method", {
      method: facts.method,
      madhab: tMethod(facts.madhab),
      country: countryName,
    })
  );

  const jsonLd = [
    breadcrumbJsonLd([
      { name: tNav("home"), path: localePath(locale) },
      { name: countryName, path: localePath(locale, `/${country.slug}`) },
      { name: stateName, path: localePath(locale, basePath) },
    ]),
    statePageJsonLd({
      name: t("heading", { state: stateName, country: countryName }),
      description: sentences[0],
      path: localePath(locale, page === 1 ? basePath : `${basePath}/page/${page}`),
      locale,
      state,
      country,
      children: pageCities.map((c) => ({
        name: c.name,
        path: localePath(locale, `${basePath}/${c.slug}`),
      })),
      positionOffset: (page - 1) * PAGE_SIZE,
    }),
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="space-y-4">
        <Breadcrumbs
          items={[
            { label: tNav("home"), href: "/" },
            { label: countryName, href: `/${country.slug}` },
            { label: stateName, href: "#" },
          ]}
        />
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          {t("heading", { state: stateName, country: countryName })}
        </h1>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight text-ink">
          {tContent("aboutHeading", { state: stateName })}
        </h2>
        <p className="text-sm leading-relaxed text-ink-muted">{sentences.join(" ")}</p>
      </section>

      {/* Times only on page 1 — on page 2+ the same "largest cities"
          block would repeat identical content under a different URL,
          which is the duplicate-content pattern pagination is supposed
          to avoid. */}
      {page === 1 && facts.cityTimes.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            {tContent("topCitiesHeading", { state: stateName })}
          </h2>
          <p className="text-sm text-ink-muted">
            {tContent("topCitiesIntro", {
              state: stateName,
              date: formatDate(facts.date, locale),
            })}
          </p>
          <HubCityTimes
            namespace="stateContent"
            entries={facts.cityTimes}
            nameFor={(e) => e.city.name}
            hrefFor={(e) => `${basePath}/${e.city.slug}`}
          />
        </section>
      )}

      {timesAt && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            {tContent("fallbackHeading", { state: stateName })}
          </h2>
          <p className="text-sm text-ink-muted">
            {fallback
              ? tContent("fallbackIntro", { state: stateName, place: timesAt.place })
              : tContent("mainTimesIntro", { state: stateName, place: timesAt.place })}
          </p>
          <PrayerTimesTable
            lat={timesAt.lat}
            lon={timesAt.lon}
            timezone={timesAt.timezone}
            defaultMethod={defaultMethodForCountry(country.code)}
            defaultMadhab={defaultMadhabKeyForCountry(country.code)}
          />
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight text-ink">
          {t("citiesHeading")}
        </h2>
        {totalPages > 1 && (
          <p className="text-sm text-ink-subtle">
            {tContent("paginationIntro", {
              page: formatNumber(page, locale),
              totalPages: formatNumber(totalPages, locale),
              from: formatNumber((page - 1) * PAGE_SIZE + 1, locale),
              to: formatNumber(Math.min(page * PAGE_SIZE, sorted.length), locale),
              total: formatNumber(sorted.length, locale),
              state: stateName,
            })}
          </p>
        )}
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {pageCities.map((c) => (
            <li key={c.geonameId}>
              <Link
                href={`${basePath}/${c.slug}`}
                className="block rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink hover:border-accent hover:text-accent-strong"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
        <Pagination currentPage={page} totalPages={totalPages} basePath={basePath} />
      </section>
    </div>
  );
}
