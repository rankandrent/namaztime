/**
 * Every computed fact a city page needs, derived once per request.
 *
 * This is the single source for the prose sections, the FAQ, and the
 * JSON-LD — so a number can never disagree between the visible text and
 * the structured data.
 *
 * Cost: exactly **4** `computePrayerTimes` calls (~40 µs each). The
 * tempting alternative — scanning all ~30 days for a monthly min/max —
 * costs 30 calls/page, which is ~1.9M extra calls across a full build for
 * a claim ("earliest Fajr this month") that sampling can get wrong near a
 * solstice turning point anyway. Three *dated* samples are cheaper and
 * strictly more defensible: "on 1 Aug Fajr was 4:12 AM, by 31 Aug 3:47 AM"
 * is exactly true as stated.
 */
import { cache } from "react";
import { DateTime } from "luxon";
import { CalculationMethod } from "adhan";
import { computePrayerTimes, todayInTimezone, type DailyPrayerTimes } from "./calculate";
import { qiblaBearing, qiblaDistanceKm, compassPoint16, type CompassPoint } from "./qibla";
import { toHijriDate, type HijriDate } from "./hijri";
import {
  defaultMethodForCountry,
  defaultMadhabKeyForCountry,
  type MethodKey,
  type MadhabKey,
} from "./method-by-country";

export interface MonthSample {
  date: DateTime;
  fajr: DateTime;
  maghrib: DateTime;
}

export interface CityFacts {
  coordinates: { lat: number; lon: number };

  /** Today, in the city's own timezone (never the server's). */
  date: DateTime;
  hijri: HijriDate;
  times: DailyPrayerTimes;

  timezone: string;
  /** Today's offset — reading it from `date` keeps DST correct. */
  utcOffsetMinutes: number;
  utcOffsetLabel: string; // "+05:00"

  dayLengthMinutes: number; // sunrise -> maghrib
  nightLengthMinutes: number;
  fastingMinutes: number; // fajr -> maghrib
  fajrWindowMinutes: number; // fajr -> sunrise
  maghribToIshaMinutes: number;

  qibla: { bearing: number; distanceKm: number; compass: CompassPoint };

  method: MethodKey;
  madhab: MadhabKey;
  methodParams: {
    fajrAngle: number;
    ishaAngle: number;
    /** Minutes after Maghrib; >0 means this method ignores ishaAngle. */
    ishaInterval: number;
    maghribAngle: number;
  };
  /** 1 for Shafi, 2 for Hanafi — the Asr shadow multiplier. */
  asrShadowFactor: 1 | 2;

  /** First, middle and last day of the current month. */
  monthSamples: MonthSample[];
}

const diffMinutes = (a: DateTime, b: DateTime) => Math.round(a.diff(b, "minutes").minutes);

export interface CityFactsInput {
  lat: number;
  lon: number;
  timezone: string;
  countryCode: string;
}

function buildCityFacts({ lat, lon, timezone, countryCode }: CityFactsInput): CityFacts {
  const method = defaultMethodForCountry(countryCode);
  const madhab = defaultMadhabKeyForCountry(countryCode);
  const date = todayInTimezone(timezone);

  const times = computePrayerTimes({ lat, lon, timezone, date, method, madhab });

  const params = CalculationMethod[method]();

  // Three dated samples: 1st, 15th, last day of this month.
  const first = date.startOf("month");
  const last = date.endOf("month").startOf("day");
  const mid = first.set({ day: Math.min(15, last.day) });
  const monthSamples: MonthSample[] = [first, mid, last].map((d) => {
    const t = computePrayerTimes({ lat, lon, timezone, date: d, method, madhab });
    return { date: d, fajr: t.fajr, maghrib: t.maghrib };
  });

  const bearing = qiblaBearing(lat, lon);

  return {
    coordinates: { lat, lon },
    date,
    hijri: toHijriDate(date),
    times,
    timezone,
    utcOffsetMinutes: date.offset,
    utcOffsetLabel: date.toFormat("ZZ"),
    dayLengthMinutes: diffMinutes(times.maghrib, times.sunrise),
    nightLengthMinutes: 24 * 60 - diffMinutes(times.maghrib, times.sunrise),
    fastingMinutes: diffMinutes(times.maghrib, times.fajr),
    fajrWindowMinutes: diffMinutes(times.sunrise, times.fajr),
    maghribToIshaMinutes: diffMinutes(times.isha, times.maghrib),
    qibla: {
      bearing,
      distanceKm: qiblaDistanceKm(lat, lon),
      compass: compassPoint16(bearing),
    },
    method,
    madhab,
    methodParams: {
      fajrAngle: params.fajrAngle,
      ishaAngle: params.ishaAngle,
      ishaInterval: params.ishaInterval,
      maghribAngle: params.maghribAngle,
    },
    asrShadowFactor: madhab === "hanafi" ? 2 : 1,
    monthSamples,
  };
}

/**
 * React `cache` dedupes this within a single request, so the page shell,
 * the prose sections and the FAQ builder can each ask for facts without
 * recomputing them.
 */
export const getCityFacts = cache(buildCityFacts);
