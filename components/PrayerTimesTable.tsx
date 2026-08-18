"use client";

import { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import { useLocale, useTranslations } from "next-intl";
import { computePrayerTimes, todayInTimezone } from "@/lib/prayer-times/calculate";
import type { MethodKey, MadhabKey } from "@/lib/prayer-times/method-by-country";
import {
  METHOD_COOKIE,
  MADHAB_COOKIE,
  isValidMethod,
  isValidMadhab,
} from "@/lib/prayer-times/preferences";
import { MethodSelector } from "@/components/MethodSelector";
import { MonthlyCalendar } from "@/components/MonthlyCalendar";

type PrayerKey = "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha";
const PRAYER_KEYS: PrayerKey[] = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];
// "sunrise" isn't a prayer, but is shown in the table and excluded from
// the active-prayer/countdown logic below.
const ACTIONABLE: Exclude<PrayerKey, "sunrise">[] = [
  "fajr",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
];

function readCookie(name: string): string | undefined {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];
}

export interface PrayerTimesTableProps {
  lat: number;
  lon: number;
  timezone: string;
  /** Country-based default — always correct for SSR/first paint, since it
   * doesn't depend on any per-visitor state (keeps this route ISR-cacheable;
   * see comment below on why the override isn't read server-side). */
  defaultMethod: MethodKey;
  defaultMadhab: MadhabKey;
}

export function PrayerTimesTable({
  lat,
  lon,
  timezone,
  defaultMethod,
  defaultMadhab,
}: PrayerTimesTableProps) {
  const t = useTranslations();
  const locale = useLocale();

  // The method/madhab override lives in a cookie so it persists across
  // visits, but it's deliberately read client-side only, not via
  // `cookies()` in the server component. Reading cookies server-side would
  // opt every city page out of static rendering/ISR — a per-visitor
  // preference isn't worth losing the scale strategy in plan §Rendering
  // Strategy for. Same hydration-safe seeding pattern as the clock below:
  // start at the server-safe default, then adopt the cookie value post-mount.
  const [method, setMethod] = useState<MethodKey>(defaultMethod);
  const [madhab, setMadhab] = useState<MadhabKey>(defaultMadhab);

  useEffect(() => {
    const cookieMethod = readCookie(METHOD_COOKIE);
    const cookieMadhab = readCookie(MADHAB_COOKIE);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seeding the saved preference post-hydration, see comment above
    if (isValidMethod(cookieMethod)) setMethod(cookieMethod);
    if (isValidMadhab(cookieMadhab)) setMadhab(cookieMadhab);
  }, []);

  // `now` starts null so server-render and the client's pre-hydration render
  // produce identical markup (avoids a hydration mismatch on this
  // live-ticking value). useSyncExternalStore was tried here but doesn't
  // fit: its snapshot must be stable between consecutive reads within a
  // render, which "the current millisecond" never is, so React logs an
  // infinite-loop warning. A plain effect-driven clock is the correct tool
  // for a continuously-changing value — the one-time sync setState on mount
  // is deliberate (seeding real time post-hydration), not derived state.
  const [now, setNow] = useState<DateTime | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seeding the clock post-hydration, see comment above
    setNow(DateTime.now().setZone(timezone));
    const id = setInterval(() => setNow(DateTime.now().setZone(timezone)), 1000);
    return () => clearInterval(id);
  }, [timezone]);

  const times = useMemo(
    () =>
      computePrayerTimes({
        lat,
        lon,
        timezone,
        date: todayInTimezone(timezone),
        method,
        madhab,
      }),
    [lat, lon, timezone, method, madhab]
  );

  let active: PrayerKey | null = null;
  if (now) {
    for (const key of ACTIONABLE) {
      if (times[key] <= now) active = key;
    }
  }

  let next: { key: PrayerKey; time: DateTime } | null = null;
  if (now) {
    next = ACTIONABLE.map((key) => ({ key, time: times[key] })).find(
      (p) => p.time > now
    ) ?? null;
    if (!next) {
      // after Isha: next is tomorrow's Fajr
      const tomorrow = computePrayerTimes({
        lat,
        lon,
        timezone,
        date: todayInTimezone(timezone).plus({ days: 1 }),
        method,
        madhab,
      });
      next = { key: "fajr", time: tomorrow.fajr };
    }
  }

  const countdown = next && now ? next.time.diff(now, ["hours", "minutes", "seconds"]) : null;

  return (
    <div className="space-y-4">
      {/* Full-width stacked rows rather than a grid of small cards.
          This is the layout every page that ranks for these queries
          uses, and the reason is functional, not fashion: the reader is
          scanning one column for one prayer name, and the time needs to
          be the largest thing on its line. A six-across grid makes each
          time small and forces the eye to hunt in two dimensions. */}
      <ol className="overflow-hidden rounded-xl border border-line">
        {PRAYER_KEYS.map((key) => {
          const isActive = key === active;
          return (
            <li
              key={key}
              aria-current={isActive ? "time" : undefined}
              className={`flex items-baseline justify-between gap-4 border-b border-line px-4 py-3 last:border-b-0 ${
                isActive ? "bg-accent text-accent-ink" : "odd:bg-surface even:bg-surface-band"
              }`}
            >
              <span className="flex items-baseline gap-2">
                <span className={`text-sm font-medium ${isActive ? "" : "text-ink"}`}>
                  {t(`prayers.${key}`)}
                </span>
                {isActive && next && countdown && (
                  <span className="text-xs opacity-90">
                    {t("table.next")} {t(`prayers.${next.key}`)} {t("table.in")}{" "}
                    <span className="font-mono tabular" dir="ltr">
                      {String(Math.floor(countdown.hours)).padStart(2, "0")}:
                      {String(Math.floor(countdown.minutes)).padStart(2, "0")}:
                      {String(Math.floor(countdown.seconds)).padStart(2, "0")}
                    </span>
                  </span>
                )}
              </span>
              <span className="font-mono text-base font-semibold tabular">
                {times[key].setLocale(locale).toFormat("h:mm a")}
              </span>
            </li>
          );
        })}
      </ol>

      {/* Before hydration `active` is null, so the countdown above has
          nowhere to live; this keeps it visible rather than showing an
          empty strip that then disappears. */}
      {!active && (
        <p className="text-sm text-ink-subtle">{t("table.loading")}</p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <MethodSelector method={method} madhab={madhab} onChange={setMethod} onChangeMadhab={setMadhab} />
      </div>
      <MonthlyCalendar lat={lat} lon={lon} timezone={timezone} method={method} madhab={madhab} />
    </div>
  );
}
