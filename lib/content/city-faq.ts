/**
 * The city FAQ, built once and consumed by BOTH the rendered markup and
 * the FAQPage JSON-LD.
 *
 * Single source on purpose: these two used to be assembled by separate
 * code in CityPageContent and CityFaq, which meant the structured data
 * could silently drift from the visible answer — exactly the mismatch
 * Google penalises.
 *
 * Every answer embeds computed values (times, durations, bearings) and
 * names the date those values are for. The date-stamp is what makes a
 * cached/stale page *historically accurate* rather than wrong, since
 * these strings are baked into ISR HTML — see plan §Staleness.
 *
 * Answers are plain strings with no rich-text tags: JSON-LD
 * `acceptedAnswer.text` must be plain, and keeping one representation
 * guarantees the markup and the structured data stay byte-identical.
 */
import type { CityFacts } from "@/lib/prayer-times/city-facts";
import {
  formatTime,
  formatDate,
  formatDuration,
  formatDegrees,
  formatCoordinate,
  formatKm,
} from "@/lib/format";

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

type Translator = (key: string, values?: Record<string, string>) => string;

export interface BuildCityFaqArgs {
  facts: CityFacts;
  cityName: string;
  countryName: string;
  locale: string;
  /** Scoped to the "faq" namespace. */
  t: Translator;
  /** Scoped to "compass". */
  tCompass: Translator;
  /** Scoped to "methodSelector" (for madhab labels). */
  tMadhab: Translator;
  /** Scoped to "shadow" — the once/twice shadow-length wording. */
  tShadow: Translator;
}

export function buildCityFaq({
  facts,
  cityName,
  countryName,
  locale,
  t,
  tCompass,
  tMadhab,
  tShadow,
}: BuildCityFaqArgs): FaqItem[] {
  const { times, qibla, methodParams } = facts;
  const time = (dt: Parameters<typeof formatTime>[0]) => formatTime(dt, locale);
  const dur = (mins: number) => formatDuration(mins, locale);

  const date = formatDate(facts.date, locale);
  const city = cityName;
  const timezone = facts.timezone;
  const madhabLabel = tMadhab(facts.madhab);
  // Was a hardcoded English "twice"/"once" spliced into translated
  // sentences, which rendered e.g. "سایہ اپنی لمبائی کے twice" on every
  // non-English page. It is content, so it lives in the catalogue.
  const shadowFactor = tShadow(facts.asrShadowFactor === 2 ? "twice" : "once");

  // Methods like UmmAlQura and Qatar report ishaAngle = 0 and use a fixed
  // interval instead — printing "Isha at 0°" would be a visible falsehood
  // on every Saudi and Qatari page.
  const angleNote =
    methodParams.ishaInterval > 0
      ? t("methodAngleInterval", {
          fajrAngle: formatDegrees(methodParams.fajrAngle, locale),
          interval: dur(methodParams.ishaInterval),
        })
      : t("methodAngleBoth", {
          fajrAngle: formatDegrees(methodParams.fajrAngle, locale),
          ishaAngle: formatDegrees(methodParams.ishaAngle, locale),
        });

  return [
    {
      id: "fajr",
      question: t("fajrQuestion", { city }),
      answer: t("fajrAnswer", {
        city,
        date,
        timezone,
        fajr: time(times.fajr),
        sunrise: time(times.sunrise),
        window: dur(facts.fajrWindowMinutes),
        method: facts.method,
      }),
    },
    {
      id: "dhuhr",
      question: t("dhuhrQuestion", { city }),
      answer: t("dhuhrAnswer", {
        city,
        date,
        timezone,
        dhuhr: time(times.dhuhr),
        asr: time(times.asr),
      }),
    },
    {
      id: "asr",
      question: t("asrQuestion", { city }),
      answer: t("asrAnswer", {
        city,
        date,
        timezone,
        asr: time(times.asr),
        maghrib: time(times.maghrib),
        madhab: madhabLabel,
        shadowFactor,
      }),
    },
    {
      id: "maghrib",
      question: t("maghribQuestion", { city }),
      answer: t("maghribAnswer", {
        city,
        date,
        timezone,
        maghrib: time(times.maghrib),
        isha: time(times.isha),
        gap: dur(facts.maghribToIshaMinutes),
        lat: formatCoordinate(Math.abs(facts.coordinates.lat), locale),
        lon: formatCoordinate(Math.abs(facts.coordinates.lon), locale),
        latHemisphere: facts.coordinates.lat >= 0 ? "N" : "S",
        lonHemisphere: facts.coordinates.lon >= 0 ? "E" : "W",
        method: facts.method,
      }),
    },
    {
      id: "isha",
      question: t("ishaQuestion", { city }),
      answer: t("ishaAnswer", {
        city,
        date,
        timezone,
        isha: time(times.isha),
        fajr: time(times.fajr),
      }),
    },
    {
      id: "sunrise",
      question: t("sunriseQuestion", { city }),
      answer: t("sunriseAnswer", {
        city,
        date,
        timezone,
        sunrise: time(times.sunrise),
        maghrib: time(times.maghrib),
        dayLength: dur(facts.dayLengthMinutes),
      }),
    },
    {
      id: "fajr-end",
      question: t("fajrEndQuestion", { city }),
      answer: t("fajrEndAnswer", {
        city,
        date,
        fajr: time(times.fajr),
        sunrise: time(times.sunrise),
        window: dur(facts.fajrWindowMinutes),
      }),
    },
    {
      id: "fasting",
      question: t("fastingQuestion", { city }),
      answer: t("fastingAnswer", {
        city,
        date,
        fajr: time(times.fajr),
        maghrib: time(times.maghrib),
        fastingLength: dur(facts.fastingMinutes),
      }),
    },
    {
      id: "qibla",
      question: t("qiblaQuestion", { city }),
      answer: t("qiblaAnswer", {
        city,
        bearing: formatDegrees(qibla.bearing, locale),
        compass: tCompass(qibla.compass),
        distance: formatKm(qibla.distanceKm, locale),
      }),
    },
    {
      id: "method",
      question: t("methodQuestion", { city, country: countryName }),
      answer: t("methodAnswer", {
        city,
        country: countryName,
        method: facts.method,
        madhab: madhabLabel,
        angleNote,
      }),
    },
  ];
}
