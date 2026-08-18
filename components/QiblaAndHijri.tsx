import { getTranslations, getLocale } from "next-intl/server";
import { formatDegrees } from "@/lib/format";
import type { CityFacts } from "@/lib/prayer-times/city-facts";

/**
 * Takes the shared `facts` rather than re-deriving the Qibla bearing and
 * Hijri date, which the page has already computed.
 */
export async function QiblaAndHijri({ facts }: { facts: CityFacts }) {
  const t = await getTranslations();
  const locale = await getLocale();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="rounded-lg border border-line px-4 py-3">
        <div className="text-xs uppercase tracking-wide text-ink-muted">
          {t("qibla.heading")}
        </div>
        <div className="text-lg font-semibold">
          {t("qibla.fromNorth", { deg: formatDegrees(facts.qibla.bearing, locale) })}
        </div>
      </div>
      <div className="rounded-lg border border-line px-4 py-3">
        <div className="text-xs uppercase tracking-wide text-ink-muted">
          {t("hijri.heading")} <span className="italic">{t("hijri.approximate")}</span>
        </div>
        <div className="text-lg font-semibold">
          {facts.hijri.day} {facts.hijri.monthName} {facts.hijri.year}{" "}
          {t("hijri.yearSuffix")}
        </div>
      </div>
    </div>
  );
}
