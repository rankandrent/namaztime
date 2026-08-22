import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        // Crawlers (and people) try /sitemap.xml first. Next reserves
        // that exact path for the app/sitemap.ts metadata convention —
        // with generateSitemaps it only ever *serves* /sitemap/N.xml and
        // leaves /sitemap.xml a 404, and adding our own route there fails
        // the build ("Conflicting route and metadata at /sitemap.xml").
        // A redirect sidesteps the reservation and points them at the
        // real index, which robots.txt already advertises.
        source: "/sitemap.xml",
        destination: "/sitemap_index.xml",
        permanent: true,
      },
    ];
  },
};

export default withNextIntl(nextConfig);

// Lets `next dev` reach Cloudflare bindings (KV, etc.) locally by proxying
// through the Workers runtime instead of Node — a no-op in production,
// where the app already runs inside the real Worker.
initOpenNextCloudflareForDev();
