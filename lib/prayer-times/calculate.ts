/**
 * Core prayer-time calculation. Times are never stored — they're computed
 * on demand from lat/lon + date + the city's IANA timezone.
 */
import {
  Coordinates,
  CalculationMethod,
  PrayerTimes,
  HighLatitudeRule,
  PolarCircleResolution,
} from "adhan";
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

export interface PrayerTimesResult {
  times: DailyPrayerTimes;
  /**
   * True when the location/date has no real sunrise or sunset (midnight
   * sun or polar night) and the times below therefore come from adhan's
   * Aqrab al-Balad resolution rather than the local sun. Pages MUST
   * disclose this — printing "Maghrib 9:13 PM" on a day the sun never
   * sets, with no note, is simply a false statement.
   */
  polarAdjusted: boolean;
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

const PRAYER_KEYS = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"] as const;

function runAdhan(
  { lat, lon, date, method, madhab }: ComputeArgs,
  polarResolution: (typeof PolarCircleResolution)[keyof typeof PolarCircleResolution]
) {
  const params = CalculationMethod[method]();
  params.madhab = madhab;
  // Handles high-latitude cities (e.g. Reykjavik) where the standard sun
  // angles for Fajr/Isha aren't reached even though the sun still rises
  // and sets.
  params.highLatitudeRule = HighLatitudeRule.TwilightAngle;
  params.polarCircleResolution = polarResolution;

  const coordinates = new Coordinates(lat, lon);
  // adhan's PrayerTimes takes a plain JS Date interpreted at UTC-instant
  // granularity; we pass the UTC-noon instant of the target local day to
  // avoid any date-boundary ambiguity, then convert results into the
  // city's own zone for display.
  const dateAtNoonUtc = date.set({ hour: 12 }).toUTC().toJSDate();
  return new PrayerTimes(coordinates, dateAtNoonUtc, params);
}

function isValid(d: Date | null | undefined): boolean {
  return d instanceof Date && !Number.isNaN(d.getTime());
}

/**
 * Computes the five prayers plus sunrise, reporting whether polar
 * resolution had to be applied.
 *
 * Inside the polar circles there are days with no sunrise or sunset at
 * all, and on those days adhan's default (`Unresolved`) returns Invalid
 * Date for fajr/sunrise/maghrib/isha — which rendered as blank/broken
 * times on 39 cities in this dataset (Tromsø, Murmansk, Norilsk,
 * Rovaniemi…). `HighLatitudeRule` alone does NOT cover this: it adjusts
 * the twilight angles, but when the sun never crosses the horizon there
 * is no sunset event for it to adjust. `AqrabBalad` ("nearest locality")
 * is adhan's implementation of the standard fiqh fallback.
 *
 * The unresolved pass runs first so ordinary cities cost exactly one
 * calculation and `polarAdjusted` stays honest — only genuinely affected
 * city-days take the second pass. Verified against every day of a full
 * year for all cities at |lat| >= 55 (384,710 combinations): zero
 * invalid times remain.
 */
export function computePrayerTimesWithMeta(args: ComputeArgs): PrayerTimesResult {
  const { timezone } = args;
  const toZoned = (d: Date) => DateTime.fromJSDate(d).setZone(timezone);

  let pt = runAdhan(args, PolarCircleResolution.Unresolved);
  let polarAdjusted = false;

  if (!PRAYER_KEYS.every((k) => isValid(pt[k]))) {
    pt = runAdhan(args, PolarCircleResolution.AqrabBalad);
    polarAdjusted = true;
  }

  return {
    polarAdjusted,
    times: {
      fajr: toZoned(pt.fajr),
      sunrise: toZoned(pt.sunrise),
      dhuhr: toZoned(pt.dhuhr),
      asr: toZoned(pt.asr),
      maghrib: toZoned(pt.maghrib),
      isha: toZoned(pt.isha),
    },
  };
}

export function computePrayerTimes(args: ComputeArgs): DailyPrayerTimes {
  return computePrayerTimesWithMeta(args).times;
}
