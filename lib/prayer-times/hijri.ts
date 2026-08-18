/**
 * Gregorian -> Hijri conversion. Tabular/astronomical algorithm — can
 * differ ±1 day from local moon-sighting announcements, so always label
 * this "approximate" in the UI rather than authoritative.
 */
import { toHijri } from "hijri-converter";
import type { DateTime } from "luxon";

const HIJRI_MONTHS = [
  "Muharram",
  "Safar",
  "Rabi' al-awwal",
  "Rabi' al-thani",
  "Jumada al-awwal",
  "Jumada al-thani",
  "Rajab",
  "Sha'ban",
  "Ramadan",
  "Shawwal",
  "Dhu al-Qi'dah",
  "Dhu al-Hijjah",
] as const;

export interface HijriDate {
  year: number;
  month: number; // 1-12
  monthName: string;
  day: number;
}

export function toHijriDate(date: DateTime): HijriDate {
  const { hy, hm, hd } = toHijri(date.year, date.month, date.day);
  return {
    year: hy,
    month: hm,
    monthName: HIJRI_MONTHS[hm - 1],
    day: hd,
  };
}
