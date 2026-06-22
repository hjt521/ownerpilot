#!/usr/bin/env node
/**
 * verify_classifier_audit_no_input_text.mjs
 *
 * CI guard mandated by the classifier persistence-lock conflict broker ruling
 * (2026-06-20), §2.4. The 2026-06-06 persistence lock forbids persisting the
 * classifier's target text. This guard structurally refuses any migration that
 * adds an input-text-semantic column to `classifier_audit_log`, so the lock
 * cannot be violated by a column slipping past code review.
 *
 * It scans supabase/migrations/*.sql for `create table ... classifier_audit_log`
 * bodies and `alter table ... classifier_audit_log add column ...` statements,
 * and fails (exit 1) if any column name matches the forbidden user-content set.
 *
 * Run: node scripts/ci/verify_classifier_audit_no_input_text.mjs
 * Wire as a required check alongside verify-locked-prose.
 *
 * The forbidden list is illustrative-but-strict; extend it, never narrow it.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS_DIR = 'supabase/migrations';
const TABLE = 'classifier_audit_log';

// Column names that denote user / chat / prompt content. Matched case-insensitively
// against the FIRST identifier of each column line inside a classifier_audit_log body.
const FORBIDDEN = [
  'input_text', 'input', 'prompt', 'user_text', 'chat_text', 'target_text',
  'message_text', 'raw_input', 'user_input', 'chat_content', 'content',
  'transcript', 'message', 'user_message', 'query_text', 'text',
];

/** Extract the parenthesised body of `create table ... classifier_audit_log ( ... )`. */
function createTableBodies(sql, table) {
  const bodies = [];
  const re = new RegExp(`create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?(?:public\\.)?${table}\\s*\\(`, 'gi');
  let m;
  while ((m = re.exec(sql)) !== null) {
    let depth = 1;
    let i = re.lastIndex;
    const start = i;
    while (i < sql.length && depth > 0) {
      if (sql[i] === '(') depth++;
      else if (sql[i] === ')') depth--;
      i++;
    }
    bodies.push(sql.slice(start, i - 1));
  }
  return bodies;
}

/** First identifier on a column-definition line (skips comments, constraints). */
function columnNames(body) {
  const names = [];
  for (let raw of body.split('\n')) {
    const line = raw.replace(/--.*$/, '').trim();
    if (!line) continue;
    if (/^(constraint|primary|foreign|unique|check|like|exclude)\b/i.test(line)) continue;
    const m = line.match(/^"?([a-z_][a-z0-9_]*)"?/i);
    if (m) names.push(m[1].toLowerCase());
  }
  return names;
}

/** `alter table ... classifier_audit_log add column <name>` targets. */
function alterAddColumns(sql, table) {
  const names = [];
  const re = new RegExp(
    `alter\\s+table\\s+(?:public\\.)?${table}\\s+add\\s+column\\s+(?:if\\s+not\\s+exists\\s+)?"?([a-z_][a-z0-9_]*)"?`,
    'gi'
  );
  let m;
  while ((m = re.exec(sql)) !== null) names.push(m[1].toLowerCase());
  return names;
}

let violations = [];
let scanned = 0;

let files = [];
try {
  files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'));
} catch {
  console.error(`verify_classifier_audit_no_input_text: cannot read ${MIGRATIONS_DIR}`);
  process.exit(2);
}

for (const f of files) {
  const sql = readFileSync(join(MIGRATIONS_DIR, f), 'utf8');
  if (!new RegExp(TABLE, 'i').test(sql)) continue;
  scanned++;
  const cols = [
    ...createTableBodies(sql, TABLE).flatMap(columnNames),
    ...alterAddColumns(sql, TABLE),
  ];
  for (const c of cols) {
    if (FORBIDDEN.includes(c)) {
      violations.push(`${f}: classifier_audit_log column "${c}" denotes user content — forbidden by the 2026-06-06 persistence lock (ruling §2.4).`);
    }
  }
}

if (violations.length > 0) {
  console.error('verify_classifier_audit_no_input_text: FAIL');
  for (const v of violations) console.error('  - ' + v);
  console.error('\nclassifier_audit_log MUST NOT capture input text. Use input_decision_hash (HMAC-SHA-256).');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Slice 3b (ruling §2.2 req 5): the side column must be constrained to
// 'input' | 'output' so a non-{input,output} value can never land. Assert that
// some migration adds a CHECK on side. ('CI guard rejects other values.')
// ---------------------------------------------------------------------------
const allSql = files.map((f) => readFileSync(join(MIGRATIONS_DIR, f), 'utf8')).join('\n');
const sideCheck = new RegExp(
  `check\\s*\\(\\s*side\\s+in\\s*\\(\\s*'input'\\s*,\\s*'output'\\s*\\)\\s*\\)`,
  'i',
);
if (!sideCheck.test(allSql)) {
  console.error('verify_classifier_audit_no_input_text: FAIL');
  console.error(
    `  - ${TABLE}.side is not constrained to ('input','output'). ` +
      'Add the CHECK constraint (ruling 2026-06-21 §2.2 req 5).'
  );
  process.exit(1);
}

console.log(`verify_classifier_audit_no_input_text: PASS (${scanned} migration file(s) referencing ${TABLE} scanned; side constraint present)`);
process.exit(0);
