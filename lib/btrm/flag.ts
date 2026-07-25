// lib/btrm/flag.ts
// BTRM-001 activation gate (ADR-013). Every BTRM component ships additive and DARK until this flag is explicitly
// on. Default OFF in every environment — main/prod never runs any BTRM stage until each stage is independently
// flag-checked at its own call site. This top-level flag is a kill switch for the whole capability; individual
// stages MAY also gate on narrower per-stage flags (see BTRM-001 §10 migration strategy) as they are wired in.
//
// Mirrors the FF-3 activation pattern (lib/chat/ff3Flag.ts) intentionally — same reviewer, same mental model.

/** True only when BTRM_ENABLED is explicitly set to '1' or 'true'. Off (false) by default everywhere. */
export function btrmEnabled(): boolean {
  const v = (process.env.BTRM_ENABLED ?? '').trim().toLowerCase();
  return v === '1' || v === 'true';
}

/**
 * Per-stage sub-flags, additive to btrmEnabled(). A stage only runs if BOTH the top-level flag AND its own
 * stage flag are on — lets stages be enabled independently as they land (ENR-001 first, etc.) without
 * accidentally lighting up later, unimplemented stages.
 */
export type BtrmStage = 'enr' | 'bae' | 'tm' | 'cm' | 'icoa' | 'rie' | 'ocm' | 'cs' | 'pol';

export function btrmStageEnabled(stage: BtrmStage): boolean {
  if (!btrmEnabled()) return false;
  const v = (process.env[`BTRM_STAGE_${stage.toUpperCase()}_ENABLED`] ?? '').trim().toLowerCase();
  return v === '1' || v === 'true';
}
