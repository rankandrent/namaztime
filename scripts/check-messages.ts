/**
 * Message-file integrity check across all 17 locales.
 *
 *   npx tsx scripts/check-messages.ts
 *
 * A translation pass (human or LLM) touching 17 files can silently drop
 * a key, mangle a {placeholder}, or lose a <t> tag — and any of those
 * either crashes next-intl at render time or prints a raw key path onto
 * a live page. These are exactly the failures that don't show up until
 * someone visits an Urdu city page, so check them mechanically.
 *
 * Also enforces the date-stamp rule from plan §Staleness: any string
 * that states a prayer time must also name the date it refers to, so a
 * cached/stale page stays historically accurate rather than wrong.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const MESSAGES_DIR = path.join(__dirname, "..", "messages");
const REFERENCE = "en";

type Json = { [k: string]: string | Json };

function flatten(obj: Json, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out.set(key, v);
    else for (const [k2, v2] of flatten(v, key)) out.set(k2, v2);
  }
  return out;
}

const placeholders = (s: string) =>
  new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]));
const richTags = (s: string) => (s.match(/<(\w+)>/g) ?? []).sort().join(",");

/** Keys whose English text names a time and so must also carry a date. */
const TIME_TOKENS = [
  "fajr", "dhuhr", "asr", "maghrib", "isha", "sunrise", "time",
  "startTime", "midTime", "endTime",
];

/**
 * Strings that legitimately omit a date because they are always rendered
 * immediately after a sibling string that supplies one. Each entry names
 * the sibling — if that pairing is ever broken, this list is wrong.
 * Kept explicit rather than loosening the rule, so the exceptions stay
 * visible and reviewable.
 */
const DATED_BY_SIBLING: Record<string, string> = {
  "cityContent.todayTimes": "cityContent.todayDates, same paragraph",
  "cityContent.monthMaghrib": "cityContent.monthFajr, same paragraph",
  "countryContent.cityTimesItem": "countryContent.largestCitiesIntro, section heading",
  "stateContent.cityTimesItem": "stateContent.topCitiesIntro, section heading",
};

function main() {
  const files = readdirSync(MESSAGES_DIR).filter((f) => f.endsWith(".json"));
  const ref = flatten(JSON.parse(readFileSync(path.join(MESSAGES_DIR, `${REFERENCE}.json`), "utf-8")));

  const problems: string[] = [];

  // --- date-stamp rule, checked on the English source only ---
  for (const [key, value] of ref) {
    // Headings are labels ("Fajr in Lahore: 4:00 AM") sitting directly
    // above a dated body, so they don't each need their own date.
    if (key.endsWith("Heading") || key.startsWith("prayers.")) continue;
    if (key in DATED_BY_SIBLING) continue;
    const ph = placeholders(value);
    const namesATime = TIME_TOKENS.some((tok) => ph.has(tok));
    if (namesATime && !ph.has("date") && !ph.has("startDate")) {
      problems.push(
        `${REFERENCE}.json: "${key}" states a time but names no date — a cached page would show it as if current`
      );
    }
  }

  // --- parity across locales ---
  for (const file of files) {
    const locale = file.replace(".json", "");
    if (locale === REFERENCE) continue;
    const other = flatten(JSON.parse(readFileSync(path.join(MESSAGES_DIR, file), "utf-8")));

    for (const key of ref.keys()) {
      if (!other.has(key)) {
        problems.push(`${file}: missing key "${key}"`);
        continue;
      }
      const a = ref.get(key)!;
      const b = other.get(key)!;

      const pa = placeholders(a);
      const pb = placeholders(b);
      const missing = [...pa].filter((p) => !pb.has(p));
      const extra = [...pb].filter((p) => !pa.has(p));
      if (missing.length) problems.push(`${file}: "${key}" lost placeholder(s) {${missing.join("}, {")}}`);
      if (extra.length) problems.push(`${file}: "${key}" has unknown placeholder(s) {${extra.join("}, {")}}`);

      if (richTags(a) !== richTags(b)) {
        problems.push(`${file}: "${key}" rich-tag mismatch (en: "${richTags(a)}" vs "${richTags(b)}")`);
      }
    }

    for (const key of other.keys()) {
      if (!ref.has(key)) problems.push(`${file}: extra key "${key}" not in ${REFERENCE}.json`);
    }
  }

  if (problems.length) {
    for (const p of problems.slice(0, 60)) console.error(`  ✗ ${p}`);
    if (problems.length > 60) console.error(`  … and ${problems.length - 60} more`);
    console.error(`\nFAIL: ${problems.length} message problem(s) across ${files.length} locales`);
    process.exit(1);
  }

  console.log(`OK: ${files.length} locales, ${ref.size} keys each — placeholders and rich tags consistent`);
}

main();
