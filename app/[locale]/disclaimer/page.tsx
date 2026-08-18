import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StaticPage, Section, Prose } from "@/components/legal/StaticPage";
import { staticPageMetadata } from "@/lib/seo/static-page-meta";

const PATH = "/disclaimer";
const UPDATED = "2026-08-18";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return staticPageMetadata(locale, PATH, "disclaimerTitle", "disclaimerIntro");
}

export default async function DisclaimerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages");

  return (
    <StaticPage
      title={t("disclaimerTitle")}
      intro={t("disclaimerIntro")}
      updatedIso={UPDATED}
      path={PATH}
    >
      <Section heading={t("disclaimerCalcHeading")}><Prose>{t("disclaimerCalcBody")}</Prose></Section>
      <Section heading={t("disclaimerDifferHeading")}><Prose>{t("disclaimerDifferBody")}</Prose></Section>
      <Section heading={t("disclaimerFollowHeading")}><Prose>{t("disclaimerFollowBody")}</Prose></Section>
      <Section heading={t("disclaimerHijriHeading")}><Prose>{t("disclaimerHijriBody")}</Prose></Section>
      <Section heading={t("disclaimerAppsHeading")}><Prose>{t("disclaimerAppsBody")}</Prose></Section>
    </StaticPage>
  );
}
