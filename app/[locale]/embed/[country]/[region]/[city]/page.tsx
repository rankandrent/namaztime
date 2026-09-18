import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getCountryBySlug, resolveRegionOrCity, getCityBySlug } from "@/lib/data/queries";
import { getCityFacts } from "@/lib/prayer-times/city-facts";
import { formatTime, formatDate } from "@/lib/format";
import { store } from "@/lib/data/store";
import { SITE_URL } from "@/lib/seo/site";

export const dynamicParams = true;
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  return {
    robots: { index: false, follow: true }, // Embeds shouldn't compete with the main canonical city page
  };
}

export default async function PrayerWidget({
  params,
}: {
  params: Promise<{ locale: string; country: string; region: string; city: string }>;
}) {
  const { locale, country: countrySlug, region: regionSlug, city: citySlug } = await params;
  setRequestLocale(locale);
  const country = await getCountryBySlug(countrySlug);
  if (!country) notFound();

  const resolved = await resolveRegionOrCity(country.code, regionSlug);
  if (resolved.kind !== "state") notFound();

  const city = await getCityBySlug(country.code, resolved.state.id, citySlug);
  if (!city) notFound();

  const facts = getCityFacts({
    lat: city.lat,
    lon: city.lon,
    timezone: city.timezone,
    countryCode: country.code,
  });

  const cityUrl = `${SITE_URL}/${country.slug}/${resolved.state.slug}/${city.slug}`;
  const prayers = [
    { name: "Fajr", time: formatTime(facts.times.fajr, locale) },
    { name: "Sunrise", time: formatTime(facts.times.sunrise, locale) },
    { name: "Dhuhr", time: formatTime(facts.times.dhuhr, locale) },
    { name: "Asr", time: formatTime(facts.times.asr, locale) },
    { name: "Maghrib", time: formatTime(facts.times.maghrib, locale), highlight: true },
    { name: "Isha", time: formatTime(facts.times.isha, locale) },
  ];

  return (
    <div className="w-full max-w-[320px] rounded-2xl border border-line bg-surface p-4 shadow-sm font-sans text-ink">
      <div className="flex items-center justify-between border-b border-line pb-2 mb-3">
        <div>
          <h2 className="text-base font-bold leading-tight">{city.name}</h2>
          <p className="text-xs text-ink-muted">{country.name} · {formatDate(facts.date, locale)}</p>
        </div>
        <span className="text-[10px] font-semibold bg-accent-tint text-accent-strong px-2 py-0.5 rounded-full uppercase">
          Live
        </span>
      </div>

      <div className="space-y-1.5 text-sm">
        {prayers.map((p) => (
          <div
            key={p.name}
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg ${
              p.highlight
                ? "bg-accent text-white font-semibold"
                : "hover:bg-surface-band/50 text-ink"
            }`}
          >
            <span>{p.name}</span>
            <span className="font-mono tabular-nums">{p.time}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-2 border-t border-line text-center">
        <a
          href={cityUrl}
          target="_blank"
          rel="noopener"
          className="text-xs text-accent-strong hover:underline font-medium"
        >
          View Full Timetable & Qibla at Maghrib Time →
        </a>
      </div>
    </div>
  );
}
