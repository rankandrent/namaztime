/**
 * Sitemap URL source.
 *
 * Covers all countries, all admin1 states that have content, and a staged
 * tier of the most populous cities, across all 17 locales.
 *
 * The path list is NOT computed here — `scripts/build-sitemap-paths.ts`
 * precomputes it into public/runtime-data/sitemap-paths.json at build
 * time. Doing it at request time meant fetching a 5.3MB index and sorting
 * ~34,000 cities on every sitemap hit, which blew the Workers free plan's
 * 10 ms CPU budget: /sitemap_index.xml was returning error 1102, so
 * Googlebot could not read the sitemap at all. Re-read that script's
 * header before changing anything here — the staging limit and the
 * `lastmod` semantics live there now.
 *
 * Chunking is locale-major: one chunk per locale, so Search Console
 * reports indexation per language and chunk boundaries don't shift when a
 * city is added.
 */
import { readRuntimeJson } from "@/lib/data/runtime-fetch";
import { locales } from "@/lib/i18n/config";
import { SITE_URL } from "./site";
import { localeUrl } from "@/lib/i18n/paths";

interface SitemapPathFile {
  /** ISO date the underlying place data last changed. */
  lastModified: string;
  paths: string[];
}

let pathFilePromise: Promise<SitemapPathFile> | null = null;
function getPathFile(): Promise<SitemapPathFile> {
  if (!pathFilePromise) {
    pathFilePromise = readRuntimeJson<SitemapPathFile>("sitemap-paths.json").then(
      (d) => d ?? { lastModified: new Date().toISOString(), paths: [] }
    );
  }
  return pathFilePromise;
}

export const SITEMAP_CHUNK_SIZE = 45_000; // safely under Google's 50k/file limit

export interface SitemapEntry {
  url: string;
  lastModified: Date;
}

async function chunksPerLocale(): Promise<number> {
  const { paths } = await getPathFile();
  return Math.max(1, Math.ceil(paths.length / SITEMAP_CHUNK_SIZE));
}

export async function getSitemapChunkCount(): Promise<number> {
  return locales.length * (await chunksPerLocale());
}

export async function getSitemapChunk(id: number | string): Promise<SitemapEntry[]> {
  // Next.js 16 passes `id` resolved from a Promise<string> (changed from
  // number in earlier versions) — coerce explicitly rather than relying on
  // `*`/`+`, where a string `id` silently does concatenation instead of
  // addition and produces wrong slice boundaries.
  const n = Number(id);
  const { paths, lastModified } = await getPathFile();
  const perLocale = Math.max(1, Math.ceil(paths.length / SITEMAP_CHUNK_SIZE));

  const locale = locales[Math.floor(n / perLocale)];
  if (!locale) return [];

  const sub = n % perLocale;
  const slice = paths.slice(sub * SITEMAP_CHUNK_SIZE, (sub + 1) * SITEMAP_CHUNK_SIZE);

  // One shared Date across the chunk — 45k identical Date objects would be
  // pure waste, and the serializer only reads it.
  const when = new Date(lastModified);
  return slice.map((p) => ({ url: localeUrl(locale, p), lastModified: when }));
}

/** Absolute URLs of every chunk — used by the <sitemapindex> route. */
export async function getSitemapChunkUrls(): Promise<string[]> {
  const count = await getSitemapChunkCount();
  return Array.from({ length: count }, (_, i) => `${SITE_URL}/sitemap/${i}.xml`);
}

export async function getSitemapLastModified(): Promise<Date> {
  return new Date((await getPathFile()).lastModified);
}
