#!/usr/bin/env node
// Verifies 11 Required checks on main — the curated compliance-critical set ruled in
// gate2_baseline_correction_addendum_2026-07-01.md (Option (c)). Supersedes the earlier 17/18/19 chain, which the
// "main protection" ruleset never actually enforced (reconciliation 2026-07-01 found only 5 enforced).
// Invoked by broker to confirm 11/11 after the ruleset required_status_checks PATCH.
//
// verify-branch-protection.mjs — P1 one-shot (broker-authorized; NOT wired into CI — the daily-CI form is
// Gate-3 scope per e2e_gate2_deviations_and_ci_wiring_broker_ruling_2026-06-30).
//
// Deterministically confirms that all 11 expected compliance checks are Required on `main`, so the runbook's
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
// Output: one copy-pasteable line. Exit 0 iff all 11 present and nothing unexpected; exit 1 otherwise.

import { readFileSync } from 'node:fs';

// The 11 expected Required checks — Option (c) curated set (gate2_baseline_correction_addendum_2026-07-01.md):
// the 5 the "main protection" ruleset already enforced + 6 compliance-critical guards promoted to Required. The
// other 8 audit-gap checks are advisory-tier (fast-follow GATE2-ADVISORY-PROMOTION-2026Q3). This list MUST equal
// the ruleset's required_status_checks (helper == GitHub). Job ids verbatim from .github/workflows/*.yml.
const EXPECTED = [
  // 5 previously enforced by the "main protection" ruleset
  'test-and-typecheck',
  'verify-locked-prose',
  'verify-system-prompt-lock',
  'verify-classifier-lock',
  'verify-no-live-cliff',
  // 6 compliance-critical, promoted to Required per the baseline-correction addendum
  'verify-banned-terms',
  'verify-no-operator-secrets',
  'verify-e2e-seed-guard',
  'verify-fetch-binding',
  'verify-review-produce-parity',
  'synthetic-daycount-jul2026',
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
