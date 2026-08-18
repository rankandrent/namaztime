import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
    // A single index URL — the individual /sitemap/N.xml chunks are listed
    // inside it. See app/sitemap_index.xml/route.ts for why it isn't at
    // /sitemap.xml (Next reserves that path for the metadata convention).
    sitemap: `${SITE_URL}/sitemap_index.xml`,
  };
}
