/**
 * Qibla bearing and distance to the Kaaba.
 *
 * The bearing comes from adhan (same great-circle formula) rather than a
 * second hand-rolled implementation that could drift.
 */
import { Coordinates, Qibla } from "adhan";

export const KAABA = { lat: 21.4225, lon: 39.8262 };

const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Bearing in degrees (0-360, clockwise from true north). */
export function qiblaBearing(lat: number, lon: number): number {
  return Qibla(new Coordinates(lat, lon));
}

/** Great-circle distance to the Kaaba in kilometres. */
export function qiblaDistanceKm(lat: number, lon: number): number {
  return haversineKm(lat, lon, KAABA.lat, KAABA.lon);
}

/** Great-circle distance between two points, in kilometres. */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

export const COMPASS_POINTS = [
  "n", "nne", "ne", "ene", "e", "ese", "se", "sse",
  "s", "ssw", "sw", "wsw", "w", "wnw", "nw", "nnw",
] as const;

export type CompassPoint = (typeof COMPASS_POINTS)[number];

/** Nearest 16-point compass direction for a bearing in degrees. */
export function compassPoint16(bearing: number): CompassPoint {
  const idx = Math.round((((bearing % 360) + 360) % 360) / 22.5) % 16;
  return COMPASS_POINTS[idx];
}
