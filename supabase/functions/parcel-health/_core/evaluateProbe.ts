// ============================================================================
// GENERATED FILE — DO NOT EDIT
// Source: lib/jurisdiction/parcelHealth/evaluateProbe.ts
// Regenerate with: npm run build:parcel-health-core
// CI guard: git diff --exit-code supabase/functions/parcel-health/_core/
// Governing ruling: slice2_architecture_and_alert_sink_broker_ruling_2026-06-25.md
// ============================================================================
import type { ProbeVerdict } from './types.ts';

// §2 healthy-probe definition
// (parcel_endpoint_health_check_live_determination_broker_2026-06-25.md §2).
//
// A probe is healthy iff ALL THREE hold, evaluated IN ORDER; the first failure
// names the reason:
//   1. HTTP 200
//   2. structured-response-shape valid (endpoint-specific predicate -> boolean)
//   3. latency <= 18s ceiling
//
// The shape predicate is endpoint-specific (endpoints/county.ts, endpoints/zimas.ts)
// and is resolved to a boolean BEFORE this evaluator runs. This function is the pure
// ordering/precedence gate and holds no endpoint-specific knowledge.

// Global latency ceiling — the boundary past which any endpoint's slowness
// becomes operationally an outage. Raised from 10_000 to 18_000 per the
// ZIMAS-from-Edge diagnostic measurement (2026-06-27): ZIMAS measured at
// ~9s from Supabase us-west-1 Edge under healthy conditions, requiring a
// per-endpoint PROBE_TIMEOUT_MS of 15_000 for ZIMAS (vs 8_000 for County).
// The latency ceiling must sit structurally above the slowest endpoint's
// timeout so a fetch that succeeded within its timeout is not classified
// as a latency failure. 18_000 = 15_000 ZIMAS timeout + 3_000 margin for
// `latency` to remain a meaningful distinct reason from `http_status`.
// Amends §2 of the broker healthy-probe determination
// (parcel_endpoint_health_check_live_determination_broker_2026-06-25.md).
export const LATENCY_CEILING_MS = 18_000;

export interface ProbeObservation {
  httpStatus: number;
  responseShapeValid: boolean;
  latencyMs: number;
}

export function evaluateProbe(obs: ProbeObservation): ProbeVerdict {
  if (obs.httpStatus !== 200) return { outcome: 'unhealthy', reason: 'http_status' };
  if (!obs.responseShapeValid) return { outcome: 'unhealthy', reason: 'response_shape' };
  if (obs.latencyMs > LATENCY_CEILING_MS) return { outcome: 'unhealthy', reason: 'latency' };
  return { outcome: 'healthy', reason: null };
}
