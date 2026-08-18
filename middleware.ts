import createMiddleware from "next-intl/middleware";
import { routing } from "./lib/i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Skip API routes, Next.js internals, and files with an extension
  // (favicon.ico, images, etc.) — everything else gets locale-routed.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
