#!/bin/bash
# Prunes .open-next/cache down to home + legal pages only (drops every
# country/state/city subtree) before `wrangler deploy` populates KV.
# Rationale: `opennextjs-cloudflare deploy`/`upload` ALWAYS bulk-uploads
# the full local cache to KV as part of the deploy — there's no CLI flag
# to skip it (checked populate-cache.js source). At full scale that's
# 54k+ entries / ~20GB, which at observed KV bulk-put throughput would
# take hours. Everything dropped here still works correctly: ISR renders
# it on first visit and caches it from then on (same as any ISR miss),
# exactly as already verified in dev. Run this after every
# `opennextjs-cloudflare build` and before `wrangler deploy`.
set -e
BUILD_DIR=$(find .open-next/cache -mindepth 1 -maxdepth 1 -type d | head -1)
if [ -z "$BUILD_DIR" ]; then
  echo "No .open-next/cache build directory found — run the build first." >&2
  exit 1
fi
python3 - "$BUILD_DIR" <<'PYEOF'
import os, sys, shutil

build_dir = sys.argv[1]
locales = ["ar","bn","de","en","es","fa","fr","hi","id","it","ms","nl","ru","sv","tr","ur","zh"]
static_pages = {"about", "contact", "privacy", "terms", "disclaimer"}

kept, dropped_dirs, dropped_files = 0, 0, 0
for entry in os.listdir(build_dir):
    full = os.path.join(build_dir, entry)
    if entry in locales:
        for sub in os.listdir(full):
            sub_full = os.path.join(full, sub)
            name = sub[:-6] if sub.endswith(".cache") else sub
            if os.path.isdir(sub_full):
                shutil.rmtree(sub_full)
                dropped_dirs += 1
            elif name in static_pages:
                kept += 1
            else:
                os.remove(sub_full)
                dropped_files += 1
    else:
        kept += 1

print(f"kept={kept} dropped_dirs={dropped_dirs} dropped_files={dropped_files}")
PYEOF
echo "New cache size: $(du -sh .open-next/cache | cut -f1), $(find .open-next/cache -type f | wc -l | tr -d ' ') files"
