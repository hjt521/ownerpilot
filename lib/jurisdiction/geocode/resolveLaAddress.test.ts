/**
 * §2.1 branch coverage for the geocode resolver — all with MOCKED Google
 * responses. No live calls. Proves:
 *  - confirmed_la when PREMISE + locality "Los Angeles" + admin "California"
 *  - not_la when locality is another city at PREMISE+
 *  - manual_review for: coarse granularity, no locality, boundary edge case,
 *    API error, and billing-cap-exhausted (circuit breaker)
 *  - the resolver THROWS while the LA production gate is closed
 *  - manual_review dispositions are enqueued to the typed queue (§2.1(4))
 */
import {
  classifyLaMembership,
  resolveLaAddress,
  type AddressValidationResponse,
  type ResolverDeps,
  type ReverseGeocodeResponse,
} from './resolveLaAddress';
import { InMemoryManualReviewQueue, StubBillingCapStatus } from './geocodeStubs';
import type { ReverseGeocodeComponent } from './resolveLaAddress';
import { isLaProductionUnblocked } from '../laRtcRules';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  \u2713 ' + name); }
  else { failed++; console.log('  \u2717 ' + name); }
}
async function throwsAsync(fn: () => Promise<unknown>): Promise<boolean> {
  try { await fn(); return false; } catch { return true; }
}

function comps(
  locality: string | null,
  admin1: string | null,
): ReverseGeocodeComponent[] {
  const out: ReverseGeocodeComponent[] = [];
  if (locality !== null) out.push({ long_name: locality, types: ['locality'] });
  if (admin1 !== null)
    out.push({ long_name: admin1, types: ['administrative_area_level_1'] });
  return out;
}

// ---- PURE classifier branch coverage (no network at all) ----
console.log('\n=== classifyLaMembership (pure §2.1 (3)/(4)/(5)) ===');
check('PREMISE + Los Angeles + California => confirmed_la',
  classifyLaMembership({ inputAddress: 'a', validationGranularity: 'PREMISE', reverseComponents: comps('Los Angeles', 'California') }).disposition === 'confirmed_la');
check('SUB_PREMISE + Los Angeles + California => confirmed_la',
  classifyLaMembership({ inputAddress: 'a', validationGranularity: 'SUB_PREMISE', reverseComponents: comps('Los Angeles', 'California') }).disposition === 'confirmed_la');
check('PREMISE + Santa Monica => not_la',
  classifyLaMembership({ inputAddress: 'a', validationGranularity: 'PREMISE', reverseComponents: comps('Santa Monica', 'California') }).disposition === 'not_la');
{
  const r = classifyLaMembership({ inputAddress: 'a', validationGranularity: 'BLOCK', reverseComponents: comps('Los Angeles', 'California') });
  check('BLOCK granularity => manual_review/coarse_granularity',
    r.disposition === 'manual_review' && r.reviewReason === 'coarse_granularity');
}
{
  const r = classifyLaMembership({ inputAddress: 'a', validationGranularity: 'PREMISE', reverseComponents: comps(null, 'California') });
  check('no locality => manual_review/no_locality',
    r.disposition === 'manual_review' && r.reviewReason === 'no_locality');
}
{
  const r = classifyLaMembership({ inputAddress: 'a', validationGranularity: 'PREMISE', reverseComponents: comps('Los Angeles', 'Nevada') });
  check('LA locality but admin != California => manual_review/boundary_edge_case',
    r.disposition === 'manual_review' && r.reviewReason === 'boundary_edge_case');
}
check('GRANULARITY_UNSPECIFIED => manual_review',
  classifyLaMembership({ inputAddress: 'a', validationGranularity: 'GRANULARITY_UNSPECIFIED', reverseComponents: comps('Los Angeles', 'California') }).disposition === 'manual_review');

// ---- Full resolver: gate must be CLOSED at HEAD, so it must throw ----
console.log('\n=== resolver gate enforcement ===');
function makeDeps(over: Partial<ResolverDeps> = {}): ResolverDeps {
  return {
    fetchAddressValidation: async (): Promise<AddressValidationResponse> => ({
      result: { verdict: { validationGranularity: 'PREMISE' }, geocode: { location: { latitude: 34.05, longitude: -118.24 } }, address: { formattedAddress: 'x' } },
    }),
    fetchReverseGeocode: async (): Promise<ReverseGeocodeResponse> => ({
      results: [{ address_components: comps('Los Angeles', 'California') }],
    }),
    queue: new InMemoryManualReviewQueue(),
    billing: new StubBillingCapStatus(false),
    getApiKey: () => 'test-key',
    ...over,
  };
}

