import createMiddleware from "next-intl/middleware";
import { routing } from "./lib/i18n/routing";
import { NextRequest, NextResponse } from "next/server";

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  // Canonical host: redirect www -> apex. www.maghrib-time.com already has
  // a proxied CNAME in DNS; wrangler.jsonc adds a Worker route for it so
  // those requests reach this Worker, and this 301 sends every one to the
  // bare maghrib-time.com that all canonicals, hreflang and the sitemap
  // already point at — no duplicate host. Runs before everything else,
  // including the ISR bypass.
  if (request.nextUrl.hostname === "www.maghrib-time.com") {
    const url = new URL(request.url);
    url.hostname = "maghrib-time.com";
    return NextResponse.redirect(url, 301);
  }

  // If this is an internal ISR revalidation request from OpenNext or Next.js,
  // bypass next-intl's locale redirection so Next.js executes the route directly
  // and returns HTTP 200 with `x-nextjs-cache: REVALIDATED`.
  if (
    request.headers.get("x-isr") === "1" ||
    request.headers.has("x-prerender-revalidate")
  ) {
    return NextResponse.next();
  }

  const response = intlMiddleware(request);

  // next-intl issues a TEMPORARY (307) redirect when it strips the default
  // locale prefix — /en and /en/* normalise to the unprefixed English URL.
  // That normalisation is permanent (English is always served unprefixed),
  // so upgrade it to a 308 permanent redirect: it tells Google the /en URL
  // is a permanent alias to consolidate, not a temporary one to keep
  // revisiting. Scoped strictly to /en paths — other locale prefixes are
  // valid and next-intl does not redirect them.
  const path = request.nextUrl.pathname;
  if (
    response.status === 307 &&
    (path === "/en" || path.startsWith("/en/"))
  ) {
    const location = response.headers.get("location");
    if (location) {
      return NextResponse.redirect(new URL(location, request.url), 308);
    }
  }

  return response;
}

export const config = {
  // Skip API routes, Next.js internals, and files with an extension
  // (favicon.ico, images, etc.) — everything else gets locale-routed.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
