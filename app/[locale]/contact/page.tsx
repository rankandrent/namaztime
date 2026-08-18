import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StaticPage, Section, Prose } from "@/components/legal/StaticPage";
import { staticPageMetadata } from "@/lib/seo/static-page-meta";
import { CONTACT_EMAIL, OPERATOR_NAME, OPERATOR_ADDRESS, hasContactEmail } from "@/lib/site-config";

const PATH = "/contact";
const UPDATED = "2026-08-18";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return staticPageMetadata(locale, PATH, "contactTitle", "contactIntro");
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages");

  return (
    <StaticPage
      title={t("contactTitle")}
      intro={t("contactIntro")}
      updatedIso={UPDATED}
      path={PATH}
    >
      <Section heading={t("contactEmailLabel")}>
        {/* Renders the real address when configured, and an honest
            "not configured yet" line when it isn't — rather than a
            mailto: pointing at a placeholder that would bounce. */}
        {hasContactEmail ? (
          <p className="text-sm">
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent-strong hover:underline">
              {CONTACT_EMAIL}
            </a>
          </p>
        ) : (
          <Prose>{t("contactUnavailable")}</Prose>
        )}
        {OPERATOR_NAME && <Prose>{OPERATOR_NAME}</Prose>}
        {OPERATOR_ADDRESS && (
          <p className="text-sm text-ink-muted whitespace-pre-line">{OPERATOR_ADDRESS}</p>
        )}
      </Section>

      <Section heading={t("contactWhatHeading")}>
        <Prose>{t("contactWhatBody")}</Prose>
        <Prose>{t("contactResponseBody")}</Prose>
      </Section>
    </StaticPage>
  );
}
