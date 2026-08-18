import { CalculationMethod } from "adhan";
import type { MethodKey, MadhabKey } from "./method-by-country";

export const METHOD_COOKIE = "prayer_method";
export const MADHAB_COOKIE = "prayer_madhab";

// "Other" is excluded — it has no defined angles and isn't a real regional
// convention, just an escape hatch adhan offers for a fully custom setup.
export const SELECTABLE_METHODS = Object.keys(CalculationMethod).filter(
  (m) => m !== "Other"
) as MethodKey[];

export function isValidMethod(value: string | undefined): value is MethodKey {
  return !!value && (SELECTABLE_METHODS as string[]).includes(value);
}

export function isValidMadhab(value: string | undefined): value is MadhabKey {
  return value === "shafi" || value === "hanafi";
}
