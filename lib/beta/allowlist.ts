// lib/beta/allowlist.ts
// Fork B2 — closed-beta email allowlist. The claim/magic-link flow (the only way to persist a RiskPath) is gated
// to allowlisted emails — a natural fit for A1 (LA-only). BETA_ALLOWLIST is a comma-separated env list
// (trimmed, lowercased); BETA_OPEN=true opens the gate for the GA transition (F2 exit). Default: closed.
// Source: gate3_forks_C_D_B_E_F_G_omnibus_broker_ruling_2026-07-02 (B2).

/** The configured allowlist as a normalized Set (lowercased, trimmed). Empty when unset → closed beta. */
export function betaAllowlist(): Set<string> {
  return new Set(
    (process.env.BETA_ALLOWLIST ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** True when the beta is open to everyone (GA transition) or the email is on the allowlist. Case/space-insensitive. */
export function isBetaAllowlisted(email: string): boolean {
  if (process.env.BETA_OPEN === 'true') return true;
  return betaAllowlist().has(email.trim().toLowerCase());
}
