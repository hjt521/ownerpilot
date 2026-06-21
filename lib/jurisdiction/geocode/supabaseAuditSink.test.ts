/**
 * Slice 2 — Supabase audit sink tests. No live calls (Supabase client injected).
 * Covers the plain-SHA-256 decision hash + canonicalization + cross-SHA
 * separation (ruling 4.4), the 'unknown' chain-head fallback, the row mapping,
 * and the swallow+log+alert failure posture (ruling 4.3): a failed write resolves
 * without throwing, emits a geocode_audit alert, and increments the counter.
 */
import {
  computeDecisionInputHash,
  resolveChainHeadSha,
  toGeocodeAuditRow,
  createSupabaseRecordAudit,
  geocodeAuditWriteFailureCount,
  type AuditAlertSink,
  type GeocodeAuditAlert,
  type SupabaseAuditClient,
} from './supabaseAuditSink';
import type { GeocodeAuditRecord } from './resolveLaAddressV2';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  \u2713 ' + name); } else { failed++; console.log('  \u2717 ' + name); }
}

// Known-answer vectors (computed from the exact construction).
const H_ABC = 'dba554611511c799b1488e8f2fc6c6c7f3a15edc19a77c307627532317cd645d';
const H_UNKNOWN = 'd7c234ebec390d9a7f2febbf10c9b4e7a61c22e5f2d13fb497da05d90df10145';

const rec = (over: Partial<GeocodeAuditRecord> = {}): GeocodeAuditRecord => ({
  inputAddress: '11460 S Normandie Ave',
  locality: 'Los Angeles', administrativeAreaLevel1: 'California',
  hasInferredComponents: false, hasReplacedComponents: false, possibleNextAction: null,
  disposition: 'manual_review', reviewReason: 'no_locality', branch: 'no_locality',
  ...over,
});

class CapturingAlertSink implements AuditAlertSink {
  emitted: GeocodeAuditAlert[] = [];
  async emit(a: GeocodeAuditAlert): Promise<void> { this.emitted.push(a); }
}

const okClient = (capture?: (row: unknown) => void): SupabaseAuditClient => ({
  from: () => ({ insert: async (row: unknown) => { capture?.(row); return { error: null }; } }),
});
const errClient = (msg: string): SupabaseAuditClient => ({
  from: () => ({ insert: async () => ({ error: { message: msg } }) }),
});
const throwClient = (): SupabaseAuditClient => ({
  from: () => ({ insert: async () => { throw new Error('network down'); } }),
});

