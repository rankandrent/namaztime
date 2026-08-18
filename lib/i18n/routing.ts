import { defineRouting } from "next-intl/routing";
import { locales, defaultLocale } from "./config";

export const routing = defineRouting({
  locales,
  defaultLocale,
  // English (the default) is served unprefixed — `/pakistan`, not
  // `/en/pakistan` — while every other locale keeps its prefix. next-intl
  // 308-redirects `/en/...` to the bare path, so the two never both
  // resolve. Every URL we emit goes through lib/i18n/paths.ts so the
  // rule is applied in exactly one place.
  localePrefix: "as-needed",
  // Off, deliberately, and only because of the pairing with "as-needed"
  // above: with detection on, next-intl treats *any* unprefixed path —
  // not just bare "/" — as unresolved and redirects it via the
  // NEXT_LOCALE cookie or Accept-Language. That cookie gets set the
  // moment a visitor opens any `/ur/...` URL once, so a returning
  // visitor typing or clicking the plain English URL for a page they
  // want in English got silently bounced to Urdu instead — caught by
  // navigating directly to an unprefixed URL in a tab that had
  // previously visited a prefixed one. That's exactly backwards for a
  // site whose canonical tags, hreflang, and ~650k sitemap URLs all
  // promise a specific, stable locale at a specific, stable path.
  // Detection would still be fine under `localePrefix: "always"` (every
  // locale, including English, has an explicit segment, so "unprefixed"
  // only ever meant the bare root) — it's only unsafe once English's own
  // URLs became unprefixed. The one cost: a first-time visitor landing
  // on bare "/" no longer auto-redirects to their browser's language;
  // they see English with the switcher in the header, which is a fair
  // trade for every other URL on the site staying trustworthy.
  localeDetection: false,
});
