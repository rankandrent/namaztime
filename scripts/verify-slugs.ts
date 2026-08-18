/**
 * Slug drift guard.
 *
 * Every slug in data/processed is a live, indexable URL segment. If a
 * pipeline change silently renames one, the old URL 404s and whatever
 * ranking it had is lost. This snapshots slugs to a baseline and diffs
 * against it.
 *
 *   npx tsx scripts/verify-slugs.ts --save     # write the baseline
 *   npx tsx scripts/verify-slugs.ts            # diff against it (exit 1 on drift)
 *
 * An *intentional* slug change (like the Macao state/city collision fix)
 * is approved by re-running with --save and noting why in the commit.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";

const OUT_DIR = path.join(__dirname, "..", "data", "processed");
const BASELINE = path.join(__dirname, "..", "data", "slug-baseline.json");

interface Baseline {
  countries: Record<string, string>; // code -> slug
  admin1: Record<string, string>; // id -> slug
  cities: Record<string, string>; // geonameId -> "countrySlug/[stateSlug/]citySlug"
}

function collect(): Baseline {
  const countries = JSON.parse(
    readFileSync(path.join(OUT_DIR, "countries.json"), "utf-8")
  ) as { code: string; slug: string }[];
  const admin1 = JSON.parse(
    readFileSync(path.join(OUT_DIR, "admin1.json"), "utf-8")
  ) as { id: string; slug: string }[];

  const countrySlugByCode = new Map(countries.map((c) => [c.code, c.slug]));
  const stateSlugById = new Map(admin1.map((a) => [a.id, a.slug]));

  const out: Baseline = { countries: {}, admin1: {}, cities: {} };
  for (const c of countries) out.countries[c.code] = c.slug;
  for (const a of admin1) out.admin1[a.id] = a.slug;

  const citiesDir = path.join(OUT_DIR, "cities");
  for (const file of readdirSync(citiesDir).filter((f) => f.endsWith(".json"))) {
    const cities = JSON.parse(
      readFileSync(path.join(citiesDir, file), "utf-8")
    ) as { geonameId: number; slug: string; countryCode: string; admin1Id: string | null }[];
    for (const city of cities) {
      const cSlug = countrySlugByCode.get(city.countryCode) ?? city.countryCode;
      const sSlug = city.admin1Id ? stateSlugById.get(city.admin1Id) : null;
      // The full URL path is what matters, not the bare slug — a city
      // moving between states changes its URL just as much as a rename.
      out.cities[String(city.geonameId)] = sSlug
        ? `${cSlug}/${sSlug}/${city.slug}`
        : `${cSlug}/${city.slug}`;
    }
  }
  return out;
}

function diff(kind: string, before: Record<string, string>, after: Record<string, string>) {
  const changed: string[] = [];
  const removed: string[] = [];
  const added: string[] = [];
  for (const [k, v] of Object.entries(before)) {
    if (!(k in after)) removed.push(`${k}: ${v}`);
    else if (after[k] !== v) changed.push(`${k}: ${v} -> ${after[k]}`);
  }
  for (const k of Object.keys(after)) if (!(k in before)) added.push(`${k}: ${after[k]}`);
  return { kind, changed, removed, added };
}

function main() {
  const current = collect();
  const save = process.argv.includes("--save");

  if (save || !existsSync(BASELINE)) {
    writeFileSync(BASELINE, JSON.stringify(current, null, 0));
    console.log(
      `baseline ${save ? "updated" : "created"}: ` +
        `${Object.keys(current.countries).length} countries, ` +
        `${Object.keys(current.admin1).length} states, ` +
        `${Object.keys(current.cities).length} cities`
    );
    return;
  }

  const before = JSON.parse(readFileSync(BASELINE, "utf-8")) as Baseline;
  const results = [
    diff("countries", before.countries, current.countries),
    diff("admin1", before.admin1, current.admin1),
    diff("cities", before.cities, current.cities),
  ];

  let drift = 0;
  for (const r of results) {
    drift += r.changed.length + r.removed.length;
    const note =
      `${r.kind}: ${r.changed.length} changed, ${r.removed.length} removed, ` +
      `${r.added.length} added`;
    console.log(note);
    for (const line of [...r.changed, ...r.removed].slice(0, 10)) {
      console.log(`   ! ${line}`);
    }
  }

  if (drift > 0) {
    console.error(
      `\nFAIL: ${drift} existing URL(s) changed or disappeared. ` +
        `If this is intentional, re-run with --save and add redirects for the old URLs.`
    );
    process.exit(1);
  }
  console.log("\nOK: no existing URL changed.");
}

main();
