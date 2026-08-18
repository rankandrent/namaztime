import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { CityPageContent } from "@/components/CityPageContent";
import { getCountryBySlug, resolveRegionOrCity, getCityBySlug } from "@/lib/data/queries";
import { getTopCityParams } from "@/lib/data/static-params";
import { buildAlternates, cityMetadata } from "@/lib/seo/metadata";

export const dynamicParams = true;
export const revalidate = 3600; // prayer times are time-sensitive — see plan §Rendering Strategy

export function generateStaticParams() {
  return getTopCityParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; country: string; region: string; city: string }>;
}): Promise<Metadata> {
  const { locale, country: countrySlug, region: regionSlug, city: citySlug } = await params;
  const country = await getCountryBySlug(countrySlug);
  if (!country) return {};

  const resolved = await resolveRegionOrCity(country.code, regionSlug);
  if (resolved.kind !== "state") return {};

  const city = await getCityBySlug(country.code, resolved.state.id, citySlug);
  if (!city) return {};

  return {
    ...(await cityMetadata({ locale, city, country, state: resolved.state })),
    alternates: buildAlternates(locale, `/${country.slug}/${resolved.state.slug}/${city.slug}`),
  };
}

export default async function CityPage({
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

  return <CityPageContent city={city} country={country} state={resolved.state} />;
}
