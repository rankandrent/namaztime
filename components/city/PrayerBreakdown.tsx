import { getTranslations, getLocale } from "next-intl/server";
import { formatTime, formatDate, formatDuration, formatDegrees } from "@/lib/format";
import type { CityFacts } from "@/lib/prayer-times/city-facts";

/**
 * One block per prayer, each headed with that prayer's ACTUAL time for
 * this city today.
 *
 * This is the section that answers the query a person actually types
 * ("maghrib time in lahore") in the page's own text, rather than pointing
 * at a table — and it's what a passage-ranking or AI answer engine can
 * lift verbatim.
 */
export async function PrayerBreakdown({
  displayName,
  facts,
}: {
  displayName: string;
  facts: CityFacts;
}) {
  const t = await getTranslations("cityContent");
  const tShadow = await getTranslations("shadow");
  const locale = await getLocale();
  const { times, methodParams } = facts;

  const time = (dt: (typeof times)["fajr"]) => formatTime(dt, locale);
  const dur = (m: number) => formatDuration(m, locale);
  const date = formatDate(facts.date, locale);
  const city = displayName;

  const strong = (chunks: React.ReactNode) => (
    <strong dir="auto" className="font-semibold tabular-nums whitespace-nowrap">
      {chunks}
    </strong>
  );

  const blocks = [
    {
      key: "fajr",
      heading: t("fajrHeading", { city, time: time(times.fajr) }),
      body: t.rich("fajrBody", {
        city,
        date,
        angle: formatDegrees(methodParams.fajrAngle, locale),
        sunrise: time(times.sunrise),
        window: dur(facts.fajrWindowMinutes),
        t: strong,
      }),
    },
    {
      key: "sunrise",
      heading: t("sunriseHeading", { city, time: time(times.sunrise) }),
      body: t.rich("sunriseBody", { city, date, t: strong }),
    },
    {
      key: "dhuhr",
      heading: t("dhuhrHeading", { city, time: time(times.dhuhr) }),
      body: t.rich("dhuhrBody", {
        city,
        date,
        time: time(times.dhuhr),
        asr: time(times.asr),
        t: strong,
      }),
    },
    {
      key: "asr",
      heading: t("asrHeading", { city, time: time(times.asr) }),
      body: t.rich("asrBody", {
        city,
        date,
        time: time(times.asr),
        maghrib: time(times.maghrib),
        // 1x for Shafi, 2x for Hanafi — the substantive difference
        // between the two positions, and why Asr moves ~an hour.
        shadowFactor: tShadow(facts.asrShadowFactor === 2 ? "twice" : "once"),
        t: strong,
      }),
    },
    {
      key: "maghrib",
      heading: t("maghribHeading", { city, time: time(times.maghrib) }),
      body: t.rich("maghribBody", {
        city,
        date,
        time: time(times.maghrib),
        isha: time(times.isha),
        gap: dur(facts.maghribToIshaMinutes),
        t: strong,
      }),
    },
    {
      key: "isha",
      heading: t("ishaHeading", { city, time: time(times.isha) }),
      // Methods like UmmAlQura/Qatar define Isha as a fixed interval after
      // Maghrib and report ishaAngle = 0 — describing that as "0° below
      // the horizon" would be plainly false on every Saudi/Qatari page.
      body:
        methodParams.ishaInterval > 0
          ? t.rich("ishaBodyInterval", {
              city,
              date,
              interval: dur(methodParams.ishaInterval),
              time: time(times.isha),
              t: strong,
            })
          : t.rich("ishaBody", {
              city,
              date,
              angle: formatDegrees(methodParams.ishaAngle, locale),
              time: time(times.isha),
              t: strong,
            }),
    },
  ];

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">
        {t("prayersHeading", { city: displayName })}
      </h2>
      {blocks.map((b) => (
        <div key={b.key}>
          <h3 className="font-medium">{b.heading}</h3>
          <p className="text-sm text-ink-muted mt-1 leading-relaxed">
            {b.body}
          </p>
        </div>
      ))}
    </section>
  );
}
