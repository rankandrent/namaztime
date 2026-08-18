/**
 * Build-time-only helpers for generateStaticParams — the tiered
 * pre-rendering strategy from plan §Rendering Strategy. Everything not
 * covered by these lists still resolves correctly at request time via
 * ISR (dynamicParams = true on each route), these just decide what gets
 * pre-built so the common case is instant.
 *
 * Cloudflare-specific correction (2026-08-18): every statically
 * pre-rendered page adds one entry to Next's prerender manifest, and
 * OpenNext's Cloudflare adapter embeds that ENTIRE manifest directly into
 * the middleware bundle — verified by inspecting .open-next/middleware/
 * handler.mjs, which turned out to be ~34,000 near-identical JSON records
 * (route path, htmlSize, revalidate settings), one per pre-rendered page.
 * At the previous tier sizes (252 countries + 1,153 states + 1,788 cities
 * × 17 locales ≈ 54,300 pages) that manifest alone made the middleware
 * bundle ~33MB, and pushed the combined Worker past Cloudflare's 64MB
 * uncompressed cap. This isn't a build-time or sitemap-coverage concern —
 * every one of those pages is still fully correct and reachable via ISR
 * regardless of whether it's pre-rendered — so the fix is to shrink these
 * tiers, not to change what the site covers.
 */
import { store } from "./store";
import topCitiesData from "@/data/processed/top-cities.json";
import type { City } from "./types";

const topCities = topCitiesData as City[];

/** Every country gets a static hub page — cheap, high-value. */
export function getAllCountryParams(): { country: string }[] {
  return store.countries.map((c) => ({ country: c.slug }));
}

// Cut from 40 → 6 for the Cloudflare manifest-size reason above. These are
// the handful of highest-population countries — Pakistan/Indonesia/India/
// Bangladesh/Nigeria/Egypt-class markets — worth having their state hubs
// (and, via getTopCityParams, their cities) ready instantly. Every other
// country's states/cities still render correctly on first request.
const PRIORITY_COUNTRY_COUNT = 6;
const priorityCountryCodes = new Set(
  store.countries
    .slice()
    .sort((a, b) => b.population - a.population)
    .slice(0, PRIORITY_COUNTRY_COUNT)
    .map((c) => c.code)
);

// Cut from ~1,788 (the full curated tier) → 150 for the same reason. The
// full topCitiesData set is still used elsewhere (e.g. the homepage's
// "popular cities" list) — this slice only limits what gets *pre-rendered*
// at build time, sorted by population so the highest-traffic cities are
// the ones kept static.
const TOP_CITY_PARAM_COUNT = 150;
const sortedTopCities = [...topCities].sort((a, b) => b.population - a.population);
const prerenderCities = sortedTopCities.slice(0, TOP_CITY_PARAM_COUNT);

/**
 * Params for the `[country]/[region]` route: state hubs for a priority
 * subset of countries (by population), plus the top-cities entries that
 * live in no-admin1 countries (which resolve as a city at this same
 * route depth — see the routing branch in that page).
 */
export function getPriorityRegionParams(): { country: string; region: string }[] {
  const countryBySlug = store.countryByCode;
  const params: { country: string; region: string }[] = [];

  for (const country of store.countries) {
    if (!priorityCountryCodes.has(country.code)) continue;
    const states = store.admin1ByCountry.get(country.code) ?? [];
    for (const state of states) {
      params.push({ country: country.slug, region: state.slug });
    }
  }

  for (const city of prerenderCities) {
    if (city.admin1Id) continue; // handled as a state-hub country above
    const country = countryBySlug.get(city.countryCode);
    if (country) params.push({ country: country.slug, region: city.slug });
  }

  return params;
}

/** Params for the `[country]/[region]/[city]` route: the curated top-cities tier. */
export function getTopCityParams(): { country: string; region: string; city: string }[] {
  const countryBySlug = store.countryByCode;
  const params: { country: string; region: string; city: string }[] = [];

  for (const city of prerenderCities) {
    if (!city.admin1Id) continue; // no-admin1 countries resolve one level up
    const country = countryBySlug.get(city.countryCode);
    const state = store.admin1ById.get(city.admin1Id);
    if (!country || !state) continue;
    params.push({ country: country.slug, region: state.slug, city: city.slug });
  }

  return params;
}
