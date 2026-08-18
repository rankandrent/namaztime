/**
 * Core prayer-time calculation. Times are never stored — they're computed
 * on demand from lat/lon + date + the city's IANA timezone.
 */
import { Coordinates, CalculationMethod, PrayerTimes, HighLatitudeRule } from "adhan";
import { DateTime } from "luxon";
import type { MethodKey, MadhabKey } from "./method-by-country";

export interface DailyPrayerTimes {
  fajr: DateTime;
  sunrise: DateTime;
  dhuhr: DateTime;
  asr: DateTime;
  maghrib: DateTime;
  isha: DateTime;
}

export interface ComputeArgs {
  lat: number;
  lon: number;
  timezone: string;
  /** Calendar date to compute for, in the city's own local timezone. */
  date: DateTime;
  method: MethodKey;
  madhab: MadhabKey;
}

/**
 * Resolves "today" for a city correctly: must be today's date in the
 * city's own IANA timezone, not the server's or visitor's timezone —
 * a city that has already crossed local midnight relative to the server
 * must show the next day's times.
 */
export function todayInTimezone(timezone: string): DateTime {
  return DateTime.now().setZone(timezone).startOf("day");
}

export function computePrayerTimes({
  lat,
  lon,
  timezone,
  date,
  method,
  madhab,
}: ComputeArgs): DailyPrayerTimes {
  const params = CalculationMethod[method]();
  params.madhab = madhab;
  // Needed for high-latitude cities (e.g. Reykjavik, Tromsø) where the
  // standard sun-angle rules can fail to resolve near the solstices.
  params.highLatitudeRule = HighLatitudeRule.TwilightAngle;

  const coordinates = new Coordinates(lat, lon);
  // adhan's PrayerTimes takes a plain JS Date interpreted at UTC-instant
  // granularity; we pass the UTC-noon instant of the target local day to
  // avoid any date-boundary ambiguity, then convert results into the
  // city's own zone for display.
  const dateAtNoonUtc = date.set({ hour: 12 }).toUTC().toJSDate();
  const pt = new PrayerTimes(coordinates, dateAtNoonUtc, params);

  const toZoned = (d: Date) => DateTime.fromJSDate(d).setZone(timezone);

  return {
    fajr: toZoned(pt.fajr),
    sunrise: toZoned(pt.sunrise),
    dhuhr: toZoned(pt.dhuhr),
    asr: toZoned(pt.asr),
    maghrib: toZoned(pt.maghrib),
    isha: toZoned(pt.isha),
  };
}
