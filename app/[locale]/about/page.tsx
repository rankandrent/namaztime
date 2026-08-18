import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StaticPage, Section, Prose } from "@/components/legal/StaticPage";
import { staticPageMetadata } from "@/lib/seo/static-page-meta";

const PATH = "/about";
const UPDATED = "2026-08-18";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return staticPageMetadata(locale, PATH, "aboutTitle", "aboutIntro");
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages");

  return (
    <StaticPage title={t("aboutTitle")} intro={t("aboutIntro")} updatedIso={UPDATED} path={PATH}>
      <Section heading={t("aboutHowHeading")}><Prose>{t("aboutHowBody")}</Prose></Section>
      <Section heading={t("aboutMethodHeading")}><Prose>{t("aboutMethodBody")}</Prose></Section>
      <Section heading={t("aboutDataHeading")}><Prose>{t("aboutDataBody")}</Prose></Section>
      <Section heading={t("aboutAccuracyHeading")}><Prose>{t("aboutAccuracyBody")}</Prose></Section>
    </StaticPage>
  );
}
