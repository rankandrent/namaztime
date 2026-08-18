import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { formatTime } from "@/lib/format";
import type { HubCityTime } from "@/lib/prayer-times/hub-facts";

/**
 * The "today's times in the biggest places here" block, shared by the
 * country and state hubs.
 *
 * This is what stops a hub page from being a bare link list: it states
 * real, differing numbers per city, which is both the useful thing for a
 * reader scanning for their nearest city and the non-duplicate content a
 * hub needs to stand on its own. The date lives in the intro line above
 * (passed in by the caller), not repeated per row.
 */
export async function HubCityTimes({
  entries,
  hrefFor,
  nameFor,
  namespace,
}: {
  entries: HubCityTime[];
  hrefFor: (entry: HubCityTime) => string;
  nameFor: (entry: HubCityTime) => string;
  /** "countryContent" or "stateContent" — both define `cityTimesItem`. */
  namespace: "countryContent" | "stateContent";
}) {
  const t = await getTranslations(namespace);
  const locale = await getLocale();
  if (entries.length === 0) return null;

  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {entries.map((entry) => (
        <li key={entry.city.geonameId}>
          <Link
            href={hrefFor(entry)}
            className="flex items-baseline justify-between gap-3 rounded-lg border border-line bg-surface px-3 py-2 hover:border-accent"
          >
            <span className="text-sm font-medium text-ink">{nameFor(entry)}</span>
            <span className="font-mono text-xs text-ink-muted tabular">
              {t("cityTimesItem", {
                fajr: formatTime(entry.fajr, locale),
                maghrib: formatTime(entry.maghrib, locale),
              })}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
