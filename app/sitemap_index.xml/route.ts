import { getSitemapChunkUrls, getSitemapLastModified } from "@/lib/seo/sitemap-source";

/**
 * The <sitemapindex>. Next's `generateSitemaps` serves each chunk at
 * /sitemap/{id}.xml but never emits a combining index, so we build one.
 *
 * Why `/sitemap_index.xml` and not `/sitemap.xml`: `app/sitemap.ts`
 * registers a metadata route at `/sitemap.xml` even though — with
 * `generateSitemaps` present — it only ever *serves* the numbered
 * `/sitemap/N.xml` chunks and leaves `/sitemap.xml` itself a 404. Adding
 * our own route there fails the build outright with "Conflicting route
 * and metadata at /sitemap.xml". `/sitemap_index.xml` is the same
 * convention Yoast popularised, and crawlers reach it from robots.txt.
 */
export const dynamic = "force-static";

export async function GET() {
  const [lastModified, urls] = await Promise.all([getSitemapLastModified(), getSitemapChunkUrls()]);
  const lastmod = lastModified.toISOString();
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((url) => `  <sitemap>\n    <loc>${url}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </sitemap>`)
  .join("\n")}
</sitemapindex>
`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml" },
  });
}
