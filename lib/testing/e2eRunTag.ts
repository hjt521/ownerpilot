// lib/testing/e2eRunTag.ts
// E2/E3 gate — Preview-only honoring of the E2E run tag. `isE2EActive()` is the single switch that production
// must read as false: it requires E2E_RUN_ACTIVE=true AND VERCEL_ENV != 'production', so even if the flag
// leaked into prod env the gate stays closed. Write paths spread the returned tag into their inserts; in prod
// (and any non-E2E request) the tag is {} → behavior is byte-identical to before.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface E2ETag {
  e2e_run_id?: string;
  synthetic_source?: string;
}

/** True only on a non-production deployment with the E2E flag set. Production reads this as false, always. */
export function isE2EActive(): boolean {
  return process.env.E2E_RUN_ACTIVE === 'true' && process.env.VERCEL_ENV !== 'production';
}

/** Tag fields to stamp on E2E-created rows, or {} when not an active, valid E2E request. */
export function e2eTagFromHeaders(headers: { get(name: string): string | null }): E2ETag {
  if (!isE2EActive()) return {};
  const id = headers.get('x-e2e-run-id');
  if (!id || !UUID_RE.test(id)) return {};
  return { e2e_run_id: id, synthetic_source: 'e2e' };
}
