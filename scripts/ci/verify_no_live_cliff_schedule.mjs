#!/usr/bin/env node
/**
 * verify_no_live_cliff_schedule.mjs
 * Slice 4b CI guard per broker ruling 2026-06-21 §2.5 req 5.
 *
 * The retention cliff's LIVE delete (audit_cliff with p_dry_run = false) is
 * broker-run from scripts/audit_cliff_live.ts ONLY. It must never be scheduled
 * or otherwise invoked from a migration. This guard scans supabase/migrations
 * and FAILS if any migration calls audit_cliff with a false dry-run — whether
 * positionally (audit_cliff(false ...)) or by named arg (p_dry_run := false).
 * No autonomous deletion under any circumstance.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');

let files;
try {
  files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'));
} catch (e) {
  console.error('verify_no_live_cliff_schedule: could not read ' + MIGRATIONS_DIR);
  console.error(String(e));
  process.exit(1);
}

// Match audit_cliff( ... ) with a false dry-run, tolerant of whitespace/newlines.
// Two shapes: positional first arg false, or named p_dry_run := false anywhere.
const POSITIONAL_FALSE = /audit_cliff\s*\(\s*false\b/i;
const NAMED_FALSE = /p_dry_run\s*:=\s*false\b/i;

const violations = [];
for (const f of files) {
  const sql = readFileSync(join(MIGRATIONS_DIR, f), 'utf8');
  if (POSITIONAL_FALSE.test(sql)) {
    violations.push(`${f}: audit_cliff(false ...) — live cliff must never be scheduled in a migration.`);
  }
  if (NAMED_FALSE.test(sql)) {
    violations.push(`${f}: p_dry_run := false — live cliff must never be scheduled in a migration.`);
  }
}

if (violations.length > 0) {
  console.error('verify_no_live_cliff_schedule: FAIL');
  for (const v of violations) console.error('  - ' + v);
  console.error(
    '\nThe live retention cliff is broker-run from scripts/audit_cliff_live.ts only ' +
      '(ruling 2026-06-21 §2.5 req 5). No autonomous deletion.',
  );
  process.exit(1);
}

console.log(
  `verify_no_live_cliff_schedule: PASS (${files.length} migration file(s) scanned; no scheduled live cliff)`,
);
process.exit(0);
