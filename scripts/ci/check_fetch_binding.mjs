#!/usr/bin/env node
/**
 * check_fetch_binding.mjs — static guard against the "Illegal invocation" fetch bug.
 *
 * The browser's window.fetch enforces its receiver. Passing bare `fetch` into a
 * deps object and calling it as `deps.fetchImpl(...)` rebinds `this` and throws
 * "TypeError: Failed to execute 'fetch' on 'Window': Illegal invocation" — before
 * any request leaves the browser. This bug shipped twice (jurisdiction bridge +
 * Phase 2D produce) and passed CI because tests inject a stub fetch with no
 * receiver requirement. This guard fails the build if the bare-fetch pattern (or
 * its destructured cousin) reappears.
 *
 * Allowed form for injected fetch: `boundFetch` (lib/http/boundFetch.ts), an
 * inline arrow `(...args) => fetch(...args)`, or `fetch.bind(...)`.
 *
 * Usage:  node scripts/ci/check_fetch_binding.mjs
 * Exit:   0 clean · 1 violation(s) found.
 */
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['lib', 'components', 'app'];
const EXTS = new Set(['.ts', '.tsx']);

// Each rule: a regex that, if matched on a non-test line, is a violation.
const RULES = [
  { name: 'bare fetch in fetchImpl slot', re: /fetchImpl:\s*fetch\b/ },
  { name: 'window.fetch in fetchImpl slot', re: /fetchImpl:\s*window\.fetch\b/ },
  { name: 'globalThis.fetch in fetchImpl slot', re: /fetchImpl:\s*globalThis\.fetch\b/ },
  // Note 2 (broker ratification): destructuring fetch off a global produces an
  // unbound reference that trips the receiver check the moment it's used.
  { name: 'destructured fetch (unbound)', re: /const\s*\{[^}]*\bfetch\b[^}]*\}\s*=/ },
];

function walk(dir, acc) {
  let entries;
  try { entries = readdirSync(dir); } catch { return acc; }
  for (const name of entries) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (EXTS.has(p.slice(p.lastIndexOf('.'))) && !/\.test\.[tj]sx?$/.test(name)) acc.push(p);
  }
  return acc;
}

const files = ROOTS.flatMap((r) => walk(r, []));
const violations = [];
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const rule of RULES) {
      if (rule.re.test(line)) {
        violations.push({ file, line: i + 1, rule: rule.name, text: line.trim() });
      }
    }
  });
}

if (violations.length > 0) {
  console.error('\n[check-fetch-binding] FAIL — bare/unbound fetch in an injected slot:\n');
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  [${v.rule}]`);
    console.error(`    ${v.text}`);
  }
  console.error('\n  Fix: use `boundFetch` from lib/http/boundFetch.ts (never pass bare');
  console.error('  fetch/window.fetch/globalThis.fetch — it throws "Illegal invocation"');
  console.error('  when called as deps.fetchImpl(...)).\n');
  process.exit(1);
}

console.log(`[check-fetch-binding] PASS — scanned ${files.length} files, no bare/unbound fetch in injected slots.`);
process.exit(0);
