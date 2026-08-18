import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Reads a JSON file from `public/runtime-data/` at request time, instead
 * of a bundler-resolved `import()`.
 *
 * Why this exists: `import(\`.../cities/${countryCode}.json\`)` (a dynamic
 * import with a template-literal path) is exactly the pattern Next.js
 * code-splits on Vercel/Node — each country's file becomes its own lazy
 * chunk. But OpenNext's Cloudflare build bundles the *entire* app into one
 * Workers script, so every file matching that glob (cities for all ~250
 * countries, names for all ~250 countries, the 5.3MB search index) got
 * pulled into a single ~111MB handler.mjs — over Workers' 64MB uncompressed
 * cap. Serving them as static assets and fetching the one file actually
 * needed per request keeps them out of the JS bundle entirely.
 *
 * Dual runtime, fs tried FIRST: `next build`'s static generation calls
 * this thousands of times (once per country, per worker process, across
 * 54k+ pages), and `getCloudflareContext()` — even though it does reject
 * quickly in isolation — is one more async hop we don't need there, since
 * a real filesystem is always available during build/dev. Cloudflare
 * Workers has no such filesystem (even with nodejs_compat, `public/` isn't
 * disk-backed), so fs failing there is the reliable, side-effect-free
 * signal to fall through to the ASSETS binding — no environment sniffing.
 */
export async function readRuntimeJson<T>(relativePath: string): Promise<T | null> {
  try {
    const { readFile } = await import("node:fs/promises");
    const path = await import("node:path");
    const full = path.join(process.cwd(), "public", "runtime-data", relativePath);
    const raw = await readFile(full, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    // No real filesystem — we're on Cloudflare. Fall through below.
  }
  try {
    const ctx = await getCloudflareContext({ async: true });
    if (ctx?.env?.ASSETS) {
      const url = new URL(`/runtime-data/${relativePath}`, "http://assets.local");
      const res = await ctx.env.ASSETS.fetch(new Request(url));
      if (!res.ok) return null;
      return (await res.json()) as T;
    }
  } catch {
    // Neither path available — return null below.
  }
  return null;
}
