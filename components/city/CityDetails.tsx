import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import {
  formatTime,
  formatDegrees,
  formatDuration,
  formatDayMonth,
  formatMonthYear,
  formatKm,
} from "@/lib/format";
import type { CityFacts } from "@/lib/prayer-times/city-facts";
import type { NearbyCity } from "@/lib/data/queries";

const strong = (chunks: React.ReactNode) => (
  <strong dir="auto" className="font-semibold tabular-nums whitespace-nowrap">
    {chunks}
  </strong>
);

/** What the calculation method actually does, with its real angles. */
export async function MethodExplainer({
  displayName,
  countryName,
  facts,
}: {
  displayName: string;
  countryName: string;
  facts: CityFacts;
}) {
  const t = await getTranslations("cityContent");
  const locale = await getLocale();
  const { methodParams } = facts;
  const dur = (m: number) => formatDuration(m, locale);

  const angles =
    methodParams.ishaInterval > 0
      ? t("methodIshaInterval", {
          fajrAngle: formatDegrees(methodParams.fajrAngle, locale),
          interval: dur(methodParams.ishaInterval),
        })
      : t("methodAngles", {
          fajrAngle: formatDegrees(methodParams.fajrAngle, locale),
          ishaAngle: formatDegrees(methodParams.ishaAngle, locale),
        });

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{t("methodHeading")}</h2>
      <p className="text-sm text-ink-muted leading-relaxed">
        {t("methodBody", {
          city: displayName,
          method: facts.method,
          country: countryName,
        })}{" "}
        {angles}{" "}
        {/* Tehran and a few others shift Maghrib off plain sunset. */}
        {methodParams.maghribAngle > 0
          ? `${t("methodMaghribAngle", {
              maghribAngle: formatDegrees(methodParams.maghribAngle, locale),
            })} `
          : ""}
        {facts.madhab === "hanafi" ? t("methodMadhabHanafi") : t("methodMadhabShafi")}{" "}
        {t("methodChange")}
      </p>
    </section>
  );
}

/**
 * How times drift across the month, using three dated samples rather
 * than a min/max claim — "on 1 Aug it was X" is exactly true as written,
 * where "earliest this month" from sampling can be wrong near a solstice.
 */
export async function MonthOutlook({
  displayName,
  facts,
}: {
  displayName: string;
  facts: CityFacts;
}) {
  const t = await getTranslations("cityContent");
  const locale = await getLocale();
  const [first, mid, last] = facts.monthSamples;
  if (!first || !mid || !last) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">
        {t("monthHeading", { month: formatMonthYear(facts.date, locale) })}
      </h2>
      <p className="text-sm text-ink-muted leading-relaxed">
        {t.rich("monthFajr", {
          city: displayName,
          startTime: formatTime(first.fajr, locale),
          startDate: formatDayMonth(first.date, locale),
          midTime: formatTime(mid.fajr, locale),
          midDate: formatDayMonth(mid.date, locale),
          endTime: formatTime(last.fajr, locale),
          endDate: formatDayMonth(last.date, locale),
          t: strong,
        })}{" "}
        {t.rich("monthMaghrib", {
          startTime: formatTime(first.maghrib, locale),
          midTime: formatTime(mid.maghrib, locale),
          endTime: formatTime(last.maghrib, locale),
          t: strong,
        })}{" "}
        {t("monthNote")}
      </p>
    </section>
  );
}

/** Qibla bearing with its compass name and the distance to Makkah. */
export async function QiblaDetail({
  displayName,
  facts,
}: {
  displayName: string;
  facts: CityFacts;
}) {
  const t = await getTranslations("cityContent");
  const tCompass = await getTranslations("compass");
  const locale = await getLocale();

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">
        {t("qiblaHeading", { city: displayName })}
      </h2>
      <p className="text-sm text-ink-muted leading-relaxed">
        {t("qiblaBody", {
          city: displayName,
          bearing: formatDegrees(facts.qibla.bearing, locale),
          compass: tCompass(facts.qibla.compass),
          distance: formatKm(facts.qibla.distanceKm, locale),
        })}{" "}
        {t("qiblaTrueNorth")}
      </p>
    </section>
  );
}

/**
 * Genuinely nearest cities (great-circle), each with how its Maghrib
 * compares to this city's — a real, checkable number rather than a
 * bare link list.
 */
export async function NearbyCitiesDetail({
  displayName,
  facts,
  nearby,
  countrySlug,
  stateSlugFor,
  maghribOffsetFor,
}: {
  displayName: string;
  facts: CityFacts;
  nearby: NearbyCity[];
  countrySlug: string;
  stateSlugFor: (n: NearbyCity) => string | null;
  maghribOffsetFor: (n: NearbyCity) => number;
}) {
  const t = await getTranslations("cityContent");
  const tUnits = await getTranslations("units");
  const locale = await getLocale();
  if (nearby.length === 0) return null;
  void facts;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">
        {t("nearbyHeading", { city: displayName })}
      </h2>
      <p className="text-sm text-ink-muted">
        {t("nearbyIntro", { city: displayName })}
      </p>
      <ul className="space-y-1.5">
        {nearby.map((n) => {
          const stateSlug = stateSlugFor(n);
          const href = stateSlug
            ? `/${countrySlug}/${stateSlug}/${n.city.slug}`
            : `/${countrySlug}/${n.city.slug}`;
          const offsetMinutes = maghribOffsetFor(n);
          const offset =
            offsetMinutes === 0
              ? tUnits("sameMinute")
              : tUnits(offsetMinutes > 0 ? "later" : "earlier", {
                  duration: formatDuration(Math.abs(offsetMinutes), locale),
                });
          return (
            <li key={n.city.geonameId} className="text-sm">
              <Link
                href={href}
                className="text-accent-strong hover:underline"
              >
                {n.city.name}
              </Link>
              <span className="text-ink-muted">
                {" — "}
                {formatKm(n.distanceKm, locale)}
                {", Maghrib "}
                {offset}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
