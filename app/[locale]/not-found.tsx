import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center space-y-4">
      <h1 className="text-2xl font-bold">{t("heading")}</h1>
      <p className="text-ink-muted">{t("body")}</p>
      <Link href="/" className="inline-block text-accent-strong hover:underline">
        {t("homeLink")}
      </Link>
    </div>
  );
}
