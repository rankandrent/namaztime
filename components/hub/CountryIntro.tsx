import { getLocale, getTranslations } from "next-intl/server";
import { formatNumber, formatDuration, formatDate } from "@/lib/format";
import type { HubFacts } from "@/lib/prayer-times/hub-facts";
import type { Country } from "@/lib/data/types";

/**
 * The prose block on a country hub.
 *
 * Every sentence is conditional on data actually being present — a
 * country with no area figure, one timezone, or two cities simply gets
 * fewer sentences rather than a sentence with a hole in it. That is the
 * difference between templated-but-true and the thin, obviously-generated
 * text that gets a large programmatic site filtered out of the index.
 */
export async function CountryIntro({
  country,
  countryName,
  continentName,
  stateCount,
  cityCount,
  facts,
  languageNames,
}: {
  country: Country;
  countryName: string;
  continentName: string;
  stateCount: number;
  cityCount: number;
  facts: HubFacts;
  languageNames: string[];
}) {
  const t = await getTranslations("countryContent");
  const tMethod = await getTranslations("methodSelector");
  const locale = await getLocale();

  const sentences: string[] = [];

  sentences.push(
    t("intro", {
      country: countryName,
      continent: continentName,
      capital: country.capital || "—",
      population: formatNumber(country.population, locale),
    })
  );

  if (country.areaSqKm > 0 && stateCount > 0) {
    sentences.push(
      t("introArea", {
        area: `${formatNumber(country.areaSqKm, locale)} km²`,
        stateCount: formatNumber(stateCount, locale),
      })
    );
  }

  if (languageNames.length > 0) {
    sentences.push(t("introLanguages", { languages: languageNames.join(", ") }));
  }

  sentences.push(
    t("cityCount", {
      cityCount: formatNumber(cityCount, locale),
      country: countryName,
    })
  );

  if (facts.timezones.length === 1) {
    sentences.push(t("timezoneSingle", { timezone: facts.timezones[0] }));
  } else if (facts.timezones.length > 1) {
    sentences.push(
      t("timezoneMultiple", {
        country: countryName,
        count: formatNumber(facts.timezones.length, locale),
      })
    );
  }

  // Only worth stating when the spread is big enough to matter — under
  // ~15 min it's a rounding curiosity, not a reason times differ.
  if (facts.longitudeSpreadMinutes !== null && facts.longitudeSpreadMinutes >= 15) {
    sentences.push(
      t("longitudeSpread", {
        spread: formatDuration(facts.longitudeSpreadMinutes, locale),
      })
    );
  }

  sentences.push(
    t("method", {
      country: countryName,
      method: facts.method,
      madhab: tMethod(facts.madhab),
    })
  );

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold tracking-tight text-ink">
        {t("aboutHeading", { country: countryName })}
      </h2>
      <p className="text-sm leading-relaxed text-ink-muted">{sentences.join(" ")}</p>
    </section>
  );
}

/** Intro line for the city-times list — carries the date those times are for. */
export async function CountryCityTimesIntro({ facts }: { facts: HubFacts }) {
  const t = await getTranslations("countryContent");
  const locale = await getLocale();
  return (
    <p className="text-sm text-ink-muted">
      {t("largestCitiesIntro", { date: formatDate(facts.date, locale) })}
    </p>
  );
}
