/**
 * Canonical site origin — the single source for canonical tags, hreflang,
 * sitemap and robots.txt.
 *
 * Defaults to the production domain so a build without env vars still
 * emits correct absolute URLs; NEXT_PUBLIC_SITE_URL overrides it for
 * preview/staging deploys, where emitting production URLs would tell
 * Google the staging copy is canonical.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://maghrib-time.com"
).replace(/\/$/, "");
