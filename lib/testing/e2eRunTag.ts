// lib/testing/e2eRunTag.ts
// E2/E3 gate — Preview-only honoring of the E2E run tag. `isE2EActive()` is the single switch that production
// must read as false: it requires E2E_RUN_ACTIVE=true AND VERCEL_ENV != 'production', so even if the flag
// leaked into prod env the gate stays closed. Write paths spread the returned tag into their inserts; in prod
// (and any non-E2E request) the tag is {} → behavior is byte-identical to before.

import { createHash } from 'crypto';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface E2ETag {
  e2e_run_id?: string;
  synthetic_source?: string;
}

// Fixed namespace scoping every derived id below to this project's E2E-run-tag usage (an arbitrary,
// hardcoded v4 UUID — analogous to RFC 4122 UUID v5 namespacing, not itself meaningful).
const E2E_RUN_NAMESPACE = 'a3f1c2d4-9b6e-4a11-8c2f-0a2b6d7e4f10';

/**
 * Repair for run #30599083648's :304 finding: e2e_run_id is a `uuid`-typed column on both
 * chat_sessions and riskpath_records (migration 033_e2e_test_tagging.sql), but the CI-generated
 * E2E_RUN_ID value (`${github.run_id}-${github.run_attempt}-${github.sha}`, e.g.
 * "30599083648-1-4b049c79e3fa1fd9f55769a1273c0d29afdbb3f3") is not UUID-shaped. Writing it directly
 * into e2e_run_id makes Postgres reject the insert with "invalid input syntax for type uuid".
 *
 * Rather than add a second, schema-changing text/tag column, this deterministically derives a real
 * UUID from the arbitrary run-id string (a fixed-namespace SHA-256 hash, formatted as a v5-shaped
 * UUID). The derivation is a pure function of the input string, so every caller — the seed routes
 * that stamp e2e_run_id, this run's own follow-up characterization checks, and
 * lib/testing/e2eCleanup.ts / e2e/global-teardown.ts's cleanup sweep — can independently recompute
 * the identical tag value from the same E2E_RUN_ID env var / X-E2E-Run-Id header, with no schema
 * change and no coordination beyond the shared string itself.
 *
 * If the input already happens to be UUID-shaped (e.g. a human operator runs `E2E_RUN_ID="$(uuidgen)"`
 * per docs/compliance/ff3_rollback_drill_runbook_and_evidence_2026-07-13.md), it is still passed
 * through this same derivation for consistency — every caller must apply the identical rule so the
 * tag values agree, whether or not the raw input happened to already be a UUID.
 */
export function runIdToUuid(runId: string): string {
  const hash = createHash('sha256').update(`${E2E_RUN_NAMESPACE}:${runId}`).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant RFC 4122
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** True only on a non-production deployment with the E2E flag set. Production reads this as false, always. */
export function isE2EActive(): boolean {
  return process.env.E2E_RUN_ACTIVE === 'true' && process.env.VERCEL_ENV !== 'production';
}

/** Tag fields to stamp on E2E-created rows, or {} when not an active, valid E2E request. */
export function e2eTagFromHeaders(headers: { get(name: string): string | null }): E2ETag {
  if (!isE2EActive()) return {};
  const id = headers.get('x-e2e-run-id');
  if (!id || !UUID_RE.test(id)) return {};
  return { e2e_run_id: id, synthetic_source: 'e2e' };
}
