import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";
import kvTagCache from "@opennextjs/cloudflare/overrides/tag-cache/kv-next-tag-cache";

/**
 * Incremental cache: where rendered HTML for ISR pages lives. This is NOT
 * the same as Workers Static Assets (which only holds the 54k pages
 * pre-rendered at build time, well under the 100k-file account limit) —
 * every city page rendered on first request after that goes here instead,
 * which is what makes the other ~595k sitemap URLs (see
 * lib/seo/sitemap-source.ts) servable without pre-rendering them all.
 *
 * Using Cloudflare KV rather than R2 (OpenNext's documented recommendation
 * for this scale) only because R2 is not yet enabled on this Cloudflare
 * account — that's a one-click dashboard action ("Enable R2") that
 * requires the account owner, not something scriptable from here. KV's
 * eventual consistency (up to ~60s) is a non-issue for this site: city
 * pages revalidate on a 1800s timer, not on rapid writes, so a 60s window
 * where a stale value might still be served is invisible in practice.
 * Swap both overrides below to the r2-incremental-cache /
 * do-sharded-tag-cache modules once R2 is enabled — see the deploy notes
 * in memory (prayer-time-site-project.md) for the migration path.
 */
export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
  tagCache: kvTagCache,
  /**
   * Serve an already-cached page straight from the incremental cache
   * without booting the full Next.js server handler.
   *
   * This exists here for a specific, measured reason: on the Workers free
   * plan a request gets **10 ms of CPU**, and a full SSR of one of these
   * pages (parse the country's city JSON, scan for nearby cities, render
   * ~1,300 words plus JSON-LD) sits close enough to that ceiling that it
   * tips over under load. Googlebot crawls at far higher concurrency than
   * a human ever will, and Search Console recorded 30-50% failed crawl
   * requests because of it; reproduced locally at 10 concurrent requests
   * (4/40 failed). Interception removes almost all of that work for every
   * request after a page's first render, which is the overwhelming
   * majority of crawl traffic.
   *
   * Must stay `false` if PPR is ever enabled — the two are incompatible.
   */
  enableCacheInterception: true,
});
