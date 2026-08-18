import { store } from "./store";
import { readRuntimeJson } from "./runtime-fetch";

interface SearchIndexEntry {
  geonameId: number;
  name: string;
  slug: string;
  countryCode: string;
  countrySlug: string;
  admin1Slug: string | null;
  population: number;
}

export interface SearchResult {
  type: "city" | "country";
  label: string;
  sublabel: string;
  href: string;
  population: number;
}

// Loaded once per server instance via readRuntimeJson (not a static
// `import`) — at 5.3MB this was the single largest contributor to the
// Workers bundle when it was statically imported. Cached as a shared
// promise so concurrent requests await the same fetch instead of each
// triggering their own.
let searchIndexPromise: Promise<SearchIndexEntry[]> | null = null;
function getSearchIndex(): Promise<SearchIndexEntry[]> {
  if (!searchIndexPromise) {
    searchIndexPromise = readRuntimeJson<SearchIndexEntry[]>("search-index.json").then(
      (data) => data ?? []
    );
  }
  return searchIndexPromise;
}

/**
 * Simple ranked substring search: prefix matches first (by population),
 * then contains-matches (by population). Good enough at ~35k rows without
 * a dedicated search index — see plan §Data Pipeline for the tradeoff.
 */
export async function searchPlaces(query: string, limit = 10): Promise<SearchResult[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const countryMatches: SearchResult[] = store.countries
    .filter((c) => c.name.toLowerCase().includes(q))
    .sort((a, b) => b.population - a.population)
    .slice(0, 3)
    .map((c) => ({
      type: "country" as const,
      label: c.name,
      sublabel: c.continent,
      href: `/${c.slug}`,
      population: c.population,
    }));

  const searchIndex = await getSearchIndex();
  const cityPrefix: SearchIndexEntry[] = [];
  const cityContains: SearchIndexEntry[] = [];
  for (const entry of searchIndex) {
    const nameLower = entry.name.toLowerCase();
    if (nameLower.startsWith(q)) cityPrefix.push(entry);
    else if (nameLower.includes(q)) cityContains.push(entry);
  }
  cityPrefix.sort((a, b) => b.population - a.population);
  cityContains.sort((a, b) => b.population - a.population);

  const country = (code: string) => store.countryByCode.get(code);

  const cityMatches: SearchResult[] = [...cityPrefix, ...cityContains]
    .slice(0, limit)
    .map((entry) => {
      const c = country(entry.countryCode);
      const regionSlug = entry.admin1Slug ?? entry.slug; // no-admin1 fallback
      return {
        type: "city" as const,
        label: entry.name,
        sublabel: c?.name ?? entry.countryCode,
        href: `/${entry.countrySlug}/${regionSlug}${entry.admin1Slug ? `/${entry.slug}` : ""}`,
        population: entry.population,
      };
    });

  return [...countryMatches, ...cityMatches].slice(0, limit);
}
