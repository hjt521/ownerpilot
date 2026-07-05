// scripts/ci/check_attorney_attribution.mjs
// codebase_prose_correction_reviewing_attorney_of_record_2026-07-05 — CI guard.
// Asserts no production source file contains attorney-attribution phrases that conflict with the broker-only /
// no-SBN posture. Scans lib/ app/ components/ scripts/ for: the 3 attribution phrases named in the ruling
// ("attorney of record", "State Bar number", "reviewing attorney") PLUS the 8 mandatory-attorney phrases reused
// from the persona ruling (already in lib/chat/bannedTerms.json). Fails the build on any hit outside the allowlist.
//
// Government-form carve-out: form text imported verbatim from LASC / Judicial Council / LAHD PDFs is not
// OwnerPilot-authored copy and is not scanned here (those inputs live outside the scanned source dirs).

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOTS = ['lib', 'app', 'components', 'scripts'];
const EXTS = new Set(['.ts', '.tsx', '.mjs', '.js', '.sql']);

// Files that legitimately contain these phrases (test fixtures, the single-source term list, and these guards
// themselves). Kept explicit + minimal so the guard cannot false-positive on itself.
const ALLOWLIST = new Set([
  'lib/chat/bannedTerms.json',
  'lib/chat/__tests__/udProPerGate.test.ts',
  'scripts/ci/check_attorney_attribution.mjs',
]);

// 3 attribution phrases (this ruling) + 8 mandatory-attorney phrases (persona ruling, reused).
const PHRASES = [
  'attorney of record', 'State Bar number', 'reviewing attorney',
  'must be reviewed by an attorney', 'must be filed by an attorney', 'must have an attorney',
  'requires an attorney', 'you need an attorney to file', 'you need a lawyer to file',
  'only an attorney can file', 'only a lawyer can file',
].map((p) => ({ p, re: new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }));

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name === 'dist') continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (EXTS.has(extname(name))) out.push(full);
  }
  return out;
}

const hits = [];
for (const root of ROOTS) {
  let files;
  try { files = walk(root); } catch { continue; }
  for (const f of files) {
    const rel = f.replace(/\\/g, '/');
    if (ALLOWLIST.has(rel)) continue;
    const text = readFileSync(f, 'utf8');
    for (const { p, re } of PHRASES) {
      if (re.test(text)) hits.push(`${rel}: "${p}"`);
    }
  }
}

if (hits.length) {
  console.error('ci:check-attorney-attribution: FAIL — attorney/SBN attribution found in production source.');
  console.error('Broker-only attribution (Jack Taglyan / CalDRE B9445457); no attorney of record, no SBN.');
  for (const h of hits) console.error('  ' + h);
  process.exit(1);
}
console.log('ci:check-attorney-attribution: OK (no attorney/SBN attribution in production source)');
