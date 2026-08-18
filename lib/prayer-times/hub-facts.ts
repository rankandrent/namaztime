/**
 * Facts for a *hub* page — a country or state — as opposed to a single
 * city (see city-facts.ts).
 *
 * The point of these pages, SEO-wise, is that they must say something
 * true and specific that isn't just a link list. The two things a hub
 * genuinely knows that its children don't are (a) the spread across it —
 * of longitude, latitude, timezone — and (b) today's actual times in its
 * biggest places, side by side. Both are computed here.
 *
 * Cost control: `computePrayerTimes` runs once per listed city, and the
 * list is capped at HUB_CITY_LIMIT. A country hub therefore costs ~8
 * adhan calls, not one per city in the country (India would be 3,779).
 */
import { cache } from "react";
import { DateTime } from "luxon";
import { computePrayerTimes, todayInTimezone } from "./calculate";
import {
  defaultMethodForCountry,
  defaultMadhabKeyForCountry,
  type MethodKey,
  type MadhabKey,
} from "./method-by-country";
import type { City } from "@/lib/data/types";

/** How many cities a hub lists with times. Kept small deliberately —
 * this is a teaser that earns a click, not a replacement for the state
 * page's full list. */
export const HUB_CITY_LIMIT = 8;

export interface HubCityTime {
  city: City;
  fajr: DateTime;
  maghrib: DateTime;
}

export interface HubFacts {
  /** The date all times below were computed for, in the hub's own
   * representative timezone — so the page can date-stamp them. */
  date: DateTime;
  method: MethodKey;
  madhab: MadhabKey;
  /** Distinct IANA timezones across the places in this hub. */
  timezones: string[];
  /** Difference in *solar* time between the east- and west-most city,
   * in minutes. Longitude alone drives this: 15° ≈ 60 min. Null when
   * there are fewer than two cities to compare. */
  longitudeSpreadMinutes: number | null;
  latitudeRange: { south: number; north: number } | null;
  /** Most-populous cities, with today's Fajr/Maghrib each. */
  cityTimes: HubCityTime[];
}

function buildHubFacts({
  cities,
  countryCode,
  limit = HUB_CITY_LIMIT,
}: {
  cities: City[];
  countryCode: string;
  limit?: number;
}): HubFacts {
  const method = defaultMethodForCountry(countryCode);
  const madhab = defaultMadhabKeyForCountry(countryCode);

  const timezones = [...new Set(cities.map((c) => c.timezone))].sort();

  // "Today" is resolved in the hub's most-common timezone, not the
  // server's — a country spanning midnight would otherwise date-stamp
  // the page with the build machine's day.
  const representativeTz =
    cities.length > 0
      ? [...cities.reduce((m, c) => m.set(c.timezone, (m.get(c.timezone) ?? 0) + 1), new Map<string, number>())]
          .sort((a, b) => b[1] - a[1])[0][0]
      : "UTC";
  const date = todayInTimezone(representativeTz);

  let longitudeSpreadMinutes: number | null = null;
  let latitudeRange: { south: number; north: number } | null = null;
  if (cities.length >= 2) {
    const lons = cities.map((c) => c.lon);
    const lats = cities.map((c) => c.lat);
    // 360° of longitude = 24 h, so 1° = 4 minutes of solar time.
    longitudeSpreadMinutes = Math.round((Math.max(...lons) - Math.min(...lons)) * 4);
    latitudeRange = { south: Math.min(...lats), north: Math.max(...lats) };
  }

  const cityTimes: HubCityTime[] = cities
    .slice()
    .sort((a, b) => b.population - a.population)
    .slice(0, limit)
    .map((city) => {
      const times = computePrayerTimes({
        lat: city.lat,
        lon: city.lon,
        timezone: city.timezone,
        // Each city's own local day — not the hub's — so a city on the
        // far side of a timezone boundary still gets its own correct day.
        date: todayInTimezone(city.timezone),
        method,
        madhab,
      });
      return { city, fajr: times.fajr, maghrib: times.maghrib };
    });

  return {
    date,
    method,
    madhab,
    timezones,
    longitudeSpreadMinutes,
    latitudeRange,
    cityTimes,
  };
}

export const getHubFacts = cache(buildHubFacts);
