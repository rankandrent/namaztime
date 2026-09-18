import { SITE_URL } from "./site";
import { localeUrl } from "@/lib/i18n/paths";
import type { City, Country, Admin1 } from "@/lib/data/types";
import type { CityFacts } from "@/lib/prayer-times/city-facts";

/**
 * Structured data builders. Deliberately limited to schema.org types and
 * properties that actually exist — see plan §SEO: no invented "prayer
 * times" type, and no properties bolted onto types that don't define them.
 */

export interface BreadcrumbItem {
  name: string;
  /** Absolute or locale-relative path; relative paths resolve against SITE_URL. */
  path: string;
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.path.startsWith("http") ? item.path : `${SITE_URL}${item.path}`,
    })),
  };
}

/**
 * WebPage + the City entity it's about.
 *
 * Population, timezone, UTC offset and the Qibla values go under
 * `additionalProperty` as PropertyValue rather than as top-level keys:
 * schema.org's Place/AdministrativeArea define none of them, and
 * inventing `population: 13004135` on a Place would be exactly the
 * made-up markup we're avoiding. PropertyValue is the sanctioned
 * escape hatch. unitCode values are UN/CEFACT (DD = degree,
 * KMT = kilometre, MTR = metre).
 */
export function cityPlaceJsonLd({
  heading,
  description,
  path,
  locale,
  city,
  country,
  state,
  displayName,
  alternateNames,
  facts,
}: {
  heading: string;
  description: string;
  path: string;
  locale: string;
  city: City;
  country: Country;
  state: Admin1 | null;
  displayName: string;
  alternateNames: string[];
  facts: CityFacts;
}) {
  const url = `${SITE_URL}${path}`;

  const additionalProperty: Record<string, unknown>[] = [
    { "@type": "PropertyValue", name: "timezone", value: city.timezone },
    { "@type": "PropertyValue", name: "utcOffset", value: facts.utcOffsetLabel },
    {
      "@type": "PropertyValue",
      name: "qiblaBearing",
      value: Number(facts.qibla.bearing.toFixed(2)),
      unitCode: "DD",
    },
    {
      "@type": "PropertyValue",
      name: "distanceToKaaba",
      value: Math.round(facts.qibla.distanceKm),
      unitCode: "KMT",
    },
    {
      "@type": "PropertyValue",
      name: "calculationMethod",
      value: facts.method,
    },
  ];
  if (city.population > 0) {
    additionalProperty.unshift({
      "@type": "PropertyValue",
      name: "population",
      value: city.population,
    });
  }

  const geo: Record<string, unknown> = {
    "@type": "GeoCoordinates",
    latitude: city.lat,
    longitude: city.lon,
  };
  // GeoCoordinates.elevation is a real property; only emit it when known.
  if (city.elevation !== null) geo.elevation = `${city.elevation} m`;

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: heading,
    description,
    url,
    inLanguage: locale,
    // The date the page's figures were computed for — honest about
    // freshness rather than claiming "now" on a cached copy.
    dateModified: facts.date.toISODate(),
    isPartOf: { "@type": "WebSite", "@id": `${SITE_URL}#website` },
    about: {
      "@type": "City",
      "@id": `${url}#place`,
      name: displayName,
      sameAs: `https://www.geonames.org/${city.geonameId}/`,
      ...(alternateNames.length > 0 ? { alternateName: alternateNames } : {}),
      geo,
      address: {
        "@type": "PostalAddress",
        addressLocality: displayName,
        ...(state ? { addressRegion: state.name } : {}),
        addressCountry: country.code,
      },
      containedInPlace: state
        ? {
            "@type": "AdministrativeArea",
            name: state.name,
            url: localeUrl(locale, `/${country.slug}/${state.slug}`),
          }
        : {
            "@type": "Country",
            name: country.name,
            url: localeUrl(locale, `/${country.slug}`),
          },
      additionalProperty,
    },
  };
}

