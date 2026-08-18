import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StaticPage, Section, Prose } from "@/components/legal/StaticPage";
import { staticPageMetadata } from "@/lib/seo/static-page-meta";

const PATH = "/terms";
const UPDATED = "2026-08-18";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return staticPageMetadata(locale, PATH, "termsTitle", "termsIntro");
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages");

  return (
    <StaticPage title={t("termsTitle")} intro={t("termsIntro")} updatedIso={UPDATED} path={PATH}>
      <Section heading={t("termsUseHeading")}><Prose>{t("termsUseBody")}</Prose></Section>
      <Section heading={t("termsAccuracyHeading")}><Prose>{t("termsAccuracyBody")}</Prose></Section>
      <Section heading={t("termsNoWarrantyHeading")}><Prose>{t("termsNoWarrantyBody")}</Prose></Section>
      <Section heading={t("termsLiabilityHeading")}><Prose>{t("termsLiabilityBody")}</Prose></Section>
      <Section heading={t("termsContentHeading")}><Prose>{t("termsContentBody")}</Prose></Section>
      <Section heading={t("termsChangesHeading")}><Prose>{t("termsChangesBody")}</Prose></Section>
    </StaticPage>
  );
}
