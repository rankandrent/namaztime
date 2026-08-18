/**
 * Parses the raw GeoNames files in data/raw/ into the processed dataset
 * the app consumes: data/processed/{countries.json, admin1.json,
 * search-index.json, cities/{ISO2}.json}.
 *
 * Run with: npx tsx scripts/build-database.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { assignSlugs, baseSlug, CITY_SLUG_PREFIX } from "../lib/slug";
import type { Country, Admin1, City, CityRank } from "../lib/data/types";

const RAW_DIR = path.join(__dirname, "..", "data", "raw");
const OUT_DIR = path.join(__dirname, "..", "data", "processed");
const CITIES_OUT_DIR = path.join(OUT_DIR, "cities");

function readLines(file: string): string[] {
  return readFileSync(path.join(RAW_DIR, file), "utf-8")
    .split("\n")
    .filter((l) => l.trim().length > 0);
}

function rankFromFeatureCode(featureCode: string): CityRank {
  switch (featureCode) {
    case "PPLC":
      return "national-capital";
    case "PPLA":
      return "admin1-capital";
    case "PPLA2":
      return "admin2-capital";
    default:
      return "city";
  }
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(CITIES_OUT_DIR, { recursive: true });

  // ---------- countryInfo.txt ----------
  // 0 ISO  1 ISO3  2 ISO-Numeric  3 fips  4 Country  5 Capital  6 Area
  // 7 Population  8 Continent  9 tld  10 CurrencyCode  11 CurrencyName
  // 12 Phone  13 PostalFmt  14 PostalRegex  15 Languages  16 geonameid
  // 17 neighbours  18 EquivalentFipsCode
  const countryLines = readLines("countryInfo.txt").filter(
    (l) => !l.startsWith("#")
  );
  const countryRows = countryLines.map((line) => {
    const c = line.split("\t");
    return {
      code: c[0],
      iso3: c[1],
      name: c[4],
      capital: c[5],
      areaSqKm: Number(c[6]) || 0,
      population: Number(c[7]) || 0,
      continent: c[8],
      // "ur-PK,en-PK,pa,..." -> ["ur", "en", "pa"] (base language subtag)
      languages: (c[15] ?? "")
        .split(",")
        .map((l) => l.trim().split("-")[0])
        .filter(Boolean),
      geonameId: Number(c[16]) || 0,
      neighbours: (c[17] ?? "").split(",").map((n) => n.trim()).filter(Boolean),
    };
  });

  // ---------- admin1CodesASCII.txt ----------
  // 0 code (CC.admin1)  1 name  2 asciiname  3 geonameid
  const admin1Rows = readLines("admin1CodesASCII.txt").map((line) => {
    const c = line.split("\t");
    const id = c[0]; // e.g. "PK.04"
    const countryCode = id.split(".")[0];
    return {
      id,
      countryCode,
      admin1Code: id.split(".").slice(1).join("."),
      name: c[2] || c[1], // prefer asciiname
      geonameId: Number(c[3]) || 0,
    };
  });
  const admin1CountrySet = new Set(admin1Rows.map((r) => r.countryCode));

  // Slug admin1 regions, scoped per-country (two states in different
  // countries can share a slug; same-country collisions get disambiguated)
  const admin1ByCountry = new Map<string, typeof admin1Rows>();
  for (const row of admin1Rows) {
    const arr = admin1ByCountry.get(row.countryCode) ?? [];
    arr.push(row);
    admin1ByCountry.set(row.countryCode, arr);
  }
  const admin1SlugMap = new Map<string, string>(); // id -> slug
  for (const [, rows] of admin1ByCountry) {
    const slugs = assignSlugs(rows.map((r) => ({ id: r.id, name: r.name })));
    for (const [id, slug] of slugs) admin1SlugMap.set(id as string, slug);
  }

  const admin1: Admin1[] = admin1Rows.map((r) => ({
    id: r.id,
    countryCode: r.countryCode,
    admin1Code: r.admin1Code,
    geonameId: r.geonameId,
    name: r.name,
    slug: admin1SlugMap.get(r.id)!,
  }));

  // Country slugs (global scope — collisions are rare but handled)
  const countrySlugMap = assignSlugs(
    countryRows.map((r) => ({ id: r.code, name: r.name }))
  );
  const countries: Country[] = countryRows.map((r) => ({
    code: r.code,
    iso3: r.iso3,
    geonameId: r.geonameId,
    name: r.name,
    slug: countrySlugMap.get(r.code)!,
    capital: r.capital,
    continent: r.continent,
    population: r.population,
    areaSqKm: r.areaSqKm,
    languages: r.languages,
    neighbours: r.neighbours,
    hasAdmin1: admin1CountrySet.has(r.code),
  }));

  // ---------- cities15000.txt ----------
  // 0 geonameid 1 name 2 asciiname 3 alternatenames 4 lat 5 lon
  // 6 featureClass 7 featureCode 8 countryCode 9 cc2 10 admin1 11 admin2
  // 12 admin3 13 admin4 14 population 15 elevation 16 dem 17 timezone
  // 18 modificationDate
  const cityLines = readLines("cities15000.txt");
  const cityRowsRaw = cityLines.map((line) => {
    const c = line.split("\t");
    // Prefer the surveyed `elevation` column; fall back to the SRTM `dem`
    // model, which is populated for ~34k of 34,098 cities. -9999 is
    // GeoNames' "unknown" sentinel for dem.
    const gpsElevation = c[15] !== "" ? Number(c[15]) : NaN;
    const dem = c[16] !== "" ? Number(c[16]) : NaN;
    let elevation: number | null = null;
    let elevationSource: "gps" | "dem" | null = null;
    if (Number.isFinite(gpsElevation)) {
      elevation = gpsElevation;
      elevationSource = "gps";
    } else if (Number.isFinite(dem) && dem !== -9999) {
      elevation = dem;
      elevationSource = "dem";
    }
    return {
      geonameId: Number(c[0]),
      name: c[2] || c[1], // asciiname preferred, fallback to name
      featureCode: c[7] ?? "",
      countryCode: c[8],
      admin1Code: c[10],
      lat: Number(c[4]),
      lon: Number(c[5]),
      population: Number(c[14]) || 0,
      elevation,
      elevationSource,
      timezone: c[17],
    };
  });

  // Slug cities, scoped per country+admin1 (falls back to per-country if
  // no admin1) so "Springfield" in two different states doesn't collide
  // unless they're genuinely in the same state.
  const cityGroupKey = (r: (typeof cityRowsRaw)[number]) =>
    `${r.countryCode}.${r.admin1Code || ""}`;
  const cityByGroup = new Map<string, typeof cityRowsRaw>();
  for (const row of cityRowsRaw) {
    const key = cityGroupKey(row);
    const arr = cityByGroup.get(key) ?? [];
    arr.push(row);
    cityByGroup.set(key, arr);
  }
  // Every city's *final* slug carries CITY_SLUG_PREFIX ("prayer-times-lahore",
  // not "lahore") — applied once, here, after collision-safe base slugs are
  // assigned, so uniqueness within each group is untouched (prefixing a set
  // of already-unique strings with the same prefix keeps them unique).
  // Nothing downstream needs to know this happened: every consumer
  // (breadcrumbs, JSON-LD, sitemap, search index, internal links) just
  // reads `city.slug` as it always did — see lib/slug.ts's comment on
  // CITY_SLUG_PREFIX for why that's what makes this a one-line change.
  const citySlugMap = new Map<number, string>();
  for (const [, rows] of cityByGroup) {
    const slugs = assignSlugs(
      rows.map((r) => ({ id: r.geonameId, name: r.name }))
    );
    for (const [id, slug] of slugs) {
      citySlugMap.set(id as number, `${CITY_SLUG_PREFIX}${slug}`);
    }
  }

  const admin1ById = new Map(admin1.map((a) => [a.id, a]));

  // A city whose admin1 code matches no admin1 record is served one level
  // up, at /{country}/{citySlug} — the same URL depth as a state hub. Its
  // slug therefore has to avoid colliding with the *state* slugs of that
  // country, which the per-group slugging above never considered. Without
  // this, e.g. Macao has both a state "Se" and a city "Se" wanting
  // /macao/se, the state wins, and the city is unreachable.
  //
  // Since CITY_SLUG_PREFIX, this is structurally unreachable — a prefixed
  // city slug ("prayer-times-se") can never equal an unprefixed state slug
  // ("se") — but it's left in place as a safety net rather than deleted:
  // free to keep, and it stops being free the moment either assumption
  // (the prefix existing, or state slugs staying unprefixed) changes.
  const stateSlugsByCountry = new Map<string, Set<string>>();
  for (const a of admin1) {
    const set = stateSlugsByCountry.get(a.countryCode) ?? new Set<string>();
    set.add(a.slug);
    stateSlugsByCountry.set(a.countryCode, set);
  }
  let disambiguated = 0;
  for (const r of cityRowsRaw) {
    const hasState = admin1ById.has(`${r.countryCode}.${r.admin1Code}`);
    if (hasState) continue; // lives at 3-segment depth, no conflict
    const slug = citySlugMap.get(r.geonameId)!;
    if (stateSlugsByCountry.get(r.countryCode)?.has(slug)) {
      citySlugMap.set(r.geonameId, `${CITY_SLUG_PREFIX}${baseSlug(r.name)}-${r.geonameId}`);
      disambiguated++;
    }
  }

  const citiesByCountry = new Map<string, City[]>();

  for (const r of cityRowsRaw) {
    const admin1Id = `${r.countryCode}.${r.admin1Code}`;
    const hasAdmin1 = admin1ById.has(admin1Id);
    const city: City = {
      geonameId: r.geonameId,
      name: r.name,
      slug: citySlugMap.get(r.geonameId)!,
      countryCode: r.countryCode,
      admin1Id: hasAdmin1 ? admin1Id : null,
      lat: r.lat,
      lon: r.lon,
      timezone: r.timezone,
      population: r.population,
      elevation: r.elevation,
      elevationSource: r.elevationSource,
      featureCode: r.featureCode,
      rank: rankFromFeatureCode(r.featureCode),
      isTop: false, // filled in by generate-top-cities.ts
    };
    const arr = citiesByCountry.get(r.countryCode) ?? [];
    arr.push(city);
    citiesByCountry.set(r.countryCode, arr);
  }

  // ---------- write outputs ----------
  writeFileSync(
    path.join(OUT_DIR, "countries.json"),
    JSON.stringify(countries, null, 0)
  );
  writeFileSync(
    path.join(OUT_DIR, "admin1.json"),
    JSON.stringify(admin1, null, 0)
  );

  const searchIndex: Array<{
    geonameId: number;
    name: string;
    slug: string;
    countryCode: string;
    countrySlug: string;
    admin1Slug: string | null;
    population: number;
  }> = [];

  const countryBySlugCode = new Map(countries.map((c) => [c.code, c]));
  for (const [countryCode, cities] of citiesByCountry) {
    cities.sort((a, b) => b.population - a.population);
    writeFileSync(
      path.join(CITIES_OUT_DIR, `${countryCode}.json`),
      JSON.stringify(cities, null, 0)
    );
    const country = countryBySlugCode.get(countryCode);
    for (const c of cities) {
      searchIndex.push({
        geonameId: c.geonameId,
        name: c.name,
        slug: c.slug,
        countryCode: c.countryCode,
        countrySlug: country?.slug ?? countryCode.toLowerCase(),
        admin1Slug: c.admin1Id ? admin1ById.get(c.admin1Id)?.slug ?? null : null,
        population: c.population,
      });
    }
  }
  writeFileSync(
    path.join(OUT_DIR, "search-index.json"),
    JSON.stringify(searchIndex, null, 0)
  );

  // Headline counts, emitted as their own tiny file so a page that only
  // wants "how many cities do we cover" doesn't have to import
  // search-index.json (34k entries, several MB) just to read `.length`.
  writeFileSync(
    path.join(OUT_DIR, "stats.json"),
    JSON.stringify({
      cities: cityRowsRaw.length,
      countries: countries.length,
      states: admin1.length,
    })
  );

  const withElevation = cityRowsRaw.filter((r) => r.elevation !== null).length;
  const capitals = cityRowsRaw.filter((r) => r.featureCode === "PPLC").length;
  console.log(`countries: ${countries.length}`);
  console.log(`admin1 regions: ${admin1.length}`);
  console.log(`cities: ${cityRowsRaw.length} across ${citiesByCountry.size} countries`);
  console.log(`  with elevation: ${withElevation}`);
  console.log(`  national capitals (PPLC): ${capitals}`);
  console.log(`  slugs disambiguated vs state slugs: ${disambiguated}`);
  console.log(`output: ${OUT_DIR}`);
}

main();
