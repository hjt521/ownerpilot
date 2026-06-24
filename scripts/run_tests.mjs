#!/usr/bin/env node
/**
 * Test runner for the repo's tsx-based suites. Globs every *.test.ts under the given
 * roots (default: lib), runs each through tsx, and fails the whole run if any suite
 * exits non-zero. Each suite already process.exit(1)s on failure, so this composes.
 *
 * Dependency-free (Node built-ins). Invoked by `npm test`; CI runs it as its own step,
 * separate from the `tsc --noEmit` typecheck step.
 *
 *   node scripts/run_tests.mjs            # all suites under lib/
 *   node scripts/run_tests.mjs lib/chat   # only a subtree
 */

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const roots = process.argv.slice(2);
const ROOTS = roots.length ? roots : ['lib', 'supabase/functions'];

function walk(dir, acc) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const name of entries) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (name.endsWith('.test.ts')) acc.push(p);
  }
  return acc;
}

const files = [...new Set(ROOTS.flatMap((r) => walk(r, [])))].sort();
if (files.length === 0) {
  console.error(`No *.test.ts files found under: ${ROOTS.join(', ')}`);
  process.exit(1);
}

console.log(`Running ${files.length} test suite(s):\n`);
const failures = [];
for (const f of files) {
  console.log(`\u2500\u2500\u2500\u2500 ${f}`);
  const res = spawnSync('npx', ['tsx', f], { stdio: 'inherit' });
  if (res.status !== 0) failures.push(f);
}

console.log('\n' + '='.repeat(48));
console.log(`  suites: ${files.length}   failed: ${failures.length}`);
for (const f of failures) console.log(`   \u2717 ${f}`);
console.log('='.repeat(48) + '\n');
process.exit(failures.length ? 1 : 0);
