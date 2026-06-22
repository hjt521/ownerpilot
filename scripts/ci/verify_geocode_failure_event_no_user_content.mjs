#!/usr/bin/env node
/**
 * verify_geocode_failure_event_no_user_content.mjs
 *
 * CI guard mandated by the geocode-server-surface runbook ratification
 * (2026-06-22), §2.3 req 4. The `geocode_audit_write_failure` event flows to a
 * broader operational surface (incident channel, dashboard, on-call) than the
 * RLS-protected `geocode_audit_log` row, so its payload must carry ONLY
 * non-reversible identifiers (decision_input_hash, attempted_at, error_class,
 * chain_head_sha, failure_count) — never the raw input_address and never a
 * verdict (disposition / review_reason). This guard structurally refuses any
 * user-content or verdict key inside the failure-event object literal, so the
 * privacy posture cannot be violated by a field slipping past code review.
 *
 * It locates the JSON.stringify({ ... }) object that contains
 * `event: 'geocode_audit_write_failure'` in the geocode audit sink, and fails
 * (exit 1) if any forbidden key appears as a property of that object.
 *
 * Run: node scripts/ci/verify_geocode_failure_event_no_user_content.mjs
 * Wire as a required check alongside verify-locked-prose.
 *
 * The forbidden list is illustrative-but-strict; extend it, never narrow it.
 */
import { readFileSync, existsSync } from 'node:fs';

const SINK = 'lib/jurisdiction/geocode/supabaseAuditSink.ts';
const EVENT_MARKER = "event: 'geocode_audit_write_failure'";

// Keys that denote raw user content or a verdict. Matched against the property
// keys of the failure-event object literal. snake_case and camelCase variants.
const FORBIDDEN = [
  'input_address', 'inputAddress', 'address',
  'disposition', 'review_reason', 'reviewReason', 'verdict',
  'raw_input', 'rawInput', 'input', 'formatted_address', 'formattedAddress',
  'locality', 'latitude', 'longitude',
];

function fail(msg) {
  console.error(`[verify-geocode-failure-event] FAIL: ${msg}`);
  process.exit(1);
}

if (!existsSync(SINK)) {
  fail(`sink file not found at ${SINK}`);
}

const src = readFileSync(SINK, 'utf8');

const markerIdx = src.indexOf(EVENT_MARKER);
if (markerIdx === -1) {
  fail(
    `could not find the failure-event marker (${EVENT_MARKER}) in ${SINK}. ` +
    `If the event was renamed, update this guard.`,
  );
}

// Find the enclosing object literal: walk back to the nearest '{' before the
// marker, then forward to its matching '}'.
let objStart = src.lastIndexOf('{', markerIdx);
if (objStart === -1) fail('could not locate the start of the failure-event object literal.');

let depth = 0;
let objEnd = -1;
for (let i = objStart; i < src.length; i++) {
  if (src[i] === '{') depth++;
  else if (src[i] === '}') {
    depth--;
    if (depth === 0) { objEnd = i; break; }
  }
}
if (objEnd === -1) fail('could not locate the end of the failure-event object literal.');

const objBody = src.slice(objStart + 1, objEnd);

// Property keys = first identifier of each non-empty, non-comment line.
const keys = [];
for (const raw of objBody.split('\n')) {
  const line = raw.replace(/\/\/.*$/, '').trim();
  if (!line) continue;
  const m = line.match(/^([a-z_][a-z0-9_]*)\s*:/i);
  if (m) keys.push(m[1]);
}

const hits = keys.filter((k) => FORBIDDEN.includes(k));
if (hits.length > 0) {
  fail(
    `the geocode_audit_write_failure event payload carries forbidden key(s): ` +
    `${hits.join(', ')}. The failure event must carry only non-reversible ` +
    `identifiers (decision_input_hash, attempted_at, error_class, chain_head_sha, ` +
    `failure_count). Raw addresses and verdicts stay on the RLS-protected audit ` +
    `row (ratification 2026-06-22 §2.3).`,
  );
}

console.log(
  `[verify-geocode-failure-event] OK: failure-event payload keys ` +
  `[${keys.join(', ')}] carry no user-content or verdict fields.`,
);
process.exit(0);
