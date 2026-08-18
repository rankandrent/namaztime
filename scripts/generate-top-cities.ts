/**
 * Flags each country's capital + most-populous city + the global top ~1,500
 * by population as isTop=true. This flag drives generateStaticParams for
 * city pages (the build-time pre-rendered tier — everything else is ISR).
 *
 * Run with: npx tsx scripts/generate-top-cities.ts
 * (must run after build-database.ts)
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { City } from "../lib/data/types";

const OUT_DIR = path.join(__dirname, "..", "data", "processed");
const CITIES_DIR = path.join(OUT_DIR, "cities");
const GLOBAL_TOP_N = 1500;

function main() {

  const files = readdirSync(CITIES_DIR).filter((f) => f.endsWith(".json"));
  const allCities: { file: string; city: City }[] = [];
  const citiesByFile = new Map<string, City[]>();

  for (const file of files) {
    const cities: City[] = JSON.parse(
      readFileSync(path.join(CITIES_DIR, file), "utf-8")
    );
    // Reset before re-flagging: this script writes isTop back into the
    // same files it reads, so without a reset a second run treats the
    // previous run's flags as pre-existing and stacks another
    // GLOBAL_TOP_N on top (1,787 -> 3,287 -> ...). Must be idempotent —
    // the static page count depends on it.
    for (const city of cities) city.isTop = false;
    citiesByFile.set(file, cities);
    for (const city of cities) allCities.push({ file, city });
  }

  // 1. Per-country: capital + most-populous
  for (const [, cities] of citiesByFile) {
    if (cities.length === 0) continue;

    // most-populous (list is already sorted desc by build-database.ts)
    cities[0].isTop = true;

    // Capital via GeoNames' own PPLC feature code rather than matching
    // city.name against countryInfo's capital string — the two spellings
    // disagree often enough (transliteration, "City of X", diacritics)
    // that name-matching silently missed real capitals.
    for (const city of cities) {
      if (city.rank === "national-capital") city.isTop = true;
    }
  }

  // 2. Global top-N by population, not already flagged
  const remaining = allCities
    .filter((e) => !e.city.isTop)
    .sort((a, b) => b.city.population - a.city.population)
    .slice(0, GLOBAL_TOP_N);
  for (const e of remaining) e.city.isTop = true;

  // Write back per-country files
  let topCount = 0;
  for (const [file, cities] of citiesByFile) {
    writeFileSync(path.join(CITIES_DIR, file), JSON.stringify(cities, null, 0));
    topCount += cities.filter((c) => c.isTop).length;
  }

  // Flat top-cities.json for generateStaticParams consumption
  const topCities = allCities
    .filter((e) => e.city.isTop)
    .map((e) => e.city);
  writeFileSync(
    path.join(OUT_DIR, "top-cities.json"),
    JSON.stringify(topCities, null, 0)
  );

  console.log(`isTop flagged: ${topCount} cities across ${citiesByFile.size} countries`);
}

main();
