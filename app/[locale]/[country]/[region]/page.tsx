import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CityPageContent } from "@/components/CityPageContent";
import { StateHubContent } from "@/components/StateHubContent";
import { getCountryBySlug, resolveRegionOrCity, getCitiesForState } from "@/lib/data/queries";
import { getPriorityRegionParams } from "@/lib/data/static-params";
import { buildAlternates, cityMetadata } from "@/lib/seo/metadata";
import { countryDisplayName, admin1DisplayName } from "@/lib/data/names";

export const dynamicParams = true;
export const revalidate = 86400;

export function generateStaticParams() {
  return getPriorityRegionParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; country: string; region: string }>;
}): Promise<Metadata> {
  const { locale, country: countrySlug, region: regionSlug } = await params;
  const country = await getCountryBySlug(countrySlug);
  if (!country) return {};

  const resolved = await resolveRegionOrCity(country.code, regionSlug);
  if (resolved.kind === "not-found") return {};

  const path = `/${country.slug}/${regionSlug}`;
  if (resolved.kind === "city") {
    return {
      ...(await cityMetadata({ locale, city: resolved.city, country, state: null })),
      alternates: buildAlternates(locale, path),
    };
  }

  const t = await getTranslations({ locale, namespace: "state" });
  const stateName = admin1DisplayName(resolved.state, locale);
  const countryName = countryDisplayName(country, locale);
  return {
    title: t("metaTitle", { state: stateName, country: countryName }),
    description: t("metaDescription", { state: stateName, country: countryName }),
    alternates: buildAlternates(locale, path),
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export default async function RegionPage({
  params,
}: {
  params: Promise<{ locale: string; country: string; region: string }>;
}) {
  const { locale, country: countrySlug, region: regionSlug } = await params;
  setRequestLocale(locale);
  const country = await getCountryBySlug(countrySlug);
  if (!country) notFound();

  const resolved = await resolveRegionOrCity(country.code, regionSlug);

  if (resolved.kind === "city") {
    // No-admin1 country (e.g. Singapore) — region segment resolves straight
    // to the City page, per plan §Rendering Strategy.
    return <CityPageContent city={resolved.city} country={country} state={null} />;
  }

  if (resolved.kind === "not-found") notFound();

  const cities = await getCitiesForState(country.code, resolved.state.id);
  return (
    <StateHubContent country={country} state={resolved.state} cities={cities} currentPage={1} />
  );
}
