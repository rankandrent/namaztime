/**
 * Sitemap URL source — see plan §Phase 2 / Sitemap.
 *
 * Covers EVERY place we serve: all countries, all admin1 states, and all
 * ~34,000 cities, across all 17 locales (~650,000 URLs).
 *
 * Chunking is **locale-major**: one chunk per locale (38,215 places fits
 * under the 45,000 cap). This beats slicing a flat 650k list because
 *   - Search Console then reports indexation per language, which is the
 *     number that actually matters on a 17-locale site, and
 *   - chunk boundaries don't shift when a city is added, so `lastmod`
 *     diffs between builds stay reviewable.
 * The generalized math below still works if the place count later exceeds
 * one chunk per locale.
 *
 * The 650k entry list is never materialized: we cache the 38,215
 * locale-agnostic *paths* (~1.5 MB) and prefix a locale on demand.
 *
 * City paths come from `search-index.json`, which the pipeline already
 * emits with `countrySlug`/`admin1Slug`/`slug` pre-resolved for every
 * city — cheaper and synchronous, where `store.loadCitiesForCountry`
 * would mean 252 async dynamic imports.
 */
import fs from "node:fs";
import path from "node:path";
import { store } from "@/lib/data/store";
import { readRuntimeJson } from "@/lib/data/runtime-fetch";
import { locales } from "@/lib/i18n/config";
import { SITE_URL } from "./site";
import { localeUrl } from "@/lib/i18n/paths";

interface SearchIndexEntry {
  geonameId: number;
  slug: string;
  countryCode: string;
  countrySlug: string;
  admin1Slug: string | null;
}

// Fetched once via readRuntimeJson (not a static `import`) — this file is
// technically reachable at runtime (dynamicParams defaults to true on the
// sitemap route, so Next can't prove a chunk ID outside the known set is
// unreachable), and a statically-imported 5.3MB file bundled into the
// single Workers server script was most of the reason it exceeded the
// 64MB uncompressed cap. See the comment on runtime-fetch.ts.
let searchIndexPromise: Promise<SearchIndexEntry[]> | null = null;
function getSearchIndex(): Promise<SearchIndexEntry[]> {
  if (!searchIndexPromise) {
    searchIndexPromise = readRuntimeJson<SearchIndexEntry[]>("search-index.json").then(
      (data) => data ?? []
    );
  }
  return searchIndexPromise;
}

export const SITEMAP_CHUNK_SIZE = 45_000; // safely under Google's 50k/file limit

export interface SitemapEntry {
  url: string;
  lastModified: Date;
}

/**
 * `lastmod` tracks when the underlying *place data* last changed (the
 * GeoNames ingest date), not "today" — prayer times are computed
 * per-request, not stored content, so they're not what lastmod should
 * reflect. Claiming everything changed today, every day, is a known signal
 * that erodes Google's trust in a site's lastmod values.
 */
function dataLastModified(): Date {
  try {
    return fs.statSync(path.join(process.cwd(), "data/processed/countries.json")).mtime;
  } catch {
    return new Date();
  }
}

/**
 * Standalone pages that aren't places: the home page plus the info and
 * policy pages. Listed first so they lead every locale's chunk — these
 * are the pages a reviewer or crawler most wants to find, and burying
 * them behind 34,000 cities is how they get missed.
 */
const STATIC_PATHS = ["", "/about", "/contact", "/privacy", "/terms", "/disclaimer"];

/** Locale-agnostic paths for every URL, in a stable, deterministic order. */
async function buildPlacePaths(): Promise<string[]> {
  const paths: string[] = [...STATIC_PATHS];

  // Countries — sorted by ISO code for a stable, reviewable diff.
  for (const country of [...store.countries].sort((a, b) => a.code.localeCompare(b.code))) {
    paths.push(`/${country.slug}`);
  }

  // All admin1 states. Sitemap inclusion is independent of the build-time
  // static-generation tiering — ISR serves the un-prerendered ones fine.
  for (const state of [...store.admin1].sort((a, b) => a.id.localeCompare(b.id))) {
    const country = store.countryByCode.get(state.countryCode);
    if (!country) continue;
    paths.push(`/${country.slug}/${state.slug}`);
  }

  // Every city, ordered by (country, geonameId) — stable across rebuilds.
  const searchIndex = await getSearchIndex();
  const cities = [...searchIndex].sort(
    (a, b) => a.countryCode.localeCompare(b.countryCode) || a.geonameId - b.geonameId
  );
  for (const city of cities) {
    // No-admin1 countries (Singapore etc.) resolve the city one level up,
    // matching the `[region]` route's branch.
    paths.push(
      city.admin1Slug
        ? `/${city.countrySlug}/${city.admin1Slug}/${city.slug}`
        : `/${city.countrySlug}/${city.slug}`
    );
  }

  return paths;
}

let cachedPathsPromise: Promise<string[]> | null = null;
let cachedLastModified: Date | null = null;

function getPlacePaths(): Promise<string[]> {
  if (!cachedPathsPromise) {
    cachedLastModified = dataLastModified();
    cachedPathsPromise = buildPlacePaths();
  }
  return cachedPathsPromise;
}

/** Chunks needed to cover all places for a single locale. */
async function chunksPerLocale(): Promise<number> {
  return Math.max(1, Math.ceil((await getPlacePaths()).length / SITEMAP_CHUNK_SIZE));
}

export async function getSitemapChunkCount(): Promise<number> {
  return locales.length * (await chunksPerLocale());
}

export async function getSitemapChunk(id: number | string): Promise<SitemapEntry[]> {
  // Next.js 16 passes `id` resolved from a Promise<string> (changed from
  // number in earlier versions — see generateSitemaps docs) — coerce
  // explicitly rather than relying on `*`/`+` to do it inconsistently.
  // `(id + 1)` with a string `id` is string concatenation ("1"+1 -> "11"),
  // not addition, which silently produced wildly wrong slice boundaries.
  const n = Number(id);
  const [paths, perLocale] = await Promise.all([getPlacePaths(), chunksPerLocale()]);

  const locale = locales[Math.floor(n / perLocale)];
  if (!locale) return [];

  const sub = n % perLocale;
  const slice = paths.slice(sub * SITEMAP_CHUNK_SIZE, (sub + 1) * SITEMAP_CHUNK_SIZE);

  // One shared Date instance across the chunk — 45k distinct Date objects
  // per chunk is pure waste, and the sitemap serializer only reads it.
  const lastModified = cachedLastModified ?? new Date();
  return slice.map((p) => ({ url: localeUrl(locale, p), lastModified }));
}

/** Absolute URLs of every chunk — used by the <sitemapindex> route. */
export async function getSitemapChunkUrls(): Promise<string[]> {
  const count = await getSitemapChunkCount();
  return Array.from({ length: count }, (_, i) => `${SITE_URL}/sitemap/${i}.xml`);
}

export async function getSitemapLastModified(): Promise<Date> {
  await getPlacePaths(); // ensures cachedLastModified is populated
  return cachedLastModified ?? new Date();
}
