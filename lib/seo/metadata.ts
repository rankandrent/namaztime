import { getTranslations } from "next-intl/server";
import { locales, defaultLocale } from "@/lib/i18n/config";
import { localeUrl } from "@/lib/i18n/paths";
import {
  loadNamesForCountry,
  cityDisplayName,
  countryDisplayName,
} from "@/lib/data/names";
import type { City, Country, Admin1 } from "@/lib/data/types";
import { getCityTier, getCityRobots } from "@/lib/seo/tier-classifier";

/**
 * Title + description for a city page — also used by the region route's
 * no-admin1 branch, which renders the same CityPageContent one level up.
 *
 * Resolves native names the same way the page body does. Without this
 * the <h1> read "لاھور، پنجاب، پاکستان" while the <title> still said
 * "Lahore، Punjab، Pakistan" — and the title is the one that shows in
 * search results and the browser tab.
 *
 * The description is deliberately evergreen (no times): SERP snippets
 * are cached for days, so a stale time there is far more damaging than
 * one in the body, which at least carries its own date.
 */
export async function cityMetadata({
  locale,
  city,
  country,
  // `state` stays in the type — callers pass it and it may matter again —
  // but is not destructured, because the title deliberately omits it.
  // See the measurement note on the title below.
}: {
  locale: string;
  city: City;
  country: Country;
  state: Admin1 | null;
}) {
  const t = await getTranslations({ locale, namespace: "city" });
  const names = await loadNamesForCountry(country.code);
  const cityName = cityDisplayName(names, city, locale);
  const countryName = countryDisplayName(country, locale);

  const tier = getCityTier(country.code, city.population || 0);
  const robots = getCityRobots(tier);

  return {
    // metaTitle, not the <h1> key — the title has a ~60-character SERP
    // budget and a different job. The state is deliberately omitted:
    // measured across all 1,788 top cities, including it put 59.5% of
    // titles over 60 characters (median 62, worst 106 — "Santo Domingo
    // de los Colorados … Santo Domingo de los Tsachilas, Ecuador"),
    // where truncation eats the brand. City + country alone: 7.8% over,
    // median 51. The state still appears in the <h1> and breadcrumb,
    // which have no length budget.
    title: t("metaTitle", { city: cityName, country: countryName }),
    description: t("metaDescription", { city: cityName, country: countryName }),
    robots,
  };
}

/**
 * Builds `alternates.canonical` + `alternates.languages` for a locale-
 * agnostic path (e.g. "/pakistan/punjab/lahore", or "" for the homepage).
 * Every locale variant of a page points at every other — including itself
 * — plus an `x-default` pointing at English, per plan §SEO.
 */
export function buildAlternates(locale: string, path: string) {
  const languages: Record<string, string> = {};
  for (const l of locales) {
    languages[l] = localeUrl(l, path);
  }
  languages["x-default"] = localeUrl(defaultLocale, path);

  return {
    canonical: localeUrl(locale, path),
    languages,
  };
}
