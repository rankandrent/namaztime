import { getTranslations, getLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PrayerTimesTable } from "@/components/PrayerTimesTable";
import { QiblaAndHijri } from "@/components/QiblaAndHijri";
import { CityFaq } from "@/components/CityFaq";
import { StaleDateNotice } from "@/components/StaleDateNotice";
import { MethodMismatchNotice } from "@/components/MethodMismatchNotice";
import { CityIntro, TodaySummary, AlsoKnownAs } from "@/components/city/CityIntro";
import { PrayerBreakdown } from "@/components/city/PrayerBreakdown";
import {
  MethodExplainer,
  MonthOutlook,
  QiblaDetail,
  NearbyCitiesDetail,
} from "@/components/city/CityDetails";
import { getCityFacts } from "@/lib/prayer-times/city-facts";
import { computePrayerTimes } from "@/lib/prayer-times/calculate";
import { buildCityFaq } from "@/lib/content/city-faq";
import { getNearestCities, getCityCountForCountry } from "@/lib/data/queries";
import {
  loadNamesForCountry,
  cityDisplayName,
  cityAlternateNames,
  countryDisplayName,
  admin1DisplayName,
  otherScriptNames,
} from "@/lib/data/names";
import { store } from "@/lib/data/store";
import { localePath } from "@/lib/i18n/paths";
import { breadcrumbJsonLd, cityPlaceJsonLd, faqJsonLd } from "@/lib/seo/json-ld";
import { formatDate } from "@/lib/format";
import type { City, Country, Admin1 } from "@/lib/data/types";

export async function CityPageContent({
  city,
  country,
  state,
}: {
  city: City;
  country: Country;
  state: Admin1 | null;
}) {
  const t = await getTranslations("city");
  const tNav = await getTranslations("nav");
  const tContent = await getTranslations("cityContent");
  const tFaq = await getTranslations("faq");
  const tCompass = await getTranslations("compass");
  const tMadhab = await getTranslations("methodSelector");
  const tShadow = await getTranslations("shadow");
  const locale = await getLocale();

  const facts = getCityFacts({
    lat: city.lat,
    lon: city.lon,
    timezone: city.timezone,
    countryCode: country.code,
  });

  const names = await loadNamesForCountry(country.code);
  const displayName = cityDisplayName(names, city, locale);
  const countryName = countryDisplayName(country, locale);
  const stateName = state ? admin1DisplayName(state, locale) : null;
  const alternateNames = cityAlternateNames(names, city, displayName);
  const alsoKnownAs = otherScriptNames(names, city, locale, displayName);
  const nearby = await getNearestCities(city);
  // A count, not a list: this value is only ever rendered as a number,
  // and fetching every city in the country to read `.length` was the
  // single most expensive thing on this page.
  const cityCountInCountry = getCityCountForCountry(country.code);

  const heading = state && stateName
    ? t("headingWithState", { city: displayName, state: stateName, country: countryName })
    : t("heading", { city: displayName, country: countryName });
  const path = state
    ? localePath(locale, `/${country.slug}/${state.slug}/${city.slug}`)
    : localePath(locale, `/${country.slug}/${city.slug}`);

  const faqItems = buildCityFaq({
    facts,
    cityName: displayName,
    countryName,
    locale,
    t: (k, v) => tFaq(k, v),
    tCompass: (k, v) => tCompass(k, v),
    tMadhab: (k, v) => tMadhab(k, v),
    tShadow: (k, v) => tShadow(k, v),
  });

  const jsonLd = [
    breadcrumbJsonLd([
      { name: tNav("home"), path: localePath(locale) },
      { name: countryName, path: localePath(locale, `/${country.slug}`) },
      ...(state
        ? [{ name: stateName ?? state.name, path: localePath(locale, `/${country.slug}/${state.slug}`) }]
        : []),
      { name: displayName, path },
    ]),
    cityPlaceJsonLd({
      heading,
      description: t("metaDescription", { city: displayName, country: countryName }),
      path,
      locale,
      city,
      country,
      state,
      displayName,
      alternateNames,
      facts,
    }),
    faqJsonLd(faqItems.map((f) => ({ question: f.question, answer: f.answer }))),
  ];

  // Maghrib offset vs this city, for the nearby list. One extra compute
  // per neighbour (8) — they're the only genuinely per-neighbour value on
  // the page and what makes it more than a link list.
  const maghribOffsetFor = (n: (typeof nearby)[number]) => {
    const t2 = computePrayerTimes({
      lat: n.city.lat,
      lon: n.city.lon,
      timezone: n.city.timezone,
      date: facts.date.setZone(n.city.timezone, { keepLocalTime: true }).startOf("day"),
      method: facts.method,
      madhab: facts.madhab,
    });
    return Math.round(t2.maghrib.diff(facts.times.maghrib, "minutes").minutes);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Breadcrumbs
        items={[
          { label: tNav("home"), href: "/" },
          { label: countryName, href: `/${country.slug}` },
          ...(state
            ? [{ label: stateName ?? state.name, href: `/${country.slug}/${state.slug}` }]
            : []),
          { label: displayName, href: "#" },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold tracking-tight">{heading}</h1>
        <p className="text-sm text-ink-muted mt-1">{t("tagline")}</p>
      </div>

      <StaleDateNotice
        bakedDateIso={facts.date.toISODate() ?? ""}
        timezone={city.timezone}
        cityName={displayName}
      />

      <PrayerTimesTable
        lat={city.lat}
        lon={city.lon}
        timezone={city.timezone}
        defaultMethod={facts.method}
        defaultMadhab={facts.madhab}
      />

      <QiblaAndHijri facts={facts} />

      <MethodMismatchNotice
        defaultMethod={facts.method}
        defaultMadhab={facts.madhab}
      />

      <CityIntro
        city={city}
        country={country}
        state={state}
        countryName={countryName}
        stateName={stateName}
        facts={facts}
        cityCountInCountry={cityCountInCountry}
        displayName={displayName}
      />

      <AlsoKnownAs displayName={displayName} names={alsoKnownAs} />

      <TodaySummary displayName={displayName} facts={facts} />

      <PrayerBreakdown displayName={displayName} facts={facts} />

      <MethodExplainer
        displayName={displayName}
        countryName={countryName}
        facts={facts}
      />

      <MonthOutlook displayName={displayName} facts={facts} />

      <QiblaDetail displayName={displayName} facts={facts} />

      <NearbyCitiesDetail
        displayName={displayName}
        facts={facts}
        nearby={nearby}
        countrySlug={country.slug}
        stateSlugFor={(n) =>
          n.city.admin1Id ? store.admin1ById.get(n.city.admin1Id)?.slug ?? null : null
        }
        maghribOffsetFor={maghribOffsetFor}
      />

      <section>
        <h2 className="text-lg font-semibold mb-3">{t("faqHeading")}</h2>
        <CityFaq items={faqItems} />
      </section>

      <p className="text-xs text-ink-muted">
        {tContent("disclaimer", {
          city: displayName,
          date: formatDate(facts.date, locale),
        })}
      </p>

      <footer className="text-xs text-ink-subtle border-t border-line pt-4">
        {t.rich("attribution", {
          geonames: (chunks) => (
            <a
              href="https://www.geonames.org/"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {chunks}
            </a>
          ),
        })}
      </footer>
    </div>
  );
}
