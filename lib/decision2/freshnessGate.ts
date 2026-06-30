// lib/decision2/freshnessGate.ts
// Lane 5 Decision 2 — 30-day freshness window (ruling §3 Fork 3). Byte-exact from master prompt §3.2.

const FRESHNESS_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export function isFreshConfirm(resolvedAt: Date, now: Date = new Date()): boolean {
  const ageMs = now.getTime() - resolvedAt.getTime();
  return ageMs >= 0 && ageMs <= FRESHNESS_WINDOW_MS;
}
