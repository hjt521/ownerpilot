// Feature flags for OwnerPilot. Build-time env reads, one place.
//
// SAFETY_CHECK_SOFT_MODE (C5, det. 2026-06-14): when true, the Step 1 safety
// screen switches from the current HARD-BLOCK gatekeeper to the determination's
// soft-recommend-with-logged-override posture. OFF by default - production keeps
// the hard-block behavior until this is flipped after the attorney pass.
// NEXT_PUBLIC_ so the wizard (client) can read it.
export function isSafetyCheckSoftMode(): boolean {
  return process.env.NEXT_PUBLIC_SAFETY_CHECK_SOFT_MODE === 'true';
}
