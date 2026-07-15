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

// Marketing Tranche 1 (addendum 2026-07-14a §5A): scan marketing/blog/content surfaces too, including .md/.mdx.
// `content` added as a root (existsSync-guarded). Term list stays SSOT-sourced from lib/chat/bannedTerms.json.
const ROOTS = ['components', 'app', 'lib', 'content'];
const ALLOWLIST_PATH = 'scripts/ci/banned_terms_allowlist.txt';
// .md/.mdx are scanned ONLY under marketing/blog/content path segments (keeps docs/ and stray READMEs out of scope,
// which legitimately contain broker-internal terms like "rulings").
const MARKETING_CONTENT_RE = /(^|\/)(marketing|blog|content)(\/|$)/;

// SINGLE SOURCE (p4 ruling 2026-07-04 Q3): term list loaded from lib/chat/bannedTerms.json — shared with the
// runtime output gate (lib/chat/runtimeBannedTermGate.ts). The CI lint enforces the ci:true entries on committed
// copy; the runtime gate enforces the runtime action on live model output. CAR identifiers are runtime-only
// (ci:false — they legitimately appear in rulings/docs, so they must NOT fail the CI lint).
const BANNED_TERMS = JSON.parse(readFileSync('lib/chat/bannedTerms.json', 'utf8'));
// term (canonical), regex (case-insensitive, word-boundary), substitution (marketing §1.1/§1.4)
const PATTERNS = BANNED_TERMS.terms
  .filter((t) => t.ci)
  .map((t) => [t.term, new RegExp(t.pattern, t.flags), t.reason]);

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
    } else if (/\.(md|mdx)$/.test(name) && MARKETING_CONTENT_RE.test(p.replace(/\\/g, '/'))) {
      // Marketing/blog/content prose surfaces (addendum §5A) — banned-terms enforced on copy, not just code.
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
