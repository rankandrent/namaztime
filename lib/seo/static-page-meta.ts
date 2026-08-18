import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildAlternates } from "./metadata";

/**
 * Title + description + canonical/hreflang for the standalone info pages.
 *
 * These are deliberately indexable: AdSense reviewers (and visitors)
 * need to reach the privacy and contact pages, and a `noindex` on them
 * is a common reason sites fail review despite having written the pages.
 */
export async function staticPageMetadata(
  locale: string,
  path: string,
  titleKey: string,
  introKey: string
): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "pages" });
  return {
    title: t(titleKey),
    description: t(introKey),
    alternates: buildAlternates(locale, path),
  };
}
