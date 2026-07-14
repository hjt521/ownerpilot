// lib/chat/ff3TelemetryFlag.ts
// Omnibus §3 row 2 — FF-3 telemetry seam activation gate. Structured event emission at the FF-3 seams is pre-staged
// but stays DARK until this flag is explicitly on. Default OFF in every environment — shipping telemetry (and the
// final sink destination) is a separate broker ruling + a flag flip, NOT a build. Mirrors lib/chat/ff3Flag.ts.

/** True only when FF3_TELEMETRY_ENABLED is explicitly set to '1' or 'true'. Off (false) by default everywhere. */
export function ff3TelemetryEnabled(): boolean {
  const v = (process.env.FF3_TELEMETRY_ENABLED ?? '').trim().toLowerCase();
  return v === '1' || v === 'true';
}
