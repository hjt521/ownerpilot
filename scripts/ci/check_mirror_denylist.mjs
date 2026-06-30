#!/usr/bin/env node
// scripts/ci/check_mirror_denylist.mjs
// Guard H — mirror denylist enforced (A15 ruling §4.4). Ensures the Notion mirror cannot write without scrubbing.
// Verifies, scoped to the exported postToNotionDb function body:
//   (1) lib/automation/notion.ts imports scrubMirrorPayload
//   (2) scrubMirrorPayload is called inside postToNotionDb BEFORE any Notion write (callNotionApi / notion.pages.create)
//   (3) the write consumes the scrubbed payload (scrub.scrubbedPayload), not the raw payload
// Exit 0 clean; exit 1 on violation.

import { readFileSync, existsSync } from 'node:fs';

const FILE = 'lib/automation/notion.ts';
function fail(m) { console.error(`ci:verify-mirror-denylist (Guard H) FAILED — ${m}`); process.exit(1); }

if (!existsSync(FILE)) fail(`cannot read ${FILE}`);
const src = readFileSync(FILE, 'utf8');

// (1) import present
if (!/import\s*\{[^}]*\bscrubMirrorPayload\b[^}]*\}\s*from\s*['"][^'"]*mirrorScrubber['"]/.test(src)) {
  fail('must import scrubMirrorPayload from ./mirrorScrubber');
}

// Scope to the exported postToNotionDb function body (decl → EOF; the alias export follows it).
const declIdx = src.indexOf('export async function postToNotionDb');
if (declIdx === -1) fail('export async function postToNotionDb not found');
const body = src.slice(declIdx);

// (2) scrub is called inside postToNotionDb, before any write call
const scrubIdx = body.indexOf('scrubMirrorPayload(');
if (scrubIdx === -1) fail('scrubMirrorPayload() is not called inside postToNotionDb');
const writeIdx = Math.min(
  ...['notion.pages.create', 'callNotionApi('].map((m) => {
    const i = body.indexOf(m);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  }),
);
if (writeIdx === Number.MAX_SAFE_INTEGER) fail('no Notion write call found inside postToNotionDb');
if (scrubIdx > writeIdx) fail('scrubMirrorPayload must be called BEFORE the Notion write (scrub gate must precede write)');

// (3) the write consumes the scrubbed payload, and the raw payload is not written directly
if (!/callNotionApi\(\s*scrub\.scrubbedPayload/.test(body)) {
  fail('the Notion write must consume scrub.scrubbedPayload (not the raw payload)');
}
if (/callNotionApi\(\s*payload\b/.test(body)) {
  fail('raw payload is written to Notion without scrubbing (callNotionApi(payload) bypass)');
}

console.log('ci:verify-mirror-denylist (Guard H): OK (scrub gate precedes write; write uses scrubbed payload)');
process.exit(0);
