import { getTranslations, getLocale } from "next-intl/server";
import {
  formatCoordinate,
  formatNumber,
  formatDate,
  formatDuration,
  formatMetres,
} from "@/lib/format";
import type { CityFacts } from "@/lib/prayer-times/city-facts";
import type { City, Country, Admin1 } from "@/lib/data/types";

/**
 * Opening paragraph. Every clause carries a value that differs city to
 * city — coordinates, elevation, timezone offset, population, rank — so
 * this doesn't read as the same sentence 34,000 times.
 */
export async function CityIntro({
  city,
  country,
  state,
  countryName,
  stateName,
  facts,
  cityCountInCountry,
  displayName,
}: {
  city: City;
  country: Country;
  state: Admin1 | null;
  countryName: string;
  stateName: string | null;
  facts: CityFacts;
  cityCountInCountry: number;
  displayName: string;
}) {
  const t = await getTranslations("cityContent");
  const locale = await getLocale();
  void country;
  void state;

  const region = stateName ? `${stateName}, ${countryName}` : countryName;

  const rank = (() => {
    switch (city.rank) {
      case "national-capital":
        return t("rankNationalCapital", { city: displayName, country: countryName });
      case "admin1-capital":
        return stateName
          ? t("rankAdmin1Capital", { city: displayName, region: stateName })
          : null;
      case "admin2-capital":
        return stateName
          ? t("rankAdmin2Capital", { city: displayName, region: stateName })
          : null;
      default:
        return t("rankCity", {
          city: displayName,
          count: formatNumber(cityCountInCountry, locale),
          country: countryName,
        });
    }
  })();

  // Pass the value through t() rather than string-replacing afterwards:
  // next-intl can't resolve a message with a missing placeholder and
  // returns the raw key path instead, which leaked
  // "cityContent.introElevationApprox" onto the page.
  const elevation =
    city.elevation !== null
      ? t(city.elevationSource === "dem" ? "introElevationApprox" : "introElevation", {
          elevation: formatMetres(city.elevation, locale),
        })
      : null;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">
        {t("aboutHeading", { city: displayName })}
      </h2>
      <p className="text-sm text-ink-muted leading-relaxed">
        {t("introLocation", {
          city: displayName,
          lat: formatCoordinate(Math.abs(city.lat), locale),
          latHemisphere: city.lat >= 0 ? "N" : "S",
          lon: formatCoordinate(Math.abs(city.lon), locale),
          lonHemisphere: city.lon >= 0 ? "E" : "W",
          region,
        })}{" "}
        {elevation ? `${elevation} ` : ""}
        {city.population > 0
          ? `${t("introPopulation", {
              population: formatNumber(city.population, locale),
              city: displayName,
            })} `
          : ""}
        {rank ? `${rank} ` : ""}
        {t("introTimezone", {
          timezone: facts.timezone,
          offset: facts.utcOffsetLabel,
        })}
      </p>
    </section>
  );
}

/** Today's date + all six times as flowing prose, plus day/night length. */
export async function TodaySummary({
  displayName,
  facts,
}: {
  displayName: string;
  facts: CityFacts;
}) {
  const t = await getTranslations("cityContent");
  const locale = await getLocale();
  const { times } = facts;

  const time = (dt: (typeof times)["fajr"]) =>
    dt.setLocale(locale).toLocaleString({ hour: "numeric", minute: "2-digit" });

  const dur = (m: number) => formatDuration(m, locale);

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">
        {t("todayHeading", { city: displayName })}
      </h2>
      <p className="text-sm text-ink-muted leading-relaxed">
        {t("todayDates", {
          city: displayName,
          gregorianDate: formatDate(facts.date, locale),
          hijriDate: `${facts.hijri.day} ${facts.hijri.monthName} ${facts.hijri.year}`,
        })}{" "}
        {t.rich("todayTimes", {
          fajr: time(times.fajr),
          sunrise: time(times.sunrise),
          dhuhr: time(times.dhuhr),
          asr: time(times.asr),
          maghrib: time(times.maghrib),
          isha: time(times.isha),
          t: (chunks) => (
            <strong dir="auto" className="font-semibold tabular-nums whitespace-nowrap">
              {chunks}
            </strong>
          ),
        })}{" "}
        {t("todayDayLength", {
          city: displayName,
          dayLength: dur(facts.dayLengthMinutes),
          nightLength: dur(facts.nightLengthMinutes),
        })}
      </p>
    </section>
  );
}

/**
 * The city's name in other scripts. Renders nothing when we have none,
 * which is the case for most small places — so there's no empty heading
 * left behind on ~44% of pages.
 */
export async function AlsoKnownAs({
  displayName,
  names,
}: {
  displayName: string;
  names: { locale: string; name: string }[];
}) {
  const t = await getTranslations("cityContent");
  const tLang = await getTranslations("languages");
  if (names.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
        {t("alsoKnownAsHeading")}
      </h2>
      <p className="text-sm text-ink-muted">
        {t("alsoKnownAsIntro", { city: displayName })}{" "}
        {names.map((n, i) => (
          <span key={n.locale}>
            {i > 0 ? ", " : ""}
            <span dir="auto" className="font-medium">
              {n.name}
            </span>{" "}
            <span className="text-ink-subtle">({tLang(n.locale)})</span>
          </span>
        ))}
      </p>
    </section>
  );
}
