/**
 * Extracts native-script place names from the GeoNames alternate-names
 * dump into data/processed/names/.
 *
 * Runs AFTER build-database.ts — it needs the emitted geonameId sets.
 *
 *   npx tsx scripts/build-alternate-names.ts
 *
 * The source is ~17M rows / 778 MB uncompressed, so it's streamed
 * straight out of the zip via `unzip -p` rather than extracted to disk.
 * Cheapest tests run first so the vast majority of rows are rejected
 * before any allocation.
 *
 * Countries and admin1 regions are included alongside cities on purpose:
 * without them an Urdu page reads "لاہور, Punjab, Pakistan", mixing
 * scripts in the <h1> of every single page.
 */
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { locales } from "../lib/i18n/config";
import { baseSlug } from "../lib/slug";
import type { Country, Admin1, City } from "../lib/data/types";

const RAW_ZIP = path.join(__dirname, "..", "data", "raw", "alternateNamesV2.zip");
const OUT_DIR = path.join(__dirname, "..", "data", "processed");
const NAMES_DIR = path.join(OUT_DIR, "names");

/**
 * GeoNames tags names with codes finer than our locale list. Map the
 * common variants back, or we'd silently drop e.g. every zh-Hans name.
 */
const LOCALE_ALIASES: Record<string, string> = {
  "zh-hans": "zh",
  "zh-hant": "zh",
  "zh-cn": "zh",
  "zh-tw": "zh",
  cmn: "zh",
  "fa-af": "fa",
  prs: "fa",
  "ar-dz": "ar",
  "ar-eg": "ar",
  "pt-br": "pt",
};

function normalizeLang(raw: string): string | null {
  const lower = raw.toLowerCase();
  const mapped = LOCALE_ALIASES[lower] ?? lower.split("-")[0];
  return (locales as readonly string[]).includes(mapped) ? mapped : null;
}

interface Candidate {
  name: string;
  score: number;
  altId: number;
}

function main() {
  if (!existsSync(RAW_ZIP)) {
    console.error(`missing ${RAW_ZIP} — run scripts/download-alternate-names.ts first`);
    process.exit(1);
  }
  mkdirSync(NAMES_DIR, { recursive: true });

  const countries: Country[] = JSON.parse(
    readFileSync(path.join(OUT_DIR, "countries.json"), "utf-8")
  );
  const admin1: Admin1[] = JSON.parse(
    readFileSync(path.join(OUT_DIR, "admin1.json"), "utf-8")
  );

  // geonameId -> the ascii name we already show, so we can skip
  // "alternates" that are just the same string again (a big win on
  // Latin-script locales).
  const asciiById = new Map<number, string>();
  // geonameId -> which country file its names belong in ("_c"/"_a" for
  // the country/admin1 sidecars).
  const bucketById = new Map<number, string>();

  for (const c of countries) {
    if (!c.geonameId) continue;
    asciiById.set(c.geonameId, c.name);
    bucketById.set(c.geonameId, "_countries");
  }
  for (const a of admin1) {
    if (!a.geonameId) continue;
    asciiById.set(a.geonameId, a.name);
    bucketById.set(a.geonameId, "_admin1");
  }

  const cityKeyById = new Map<number, string>(); // geonameId -> "PK" etc.
  for (const c of countries) {
    const file = path.join(OUT_DIR, "cities", `${c.code}.json`);
    if (!existsSync(file)) continue;
    const cities: City[] = JSON.parse(readFileSync(file, "utf-8"));
    for (const city of cities) {
      asciiById.set(city.geonameId, city.name);
      bucketById.set(city.geonameId, c.code);
      cityKeyById.set(city.geonameId, c.code);
    }
  }

  console.log(`tracking ${bucketById.size} geonameIds across ${countries.length} countries`);

  // bucket -> geonameId -> locale -> best candidate
  const best = new Map<string, Map<number, Map<string, Candidate>>>();

  const child = spawn("unzip", ["-p", RAW_ZIP, "alternateNamesV2.txt"]);
  const rl = createInterface({ input: child.stdout, crlfDelay: Infinity });

  let scanned = 0;
  let kept = 0;

  rl.on("line", (line) => {
    scanned++;
    // 0 altId  1 geonameid  2 isolanguage  3 name  4 isPreferred
    // 5 isShort  6 isColloquial  7 isHistoric  8 from  9 to
    const c = line.split("\t");

    // Cheapest test first: language. Rejects >95% before any allocation.
    const lang = normalizeLang(c[2] ?? "");
    if (!lang) return;
    if (c[6] === "1" || c[7] === "1") return; // colloquial / historic

    const id = Number(c[1]);
    const bucket = bucketById.get(id);
    if (!bucket) return;

    const name = c[3];
    if (!name) return;
    // Same string we already display — no value in storing it.
    if (baseSlug(name) === baseSlug(asciiById.get(id) ?? "")) return;

    const score = (c[4] === "1" ? 0 : 100) + (c[5] === "1" ? 0 : 10);
    const altId = Number(c[0]) || 0;

    let byId = best.get(bucket);
    if (!byId) { byId = new Map(); best.set(bucket, byId); }
    let byLang = byId.get(id);
    if (!byLang) { byLang = new Map(); byId.set(id, byLang); }

    const current = byLang.get(lang);
    // Ties break on the lowest alternateNameId — GeoNames' own stable
    // insertion order, so output doesn't churn between refreshes.
    if (!current || score < current.score || (score === current.score && altId < current.altId)) {
      byLang.set(lang, { name, score, altId });
      kept++;
    }
  });

  rl.on("close", () => {
    let files = 0;
    let entries = 0;
    for (const [bucket, byId] of best) {
      const out: Record<string, Record<string, string>> = {};
      for (const [id, byLang] of byId) {
        const rec: Record<string, string> = {};
        for (const [lang, cand] of byLang) rec[lang] = cand.name;
        if (Object.keys(rec).length > 0) {
          // Countries/admin1 key by their own id; cities too — the
          // consumer looks up by geonameId in the country's file.
          out[String(id)] = rec;
          entries += Object.keys(rec).length;
        }
      }
      writeFileSync(path.join(NAMES_DIR, `${bucket}.json`), JSON.stringify(out, null, 0));
      files++;
    }
    console.log(`scanned ${scanned.toLocaleString()} rows, kept ${kept.toLocaleString()} candidates`);
    console.log(`wrote ${files} files, ${entries.toLocaleString()} names -> ${NAMES_DIR}`);
  });

  child.on("error", (err) => {
    console.error(`unzip failed: ${err.message}`);
    process.exit(1);
  });
}

main();
