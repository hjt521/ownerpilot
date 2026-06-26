// ============================================================================
// GENERATED FILE — DO NOT EDIT
// Source: lib/jurisdiction/parcelHealth/endpoints/zimas.ts
// Regenerate with: npm run build:parcel-health-core
// CI guard: git diff --exit-code supabase/functions/parcel-health/_core/
// Governing ruling: slice2_architecture_and_alert_sink_broker_ruling_2026-06-25.md
// ============================================================================
import { evaluateProbe, type ProbeObservation } from './evaluateProbe.ts';
import type { ProbeResult } from './types.ts';

// ZIMAS endpoint health probe — FAIL-CLOSED PLACEHOLDER.
//
// ZIMAS endpoint specs (URL, query method, shape-check fields, auth) are broker-held
// and PENDING (drips #003+). Until they land, this probe routes a deterministic-fail
// observation through the shared §2 evaluator so the gate stays not_live for ZIMAS —
// the correct fail-closed posture (slice-2 architecture ruling §4.2; drip-001
// divergence ruling §3). No network call.
//
// httpStatus 0 → evaluateProbe routes to http_status (no HTTP response reached).
// While ZIMAS is seeded not_live (migration 018) this never produces a to_not_live
// transition, so the specific reason is not surfaced in an alert; it is replaced by a
// real fetch + shape-check when the ZIMAS specs land.
export async function probeZimas(): Promise<ProbeResult> {
  const obs: ProbeObservation = { httpStatus: 0, responseShapeValid: false, latencyMs: 0 };
  return evaluateProbe(obs);
}
