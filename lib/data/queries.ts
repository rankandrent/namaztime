import { store, stateHasContent } from "./store";
import { haversineKm } from "@/lib/prayer-times/qibla";
import type { City, Country, Admin1 } from "./types";

export async function getCountryBySlug(
  countrySlug: string
): Promise<Country | undefined> {
  return store.countryBySlug.get(countrySlug);
}

/** All states in a country. Used to render the full list on the country
 * hub page — every state must be linked, not just a pre-rendered subset,
 * so crawlers can discover and ISR-render the rest (see plan §Internal Linking). */
export function getStatesForCountry(countryCode: string): Admin1[] {
  return store.admin1ByCountry.get(countryCode) ?? [];
}

/**
 * The most populous cities of a country — NOT every city.
 *
 * Its only caller is the country hub's "times in its biggest places"
 * block, which shows 8. Returning the full list meant loading the whole
 * country file (565KB for China, 1MB for India) to use 8 records.
 */
export async function getTopCitiesForCountry(countryCode: string): Promise<City[]> {
  return store.loadTopCitiesForCountry(countryCode);
}

/** How many cities we cover in a country — a number, not a list. */
export function getCityCountForCountry(countryCode: string): number {
  return store.cityCountForCountry(countryCode);
}

export async function getCitiesForState(
  countryCode: string,
  admin1Id: string
): Promise<City[]> {
  const slug = store.admin1ById.get(admin1Id)?.slug;
  if (!slug) return [];
  return store.loadCitiesForState(countryCode, slug);
}

/**
 * Resolves the `[region]` URL segment. Tries it as a state slug first;
 * failing that, treats it as a city sitting directly under the country.
 *
 * That fallback covers two cases, not just one:
 *  1. Countries with no admin1 divisions at all (Singapore, Vatican — see
 *     plan §Rendering Strategy "No-admin1 countries").
 *  2. Individual cities whose GeoNames admin1 code matched no admin1
 *     record, so `admin1Id` is null even though the country *does* have
 *     states. There are 14 such cities across 8 countries (CN, EG, ET,
 *     HK, HU, MO, MR, VN). Gating this fallback on `!country.hasAdmin1`
 *     previously made every one of them unreachable — a 404 for a page
 *     the sitemap lists.
 *
 * Only `admin1Id === null` cities are matched here: a city that *does*
 * have a state belongs at the 3-segment URL and must not also answer at
 * this depth, or the same content would be served from two URLs.
 */
export async function resolveRegionOrCity(
  countryCode: string,
  regionSlug: string
): Promise<
  | { kind: "state"; state: Admin1 }
  | { kind: "city"; city: City }
  | { kind: "not-found" }
> {
  const state = store.admin1BySlugInCountry.get(`${countryCode}/${regionSlug}`);
  if (state) {
    // A state with neither a city in the main dataset nor a fallback
    // locality has nothing to say — no cities to list and no coordinate
    // to compute prayer times at. ~90 states are in this position and
    // they are genuinely uninhabited (Redonda, Rose Island, and similar).
    // 404 rather than serve a page whose entire purpose is times it
    // cannot produce; sitemap-source.ts excludes the same set.
    if (!stateHasContent(state)) return { kind: "not-found" };
    return { kind: "state", state };
  }

  const cities = await store.loadNoAdmin1Cities(countryCode);
  const city = cities.find((c) => c.slug === regionSlug);
  if (city) return { kind: "city", city };

  return { kind: "not-found" };
}

export async function getCityBySlug(
  countryCode: string,
  admin1Id: string,
  citySlug: string
): Promise<City | undefined> {
  const slug = store.admin1ById.get(admin1Id)?.slug;
  if (!slug) return undefined;
  const cities = await store.loadCitiesForState(countryCode, slug);
  return cities.find((c) => c.slug === citySlug);
}

export interface NearbyCity {
  city: City;
  distanceKm: number;
}

/**
 * Nearest cities by real great-circle distance, within the city's state.
 *
 * Still a genuine distance sort — not "the biggest cities in the state" —
 * so every distance the page prints is true. The search is scoped to the
 * state shard the page has already loaded, rather than the whole country:
 * loading the country file for this cost 565KB of JSON parsing on Chinese
 * city pages and blew the 10ms CPU budget outright (see
 * scripts/build-city-shards.ts). 81% of a city's true nearest neighbours
 * are in its own state, so the visible result rarely differs; a border
 * city may miss a slightly closer neighbour on the other side.
 */
export async function getNearestCities(city: City, limit = 8): Promise<NearbyCity[]> {
  const slug = city.admin1Id ? store.admin1ById.get(city.admin1Id)?.slug : undefined;
  const cities = slug
    ? await store.loadCitiesForState(city.countryCode, slug)
    : await store.loadNoAdmin1Cities(city.countryCode);
  return cities
    .filter((c) => c.geonameId !== city.geonameId)
    .map((c) => ({
      city: c,
      distanceKm: haversineKm(city.lat, city.lon, c.lat, c.lon),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}
