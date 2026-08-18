import { store } from "./store";
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

export async function getCitiesForCountry(countryCode: string): Promise<City[]> {
  return store.loadCitiesForCountry(countryCode);
}

export async function getCitiesForState(
  countryCode: string,
  admin1Id: string
): Promise<City[]> {
  const cities = await store.loadCitiesForCountry(countryCode);
  return cities.filter((c) => c.admin1Id === admin1Id);
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
  if (state) return { kind: "state", state };

  const cities = await store.loadCitiesForCountry(countryCode);
  const city = cities.find((c) => c.admin1Id === null && c.slug === regionSlug);
  if (city) return { kind: "city", city };

  return { kind: "not-found" };
}

export async function getCityBySlug(
  countryCode: string,
  admin1Id: string,
  citySlug: string
): Promise<City | undefined> {
  const cities = await store.loadCitiesForCountry(countryCode);
  return cities.find((c) => c.admin1Id === admin1Id && c.slug === citySlug);
}

export interface NearbyCity {
  city: City;
  distanceKm: number;
}

/**
 * Genuinely nearest cities by great-circle distance, country-wide.
 *
 * The previous version took the most-populous cities in the *same state*,
 * which is fine for a bare link list but becomes wrong the moment the
 * page states a distance or a time offset: for a city near a state
 * border the true neighbours are often across it, and the largest city
 * in a big state can be hundreds of km away.
 *
 * Cost is a linear scan of one country's cities (3,779 for India, the
 * largest) ≈ 0.15 ms — cheap enough to do per page.
 */
export async function getNearestCities(city: City, limit = 8): Promise<NearbyCity[]> {
  const cities = await store.loadCitiesForCountry(city.countryCode);
  return cities
    .filter((c) => c.geonameId !== city.geonameId)
    .map((c) => ({
      city: c,
      distanceKm: haversineKm(city.lat, city.lon, c.lat, c.lon),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}
