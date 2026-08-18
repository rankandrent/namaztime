"use client";

import { useMemo, useState } from "react";
import { DateTime } from "luxon";
import { useLocale, useTranslations } from "next-intl";
import { computePrayerTimes } from "@/lib/prayer-times/calculate";
import type { MethodKey, MadhabKey } from "@/lib/prayer-times/method-by-country";

export function MonthlyCalendar({
  lat,
  lon,
  timezone,
  method,
  madhab,
}: {
  lat: number;
  lon: number;
  timezone: string;
  method: MethodKey;
  madhab: MadhabKey;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  // Computed lazily (only once expanded) — a full month is ~30x the work
  // of the daily table and most visitors never open it.
  const rows = useMemo(() => {
    if (!open) return [];
    const first = DateTime.now().setZone(timezone).startOf("month");
    const daysInMonth = first.daysInMonth ?? 30;
    return Array.from({ length: daysInMonth }, (_, i) => {
      const date = first.plus({ days: i });
      const times = computePrayerTimes({ lat, lon, timezone, date, method, madhab });
      return { date, times };
    });
  }, [open, lat, lon, timezone, method, madhab]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-accent-strong hover:underline"
      >
        {t("calendar.show")}
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-sm text-accent-strong hover:underline mb-2"
      >
        {t("calendar.hide")}
      </button>
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-sm text-start">
          <thead className="bg-surface-band text-xs uppercase text-ink-muted">
            <tr>
              <th className="px-3 py-2">{t("calendar.date")}</th>
              <th className="px-3 py-2">{t("prayers.fajr")}</th>
              <th className="px-3 py-2">{t("prayers.sunrise")}</th>
              <th className="px-3 py-2">{t("prayers.dhuhr")}</th>
              <th className="px-3 py-2">{t("prayers.asr")}</th>
              <th className="px-3 py-2">{t("prayers.maghrib")}</th>
              <th className="px-3 py-2">{t("prayers.isha")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ date, times }) => (
              <tr
                key={date.toISODate()}
                className="border-t border-line"
              >
                <td className="px-3 py-1.5 whitespace-nowrap">
                  {date.setLocale(locale).toFormat("EEE, MMM d")}
                </td>
                <td className="px-3 py-1.5 tabular-nums">
                  {times.fajr.setLocale(locale).toFormat("h:mm a")}
                </td>
                <td className="px-3 py-1.5 tabular-nums">
                  {times.sunrise.setLocale(locale).toFormat("h:mm a")}
                </td>
                <td className="px-3 py-1.5 tabular-nums">
                  {times.dhuhr.setLocale(locale).toFormat("h:mm a")}
                </td>
                <td className="px-3 py-1.5 tabular-nums">
                  {times.asr.setLocale(locale).toFormat("h:mm a")}
                </td>
                <td className="px-3 py-1.5 tabular-nums">
                  {times.maghrib.setLocale(locale).toFormat("h:mm a")}
                </td>
                <td className="px-3 py-1.5 tabular-nums">
                  {times.isha.setLocale(locale).toFormat("h:mm a")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
