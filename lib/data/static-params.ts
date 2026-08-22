/**
 * Build-time-only helpers for generateStaticParams — the tiered
 * pre-rendering strategy from plan §Rendering Strategy. Everything not
 * covered by these lists still resolves correctly at request time via
 * ISR (dynamicParams = true on each route), these just decide what gets
 * pre-built so the common case is instant.
 *
 * Cloudflare-specific correction (2026-08-18): every statically
 * pre-rendered page adds one entry to Next's prerender manifest, and
 * OpenNext's Cloudflare adapter embeds that ENTIRE manifest into the
 * middleware bundle — verified by inspecting .open-next/middleware/
 * handler.mjs, which was ~34,000 near-identical JSON records (route path,
 * htmlSize, revalidate settings), one per pre-rendered page. At the
 * original tiers (252 countries + 1,153 states + 1,788 cities × 17
 * locales ≈ 54,300 pages) that alone made the middleware bundle 33MB.
 * Cutting the tiers took it to 6.1MB, and the tiers below cut it again to
 * fit Cloudflare's **free-plan** 3 MiB *compressed* Worker limit.
 *
 * None of this changes what the site covers: every country, state and
 * city is still fully reachable and still in the sitemap — the only
 * difference is whether a page is pre-built or rendered on its first
 * request (and then cached). Raise these numbers if the account moves to
 * Workers Paid, which allows 10 MiB.
 */
import { store } from "./store";
import type { City } from "./types";

/**
 * Read at call time via fs rather than a top-level `import` of the JSON.
 * generateStaticParams only ever runs during `next build`, but a static
 * import would inline all 1,788 rows (~496KB) into the *runtime* Workers
 * bundle, where they're dead weight against a 3 MiB budget.
 */
async function loadTopCities(): Promise<City[]> {
  const { readFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const raw = await readFile(
    path.join(process.cwd(), "data/processed/top-cities.json"),
    "utf8"
  );
  return JSON.parse(raw) as City[];
}

// Only the largest countries get a pre-built hub; the rest render on
// first request. 252 → 30 saves 3,774 manifest entries (×17 locales).
const PRERENDER_COUNTRY_COUNT = 30;

/** Country hubs for the highest-population countries. */
export function getAllCountryParams(): { country: string }[] {
  return store.countries
    .slice()
    .sort((a, b) => b.population - a.population)
    .slice(0, PRERENDER_COUNTRY_COUNT)
    .map((c) => ({ country: c.slug }));
}

// State hubs are pre-built only for the very largest markets.
const PRIORITY_COUNTRY_COUNT = 2;
const priorityCountryCodes = new Set(
  store.countries
    .slice()
    .sort((a, b) => b.population - a.population)
    .slice(0, PRIORITY_COUNTRY_COUNT)
    .map((c) => c.code)
);

/** How many of the curated top cities get pre-rendered. */
const TOP_CITY_PARAM_COUNT = 40;

async function getPrerenderCities(): Promise<City[]> {
  const topCities = await loadTopCities();
  return topCities
    .sort((a, b) => b.population - a.population)
    .slice(0, TOP_CITY_PARAM_COUNT);
}

/**
 * Params for the `[country]/[region]` route: state hubs for a priority
 * subset of countries (by population), plus the top-cities entries that
 * live in no-admin1 countries (which resolve as a city at this same
 * route depth — see the routing branch in that page).
 */
export async function getPriorityRegionParams(): Promise<
  { country: string; region: string }[]
> {
  const countryBySlug = store.countryByCode;
  const params: { country: string; region: string }[] = [];

  for (const country of store.countries) {
    if (!priorityCountryCodes.has(country.code)) continue;
    const states = store.admin1ByCountry.get(country.code) ?? [];
    for (const state of states) {
      params.push({ country: country.slug, region: state.slug });
    }
  }

  for (const city of await getPrerenderCities()) {
    if (city.admin1Id) continue; // handled as a state-hub country above
    const country = countryBySlug.get(city.countryCode);
    if (country) params.push({ country: country.slug, region: city.slug });
  }

  return params;
}

/** Params for the `[country]/[region]/[city]` route: the curated top-cities tier. */
export async function getTopCityParams(): Promise<
  { country: string; region: string; city: string }[]
> {
  const countryBySlug = store.countryByCode;
  const params: { country: string; region: string; city: string }[] = [];

  for (const city of await getPrerenderCities()) {
    if (!city.admin1Id) continue; // no-admin1 countries resolve one level up
    const country = countryBySlug.get(city.countryCode);
    const state = store.admin1ById.get(city.admin1Id);
    if (!country || !state) continue;
    params.push({ country: country.slug, region: state.slug, city: city.slug });
  }

  return params;
}
