/**
 * Precomputes the sitemap's locale-agnostic path list at build time.
 *
 * Why this is a build step and not request-time work: generating it meant
 * fetching the 5.3MB search index, filtering states, sorting ~34,000
 * cities by population and re-sorting them by (country, geonameId) — on
 * EVERY sitemap request. On the Workers free plan a request gets 10 ms of
 * CPU, and `/sitemap_index.xml` was returning **error 1102 (Worker
 * exceeded resource limits)** as a result, which means Googlebot could not
 * read the sitemap at all. Doing it here turns that into "fetch a small
 * prepared list and slice it".
 *
 * It also fixes `lastmod`. The runtime version read the data file's mtime
 * via `fs.statSync`, which throws on Workers (no filesystem), so it fell
 * back to `new Date()` — i.e. every sitemap claimed every URL changed at
 * the moment it was fetched. That is precisely the "everything changed
 * today, every day" signal that erodes Google's trust in lastmod. The
 * real ingest date is stamped here instead.
 *
 * Output: public/runtime-data/sitemap-paths.json
 */
import fs from "node:fs";
import path from "node:path";
import { getCityTier } from "../lib/seo/tier-classifier";

const OUT = path.join(process.cwd(), "public/runtime-data/sitemap-paths.json");

/**
 * How many cities the sitemap advertises, most-populous first, or `null`
 * for all of them.
 *
 * `null` now. This was staged to 5,000 while the site ran on the Workers
 * FREE plan: advertising 650k URLs invited Googlebot to crawl the entire
 * long tail at high concurrency against an origin capped at 10 ms CPU per
 * request, and Search Console recorded 30-50% failed crawl requests. The
 * account is on Workers Paid now (30 s CPU per request), so there is no
 * reason to keep pages that render correctly out of the sitemap.
 *
 * If crawl errors ever return, staging this back is the first lever to
 * pull. Nothing is orphaned either way — state hubs link every city
 * regardless of what the sitemap advertises.
 */
const SITEMAP_CITY_LIMIT: number | null = null;

const STATIC_PATHS = ["", "/about", "/contact", "/privacy", "/terms", "/disclaimer"];

interface Country {
  code: string;
  slug: string;
}
interface Admin1 {
  id: string;
  countryCode: string;
  slug: string;
}
interface SearchRow {
  geonameId: number;
  slug: string;
  countryCode: string;
  countrySlug: string;
  admin1Slug: string | null;
  population: number;
}

function read<T>(rel: string): T {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), rel), "utf8")) as T;
}

function main() {
  const countries = read<Country[]>("data/processed/countries.json");
  const admin1 = read<Admin1[]>("data/processed/admin1.json");
  const noContent = new Set(read<string[]>("data/processed/admin1-no-content.json"));
  const searchIndex = read<SearchRow[]>("data/processed/search-index.json");

  const countryByCode = new Map(countries.map((c) => [c.code, c]));
  const paths: string[] = [...STATIC_PATHS];

  for (const country of [...countries].sort((a, b) => a.code.localeCompare(b.code))) {
    paths.push(`/${country.slug}`);
  }

  for (const state of [...admin1].sort((a, b) => a.id.localeCompare(b.id))) {
    const country = countryByCode.get(state.countryCode);
    // Skip states that 404 — a 404 in a sitemap is a Search Console error.
    if (!country || noContent.has(state.id)) continue;
    paths.push(`/${country.slug}/${state.slug}`);
  }

  const staged =
    SITEMAP_CITY_LIMIT === null
      ? searchIndex
      : [...searchIndex].sort((a, b) => b.population - a.population).slice(0, SITEMAP_CITY_LIMIT);

  let indexedCityCount = 0;
  let prunedCityCount = 0;

  for (const city of [...staged].sort(
    (a, b) => a.countryCode.localeCompare(b.countryCode) || a.geonameId - b.geonameId
  )) {
    const tier = getCityTier(city.countryCode, city.population || 0);
    if (tier === "C") {
      prunedCityCount++;
      continue;
    }

    indexedCityCount++;
    paths.push(
      city.admin1Slug
        ? `/${city.countrySlug}/${city.admin1Slug}/${city.slug}`
        : `/${city.countrySlug}/${city.slug}`
    );
  }

  console.log(`Indexed cities (Tier A + B): ${indexedCityCount}`);
  console.log(`Pruned cities (Tier C noindex): ${prunedCityCount}`);

  // The date the underlying place data last changed — not "now".
  const lastModified = fs
    .statSync(path.join(process.cwd(), "data/processed/countries.json"))
    .mtime.toISOString();

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ lastModified, paths }));
  console.log(`paths: ${paths.length}  (x17 locales = ${paths.length * 17} URLs)`);
  console.log(`lastModified: ${lastModified}`);
  console.log(`wrote ${OUT}`);
}

main();
