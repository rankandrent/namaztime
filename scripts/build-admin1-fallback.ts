/**
 * Representative coordinates for states that contain no city in our main
 * dataset.
 *
 * Why this exists: the site's city data is GeoNames `cities15000`
 * (population >= 15,000). 1,102 of 3,865 admin1 states — 28.5% — contain
 * no such city, so their hub pages rendered "we cover 0 populated places"
 * with an empty list and, critically, **no prayer times at all**. A prayer
 * times page with no prayer times is the one thing this site must never
 * ship, and it was live on ~18,700 URLs (1,102 states x 17 locales).
 *
 * Admin1 records themselves carry no lat/lon (admin1CodesASCII.txt is
 * code/name/asciiname/geonameId only), so the coordinate has to come from
 * somewhere. This script takes the most populous place GeoNames lists
 * inside that state in `cities1000` — a real, named, inhabited locality —
 * and stores it as the state's representative point. The state page then
 * computes genuine prayer times there and **names the locality it used**,
 * rather than silently implying the whole province shares one time.
 *
 * Coverage: 1,012 of the 1,102 (91.8%). The remaining ~90 have no
 * populated place at all in cities1000 (Redonda, Rose Island, and similar
 * uninhabited islands/districts); those state pages are 404'd and kept out
 * of the sitemap instead of shipping an empty page — see
 * lib/data/queries.ts and lib/seo/sitemap-source.ts.
 *
 * Input:  data/raw/cities1000.txt  (https://download.geonames.org/export/dump/cities1000.zip)
 * Output: data/processed/admin1-fallback.json
 */
import fs from "node:fs";
import path from "node:path";

const RAW = path.join(process.cwd(), "data/raw/cities1000.txt");
const OUT = path.join(process.cwd(), "data/processed/admin1-fallback.json");
const OUT_EMPTY = path.join(process.cwd(), "data/processed/admin1-no-content.json");

interface Admin1Row {
  id: string;
  countryCode: string;
  admin1Code: string;
  slug: string;
  name: string;
}
interface SearchRow {
  countryCode: string;
  admin1Slug: string | null;
}

export interface Admin1Fallback {
  lat: number;
  lon: number;
  timezone: string;
  /** The locality the coordinate belongs to — shown to the reader. */
  place: string;
  population: number;
}

function main() {
  if (!fs.existsSync(RAW)) {
    console.error(
      `Missing ${RAW}\nDownload it first:\n  curl -sL -o /tmp/cities1000.zip https://download.geonames.org/export/dump/cities1000.zip\n  unzip -o /tmp/cities1000.zip -d data/raw/`
    );
    process.exit(1);
  }

  const admin1: Admin1Row[] = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data/processed/admin1.json"), "utf8")
  );
  const searchIndex: SearchRow[] = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data/processed/search-index.json"), "utf8")
  );

  // Which states already have at least one city in the main dataset?
  const hasCities = new Set<string>();
  for (const c of searchIndex) {
    if (c.admin1Slug) hasCities.add(`${c.countryCode}/${c.admin1Slug}`);
  }
  const empty = admin1.filter((a) => !hasCities.has(`${a.countryCode}/${a.slug}`));

  // Most populous cities1000 place per country+admin1.
  const best = new Map<string, Admin1Fallback>();
  for (const line of fs.readFileSync(RAW, "utf8").split("\n")) {
    if (!line) continue;
    const f = line.split("\t");
    const countryCode = f[8];
    const admin1Code = f[10];
    if (!countryCode || !admin1Code) continue;
    const population = Number.parseInt(f[14] || "0", 10);
    const key = `${countryCode}.${admin1Code}`;
    const prev = best.get(key);
    if (prev && prev.population >= population) continue;
    best.set(key, {
      lat: Number.parseFloat(f[4]),
      lon: Number.parseFloat(f[5]),
      timezone: f[17],
      place: f[1],
      population,
    });
  }

  const out: Record<string, Admin1Fallback> = {};
  const unresolved: string[] = [];
  const unresolvedIds: string[] = [];
  for (const a of empty) {
    const hit = best.get(`${a.countryCode}.${a.admin1Code}`);
    // A coordinate is only useful if we also have a timezone for it —
    // prayer times are meaningless without one.
    if (hit && Number.isFinite(hit.lat) && Number.isFinite(hit.lon) && hit.timezone) {
      out[a.id] = hit;
    } else {
      unresolved.push(`${a.countryCode}/${a.slug} (${a.name})`);
      unresolvedIds.push(a.id);
    }
  }

  fs.writeFileSync(OUT, JSON.stringify(out, null, 0));
  fs.writeFileSync(OUT_EMPTY, JSON.stringify(unresolvedIds.sort(), null, 0));
  console.log(`states with no cities15000 city: ${empty.length}`);
  console.log(`  resolved to a representative locality: ${Object.keys(out).length}`);
  console.log(`  unresolved (will 404, excluded from sitemap): ${unresolved.length}`);
  unresolved.slice(0, 10).forEach((u) => console.log(`    ${u}`));
  console.log(`wrote ${OUT}`);
  console.log(`wrote ${OUT_EMPTY}`);
}

main();
