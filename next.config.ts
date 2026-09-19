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
  async headers() {
    // Security/best-practice response headers. Deliberately NO
    // X-Frame-Options / frame-ancestors CSP: the /embed/* routes exist to
    // be iframed on other sites, and a global frame block would break that
    // feature. These headers apply to every route.
    return [
      {
        source: "/:path*",
        headers: [
          // HSTS — tells browsers to always use HTTPS. Two years, with
          // subdomains and preload-eligible. A minor trust/ranking signal
          // and a real security win.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // Stops browsers MIME-sniffing a response into a different type.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Send only the origin as referrer cross-site; full path
          // same-origin. Standard privacy-preserving default.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);

// Lets `next dev` reach Cloudflare bindings (KV, etc.) locally by proxying
// through the Workers runtime instead of Node — a no-op in production,
// where the app already runs inside the real Worker.
initOpenNextCloudflareForDev();
