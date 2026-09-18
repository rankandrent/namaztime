import createMiddleware from "next-intl/middleware";
import { routing } from "./lib/i18n/routing";
import { NextRequest, NextResponse } from "next/server";

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  // If this is an internal ISR revalidation request from OpenNext or Next.js,
  // bypass next-intl's locale redirection so Next.js executes the route directly
  // and returns HTTP 200 with `x-nextjs-cache: REVALIDATED`.
  if (
    request.headers.get("x-isr") === "1" ||
    request.headers.has("x-prerender-revalidate")
  ) {
    return NextResponse.next();
  }
  return intlMiddleware(request);
}

export const config = {
  // Skip API routes, Next.js internals, and files with an extension
  // (favicon.ico, images, etc.) — everything else gets locale-routed.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