async function main() {
  // --- hash: known answer + canonicalization (4.4) ---
  check('hash known answer', computeDecisionInputHash('11460 S Normandie Ave', 'abc123') === H_ABC);
  check('hash trims whitespace', computeDecisionInputHash('  11460 S Normandie Ave  ', 'abc123') === H_ABC);
  check('hash lowercases', computeDecisionInputHash('11460 s normandie ave', 'abc123') === H_ABC);

  // --- hash: cross-SHA separation + collision/dedup ---
  check('different chain_head_sha => different hash', computeDecisionInputHash('11460 S Normandie Ave', 'unknown') === H_UNKNOWN);
  check('cross-sha hashes differ',
    computeDecisionInputHash('11460 S Normandie Ave', 'abc123') !== computeDecisionInputHash('11460 S Normandie Ave', 'unknown'));
  check('same input+sha => same hash (dedup)',
    computeDecisionInputHash('1600 Main St', 'a61ae1d') === computeDecisionInputHash('1600 Main St', 'a61ae1d'));
  check('same input, different sha => differ',
    computeDecisionInputHash('1600 Main St', 'a61ae1d') !== computeDecisionInputHash('1600 Main St', 'b054f95'));

  // --- chain-head fallback (4.4 / §2.4) ---
  const saved = process.env.VERCEL_GIT_COMMIT_SHA;
  delete process.env.VERCEL_GIT_COMMIT_SHA;
  check("fallback is 'unknown' when env unset", resolveChainHeadSha() === 'unknown');
  process.env.VERCEL_GIT_COMMIT_SHA = 'deadbeef';
  check('uses VERCEL_GIT_COMMIT_SHA when set', resolveChainHeadSha() === 'deadbeef');
  if (saved === undefined) delete process.env.VERCEL_GIT_COMMIT_SHA; else process.env.VERCEL_GIT_COMMIT_SHA = saved;

  // --- row mapping (snake_case, passthrough, computed hash) ---
  const sampleCounty = { taxRateCityRaw: 'LOS ANGELES', verdict: 'county_confirms_la' as const } as GeocodeAuditRecord['county'];
  const row = toGeocodeAuditRow(rec({ county: sampleCounty, countyZipInLaZipSet: true }), 'abc123') as Record<string, unknown>;
  check('maps input_address', row.input_address === '11460 S Normandie Ave');
  check('maps administrative_area_level_1', row.administrative_area_level_1 === 'California');
  check('maps has_inferred_components', row.has_inferred_components === false);
  check('maps disposition + review_reason', row.disposition === 'manual_review' && row.review_reason === 'no_locality');
  check('passes county jsonb through', JSON.stringify(row.county) === JSON.stringify(sampleCounty));
  check('maps county_zip_in_la_zip_set', row.county_zip_in_la_zip_set === true);
  check('absent optional => null', row.formatted_address === null && row.zimas === null);
  check('computes decision_input_hash', row.decision_input_hash === H_ABC);

  // --- success path: resolves, no alert, counter steady ---
  let captured: unknown = null;
  const alerts = new CapturingAlertSink();
  const before = geocodeAuditWriteFailureCount();
  const recordOk = createSupabaseRecordAudit({
    getClient: async () => okClient((r) => { captured = r; }),
    alerts, chainHeadSha: () => 'abc123',
  });
  await recordOk(rec());
  check('success: row was inserted', (captured as Record<string, unknown>)?.input_address === '11460 S Normandie Ave');
  check('success: no alert emitted', alerts.emitted.length === 0);
  check('success: failure counter unchanged', geocodeAuditWriteFailureCount() === before);

  // --- failure path (error returned): resolves, alerts, counts ---
  const alerts2 = new CapturingAlertSink();
  const c0 = geocodeAuditWriteFailureCount();
  const recordErr = createSupabaseRecordAudit({ getClient: async () => errClient('insert denied'), alerts: alerts2 });
  let threw = false;
  try { await recordErr(rec()); } catch { threw = true; }
  check('failure: does NOT throw', threw === false);
  check('failure: counter incremented', geocodeAuditWriteFailureCount() === c0 + 1);
  check('failure: one alert emitted', alerts2.emitted.length === 1);
  check('failure: alert source is geocode_audit', alerts2.emitted[0]?.source === 'geocode_audit');
  check('failure: alert targets in_app+email', JSON.stringify(alerts2.emitted[0]?.channels) === JSON.stringify(['in_app', 'email']));

  // --- failure path (client throws): also resolves + alerts ---
  const alerts3 = new CapturingAlertSink();
  const c1 = geocodeAuditWriteFailureCount();
  const recordThrow = createSupabaseRecordAudit({ getClient: async () => throwClient(), alerts: alerts3 });
  let threw2 = false;
  try { await recordThrow(rec()); } catch { threw2 = true; }
  check('thrown client: does NOT throw', threw2 === false);
  check('thrown client: counter incremented', geocodeAuditWriteFailureCount() === c1 + 1);
  check('thrown client: alert emitted', alerts3.emitted.length === 1);

  // --- failure with no alert sink still resolves (never-throw) ---
  const recordNoAlert = createSupabaseRecordAudit({ getClient: async () => errClient('x') });
  let threw3 = false;
  try { await recordNoAlert(rec()); } catch { threw3 = true; }
  check('no alert sink: still does not throw', threw3 === false);
}

main().then(() => {
  console.log(`\n  ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}).catch((e) => {
  console.error('  \u2717 unexpected error', e);
  process.exit(1);
});
