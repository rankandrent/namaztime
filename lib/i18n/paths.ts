import { defaultLocale } from "./config";
import { SITE_URL } from "@/lib/seo/site";

/**
 * Builds a locale-prefixed path, honouring `localePrefix: "as-needed"`:
 * the default locale (English) is served unprefixed, so `/pakistan`
 * rather than `/en/pakistan`.
 *
 * Everything that emits a URL — canonical tags, hreflang, JSON-LD,
 * sitemap — goes through here. Building these by hand is how a site ends
 * up advertising `/en/pakistan` in its sitemap while serving a 308 to
 * `/pakistan`, which wastes crawl budget on every single URL.
 *
 * @param path Locale-agnostic path with a leading slash ("/pakistan"),
 *             or "" for the home page.
 */
export function localePath(locale: string, path = ""): string {
  if (locale === defaultLocale) return path || "/";
  return `/${locale}${path}`;
}

/** Absolute form of {@link localePath}, for canonical/hreflang/sitemap. */
export function localeUrl(locale: string, path = ""): string {
  const p = localePath(locale, path);
  // Avoid a trailing slash on the origin itself: SITE_URL + "/" would
  // emit "https://site.com/" while the canonical elsewhere is bare.
  return p === "/" ? SITE_URL : `${SITE_URL}${p}`;
}
