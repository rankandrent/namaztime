import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { SearchBox } from "@/components/SearchBox";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

export async function SiteHeader() {
  const t = await getTranslations("nav");

  return (
    <header className="border-b border-line">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-4">
        <Link href="/" className="font-semibold shrink-0">
          🕌 {t("siteName")}
        </Link>
        <div className="flex-1 max-w-sm ms-auto">
          <SearchBox />
        </div>
        <LocaleSwitcher />
      </div>
    </header>
  );
}
