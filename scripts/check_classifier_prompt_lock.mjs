#!/usr/bin/env node
/**
 * CLASSIFIER_PROMPT lock checker — mirrors check_system_prompt_lock.mjs for the
 * help-chatbox H1 classifier prompt. Operator change-control lock (hash-lock).
 *
 * The classifier prompt is a verbatim operator change-controlled prompt. This guard
 * makes a silent edit impossible to ship: it hashes the canonical prompt store and
 * compares to the committed lock. Unlike the SYSTEM_PROMPT (a backtick-free template
 * literal sliced from source), the classifier prompt contains backticks, so it lives
 * in a JSON store both the runtime module and this guard read — no fragile source
 * slicing. Dependency-free (Node built-ins); runs in pre-commit and CI.
 *
 *   node scripts/check_classifier_prompt_lock.mjs
 *   node scripts/check_classifier_prompt_lock.mjs --write --approved-by "..." \
 *        --approved-on 2026-06-07 --source-rev "..." --status LOCKED
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const PROMPT_JSON = 'lib/chat/classifier_prompt.json';
const LOCK_PATH = 'lib/chat/classifier_prompt.lock.json';

function fail(msg) {
  console.error(`\n\u2717 CLASSIFIER_PROMPT lock check FAILED\n\n${msg}\n`);
  process.exit(1);
}

let prompt;
try {
  prompt = JSON.parse(readFileSync(PROMPT_JSON, 'utf8')).prompt;
} catch {
  fail(`Could not read ${PROMPT_JSON} (run from the repo root).`);
}
if (typeof prompt !== 'string') fail(`${PROMPT_JSON} has no string "prompt" field.`);

const hash = createHash('sha256').update(prompt, 'utf8').digest('hex');
const bytes = Buffer.byteLength(prompt, 'utf8');

const args = process.argv.slice(2);
if (args.includes('--write')) {
  const get = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
  const lock = {
    file: PROMPT_JSON,
    constant: 'CLASSIFIER_PROMPT',
    sha256: hash,
    bytes,
    status: get('--status') || 'LOCKED',
    approvedBy: get('--approved-by') || null,
    approvedOn: get('--approved-on') || null,
    sourceRevision: get('--source-rev') || null,
    note:
      'Operator change-control lock on the verbatim classifier prompt. Any change ' +
      'requires operator re-review and a deliberate re-lock.',
    lockedAt: new Date().toISOString(),
  };
  writeFileSync(LOCK_PATH, JSON.stringify(lock, null, 2) + '\n', 'utf8');
  console.log(`\u2713 Wrote ${LOCK_PATH}\n  sha256: ${hash}\n  status: ${lock.status}  approvedBy: ${lock.approvedBy ?? '(none)'}`);
  process.exit(0);
}

let lock;
try {
  lock = JSON.parse(readFileSync(LOCK_PATH, 'utf8'));
} catch {
  fail(`Could not read ${LOCK_PATH}. Seed once with: node scripts/check_classifier_prompt_lock.mjs --write`);
}

if (lock.sha256 === hash) {
  console.log(`\u2713 CLASSIFIER_PROMPT matches the lock (${lock.status || 'LOCKED'}).`);
  console.log(`  sha256: ${hash}  bytes: ${bytes}`);
  process.exit(0);
}

fail(
  `CLASSIFIER_PROMPT has CHANGED from the locked baseline.\n\n` +
    `  locked sha256:  ${lock.sha256}\n  current sha256: ${hash}\n\n` +
    `This prompt is operator change-controlled. Do NOT commit a change without\n` +
    `operator re-review. If reviewed, re-lock deliberately:\n` +
    `  node scripts/check_classifier_prompt_lock.mjs --write --approved-by "<name, SBN>" \\\n` +
    `    --approved-on <YYYY-MM-DD> --source-rev "<ruling file>" --status LOCKED\n` +
    `then commit ${LOCK_PATH} alongside ${PROMPT_JSON}.`
);
