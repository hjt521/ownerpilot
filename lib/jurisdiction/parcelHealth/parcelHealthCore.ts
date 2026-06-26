// lib/jurisdiction/parcelHealth/parcelHealthCore.ts
//
// Closure-root barrel for parcel-health Edge Function.
//
// Governing determination:
//   parcel_endpoint_health_check_live_determination_broker_2026-06-25.md
// Slice-2 architecture ruling:
//   slice2_architecture_and_alert_sink_broker_ruling_2026-06-25.md §2.1
// Generator: scripts/build_parcel_health_core.mjs
// Mirror:    supabase/functions/parcel-health/_core/
//
// This module is the single closure root the build:parcel-health-core generator
// resolves from. The Edge orchestration (supabase/functions/parcel-health/index.ts)
// imports from the mirrored barrel; do not import from individual modules in
// the Edge entry, so the closure stays explicit.
//
// Re-exports only. No logic here.

export * from './types';
export * from './evaluateProbe';
export * from './rollUpStatus';
export * from './alert';
export * from './endpoints/county';
export * from './endpoints/zimas';
