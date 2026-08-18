/**
 * Slug generation for countries, states/admin1 regions, and cities.
 *
 * Rules (per plan §URL Structure):
 *  - lowercase, ASCII-transliterated (diacritics stripped)
 *  - spaces/punctuation -> hyphens
 *  - collisions within the same scope get a `-{geonameId}` suffix,
 *    applied only to the colliding entries so the common case stays clean.
 */

/**
 * Every city page's URL segment is prefixed with this — `/pakistan/punjab/
 * prayer-times-lahore`, not `/pakistan/punjab/lahore`. Country and admin1
 * (state) slugs are deliberately left bare; only the leaf city segment,
 * the page that actually states a time, carries the keyword.
 *
 * Applied once, in scripts/build-database.ts, at slug-generation time —
 * not at render time — so every consumer (breadcrumbs, JSON-LD, sitemap,
 * search index, internal links) inherits it automatically by reading
 * `city.slug` as it always did. See lib/data/queries.ts and
 * lib/seo/sitemap-source.ts: neither reconstructs a city URL from
 * `city.name`, both just interpolate `.slug`, which is exactly what
 * makes a single change here sufficient.
 *
 * Side effect worth knowing: this makes the country/state-vs-city slug
 * collision case in build-database.ts (the "Macao" comment there)
 * structurally impossible going forward — a prefixed and an unprefixed
 * string can never be equal — but that disambiguation code is left in
 * place as a harmless safety net rather than removed.
 */
export const CITY_SLUG_PREFIX = "prayer-times-";

export function baseSlug(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/[^\p{L}\p{N}]+/gu, "-") // non-alphanumeric (unicode-aware) -> hyphen
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

/**
 * Given a list of items with a display name and a stable id, produce
 * collision-safe slugs: the common case is the bare base slug, and only
 * items that collide with another item in the same list get `-{id}`
 * appended (to every member of the colliding group, so lookups are
 * unambiguous about which id a suffixed slug belongs to).
 */
export function assignSlugs<T extends { id: string | number; name: string }>(
  items: T[]
): Map<T["id"], string> {
  const byBase = new Map<string, T[]>();
  for (const item of items) {
    const base = baseSlug(item.name) || `place-${item.id}`;
    const group = byBase.get(base);
    if (group) group.push(item);
    else byBase.set(base, [item]);
  }

  const result = new Map<T["id"], string>();
  for (const [base, group] of byBase) {
    if (group.length === 1) {
      result.set(group[0].id, base);
    } else {
      for (const item of group) {
        result.set(item.id, `${base}-${item.id}`);
      }
    }
  }
  return result;
}
