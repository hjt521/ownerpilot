// ============================================================================
// GENERATED FILE — DO NOT EDIT
// Source: lib/jurisdiction/parcelHealth/parcelHealthCore.ts
// Regenerate with: npm run build:parcel-health-core
// CI guard: git diff --exit-code supabase/functions/parcel-health/_core/
// Governing ruling: slice2_architecture_and_alert_sink_broker_ruling_2026-06-25.md
// ============================================================================
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

export * from './types.ts';
export * from './evaluateProbe.ts';
export * from './rollUpStatus.ts';
export * from './alert.ts';
export * from './county.ts';
export * from './zimas.ts';
