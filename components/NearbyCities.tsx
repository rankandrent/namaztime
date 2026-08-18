import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import type { City } from "@/lib/data/types";

export async function NearbyCities({
  cities,
  countrySlug,
  stateSlug,
}: {
  cities: City[];
  countrySlug: string;
  stateSlug: string;
}) {
  if (cities.length === 0) return null;
  const t = await getTranslations("city");
  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted mb-2">
        {t("nearbyHeading")}
      </h2>
      <ul className="flex flex-wrap gap-2">
        {cities.map((c) => (
          <li key={c.geonameId}>
            <Link
              href={`/${countrySlug}/${stateSlug}/${c.slug}`}
              className="inline-block rounded-full border border-line px-3 py-1 text-sm hover:border-accent hover:text-accent-strong"
            >
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
