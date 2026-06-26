// ============================================================================
// GENERATED FILE — DO NOT EDIT
// Source: lib/jurisdiction/parcelHealth/rollUpStatus.ts
// Regenerate with: npm run build:parcel-health-core
// CI guard: git diff --exit-code supabase/functions/parcel-health/_core/
// Governing ruling: slice2_architecture_and_alert_sink_broker_ruling_2026-06-25.md
// ============================================================================
import type { RollUpState, RollUpResult, ProbeOutcome } from './types.ts';

// §4 failure tolerance / two-consecutive roll-up
// (parcel_endpoint_health_check_live_determination_broker_2026-06-25.md §4).
//
// - Two consecutive failed probes flip a per-endpoint status to not_live.
// - A single failure does NOT flip; it increments the consecutive count.
// - Any successful probe resets the consecutive count to zero and sets status live.
// - Transition (for §4 alert-on-transition): live->not_live emits 'to_not_live';
//   not_live->live emits 'to_live'; otherwise null. A sustained outage emits NO
//   further transition after the initial flip (no re-alert).
//
// Pure and per-endpoint: County and ZIMAS roll up via independent calls; this
// function holds no cross-endpoint state.

export const CONSECUTIVE_FAILURE_THRESHOLD = 2; // §4: two consecutive failures flip to not_live

export function rollUpStatus(prev: RollUpState, outcome: ProbeOutcome): RollUpResult {
  if (outcome === 'healthy') {
    const transition = prev.status === 'not_live' ? 'to_live' : null;
    return { status: 'live', consecutiveFailures: 0, transition };
  }
  const consecutiveFailures = prev.consecutiveFailures + 1;
  const status = consecutiveFailures >= CONSECUTIVE_FAILURE_THRESHOLD ? 'not_live' : prev.status;
  const transition = prev.status === 'live' && status === 'not_live' ? 'to_not_live' : null;
  return { status, consecutiveFailures, transition };
}
