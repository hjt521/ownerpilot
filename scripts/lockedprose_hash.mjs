// scripts/lockedprose_hash.mjs
//
// Convenience CLI (ruling §2.4 item 6): recompute the SHA-256 `hash` field for every entry in the
// shape-B assembly manifest from its `value`, and write the file back. Use ONLY after a broker has
// re-ratified an edited `value` — the CI guard (verify_locked_prose.ts) remains the enforcement gate;
// this script just spares authors from hand-computing hashes.
//
//   node scripts/lockedprose_hash.mjs          # rewrites hashes in place
//   node scripts/lockedprose_hash.mjs --check  # exit 1 if any hash is stale (no write)
//
// Guardrail: this does NOT change any `value`. It only recomputes `hash` to match the current `value`.

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";

const REPO_ROOT = process.env.LOCKED_PROSE_REPO_ROOT
  ? resolve(process.env.LOCKED_PROSE_REPO_ROOT)
  : resolve(new URL("..", import.meta.url).pathname);
const MANIFEST = join(REPO_ROOT, "docs", "compliance", "locked_prose_manifest_phase2_assembly.json");
const CHECK_ONLY = process.argv.includes("--check");
const sha256 = (s) => createHash("sha256").update(s, "utf8").digest("hex");

const m = JSON.parse(readFileSync(MANIFEST, "utf8"));
if (!Array.isArray(m.entries)) {
  console.error("assembly manifest `entries` is not an array");
  process.exit(2);
}

let stale = 0;
for (const e of m.entries) {
  const want = sha256(e.value);
  if (e.hash !== want) {
    stale++;
    console.log(`${CHECK_ONLY ? "STALE" : "UPDATED"} ${e.key}: ${e.hash ?? "(none)"} -> ${want}`);
    e.hash = want;
  }
}

if (CHECK_ONLY) {
  console.log(stale === 0 ? "all hashes current" : `${stale} stale hash(es)`);
  process.exit(stale === 0 ? 0 : 1);
}

if (stale > 0) {
  writeFileSync(MANIFEST, JSON.stringify(m, null, 2) + "\n");
  console.log(`rewrote ${stale} hash(es) in ${MANIFEST}`);
} else {
  console.log("no changes — all hashes already current");
}
