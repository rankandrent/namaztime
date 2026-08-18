"use client";

import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import { useTranslations, useLocale } from "next-intl";

/**
 * Warns when a cached page's baked times are for a different day than
 * "today" in the city's own timezone.
 *
 * The page's prose and FAQ are server-rendered into ISR HTML, so after
 * the city crosses local midnight a cached copy can still state
 * yesterday's times. Every such sentence names its date, so it stays
 * *factually true* — but a visitor wants today's. This is the one piece
 * that tells them, and it costs no server-rendered text.
 *
 * Renders nothing in the normal case (dates match) and degrades to
 * nothing without JS, where the date-stamped prose still reads correctly.
 */
export function StaleDateNotice({
  bakedDateIso,
  timezone,
  cityName,
}: {
  bakedDateIso: string;
  timezone: string;
  cityName: string;
}) {
  const t = useTranslations("staleNotice");
  const locale = useLocale();
  // Starts null so SSR and the pre-hydration client render match.
  const [currentIso, setCurrentIso] = useState<string | null>(null);

  useEffect(() => {
    const check = () => setCurrentIso(DateTime.now().setZone(timezone).toISODate());
    check();
    // Re-check periodically so a page left open across midnight updates.
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [timezone]);

  if (!currentIso || !bakedDateIso || currentIso === bakedDateIso) return null;

  const fmt = (iso: string) =>
    DateTime.fromISO(iso).setLocale(locale).toLocaleString(DateTime.DATE_FULL);

  return (
    <div
      role="status"
      className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      {t("message", {
        bakedDate: fmt(bakedDateIso),
        currentDate: fmt(currentIso),
        city: cityName,
      })}
    </div>
  );
}
