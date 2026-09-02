/**
 * Splits the per-country city files into per-STATE shards.
 *
 * Why: rendering one city page loaded that city's entire *country* file —
 * 565KB for China, 1MB for India — and did it for three separate reasons
 * (find the city by slug, scan every city in the country for the nearest
 * ones, and read `.length` for a "cities in this country" count). On the
 * Workers free plan a request gets 10ms of CPU, and parsing that much
 * JSON blew straight through it: every Chinese city page returned 500
 * with `"outcome": "exceededCpu"` in the Worker logs.
 *
 * After this, a city page reads one state shard — median 7KB, and 13KB
 * for Beijing where it used to be 565KB.
 *
 * Nearest-neighbour search is now scoped to the state shard rather than
 * the whole country. That is a deliberate, measured trade: precomputing
 * country-wide neighbours into the shards was tried first and made things
 * WORSE, because carrying 8 neighbour records per city inflated
 * England's shard to 1.2MB — larger than the entire GB country file it
 * replaced. 81% of a city's true nearest neighbours are in its own state
 * anyway, and the distances shown on the page are still computed from
 * real coordinates, so nothing on the page becomes untrue — a border city
 * may simply miss a slightly closer neighbour across the line.
 *
 * Outputs, all under public/runtime-data/:
 *   cities/{CC}/{admin1Slug}.json  cities of that state
 *   cities/{CC}/_none.json         cities with no admin1 (Singapore etc.)
 *   cities/{CC}/_top.json          20 most populous, for country hub facts
 *   city-counts.json               { [countryCode]: totalCities }
 */
import fs from "node:fs";
import path from "node:path";

const SRC = path.join(process.cwd(), "data/processed/cities");
const OUT = path.join(process.cwd(), "public/runtime-data/cities");
const COUNTS = path.join(process.cwd(), "public/runtime-data/city-counts.json");

const TOP_LIMIT = 20;

interface City {
  geonameId: number;
  name: string;
  slug: string;
  countryCode: string;
  admin1Id: string | null;
  lat: number;
  lon: number;
  timezone: string;
  population: number;
  [k: string]: unknown;
}

interface Admin1 {
  id: string;
  slug: string;
}

function main() {
  const admin1: Admin1[] = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data/processed/admin1.json"), "utf8")
  );
  const slugById = new Map(admin1.map((a) => [a.id, a.slug]));

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const counts: Record<string, number> = {};
  let shards = 0;

  for (const file of fs.readdirSync(SRC)) {
    if (!file.endsWith(".json")) continue;
    const cc = file.replace(/\.json$/, "");
    const cities: City[] = JSON.parse(fs.readFileSync(path.join(SRC, file), "utf8"));
    counts[cc] = cities.length;

    const dir = path.join(OUT, cc);
    fs.mkdirSync(dir, { recursive: true });

    // Group by state slug; cities with no admin1 go to _none.
    const byShard = new Map<string, City[]>();
    for (const city of cities) {
      const key = city.admin1Id ? slugById.get(city.admin1Id) ?? "_none" : "_none";
      const arr = byShard.get(key) ?? [];
      arr.push(city);
      byShard.set(key, arr);
    }
    for (const [key, arr] of byShard) {
      fs.writeFileSync(path.join(dir, `${key}.json`), JSON.stringify(arr));
      shards++;
    }
    // _none must exist even when empty: the region route asks for it on
    // every 2-segment URL, and a 404 there would be indistinguishable
    // from a genuinely missing city.
    if (!byShard.has("_none")) {
      fs.writeFileSync(path.join(dir, "_none.json"), "[]");
      shards++;
    }

    const top = [...cities].sort((a, b) => b.population - a.population).slice(0, TOP_LIMIT);
    fs.writeFileSync(path.join(dir, "_top.json"), JSON.stringify(top));
    shards++;
  }

  fs.writeFileSync(COUNTS, JSON.stringify(counts));

  const totalCities = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(`countries: ${Object.keys(counts).length}  cities: ${totalCities}`);
  console.log(`shard files written: ${shards}`);
  console.log(`wrote ${COUNTS}`);
}

main();
