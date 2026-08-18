/**
 * Downloads the GeoNames alternate-names dump (~202 MB) used to give
 * every city/state/country its native-script name.
 *
 * Resumable on purpose: at the connection speeds this has actually seen
 * (~500 KB/s) the transfer runs ~7 minutes, and a plain `curl -o` that
 * drops at 70% throws all of it away. This retries with HTTP Range
 * requests so a dropped connection costs seconds, not minutes.
 *
 *   npx tsx scripts/download-alternate-names.ts
 */
import { createWriteStream, existsSync, statSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const URL_ = "https://download.geonames.org/export/dump/alternateNamesV2.zip";
const RAW_DIR = path.join(__dirname, "..", "data", "raw");
const DEST = path.join(RAW_DIR, "alternateNamesV2.zip");
const MAX_ATTEMPTS = 12;

async function remoteSize(): Promise<number> {
  const res = await fetch(URL_, { method: "HEAD" });
  return Number(res.headers.get("content-length") ?? 0);
}

function localSize(): number {
  return existsSync(DEST) ? statSync(DEST).size : 0;
}

async function main() {
  await mkdir(RAW_DIR, { recursive: true });

  const total = await remoteSize();
  if (!total) throw new Error("could not determine remote file size");

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const have = localSize();
    if (have >= total) {
      console.log(`complete: ${DEST} (${(have / 1e6).toFixed(1)} MB)`);
      return;
    }

    const pct = ((have / total) * 100).toFixed(1);
    console.log(`attempt ${attempt}: resuming at ${(have / 1e6).toFixed(1)} MB / ${(total / 1e6).toFixed(1)} MB (${pct}%)`);

    try {
      const res = await fetch(URL_, {
        headers: have > 0 ? { Range: `bytes=${have}-` } : {},
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      // 200 on a Range request means the server ignored it — restart clean
      // rather than appending a second copy of the whole file.
      const append = res.status === 206;
      await pipeline(
        Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]),
        createWriteStream(DEST, append ? { flags: "a" } : { flags: "w" })
      );
    } catch (err) {
      console.warn(`  interrupted: ${(err as Error).message}`);
      // Loop re-reads the on-disk size, so partial bytes are kept.
      continue;
    }
  }

  const have = localSize();
  if (have < total) {
    throw new Error(
      `gave up after ${MAX_ATTEMPTS} attempts at ${(have / 1e6).toFixed(1)}/${(total / 1e6).toFixed(1)} MB`
    );
  }
  console.log(`complete: ${DEST} (${(have / 1e6).toFixed(1)} MB)`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
