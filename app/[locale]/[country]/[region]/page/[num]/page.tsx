import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { StateHubContent, PAGE_SIZE } from "@/components/StateHubContent";
import { redirect } from "@/lib/i18n/navigation";
import { getCountryBySlug, resolveRegionOrCity, getCitiesForState } from "@/lib/data/queries";

// Deliberately no generateStaticParams here — only states with 120+ cities
// ever produce a page 2, so this tier is left to ISR (dynamicParams below)
// rather than spending build time on a small, low-traffic slice of routes.
export const dynamicParams = true;
export const revalidate = 86400;

export default async function RegionPageN({
  params,
}: {
  params: Promise<{ locale: string; country: string; region: string; num: string }>;
}) {
  const { locale, country: countrySlug, region: regionSlug, num } = await params;
  setRequestLocale(locale);
  const pageNum = Number(num);
  if (!Number.isInteger(pageNum) || pageNum < 1) notFound();

  const country = await getCountryBySlug(countrySlug);
  if (!country) notFound();

  const resolved = await resolveRegionOrCity(country.code, regionSlug);
  if (resolved.kind !== "state") notFound(); // no pagination for no-admin1 city pages

  const cities = await getCitiesForState(country.code, resolved.state.id);
  const totalPages = Math.max(1, Math.ceil(cities.length / PAGE_SIZE));

  // Keep a single canonical URL for page 1 (the base state-hub route).
  if (pageNum === 1) redirect({ href: `/${country.slug}/${resolved.state.slug}`, locale });
  if (pageNum > totalPages) notFound();

  return (
    <StateHubContent country={country} state={resolved.state} cities={cities} currentPage={pageNum} />
  );
}
