// scripts/ci/verify_locked_prose.test.mjs
//
// Unit tests for the two-manifest (shape-aware) locked-prose guard, per
// locked_prose_manifest_schema_reconciliation_broker_ruling_2026-06-29.md §2.4.
//
// Strategy: build a throwaway fixture repo tree, point the guard at it via
// LOCKED_PROSE_REPO_ROOT, run it as a subprocess, and assert exit codes.
//   exit 0 = clean, exit 1 = drift detected, exit 2 = internal error.
//
// Run:  node scripts/ci/verify_locked_prose.test.mjs
// (Wired into the repo test harness; also runnable standalone.)

import { mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const GUARD = join(HERE, "verify_locked_prose.ts");
const sha256 = (s) => createHash("sha256").update(s, "utf8").digest("hex");

let passed = 0;
let failed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.error(`  FAIL ${name}`); }
}

/** Build a fresh fixture repo tree; `mutate(paths)` may alter it before the guard runs. */
function buildFixture(mutate) {
  const root = mkdtempSync(join(tmpdir(), "lockedprose-"));
  const compliance = join(root, "docs", "compliance");
  const lib = join(root, "lib");
  mkdirSync(compliance, { recursive: true });
  mkdirSync(lib, { recursive: true });

  // --- Shape A: a determination file + a .ts export + a manifest auditing it. ---
  writeFileSync(join(compliance, "det.md"), "# fixture determination\n");
  const aLiteral = "Locked A copy — byte exact.";
  writeFileSync(join(lib, "shapeA.ts"), `export const SHAPE_A_COPY = ${JSON.stringify(aLiteral)};\n`);
  const shapeAManifest = {
    manifest_version: "test-A",
    generated_at: "2026-06-29T00:00:00Z",
    guard_status: "live",
    broker_authority: "test",
    authoring_authority: "test",
    guard_design: "test",
    entries: [
      {
        constant: "SHAPE_A_COPY",
        tier: "B",
        file: "lib/shapeA.ts",
        verbatim: aLiteral,
        hash: sha256(aLiteral),
        source_determination: "docs/compliance/det.md",
        source_section: "§1",
      },
    ],
  };

  // --- Shape B: an assembly manifest + a consumer that references keys via // LockedKey. ---
  const bValue = "Locked B copy — lives in the manifest.";
  const shapeBManifest = {
    manifest_version: "test-B",
    manifest_role: "runtime-source",
    generated_at: "2026-06-29T00:00:00Z",
    guard_status: "live",
    broker_authority: "test",
    source_rulings: ["det.md"],
    entries: [
      { key: "B_KEY_ONE", version: "v1", tier: "A", value: bValue, hash: sha256(bValue), source_ruling: "det.md §1" },
    ],
  };
  writeFileSync(
    join(lib, "shapeBConsumer.ts"),
    `// LockedKey: B_KEY_ONE\nexport const X = "uses the assembly manifest";\n`
  );

  const paths = {
    root,
    shapeAManifestPath: join(compliance, "locked_prose_manifest.json"),
    shapeBManifestPath: join(compliance, "locked_prose_manifest_phase2_assembly.json"),
    shapeATs: join(lib, "shapeA.ts"),
    shapeBConsumer: join(lib, "shapeBConsumer.ts"),
    shapeAManifest, shapeBManifest, sha256,
  };
  // write defaults
  writeFileSync(paths.shapeAManifestPath, JSON.stringify(shapeAManifest, null, 2));
  writeFileSync(paths.shapeBManifestPath, JSON.stringify(shapeBManifest, null, 2));

  if (mutate) mutate(paths);
  return paths;
}

function runGuard(root) {
  const r = spawnSync("npx", ["--yes", "tsx", GUARD], {
    env: { ...process.env, LOCKED_PROSE_REPO_ROOT: root },
    encoding: "utf8",
  });
  return { code: r.status, out: (r.stdout || "") + (r.stderr || "") };
}

function withCleanup(paths, fn) {
  try { fn(); } finally { rmSync(paths.root, { recursive: true, force: true }); }
}

console.log("verify_locked_prose.test.mjs");

// 1. Baseline clean → exit 0
{
  const p = buildFixture();
  withCleanup(p, () => {
    const { code, out } = runGuard(p.root);
    check("clean fixture passes (exit 0)", code === 0);
    if (code !== 0) console.error(out);
  });
}

// 2. Shape-B hash mismatch (value edited, hash not re-computed) → exit 1
{
  const p = buildFixture((paths) => {
    const m = JSON.parse(JSON.stringify(paths.shapeBManifest));
    m.entries[0].value = "TAMPERED VALUE"; // hash now stale
    writeFileSync(paths.shapeBManifestPath, JSON.stringify(m, null, 2));
  });
  withCleanup(p, () => {
    const { code, out } = runGuard(p.root);
    check("shape-B hash mismatch fails (exit 1)", code === 1 && /shapeb-hash-mismatch/.test(out));
  });
}

// 3. Shape-B dangling LockedKey → exit 1
{
  const p = buildFixture((paths) => {
    writeFileSync(join(paths.root, "lib", "bad.ts"), `// LockedKey: DOES_NOT_EXIST\nexport const Y = 1;\n`);
  });
  withCleanup(p, () => {
    const { code, out } = runGuard(p.root);
    check("shape-B dangling LockedKey fails (exit 1)", code === 1 && /dangling-locked-key/.test(out));
  });
}

// 4. Shape-A hash/verbatim mismatch (edit the .ts export) → exit 1
{
  const p = buildFixture((paths) => {
    writeFileSync(paths.shapeATs, `export const SHAPE_A_COPY = "DRIFTED COPY";\n`);
  });
  withCleanup(p, () => {
    const { code, out } = runGuard(p.root);
    check("shape-A drift fails (exit 1)", code === 1 && /(verbatim-mismatch|hash-mismatch)/.test(out));
  });
}

// 5. Shape-A missing export → exit 1
{
  const p = buildFixture((paths) => {
    writeFileSync(paths.shapeATs, `export const SOMETHING_ELSE = "x";\n`);
  });
  withCleanup(p, () => {
    const { code, out } = runGuard(p.root);
    check("shape-A missing export fails (exit 1)", code === 1 && /missing-export/.test(out));
  });
}

// 6. Dangling // Source: <file>.md → exit 1
{
  const p = buildFixture((paths) => {
    writeFileSync(join(paths.root, "lib", "ref.ts"), `// Source: nonexistent_determination.md\nexport const Z = 1;\n`);
  });
  withCleanup(p, () => {
    const { code, out } = runGuard(p.root);
    check("dangling // Source: comment fails (exit 1)", code === 1 && /dangling-source-comment/.test(out));
  });
}

// 7. Shape-B schema violation (Shape-A fields leak into assembly entry) → exit 1
{
  const p = buildFixture((paths) => {
    const m = JSON.parse(JSON.stringify(paths.shapeBManifest));
    m.entries[0].file = "lib/whatever.ts"; // cross-schema contamination
    writeFileSync(paths.shapeBManifestPath, JSON.stringify(m, null, 2));
  });
  withCleanup(p, () => {
    const { code, out } = runGuard(p.root);
    check("shape-B schema contamination fails (exit 1)", code === 1 && /shapeb-schema-violation/.test(out));
  });
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
