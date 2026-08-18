import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";
import enMessages from "../../messages/en.json";

type Messages = Record<string, unknown>;

/**
 * Deep-merges a locale's messages over English.
 *
 * Without this, a key missing from a translation does **not** fall back —
 * next-intl logs MISSING_MESSAGE and renders the raw key path, so a
 * reader sees the literal text `home.aboutBody` on the page. Across 17
 * locales that is a guaranteed source of visibly broken pages every time
 * a new English string lands before its translations do, which on a site
 * this size is constantly.
 *
 * English underneath means the worst case is a paragraph in the wrong
 * language — degraded, but readable and honest — instead of debug output.
 * `scripts/check-messages.ts` remains the thing that tells us which keys
 * are still untranslated; this only changes what the *reader* sees, and
 * deliberately doesn't paper over the gap for us.
 */
function deepMerge(base: Messages, override: Messages): Messages {
  const out: Messages = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const existing = out[key];
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      existing &&
      typeof existing === "object" &&
      !Array.isArray(existing)
    ) {
      out[key] = deepMerge(existing as Messages, value as Messages);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const messages =
    locale === routing.defaultLocale
      ? (enMessages as Messages)
      : deepMerge(
          enMessages as Messages,
          (await import(`../../messages/${locale}.json`)).default as Messages
        );

  return { locale, messages };
});
