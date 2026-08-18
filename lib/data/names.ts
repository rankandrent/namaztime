/**
 * Native-script place names, loaded per country to match the existing
 * city-file pattern (one dynamic import per request, never a global
 * static import of every name on Earth).
 *
 * Source: scripts/build-alternate-names.ts.
 */
import countryNames from "@/data/processed/names/_countries.json";
import admin1Names from "@/data/processed/names/_admin1.json";
import type { City, Country, Admin1 } from "./types";
import { readRuntimeJson } from "./runtime-fetch";

type NameRecord = Record<string, Partial<Record<string, string>>>;

const countryNameMap = countryNames as NameRecord;
const admin1NameMap = admin1Names as NameRecord;

const cache = new Map<string, NameRecord>();

export async function loadNamesForCountry(countryCode: string): Promise<NameRecord> {
  const cached = cache.get(countryCode);
  if (cached) return cached;
  // Plenty of countries have no alternate names file at all — that's
  // normal, not an error; readRuntimeJson returns null and we cache {}
  // so we don't retry per request.
  const data = (await readRuntimeJson<NameRecord>(`names/${countryCode}.json`)) ?? {};
  cache.set(countryCode, data);
  return data;
}

/**
 * Our stored `name` is already the ASCII/English form, and GeoNames' own
 * `en` alternates are formal long-forms — "Islamic Republic of Pakistan",
 * "Punjab Province". Using those as the display name would make English
 * pages read worse, so `en` is never used for display. It stays available
 * for JSON-LD `alternateName`, where a formal variant is a useful signal.
 */
function pickDisplay(
  names: Partial<Record<string, string>> | undefined,
  locale: string,
  fallback: string
): string {
  if (!names || locale === "en") return fallback;
  return names[locale] ?? fallback;
}

export function countryDisplayName(country: Country, locale: string): string {
  return pickDisplay(countryNameMap[String(country.geonameId)], locale, country.name);
}

export function admin1DisplayName(state: Admin1, locale: string): string {
  return pickDisplay(admin1NameMap[String(state.geonameId)], locale, state.name);
}

export function cityDisplayName(
  names: NameRecord,
  city: City,
  locale: string
): string {
  return pickDisplay(names[String(city.geonameId)], locale, city.name);
}

/**
 * Every captured native name for a place, for JSON-LD `alternateName`.
 * Deduped and excluding whatever we're already showing as the display
 * name, so the structured data doesn't just repeat `name`.
 */
export function cityAlternateNames(
  names: NameRecord,
  city: City,
  displayName: string
): string[] {
  const rec = names[String(city.geonameId)];
  if (!rec) return [];
  const seen = new Set([displayName, city.name]);
  const out: string[] = [];
  for (const value of Object.values(rec)) {
    if (value && !seen.has(value)) {
      seen.add(value);
      out.push(value);
    }
  }
  return out;
}

/**
 * Names in scripts other than the current locale's, for an "also known
 * as" line. Capped, and excluding the display name itself.
 */
export function otherScriptNames(
  names: NameRecord,
  city: City,
  locale: string,
  displayName: string,
  limit = 3
): { locale: string; name: string }[] {
  const rec = names[String(city.geonameId)];
  if (!rec) return [];
  const preferred = ["ar", "ur", "fa", "hi", "bn", "zh", "ru"];
  const seen = new Set([displayName, city.name]);
  const out: { locale: string; name: string }[] = [];
  for (const l of preferred) {
    if (l === locale) continue;
    const value = rec[l];
    if (value && !seen.has(value)) {
      seen.add(value);
      out.push({ locale: l, name: value });
      if (out.length >= limit) break;
    }
  }
  return out;
}
