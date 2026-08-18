import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StaticPage, Section, Prose } from "@/components/legal/StaticPage";
import { staticPageMetadata } from "@/lib/seo/static-page-meta";
import { Link } from "@/lib/i18n/navigation";
import { ADS_ENABLED } from "@/lib/site-config";

const PATH = "/privacy";
const UPDATED = "2026-08-18";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return staticPageMetadata(locale, PATH, "privacyTitle", "privacyIntro");
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages");
  const tFooter = await getTranslations("footer");

  return (
    <StaticPage
      title={t("privacyTitle")}
      intro={t("privacyIntro")}
      updatedIso={UPDATED}
      path={PATH}
    >
      <Section heading={t("privacyNoAccountHeading")}>
        <Prose>{t("privacyNoAccountBody")}</Prose>
      </Section>

      <Section heading={t("privacyLocationHeading")}>
        <Prose>{t("privacyLocationBody")}</Prose>
      </Section>

      <Section heading={t("privacyCookiesHeading")}>
        <Prose>{t("privacyCookiesBody")}</Prose>
        {/* Named individually because "we use cookies" tells the reader
            nothing. These are the only two the site sets. */}
        <ul className="list-disc space-y-1 ps-5 text-sm text-ink-muted">
          <li><code className="font-mono text-xs">{t("privacyCookieMethod")}</code></li>
          <li><code className="font-mono text-xs">{t("privacyCookieMadhab")}</code></li>
        </ul>
        <Prose>{t("privacyCookiesNote")}</Prose>
      </Section>

      <Section heading={t("privacySearchHeading")}>
        <Prose>{t("privacySearchBody")}</Prose>
      </Section>

      {/* Branches on real config: with ads off this must not claim a
          third party sets cookies. Flip ADS_ENABLED in lib/site-config.ts
          when AdSense actually goes live and replace this section with
          the disclosure Google requires. */}
      {!ADS_ENABLED && (
        <Section heading={t("privacyAdsHeadingOff")}>
          <Prose>{t("privacyAdsBodyOff")}</Prose>
        </Section>
      )}

      <Section heading={t("privacyThirdPartyHeading")}>
        <Prose>{t("privacyThirdPartyBody")}</Prose>
      </Section>

      <Section heading={t("privacyChangesHeading")}>
        <Prose>{t("privacyChangesBody")}</Prose>
        <p className="text-sm text-ink-muted leading-relaxed">
          {t("privacyContactBody")}{" "}
          <Link href="/contact" className="text-accent-strong hover:underline">
            {tFooter("contact")}
          </Link>
        </p>
      </Section>
    </StaticPage>
  );
}
