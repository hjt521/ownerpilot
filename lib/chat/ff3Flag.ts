// lib/chat/ff3Flag.ts
// Lane FF-3 activation gate (ruling §8). The FF-3 scripted category is wired into the live capture flow but stays
// DARK until this flag is explicitly on. Default OFF in every environment — main/prod never runs FF-3 capture until
// the broker countersigns and the flag is set (Preview first). With the flag off, scriptedCategories() returns the
// unchanged base four categories, so the wiring is a strict no-op.
//
// Activation is ALSO gated on migration 042 having VALIDATEd the FF-3 constraints (post-soak, ~2026-07-10) — do not
// flip this flag before then. See docs/compliance for the §8 activation checklist.

/** True only when FF3_CAPTURE_ENABLED is explicitly set to '1' or 'true'. Off (false) by default everywhere. */
export function ff3CaptureEnabled(): boolean {
  const v = (process.env.FF3_CAPTURE_ENABLED ?? '').trim().toLowerCase();
  return v === '1' || v === 'true';
}
