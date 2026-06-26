#!/usr/bin/env node
/**
 * build_parcel_health_core.mjs — build-sync for the parcel-health Edge Function.
 *
 * Sibling of scripts/build_edge_core.mjs (rtc-refresh). Structurally identical; the
 * only deltas are the ENTRY / OUT_DIR constants (repointed to parcel-health) and the
 * path-derived strings in the generated header, README, and log output. The rtc-refresh
 * generator is NOT touched (Option B, slice-2 architecture ruling §2.3).
 *
 * Governing rulings:
 *  - parcel_endpoint_health_check_live_determination_broker_2026-06-25.md (the "live" determination)
 *  - slice2_architecture_and_alert_sink_broker_ruling_2026-06-25.md (Architecture A; _core/ mirror)
 *
 * The Supabase Edge deploy bundler (Deno) requires explicit `.ts` extensions on relative imports;
 * the canonical source under lib/jurisdiction/ uses Node/Next extensionless imports. This script
 * transpiles the transitive import-closure of the parcel-health core entry into
 * supabase/functions/parcel-health/_core/ with `.ts` extensions added, flattened into one directory.
 *
 * _core/ is TRACKED AND COMMITTED: the bytes here are the bytes that deploy, and PR-diff visibility
 * is the explicit audit-surface design intent. The CI guard (verify-parcel-health-core-sync) runs
 * this then `git diff --exit-code` on _core/ — a stale or hand-edited _core/ fails the build.
 *
 * Determinism: closure sorted; each file rewritten by a pure regex pass; re-running on unchanged
 * source produces byte-identical output (idempotent). The script copies + rewrites ONLY — no bundling,
 * no minification, no logic transform. Every relative import must resolve to a sibling in the flattened
 * closure, or the script aborts (a future nested import can never silently produce a broken _core/).
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, basename, resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = join(REPO_ROOT, 'lib/jurisdiction/parcelHealth/parcelHealthCore.ts');
const OUT_DIR = join(REPO_ROOT, 'supabase/functions/parcel-health/_core');

const FROM_RE = /(\bfrom\s+)(['"])(\.\.?\/[^'"]+)(\2)/g;
const SIDE_EFFECT_RE = /(^\s*import\s+)(['"])(\.\.?\/[^'"]+)(\2)/gm;

function resolveSpecifier(fromFile, spec) {
  const base = resolve(dirname(fromFile), spec);
  for (const candidate of [base, `${base}.ts`, join(base, 'index.ts')]) {
    if (existsSync(candidate) && candidate.endsWith('.ts')) return candidate;
  }
  throw new Error(
    `build_parcel_health_core: cannot resolve import "${spec}" from ${fromFile} — ` +
      `closure must be flat .ts siblings; nested/extensioned imports are unsupported.`,
  );
}

function relativeSpecifiers(src) {
  const specs = [];
  for (const re of [FROM_RE, SIDE_EFFECT_RE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src)) !== null) specs.push(m[3]);
  }
  return specs;
}

function buildClosure(entry) {
  const seen = new Set();
  const stack = [entry];
  while (stack.length) {
    const file = stack.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    const src = readFileSync(file, 'utf8');
    for (const spec of relativeSpecifiers(src)) stack.push(resolveSpecifier(file, spec));
  }
  return [...seen].sort();
}

function rewriteImports(src) {
  const flatten = (_full, pre, q, spec, qq) => {
    const name = basename(spec).replace(/\.ts$/, '');
    return `${pre}${q}./${name}.ts${qq}`;
  };
  return src.replace(FROM_RE, flatten).replace(SIDE_EFFECT_RE, flatten);
}

function generatedHeader(srcRel) {
  return (
    '// ============================================================================\n' +
    '// GENERATED FILE — DO NOT EDIT\n' +
    `// Source: ${srcRel}\n` +
    '// Regenerate with: npm run build:parcel-health-core\n' +
    '// CI guard: git diff --exit-code supabase/functions/parcel-health/_core/\n' +
    '// Governing ruling: slice2_architecture_and_alert_sink_broker_ruling_2026-06-25.md\n' +
    '// ============================================================================\n'
  );
}

const README = `# parcel-health Edge Function — \`_core/\` build artifact

**This directory is generated. Do not edit.**

## What lives here

A compiled, deploy-ready copy of the parcel-health closure rooted at
\`lib/jurisdiction/parcelHealth/parcelHealthCore.ts\` and its transitive dependencies,
with \`.ts\` extensions added to all extensionless relative imports so the Supabase Edge
deploy bundler (Deno) resolves them.

## Canonical source

\`lib/jurisdiction/parcelHealth/\` — the barrel (\`parcelHealthCore.ts\`) plus the pure
modules it re-exports. **All edits go to the canonical source.** This \`_core/\` directory
is regenerated from it; do not hand-edit.

## Regenerate

\`\`\`bash
npm run build:parcel-health-core
\`\`\`

Idempotent: re-running on unchanged source produces byte-identical output.

## CI guard

\`npm run ci:verify-parcel-health-core-sync\` runs the generator then
\`git diff --exit-code supabase/functions/parcel-health/_core/\`. A stale or hand-edited
\`_core/\` fails CI — the Edge Function deploys these bytes, not the canonical source.

## Governing rulings

- \`parcel_endpoint_health_check_live_determination_broker_2026-06-25.md\`
- \`slice2_architecture_and_alert_sink_broker_ruling_2026-06-25.md\`
`;

function main() {
  const closure = buildClosure(ENTRY);
  if (existsSync(OUT_DIR)) rmSync(OUT_DIR, { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });
  for (const file of closure) {
    const srcRel = relative(REPO_ROOT, file);
    const out = join(OUT_DIR, basename(file));
    const body = rewriteImports(readFileSync(file, 'utf8'));
    writeFileSync(out, generatedHeader(srcRel) + body, 'utf8');
  }
  writeFileSync(join(OUT_DIR, 'README.md'), README, 'utf8');
  process.stderr.write(
    `build_parcel_health_core: wrote ${closure.length} file(s) + README to supabase/functions/parcel-health/_core/\n`,
  );
  for (const file of closure) process.stderr.write(`  - ${basename(file)}\n`);
}

main();
