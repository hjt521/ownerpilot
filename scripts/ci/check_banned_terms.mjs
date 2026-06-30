#!/usr/bin/env node
// scripts/ci/check_banned_terms.mjs
// Banned-term CI lint (guard E). Ratified: banned_term_audit_broker_ratification_2026-06-29.md.
// Negative-prose counterpart to ci:verify-locked-prose. Term list byte-exact from marketing §1.4.
//
// Scans components/, app/, lib/ (.ts/.tsx). Excludes *.test.*, /_core/ mirrors, docs/compliance/.
// Allow-list: scripts/ci/banned_terms_allowlist.txt, keyed `relativepath::lowercased_term` (engineering call
// on key shape per ratification §48/§66 — keyed by file+term rather than brittle line numbers; each entry
// carries a reason comment). Exit 0 clean; exit 1 with file:line + offending text + canonical §1 substitution.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOTS = ['components', 'app', 'lib'];
const ALLOWLIST_PATH = 'scripts/ci/banned_terms_allowlist.txt';

// term (canonical), regex (case-insensitive, word-boundary), substitution (marketing §1.1/§1.4)
const PATTERNS = [
  ['legally compliant',   /\blegally compliant\b/i,        'designed around California statutory requirements'],
  ['compliant notice',    /\bcompliant notice\b/i,          'notice designed around California statutory requirements'],
  ['compliant document',  /\bcompliant document\b/i,        'document designed around California statutory requirements'],
  ['court-ready',         /\bcourt-ready\b/i,               'self-filing prep packet for landlord review'],
  ['future-proof',        /\bfuture-proof\w*/i,             'banned outright — rephrase ("monitored for changes and updated as statutes and forms evolve")'],
  ['attorney-drafted',    /\battorney-drafted\b/i,          'broker-prepared / broker-supervised'],
  ['compliance officer',  /\bcompliance officer\b/i,        'broker of record / California Licensed Real Estate Broker'],
  ['audit-ready',         /\baudit-ready\b/i,               'keep records ready'],
  ['enforceable',         /\benforceable\b/i,               'do not claim as a document property — rephrase (allow-list legit statutory uses)'],
  ['AI lawyer',           /\bAI lawyer\b/i,                 'banned — OwnerPilot is not a law firm; rephrase'],
  ['guaranteed valuation',/\bguaranteed valuation\b/i,      'banned — no guarantees; rephrase'],
  ['official legal opinion',/\bofficial legal opinion\b/i,  'banned — not legal advice; rephrase'],
  ['partner attorney',    /\bpartner attorney\b/i,          'banned outside disclaimer — "a California licensed attorney"'],
  ['in-house counsel',    /\bin-house counsel\b/i,          'banned outside disclaimer — generic referral'],
  ['in-house lawyer',     /\bin-house lawyer\b/i,           'banned outside disclaimer — generic referral'],
  ['our attorney',        /\bour attorney\b/i,              'banned — generic referral only ("a California licensed attorney")'],
  ['verified badge',      /"?verified"?\s+badge/i,          'Timestamped'],
];

function loadAllowlist() {
  const allow = new Set();
  if (!existsSync(ALLOWLIST_PATH)) return allow;
  for (const raw of readFileSync(ALLOWLIST_PATH, 'utf8').split('\n')) {
    const line = raw.replace(/#.*$/, '').trim(); // strip reason comment
    if (!line) continue;
    allow.add(line.toLowerCase());
  }
  return allow;
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === '_core' || name === 'node_modules') continue;
      yield* walk(p);
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) {
      yield p;
    }
  }
}

const allow = loadAllowlist();
const violations = [];

for (const root of ROOTS) {
  if (!existsSync(root)) continue;
  for (const file of walk(root)) {
    const rel = relative('.', file);
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((text, i) => {
      for (const [term, re, sub] of PATTERNS) {
        if (re.test(text)) {
          if (allow.has(`${rel}::${term}`.toLowerCase())) continue; // legit use, allow-listed with reason
          violations.push({ file: rel, line: i + 1, term, text: text.trim().slice(0, 160), sub });
        }
      }
    });
  }
}

if (violations.length) {
  console.error('ci:verify-banned-terms FAILED — banned promotional/legal-conclusion terms in owner-facing copy:\n');
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  "${v.term}"`);
    console.error(`    > ${v.text}`);
    console.error(`    substitution: ${v.sub}\n`);
  }
  console.error(`${violations.length} violation(s). Allow legitimate uses in ${ALLOWLIST_PATH} with a reason.`);
  process.exit(1);
}
console.log('ci:verify-banned-terms: OK (no banned terms in owner-facing copy)');
process.exit(0);
