#!/usr/bin/env node
/**
 * build_edge_core.mjs — Strategy C build-sync for the rtc-refresh Edge Function.
 *
 * Governing rulings:
 *  - rtc_refresh_edge_function_spike_result_broker_acknowledgment_2026-06-23.md (A-2 build-sync)
 *  - rtc_edge_core_gitignore_vs_guard_broker_ruling_response_2026-06-23.md (Option 1: _core/ COMMITTED)
 *
 * The Supabase Edge deploy bundler (Deno) requires explicit `.ts` extensions on relative imports;
 * the canonical source under lib/jurisdiction/ uses Node/Next extensionless imports. This script
 * transpiles the transitive import-closure of the Edge Function core entry into
 * supabase/functions/rtc-refresh/_core/ with `.ts` extensions added, flattened into one directory.
 *
 * _core/ is TRACKED AND COMMITTED (ruling C-2): the bytes here are the bytes that deploy, and PR-diff
 * visibility is the explicit audit-surface design intent. The CI guard (verify-edge-core-sync) runs
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
const ENTRY = join(REPO_ROOT, 'lib/jurisdiction/rtcRefresh/rtcRefreshJob.ts');
const OUT_DIR = join(REPO_ROOT, 'supabase/functions/rtc-refresh/_core');

const FROM_RE = /(\bfrom\s+)(['"])(\.\.?\/[^'"]+)(\2)/g;
const SIDE_EFFECT_RE = /(^\s*import\s+)(['"])(\.\.?\/[^'"]+)(\2)/gm;

function resolveSpecifier(fromFile, spec) {
  const base = resolve(dirname(fromFile), spec);
  for (const candidate of [base, `${base}.ts`, join(base, 'index.ts')]) {
    if (existsSync(candidate) && candidate.endsWith('.ts')) return candidate;
  }
  throw new Error(
    `build_edge_core: cannot resolve import "${spec}" from ${fromFile} — ` +
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
    '// Regenerate with: npm run build:edge-core\n' +
    '// CI guard: git diff --exit-code supabase/functions/rtc-refresh/_core/\n' +
    '// Governing ruling: rtc_edge_core_gitignore_vs_guard_broker_ruling_response_2026-06-23.md\n' +
    '// ============================================================================\n'
  );
}

const README = `# rtc-refresh Edge Function — \`_core/\` build artifact

**This directory is generated. Do not edit.**

## What lives here

This directory contains a compiled, deploy-ready copy of \`lib/jurisdiction/rtcRefresh/\` and its transitive dependencies (\`lib/jurisdiction/laRtcRules.ts\`, \`lib/jurisdiction/rtcFormBaselines.ts\`) with \`.ts\` extensions added to all extensionless relative imports.

It exists because the Supabase Edge Function deploy bundler (Deno-based) requires explicit \`.ts\` extensions on relative imports, while the canonical source under \`lib/jurisdiction/\` uses Node/Next-style extensionless imports. Both behaviors were verified empirically in the import-strategy spike documented in \`rtc_refresh_edge_function_spike_result_2026-06-23.md\`.

## Canonical source

The canonical source lives at:

- \`lib/jurisdiction/rtcRefresh/\` — refresh job orchestration
- \`lib/jurisdiction/laRtcRules.ts\` — LA RTC rules + version baseline data
- \`lib/jurisdiction/rtcFormBaselines.ts\` — form baselines + SHA-256 hashes

**All edits go to the canonical source.** This \`_core/\` directory is regenerated from it.

## Why this directory is tracked in git

Unlike most build artifacts, this directory IS committed to the repository. The bytes here are the bytes that deploy to the Edge Function at production. Committing them serves the broker-reviews-everything posture: every PR that touches the canonical source shows both the source edit AND the corresponding \`_core/\` diff, making the actual deployed code reviewable directly in the PR. The audit surface is the diff.

## How regeneration works

Run from repo root:

\`\`\`bash
npm run build:edge-core
\`\`\`

This script reads from \`lib/jurisdiction/rtcRefresh/\` (plus its transitive deps), adds \`.ts\` extensions to relative imports, and writes the result here. The script also emits a per-file \`// GENERATED FILE — DO NOT EDIT\` header.

The script is idempotent. Running it twice on an unchanged source produces a byte-identical output.

## CI guard

The CI pipeline runs \`npm run build:edge-core\` followed by \`git diff --exit-code supabase/functions/rtc-refresh/_core/\`. If the diff is non-empty, CI fails — this means a developer edited the canonical source but did not regenerate \`_core/\`, OR edited \`_core/\` directly (forbidden), OR the source's hand-edit-resistance was bypassed somehow.

The guard exists because the Edge Function deploys these \`_core/\` bytes, not the canonical source. A stale \`_core/\` ships stale logic to production. The CI guard makes that impossible to merge.

## Editing this directory

Don't. The per-file \`// GENERATED FILE — DO NOT EDIT\` header is the inline reminder. If you find yourself wanting to edit a file here, find the corresponding canonical source under \`lib/jurisdiction/\`, edit there, run \`npm run build:edge-core\`, and commit both the canonical edit and the regenerated \`_core/\` together.

## Merge-conflict resolution

If two branches both touch the canonical source and both regenerate \`_core/\`, you'll get conflicts under this directory. Don't hand-resolve them. Take the merged canonical source (resolved normally), run \`npm run build:edge-core\` once, and commit the resulting \`_core/\` over the conflicted version. The conflict resolution discipline is documented in \`rtc_edge_core_gitignore_vs_guard_broker_ruling_response_2026-06-23.md\` §2.5.

## Governing rulings

- \`rtc_refresh_edge_function_build_scope_broker_ruling_response_2026-06-23.md\` (Strategy C rationale)
- \`rtc_refresh_edge_function_spike_result_broker_acknowledgment_2026-06-23.md\` (Strategy C ratification — superseded \`_core/\` posture)
- \`rtc_edge_core_gitignore_vs_guard_broker_ruling_response_2026-06-23.md\` (this file — Option 1; \`_core/\` committed; README under this section)
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
    `build_edge_core: wrote ${closure.length} file(s) + README to supabase/functions/rtc-refresh/_core/\n`,
  );
  for (const file of closure) process.stderr.write(`  - ${basename(file)}\n`);
}

main();
