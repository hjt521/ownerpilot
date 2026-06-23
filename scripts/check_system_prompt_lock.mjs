#!/usr/bin/env node
/**
 * SYSTEM_PROMPT lock checker — workflow hardening per the 2026-06-06 drift ruling §4.
 *
 * The deployed help-chatbox system prompt is legal-adjacent: it cannot change
 * without operator re-review (the change-control equivalent of V4_WORDING_SIGNED_OFF
 * for the produced-notice face). This guard makes a silent prompt edit impossible to ship:
 * it extracts the SYSTEM_PROMPT body from app/api/chat/route.ts, hashes it, and
 * compares against the committed approved hash in system_prompt.lock.json.
 *
 *   - match     -> exit 0 (the prompt is unchanged from the locked baseline)
 *   - mismatch  -> exit 1 (the prompt changed; STOP — this is operator change-controlled)
 *
 * Re-locking is a deliberate, attributed, reviewable act (mirrors how the holiday
 * table and Part E masking policy get re-locked): after operator re-review of a
 * new prompt revision, run with --write and the attribution flags, then commit the
 * updated lock file alongside the route change.
 *
 * Dependency-free (Node built-ins only), so it runs identically in a git pre-commit
 * hook and in CI without tsx/TS or any install. Run from the repo root.
 *
 * Usage:
 *   node scripts/check_system_prompt_lock.mjs
 *   node scripts/check_system_prompt_lock.mjs --write \
 *        --approved-by "operator" \
 *        --approved-on 2026-06-06 \
 *        --source-rev "<source file or SHA>" \
 *        --status LOCKED
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const ROUTE_PATH = 'app/api/chat/route.ts';
const LOCK_PATH = 'app/api/chat/system_prompt.lock.json';
const ANCHOR = 'const SYSTEM_PROMPT = ';

function fail(msg) {
  console.error(`\n\u2717 SYSTEM_PROMPT lock check FAILED\n\n${msg}\n`);
  process.exit(1);
}

/** Extract the SYSTEM_PROMPT template-literal body verbatim (body has no backticks). */
function extractPromptBody(src) {
  const i = src.indexOf(ANCHOR);
  if (i === -1) fail(`Could not find \`${ANCHOR}\` in ${ROUTE_PATH}.`);
  const open = src.indexOf('`', i);
  if (open === -1) fail(`Could not find the opening backtick of SYSTEM_PROMPT in ${ROUTE_PATH}.`);
  const close = src.indexOf('`', open + 1);
  if (close === -1) fail(`Could not find the closing backtick of SYSTEM_PROMPT in ${ROUTE_PATH}.`);
  return src.slice(open + 1, close);
}

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function parseArgs(argv) {
  const args = { write: false };
  for (let k = 0; k < argv.length; k++) {
    const a = argv[k];
    if (a === '--write') args.write = true;
    else if (a === '--approved-by') args.approvedBy = argv[++k];
    else if (a === '--approved-on') args.approvedOn = argv[++k];
    else if (a === '--source-rev') args.sourceRevision = argv[++k];
    else if (a === '--status') args.status = argv[++k];
    else if (a === '--note') args.note = argv[++k];
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

let src;
try {
  src = readFileSync(ROUTE_PATH, 'utf8');
} catch {
  fail(`Could not read ${ROUTE_PATH} (run this from the repo root).`);
}

const body = extractPromptBody(src);
const hash = sha256(body);
const bytes = Buffer.byteLength(body, 'utf8');

if (args.write) {
  const lock = {
    file: ROUTE_PATH,
    constant: 'SYSTEM_PROMPT',
    sha256: hash,
    bytes,
    status: args.status || 'PENDING_V4_1_RELOCK',
    approvedBy: args.approvedBy || null,
    approvedOn: args.approvedOn || null,
    sourceRevision: args.sourceRevision || null,
    note:
      args.note ||
      'Re-locked via --write. Commit this file alongside the route change. A change ' +
        'to SYSTEM_PROMPT requires operator re-review before re-locking (drift ruling 2026-06-06 §4).',
    lockedAt: new Date().toISOString(),
  };
  writeFileSync(LOCK_PATH, JSON.stringify(lock, null, 2) + '\n', 'utf8');
  console.log(`\u2713 Wrote ${LOCK_PATH}`);
  console.log(`  sha256: ${hash}`);
  console.log(`  status: ${lock.status}  approvedBy: ${lock.approvedBy ?? '(none)'}`);
  process.exit(0);
}

let lock;
try {
  lock = JSON.parse(readFileSync(LOCK_PATH, 'utf8'));
} catch {
  fail(
    `Could not read ${LOCK_PATH}. Seed it once with:\n` +
      `  node scripts/check_system_prompt_lock.mjs --write`
  );
}

if (lock.sha256 === hash) {
  const status = lock.status || 'LOCKED';
  console.log(`\u2713 SYSTEM_PROMPT matches the lock (${status}).`);
  console.log(`  sha256: ${hash}  bytes: ${bytes}`);
  if (status !== 'LOCKED') {
    console.log(`  note: baseline is ${status} — ${lock.note ?? ''}`);
  }
  process.exit(0);
}

fail(
  `SYSTEM_PROMPT in ${ROUTE_PATH} has CHANGED from the locked baseline.\n\n` +
    `  locked sha256:  ${lock.sha256}\n` +
    `  current sha256: ${hash}\n\n` +
    `The help-chatbox system prompt is operator change-controlled (drift ruling 2026-06-06 §4).\n` +
    `Do NOT commit a prompt change without operator re-review.\n\n` +
    `If this change has been reviewed and signed off, re-lock it deliberately:\n` +
    `  node scripts/check_system_prompt_lock.mjs --write \\\n` +
    `    --approved-by "operator" --approved-on <YYYY-MM-DD> \\\n` +
    `    --source-rev "<signed-off source file or SHA>" --status LOCKED\n` +
    `then commit ${LOCK_PATH} alongside ${ROUTE_PATH}.`
);