(async () => {
  check('gate is OPEN at HEAD (go-live; predicate-6 attestation 2026-06-27)', isLaProductionUnblocked() === true);
  check('resolveLaAddress THROWS while gate closed (explicit closed gate)',
    await throwsAsync(() => resolveLaAddress('123 Main St, Los Angeles, CA', makeDeps({ gateIsOpen: () => false }))));

  // Exercise the FULL resolver body with the gate forced open in tests only.
  const openGate = () => true;

  // confirmed_la end-to-end
  {
    const r = await resolveLaAddress('123 Main St', makeDeps({ gateIsOpen: openGate }));
    check('open-gate: PREMISE+LA+CA => confirmed_la', r.disposition === 'confirmed_la');
  }

  // not_la end-to-end
  {
    const r = await resolveLaAddress('1 Santa Monica Pier', makeDeps({
      gateIsOpen: openGate,
      fetchReverseGeocode: async (): Promise<ReverseGeocodeResponse> => ({
        results: [{ address_components: comps('Santa Monica', 'California') }],
      }),
    }));
    check('open-gate: other locality => not_la', r.disposition === 'not_la');
  }

  // circuit breaker: cap exhausted => billing_cap_exhausted, no Google call, enqueued
  {
    const q = new InMemoryManualReviewQueue();
    let avCalled = false;
    const r = await resolveLaAddress('123 Main St', makeDeps({
      gateIsOpen: openGate,
      billing: new StubBillingCapStatus(true),
      queue: q,
      fetchAddressValidation: async () => { avCalled = true; return {}; },
    }));
    const listed = await q.list();
    check('open-gate: cap exhausted => manual_review/billing_cap_exhausted',
      r.disposition === 'manual_review' && r.reviewReason === 'billing_cap_exhausted');
    check('open-gate: cap exhausted => NO Google call made', avCalled === false);
    check('open-gate: cap exhausted => item enqueued', listed.length === 1);
  }

  // api error => manual_review/api_error, enqueued, never a false confirm
  {
    const q = new InMemoryManualReviewQueue();
    const r = await resolveLaAddress('123 Main St', makeDeps({
      gateIsOpen: openGate,
      queue: q,
      fetchAddressValidation: async () => { throw new Error('timeout'); },
    }));
    const listed = await q.list();
    check('open-gate: API error => manual_review/api_error',
      r.disposition === 'manual_review' && r.reviewReason === 'api_error');
    check('open-gate: API error => item enqueued (no false confirm)',
      listed.length === 1 && listed[0].reason === 'api_error');
  }

  // coarse granularity end-to-end => enqueued
  {
    const q = new InMemoryManualReviewQueue();
    const r = await resolveLaAddress('123 Main St', makeDeps({
      gateIsOpen: openGate,
      queue: q,
      fetchAddressValidation: async (): Promise<AddressValidationResponse> => ({
        result: { verdict: { validationGranularity: 'ROUTE' }, geocode: { location: { latitude: 34, longitude: -118 } } },
      }),
    }));
    check('open-gate: ROUTE granularity => manual_review/coarse_granularity',
      r.disposition === 'manual_review' && r.reviewReason === 'coarse_granularity');
    check('open-gate: coarse => enqueued', (await q.list()).length === 1);
  }

  // typed queue surface accepts + lists (§2.1(4))
  {
    const q = new InMemoryManualReviewQueue();
    await q.enqueue({ inputAddress: 'b', reason: 'billing_cap_exhausted', observed: {}, enqueuedAt: new Date().toISOString() });
    const listed = await q.list();
    check('manual-review queue stores and lists items (typed surface §2.1(4))',
      listed.length === 1 && listed[0].reason === 'billing_cap_exhausted');
  }

  console.log('\n----------------------------------------');
  console.log(`  ${passed} passed, ${failed} failed`);
  console.log('----------------------------------------');
  if (failed > 0) process.exit(1);
})();
