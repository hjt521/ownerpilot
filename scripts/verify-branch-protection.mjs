#!/usr/bin/env node
// Verifies 17 Required guards on main per broker ruling 2026-07-01 §7.
// Invoked by broker to confirm 17/17 after §3.3 branch-protection toggle.
//
// verify-branch-protection.mjs — P1 one-shot (broker-authorized; NOT wired into CI — the daily-CI form is
// Gate-3 scope per e2e_gate2_deviations_and_ci_wiring_broker_ruling_2026-06-30).
//
// Deterministically confirms that all 16 expected compliance checks are Required on `main`, so the runbook's
// P1 gate becomes pass/fail instead of an eyeball check.
//
// Usage (pipe the gh api output in, or pass a saved file):
//   gh api repos/hjt521/ownerpilot/branches/main/protection | node scripts/verify-branch-protection.mjs
//   node scripts/verify-branch-protection.mjs protection.json
//
// Reads required_status_checks.contexts (classic) and/or .checks[].context (newer shape). Matching is
// prefix-tolerant: GitHub may store a context as the bare job id ("verify-banned-terms") or as
// "workflow / job"; both normalize to the job id before the set-diff.
//
// Output: one copy-pasteable line. Exit 0 iff all 16 present and nothing unexpected; exit 1 otherwise.

import { readFileSync } from 'node:fs';

// The 17 expected Required checks = 2 pre-existing + 14 audit gaps + fetch-binding (promoted per G14 v2 Fork 1,
// §4.9: runtime-crash guards on customer-facing rails count as compliance-relevant). Job ids verified verbatim
// from .github/workflows/*.yml at main 742181c (re-cross-checked at run time — keep in sync with the audit).
const EXPECTED = [
  // pre-existing
  'test-and-typecheck',
  'verify-locked-prose',
  // 14 promoted compliance guards
  'verify-system-prompt-lock',
  'verify-banned-terms',
  'verify-analytics-no-pii',
  'verify-no-preconsent-analytics',
  'verify-mirror-denylist',
  'verify-broker-confirm-sla-sync',
  'verify-normalize-identical-to-resolver',
  'verify-classifier-lock',
  'verify-geocode-failure-event',
  'verify-no-operator-secrets',
  'verify-no-live-cliff',
  'verify-edge-core-sync',
  'verify-parcel-health-core-sync',
  'verify-e2e-seed-guard',
  // promoted per Fork 1 (G14 v2)
  'verify-fetch-binding',
];

const norm = (s) => String(s).includes(' / ') ? s.split(' / ').pop().trim() : String(s).trim();

function readInput() {
  const fileArg = process.argv[2];
  const raw = fileArg ? readFileSync(fileArg, 'utf8') : readFileSync(0, 'utf8');
  if (!raw.trim()) {
    console.error('verify-branch-protection: no input. Pipe `gh api .../branches/main/protection` or pass a file.');
    process.exit(2);
  }
  return JSON.parse(raw);
}

function extractContexts(prot) {
  const rsc = prot?.required_status_checks ?? {};
  const fromContexts = Array.isArray(rsc.contexts) ? rsc.contexts : [];
  const fromChecks = Array.isArray(rsc.checks) ? rsc.checks.map((c) => c.context) : [];
  return [...new Set([...fromContexts, ...fromChecks].map(norm))];
}

const prot = readInput();
const present = new Set(extractContexts(prot));
const expected = new Set(EXPECTED.map(norm));

const missing = [...expected].filter((e) => !present.has(e));
const unexpected = [...present].filter((p) => !expected.has(p));

if (missing.length === 0 && unexpected.length === 0) {
  console.log(`P1 OK: ${expected.size}/${expected.size} required checks present on main`);
  process.exit(0);
}
console.log(
  `P1 FAIL: ${expected.size - missing.length}/${expected.size} present` +
    (missing.length ? ` | missing: ${missing.join(', ')}` : '') +
    (unexpected.length ? ` | unexpected: ${unexpected.join(', ')}` : ''),
);
process.exit(1);
