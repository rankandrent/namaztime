/**
 * Locale-aware formatters shared by the server prose and the client
 * table, so a time can never render two different ways on one page.
 *
 * Everything here returns a finished string. Message files then only
 * splice those strings in — they never carry ICU `{n, number}` or
 * `{d, date}` skeletons. That's deliberate: a translator (human or
 * machine) editing 17 files cannot break number or date output if there
 * are no format skeletons to break.
 */
import { DateTime } from "luxon";

/** e.g. "4:00 AM" (en), "٤:٠٠ ص" (ar) — locale's own convention. */
export function formatTime(dt: DateTime, locale: string): string {
  return dt.setLocale(locale).toLocaleString(DateTime.TIME_SIMPLE);
}

/** e.g. "Sunday, 16 August 2026". */
export function formatDate(dt: DateTime, locale: string): string {
  return dt.setLocale(locale).toLocaleString(DateTime.DATE_HUGE);
}

/** e.g. "16 August". */
export function formatDayMonth(dt: DateTime, locale: string): string {
  return dt.setLocale(locale).toLocaleString({ day: "numeric", month: "long" });
}

/** e.g. "August 2026". */
export function formatMonthYear(dt: DateTime, locale: string): string {
  return dt.setLocale(locale).toLocaleString({ month: "long", year: "numeric" });
}

export function formatNumber(n: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(n);
}

/** e.g. "260.3°" with locale digits. */
export function formatDegrees(deg: number, locale: string): string {
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(deg)}°`;
}

/** Coordinate with 4dp, e.g. "31.5580". */
export function formatCoordinate(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(value);
}

/**
 * Duration in minutes -> "1 hour 28 minutes" / "13 hours 17 minutes".
 *
 * Uses Intl unit formatting rather than message keys: it gets plural
 * forms right in every locale for free (Arabic alone has six plural
 * categories), and `Intl.ListFormat` supplies the locale's own joining
 * convention — Urdu's "اور", Russian's spacing, and so on. Doing this
 * with ICU plurals in 17 message files would be both larger and easier
 * to get wrong.
 */
export function formatDuration(totalMinutes: number, locale: string): string {
  const mins = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(mins / 60);
  const m = mins % 60;

  const unit = (value: number, u: "hour" | "minute") =>
    new Intl.NumberFormat(locale, {
      style: "unit",
      unit: u,
      unitDisplay: "long",
    }).format(value);

  const parts: string[] = [];
  if (h > 0) parts.push(unit(h, "hour"));
  if (m > 0 || h === 0) parts.push(unit(m, "minute"));

  return new Intl.ListFormat(locale, { style: "narrow", type: "unit" }).format(parts);
}

/** "1 minute" / "12 minutes", locale-correct. */
export function formatMinutes(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit: "minute",
    unitDisplay: "long",
  }).format(value);
}

/** "9 km" / "3,598 km", locale-correct. */
export function formatKm(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit: "kilometer",
    unitDisplay: "short",
    maximumFractionDigits: 0,
  }).format(value);
}

/** "234 m", locale-correct. */
export function formatMetres(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit: "meter",
    unitDisplay: "short",
    maximumFractionDigits: 0,
  }).format(value);
}