export function faqJsonLd(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function cityDatasetJsonLd({
  cityName,
  countryName,
  path,
}: {
  cityName: string;
  countryName: string;
  path: string;
}) {
  const url = `${SITE_URL}${path}`;
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const monthName = now.toLocaleString("en-US", { month: "long" });

  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": `${url}#dataset`,
    name: `${cityName} Islamic Prayer Times Monthly Timetable (${monthName} ${year})`,
    description: `Daily astronomical prayer times for ${cityName}, ${countryName}, including Fajr, Sunrise, Dhuhr, Asr, Maghrib, and Isha.`,
    keywords: [
      "prayer times",
      "maghrib time",
      "namaz timings",
      `${cityName} prayer times`,
      "salah timetable",
      "iftar schedule"
    ],
    spatialCoverage: {
      "@id": `${url}#place`,
    },
    temporalCoverage: `${year}-${month}-01/${year}-${month}-30`,
    variableMeasured: [
      { "@type": "PropertyValue", name: "Fajr", description: "Astronomical dawn prayer start time" },
      { "@type": "PropertyValue", name: "Sunrise", description: "Solar sunrise time" },
      { "@type": "PropertyValue", name: "Dhuhr", description: "Midday solar noon prayer start time" },
      { "@type": "PropertyValue", name: "Asr", description: "Afternoon shadow prayer start time" },
      { "@type": "PropertyValue", name: "Maghrib", description: "Sunset prayer and fasting iftar time" },
      { "@type": "PropertyValue", name: "Isha", description: "Nightfall prayer start time" }
    ],
    creator: {
      "@type": "Organization",
      name: "Maghrib Time",
      url: `${SITE_URL}/`
    },
    distribution: [
      {
        "@type": "DataDownload",
        encodingFormat: "text/html",
        contentUrl: url
      }
    ]
  };
}

/** Country hub: the Country entity plus its states as an ItemList. */
export function countryPageJsonLd({
  name,
  description,
  path,
  locale,
  country,
  children,
}: {
  name: string;
  description: string;
  path: string;
  locale: string;
  country: Country;
  children: { name: string; path: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: `${SITE_URL}${path}`,
    inLanguage: locale,
    about: {
      "@type": "Country",
      "@id": `${SITE_URL}${path}#place`,
      name: country.name,
      additionalProperty: [
        { "@type": "PropertyValue", name: "population", value: country.population },
        ...(country.areaSqKm > 0
          ? [
              {
                "@type": "PropertyValue",
                name: "area",
                value: country.areaSqKm,
                unitCode: "KMK",
              },
            ]
          : []),
      ],
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: children.length,
      itemListElement: children.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.name,
        url: `${SITE_URL}${c.path}`,
      })),
    },
  };
}

/** State hub: the AdministrativeArea plus the cities listed on this page. */
export function statePageJsonLd({
  name,
  description,
  path,
  locale,
  state,
  country,
  children,
  positionOffset = 0,
}: {
  name: string;
  description: string;
  path: string;
  locale: string;
  state: Admin1;
  country: Country;
  children: { name: string; path: string }[];
  positionOffset?: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: `${SITE_URL}${path}`,
    inLanguage: locale,
    about: {
      "@type": "AdministrativeArea",
      "@id": `${SITE_URL}${path}#place`,
      name: state.name,
      containedInPlace: {
        "@type": "Country",
        name: country.name,
        url: localeUrl(locale, `/${country.slug}`),
      },
    },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: children.map((c, i) => ({
        "@type": "ListItem",
        // Offset so page 2's items continue from page 1 rather than
        // restarting at 1 — otherwise every page claims the same ranks.
        position: positionOffset + i + 1,
        name: c.name,
        url: `${SITE_URL}${c.path}`,
      })),
    },
  };
}

/**
 * The site itself, emitted once from the home page.
 *
 * `potentialAction` declares the on-site search endpoint in the form
 * Google's sitelinks-searchbox feature reads. `query-input` must name a
 * real query parameter that `/search` actually accepts — declaring a
 * search action the site can't service is worse than omitting it.
 *
 * `@id` matches the `isPartOf` reference every city page already emits,
 * so the pages resolve as parts of one declared site rather than as
 * ~650,000 unrelated documents.
 */
export function websiteJsonLd({
  name,
  description,
  locale,
}: {
  name: string;
  description: string;
  locale: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}#website`,
    name,
    description,
    url: localeUrl(locale, ""),
    inLanguage: locale,
    publisher: {
      "@type": "Organization",
      "@id": `${SITE_URL}#organization`,
      name: "Maghrib Time",
      url: SITE_URL,
      logo: `${SITE_URL}/favicon.ico`,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${localeUrl(locale, "/search")}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}#organization`,
    name: "Maghrib Time",
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.ico`,
    description: "Global astronomical Islamic prayer times and Qibla direction platform.",
  };
}
