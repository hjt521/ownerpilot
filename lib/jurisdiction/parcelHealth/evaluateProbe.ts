import type { ProbeResult } from './types';

// §2 healthy-probe definition
// (parcel_endpoint_health_check_live_determination_broker_2026-06-25.md §2).
//
// A probe is healthy iff ALL THREE hold, evaluated IN ORDER; the first failure
// names the reason:
//   1. HTTP 200
//   2. structured-response-shape valid (endpoint-specific predicate -> boolean)
//   3. latency <= 10s ceiling
//
// The shape predicate is endpoint-specific (endpoints/county.ts, endpoints/zimas.ts)
// and is resolved to a boolean BEFORE this evaluator runs. This function is the pure
// ordering/precedence gate and holds no endpoint-specific knowledge.

export const LATENCY_CEILING_MS = 10_000; // §2 condition 3: <= 10 seconds wall-clock

export interface ProbeObservation {
  httpStatus: number;
  responseShapeValid: boolean;
  latencyMs: number;
}

export function evaluateProbe(obs: ProbeObservation): ProbeResult {
  if (obs.httpStatus !== 200) return { outcome: 'unhealthy', reason: 'http_status' };
  if (!obs.responseShapeValid) return { outcome: 'unhealthy', reason: 'response_shape' };
  if (obs.latencyMs > LATENCY_CEILING_MS) return { outcome: 'unhealthy', reason: 'latency' };
  return { outcome: 'healthy', reason: null };
}
