/**
 * Module-scope singleton loader for the processed dataset. Small reference
 * data (countries, admin1) is loaded eagerly; per-country city files are
 * fetched on demand via `readRuntimeJson` (not `import()`) so a single
 * request never pulls in cities for every country, and so the ~250
 * per-country files don't get bundled into the Workers server script —
 * see the comment on runtime-fetch.ts for why that distinction matters on
 * Cloudflare specifically.
 */
import type { Country, Admin1, City } from "./types";
import { readRuntimeJson } from "./runtime-fetch";

import countriesData from "@/data/processed/countries.json";
import admin1Data from "@/data/processed/admin1.json";

const countries = countriesData as Country[];
const admin1 = admin1Data as Admin1[];

const countryBySlug = new Map(countries.map((c) => [c.slug, c]));
const countryByCode = new Map(countries.map((c) => [c.code, c]));
const admin1ById = new Map(admin1.map((a) => [a.id, a]));
const admin1BySlugInCountry = new Map<string, Admin1>(); // "{countryCode}/{slug}"
for (const a of admin1) {
  admin1BySlugInCountry.set(`${a.countryCode}/${a.slug}`, a);
}
const admin1ByCountry = new Map<string, Admin1[]>();
for (const a of admin1) {
  const arr = admin1ByCountry.get(a.countryCode) ?? [];
  arr.push(a);
  admin1ByCountry.set(a.countryCode, arr);
}

// Per-country city files are cached after first load within a server
// instance's lifetime.
const cityFileCache = new Map<string, City[]>();

async function loadCitiesForCountry(countryCode: string): Promise<City[]> {
  const cached = cityFileCache.get(countryCode);
  if (cached) return cached;
  const cities = (await readRuntimeJson<City[]>(`cities/${countryCode}.json`)) ?? [];
  cityFileCache.set(countryCode, cities);
  return cities;
}

export const store = {
  countries,
  admin1,
  countryBySlug,
  countryByCode,
  admin1ById,
  admin1BySlugInCountry,
  admin1ByCountry,
  loadCitiesForCountry,
};
