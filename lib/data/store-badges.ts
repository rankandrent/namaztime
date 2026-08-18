/**
 * "Get it on Google Play" / "Download on the App Store" badges.
 *
 * Local static assets (public/badges/), not hotlinked — a prior version
 * of this file fetched Google's and Apple's own per-locale badge
 * services instead. That was dropped for two concrete reasons:
 *
 *   1. Size mismatch. Google's PNG badge bakes in ~33% vertical padding
 *      around the actual pill artwork (measured: only 168px of visible
 *      content in a 250px canvas) while Apple's SVG has none — so at
 *      any shared CSS height the two looked mismatched, and fixing it
 *      needed an empirically-measured height-correction hack.
 *   2. Inconsistent locale coverage. Apple only publishes badge art for
 *      12 of our 17 locales (ar/fa/hi/ur/bn silently fall back to
 *      English), so "localized" was already a partial promise.
 *
 * These two files are a matched pair — both exactly 120×40 — so neither
 * problem exists here: same aspect ratio, same padding (none), one
 * consistent look at every locale. The trade-off is real and deliberate:
 * the badge *artwork* stays in English everywhere (these were supplied
 * as the English-language variant), whereas Google's hotlinked badges
 * were genuinely localized for 16/17 locales. The accessible name below
 * — what screen readers announce, translated in all 17 locales — still
 * correctly says "Google Play" / "App Store" regardless of what the
 * image itself renders; only the visible badge graphic is English-only.
 * If per-locale badge art is ever wanted back, reintroduce the
 * `googlePlayBadgeUrl(locale)` / `appStoreBadgeUrl(locale)` pattern this
 * replaced rather than re-deriving the padding fix from scratch.
 */

export const GOOGLE_PLAY_BADGE_SRC = "/badges/google-play-badge.svg";
export const APP_STORE_BADGE_SRC = "/badges/app-store-badge.svg";

/** Both badge files share this viewBox exactly — verified, not assumed. */
export const STORE_BADGE_ASPECT = { width: 120, height: 40 };
