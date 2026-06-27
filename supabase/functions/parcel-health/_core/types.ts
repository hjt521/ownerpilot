// ============================================================================
// GENERATED FILE — DO NOT EDIT
// Source: lib/jurisdiction/parcelHealth/types.ts
// Regenerate with: npm run build:parcel-health-core
// CI guard: git diff --exit-code supabase/functions/parcel-health/_core/
// Governing ruling: slice2_architecture_and_alert_sink_broker_ruling_2026-06-25.md
// ============================================================================
// Shared types for the parcel-health probe / roll-up / alert pipeline.
// File layout: slice2_architecture_and_alert_sink_broker_ruling_2026-06-25.md §2.1.
// AlertEvent shape: same ruling §3.1 (locked).

export type Endpoint = 'county' | 'zimas';

export type ProbeOutcome = 'healthy' | 'unhealthy';

// §2 healthy-probe failure reasons — which of the three conditions failed.
export type ProbeReason = 'http_status' | 'response_shape' | 'latency';

export type EndpointStatus = 'live' | 'not_live';

// §4 alert-on-transition events (null = no transition, no alert).
export type Transition = 'to_live' | 'to_not_live' | null;

// §2 verdict produced by evaluateProbe — the pure precedence gate's output.
export interface ProbeVerdict {
  outcome: ProbeOutcome;
  reason: ProbeReason | null; // null iff healthy (§2 invariant; mirrors the 017 CHECK)
}

// Full probe result: the §2 verdict PLUS 5a forensic capture (ruled 2026-06-27).
// The forensic fields are observational — populated by the probe (endpoints/county.ts,
// endpoints/zimas.ts), written to parcel_health_probe_results (017) by the store. Gate
// logic reads only outcome/reason; the forensic columns exist for triage, so "is the
// endpoint slow or down" is one SQL query against latency_ms/http_status, not a diagnostic
// round.
export interface ProbeResult extends ProbeVerdict {
  httpStatus: number;         // HTTP status code; 0 = no response (timeout/network)
  latencyMs: number;          // wall-clock fetch duration (ms)
  errorDetail: string | null; // abort/timeout/error message (<=500 chars); null on success
}

// Rolled-up per-endpoint state (mirrors columns in 018 parcel_health_status).
export interface RollUpState {
  status: EndpointStatus;
  consecutiveFailures: number;
}

// §4 roll-up output: next state + the transition to alert on (if any).
export interface RollUpResult extends RollUpState {
  transition: Transition;
}

// §3.1 AlertEvent (locked). Placed in types.ts per the §2.1 layout; alert.ts imports it.
export interface AlertEvent {
  endpoint: Endpoint;
  transition: 'to_live' | 'to_not_live';
  detectedAt: string; // ISO-8601 UTC
  reason?: ProbeReason; // present on to_not_live; absent on to_live
  context: {
    consecutiveFailures: number;
    lastSuccessAt: string | null;
    lastProbeAt: string;
  };
}
