import type { MetadataRoute } from "next";
import { getSitemapChunkCount, getSitemapChunk } from "@/lib/seo/sitemap-source";

export async function generateSitemaps() {
  const count = await getSitemapChunkCount();
  return Array.from({ length: count }, (_, id) => ({ id }));
}

// Next.js 16: `id` resolves from a Promise<string> (see generateSitemaps
// docs' version history — changed from number in earlier versions).
export default async function sitemap({
  id,
}: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  return await getSitemapChunk(await id);
}
