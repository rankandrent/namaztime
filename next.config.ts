import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

const nextConfig: NextConfig = {
  /* config options here */
};

export default withNextIntl(nextConfig);

// Lets `next dev` reach Cloudflare bindings (KV, etc.) locally by proxying
// through the Workers runtime instead of Node — a no-op in production,
// where the app already runs inside the real Worker.
initOpenNextCloudflareForDev();
