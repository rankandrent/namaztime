/**
 * Default calculation method + madhab per country, matching regional
 * convention (same approach IslamicFinder/Aladhan use). Overridable
 * per-visitor via MethodSelector (persisted in a cookie).
 */
import { CalculationMethod, Madhab } from "adhan";

export type MethodKey = keyof typeof CalculationMethod;
// adhan's Madhab is a plain object of string literals ("shafi" | "hanafi"),
// not a TS enum — this is the value type for CalculationParameters.madhab.
export type MadhabKey = (typeof Madhab)[keyof typeof Madhab];

export const DEFAULT_METHOD: MethodKey = "MuslimWorldLeague";
export const DEFAULT_MADHAB: MadhabKey = Madhab.Shafi;

const METHOD_BY_COUNTRY: Record<string, MethodKey> = {
  SA: "UmmAlQura",
  AE: "Dubai",
  EG: "Egyptian",
  PK: "Karachi",
  IN: "Karachi",
  BD: "Karachi",
  AF: "Karachi",
  US: "NorthAmerica",
  CA: "NorthAmerica",
  KW: "Kuwait",
  QA: "Qatar",
  SG: "Singapore",
  MY: "Singapore",
  BN: "Singapore",
  ID: "Singapore",
  IR: "Tehran",
  TR: "Turkey",
};

// Hanafi madhab (later Asr) is conventional in South/Central Asia and Turkey.
const HANAFI_COUNTRIES = new Set([
  "PK",
  "IN",
  "BD",
  "AF",
  "TR",
  "TJ",
  "UZ",
  "TM",
  "KG",
  "KZ",
]);

export function defaultMethodForCountry(countryCode: string): MethodKey {
  return METHOD_BY_COUNTRY[countryCode] ?? DEFAULT_METHOD;
}

/** "shafi" | "hanafi" — the form both adhan and UI components use. */
export function defaultMadhabKeyForCountry(countryCode: string): MadhabKey {
  return HANAFI_COUNTRIES.has(countryCode) ? Madhab.Hanafi : Madhab.Shafi;
}
