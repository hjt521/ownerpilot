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

// Result of evaluating a single probe against §2.
export interface ProbeResult {
  outcome: ProbeOutcome;
  reason: ProbeReason | null; // null iff healthy (§2 invariant; mirrors the 017 CHECK)
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
