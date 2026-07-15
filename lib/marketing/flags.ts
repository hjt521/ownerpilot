// lib/marketing/flags.ts
// Marketing Tranche 1 activation gates (marketing_tranche1_broker_ruling_2026-07-14 + addendum 2026-07-14a).
// Two independent flags, both DEFAULT OFF in every environment. Mirrors lib/chat/ff3Flag.ts.
//   - MARKETING_TRANCHE1        gates the marketing surface (SEO pages, blog routes) — draft/preview only until publish.
//   - MARKETING_ANALYTICS_ENABLED gates any marketing analytics emission — no pixel/tag fires until Tranche 3.
// Nothing marketing-side ships to public/production behavior without a separate broker ruling flipping these.

/** True only when MARKETING_TRANCHE1 is explicitly '1' or 'true'. Off by default everywhere. */
export function marketingTranche1Enabled(): boolean {
  const v = (process.env.MARKETING_TRANCHE1 ?? '').trim().toLowerCase();
  return v === '1' || v === 'true';
}

/** True only when MARKETING_ANALYTICS_ENABLED is explicitly '1' or 'true'. Off by default everywhere (Tranche 3 flip). */
export function marketingAnalyticsEnabled(): boolean {
  const v = (process.env.MARKETING_ANALYTICS_ENABLED ?? '').trim().toLowerCase();
  return v === '1' || v === 'true';
}
