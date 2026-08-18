/**
 * Operator details shown on the About / Contact / Privacy / Terms pages.
 *
 * ## You must fill these in before submitting to AdSense
 *
 * Google's Publisher Policies require a working way to reach the site
 * operator, and reviewers do check that the contact route on the page
 * actually resolves. These are left as obvious placeholders rather than
 * invented values: a privacy policy naming a company that doesn't exist,
 * or a contact address that bounces, is worse than no page at all — it
 * is a false statement to visitors and an automatic rejection.
 *
 * `CONTACT_EMAIL` is the only one that is genuinely required. The others
 * improve trust signals but the pages render correctly without them, and
 * each is omitted from the page rather than printed empty when unset.
 */

/** e.g. "contact@yoursite.com" — REQUIRED before going live. */
export const CONTACT_EMAIL = "";

/** Legal or trading name of whoever operates the site. */
export const OPERATOR_NAME = "";

/**
 * Postal address. Optional for AdSense, but expected if you take payments
 * or serve visitors in jurisdictions whose privacy law requires an
 * identifiable controller (GDPR Art. 13 is the common case).
 */
export const OPERATOR_ADDRESS = "";

/** Year the site started publishing — used in the footer copyright line. */
export const FOUNDED_YEAR = 2026;

/**
 * Set once AdSense is actually live. The privacy policy branches on this:
 * with ads off it must not claim a third party sets cookies, and with ads
 * on it must disclose exactly that. Describing behaviour the site doesn't
 * have is the same failure as omitting behaviour it does.
 */
export const ADS_ENABLED = false;

/** True when enough is configured to render a usable contact route. */
export const hasContactEmail = CONTACT_EMAIL.trim().length > 0;
