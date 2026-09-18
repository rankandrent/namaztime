import type { Metadata } from "next";

export type CityTier = "A" | "B" | "C";

/**
 * Top Muslim-majority countries where Islamic prayer times are the primary daily utility.
 * In these markets, prayer time search volume is exceptionally high across all population tiers.
 */
export const MUSLIM_MAJORITY_COUNTRIES = new Set([
  "PK", // Pakistan
  "ID", // Indonesia
  "TR", // Turkey
  "EG", // Egypt
  "SA", // Saudi Arabia
  "BD", // Bangladesh
  "MA", // Morocco
  "DZ", // Algeria
  "IQ", // Iraq
  "IR", // Iran
  "AE", // United Arab Emirates
  "MY", // Malaysia
  "QA", // Qatar
  "KW", // Kuwait
  "OM", // Oman
  "JO", // Jordan
  "LB", // Lebanon
  "TN", // Tunisia
  "YE", // Yemen
  "SD", // Sudan
  "SY", // Syria
  "AF", // Afghanistan
  "UZ", // Uzbekistan
  "AZ", // Azerbaijan
  "KZ", // Kazakhstan
  "TJ", // Tajikistan
  "TM", // Turkmenistan
  "KG", // Kyrgyzstan
  "SO", // Somalia
  "LY", // Libya
  "SN", // Senegal
  "ML", // Mali
  "NE", // Niger
  "BH", // Bahrain
  "PS", // Palestine
]);

/**
 * High-value Western Diaspora markets with active Muslim communities, high search intent,
 * and high commercial RPM/CPC.
 */
export const WESTERN_DIASPORA_COUNTRIES = new Set([
  "US", // United States
  "GB", // United Kingdom
  "CA", // Canada
  "DE", // Germany
  "FR", // France
  "AU", // Australia
]);

/**
 * Countries with massive absolute Muslim populations or strategic regional importance.
 */
export const SIGNIFICANT_MINORITY_COUNTRIES = new Set([
  "IN", // India (200M+ Muslims)
  "SG", // Singapore
  "ZA", // South Africa
  "KE", // Kenya
  "NG", // Nigeria (100M+ Muslims)
  "RU", // Russia (15M+ Muslims)
  "LK", // Sri Lanka
  "TH", // Thailand (Southern provinces)
  "PH", // Philippines (BARMM)
  "ET", // Ethiopia
  "GH", // Ghana
  "TZ", // Tanzania
]);

/**
 * Classifies a city into Tier A (High Intent), Tier B (Medium Intent), or Tier C (Low/Zero Intent).
 */
export function getCityTier(countryCode: string, population: number): CityTier {
  const cc = countryCode.toUpperCase();

  if (MUSLIM_MAJORITY_COUNTRIES.has(cc)) {
    if (population >= 50_000) return "A";
    return "B"; // All localities in Muslim-majority countries maintain at least Tier B status
  }

  if (WESTERN_DIASPORA_COUNTRIES.has(cc)) {
    if (population >= 50_000) return "A";
    if (population >= 15_000) return "B";
    return "C"; // Small rural towns under 15k have negligible search intent
  }

  if (SIGNIFICANT_MINORITY_COUNTRIES.has(cc)) {
    if (population >= 100_000) return "A";
    if (population >= 35_000) return "B";
    return "C";
  }

  // All other countries (e.g. Brazil, China, Japan, Poland, Colombia, Mexico, Argentina)
  // Only major world metropolises and significant urban centers have search intent.
  if (population >= 500_000) return "A";
  if (population >= 150_000) return "B";
  return "C"; // Population < 150,000 in non-Muslim countries generates index bloat
}

/**
 * Generates SEO robots directives.
 * Every city page is configured with "index, follow" and full snippet/media permissions for Googlebot.
 */
export function getCityRobots(_tier?: CityTier): Metadata["robots"] {
  return {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  };
}

/**
 * Returns XML sitemap priority based on tier and population.
 */
export function getCityPriority(tier: CityTier, population: number): string {
  if (tier === "A") {
    return population >= 1_000_000 ? "1.0" : "0.9";
  }
  if (tier === "B") {
    return population >= 50_000 ? "0.7" : "0.6";
  }
  return "0.3";
}
