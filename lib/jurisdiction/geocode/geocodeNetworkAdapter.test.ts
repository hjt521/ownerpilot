/**
 * Geocode network adapter tests — NO live Google calls. global fetch is mocked
 * so request construction + response normalization are verified offline. The
 * REAL live shapes get confirmed at the broker test-set run (ruling §3); these
 * tests lock the parts that are build's to get right: request format, defensive
 * normalization (long_name vs longText), error surfacing, key hygiene.
 */
import {
  fetchAddressValidation,
  fetchReverseGeocode,
} from './geocodeNetworkAdapter';
import { classifyLaMembership } from './resolveLaAddress';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  \u2713 ' + name); } else { failed++; console.log('  \u2717 ' + name); }
}
async function throwsAsyncMsg(fn: () => Promise<unknown>): Promise<string | null> {
  try { await fn(); return null; } catch (e) { return (e as Error).message; }
}

type FetchCall = { url: string; init: RequestInit };
function mockFetch(handler: (call: FetchCall) => { ok: boolean; status?: number; json: unknown }) {
  (globalThis as unknown as { fetch: unknown }).fetch = async (url: unknown, init: unknown) => {
    const res = handler({ url: String(url), init: (init ?? {}) as RequestInit });
    return {
      ok: res.ok,
      status: res.status ?? (res.ok ? 200 : 500),
      json: async () => res.json,
    } as unknown as Response;
  };
}

const KEY = 'SECRET-KEY-DO-NOT-LEAK';

async function main() {
  // ---- Address Validation request construction ----
  console.log('\n=== address validation request ===');
  {
    let seen: FetchCall | null = null;
    mockFetch((call) => { seen = call; return { ok: true, json: { result: { verdict: { validationGranularity: 'PREMISE' }, geocode: { location: { latitude: 34.05, longitude: -118.24 } }, address: { formattedAddress: 'x' } } } }; });
    const r = await fetchAddressValidation('123 Main St', KEY);
    check('hits the validateAddress endpoint', seen!.url.includes('addressvalidation.googleapis.com/v1:validateAddress'));
    check('sends X-Goog-Api-Key header', (seen!.init.headers as Record<string,string>)['X-Goog-Api-Key'] === KEY);
    check('body has regionCode US + addressLines', (() => { const b = JSON.parse(String(seen!.init.body)); return b.address.regionCode === 'US' && b.address.addressLines[0] === '123 Main St'; })());
    check('returns parsed verdict granularity', r.result?.verdict?.validationGranularity === 'PREMISE');
  }

  // ---- AV non-2xx surfaces as error without leaking the key ----
  console.log('\n=== address validation error hygiene ===');
  {
    mockFetch(() => ({ ok: false, status: 403, json: {} }));
    const msg = await throwsAsyncMsg(() => fetchAddressValidation('123 Main St', KEY));
    check('non-2xx throws', msg !== null);
    check('error message does NOT contain the key', msg !== null && !msg.includes(KEY));
    check('error names the HTTP status', msg !== null && msg.includes('403'));
  }

  // ---- Reverse geocode latlng formatting + key in header not query ----
  console.log('\n=== reverse geocode request ===');
  {
    let seen: FetchCall | null = null;
    mockFetch((call) => { seen = call; return { ok: true, json: { status: 'OK', results: [{ address_components: [{ long_name: 'Los Angeles', types: ['locality'] }, { long_name: 'California', types: ['administrative_area_level_1'] }] }] } }; });
    await fetchReverseGeocode(34.05, -118.24, KEY);
    check('latlng has no space', seen!.url.includes('latlng=') && !decodeURIComponent(seen!.url).includes('34.05, -118.24'));
    check('latlng comma-joined', decodeURIComponent(seen!.url).includes('34.05,-118.24'));
    check('key in header, NOT in query string', !seen!.url.includes(KEY) && (seen!.init.headers as Record<string,string>)['X-Goog-Api-Key'] === KEY);
  }

  // ---- Normalization: long_name AND longText both map to long_name ----
  console.log('\n=== component normalization (both field variants) ===');
  {
    mockFetch(() => ({ ok: true, json: { status: 'OK', results: [{ address_components: [{ longText: 'Los Angeles', types: ['locality'] }, { longText: 'California', types: ['administrative_area_level_1'] }] }] } }));
    const rg = await fetchReverseGeocode(34.05, -118.24, KEY);
    const comps = rg.results?.[0]?.address_components ?? [];
    check('longText normalized into long_name', comps.find((c) => (c.types ?? []).includes('locality'))?.long_name === 'Los Angeles');
  }

  // ---- Non-OK Google status surfaces as error ----
  console.log('\n=== reverse geocode status handling ===');
  {
    mockFetch(() => ({ ok: true, json: { status: 'REQUEST_DENIED', results: [] } }));
    const msg = await throwsAsyncMsg(() => fetchReverseGeocode(34, -118, KEY));
    check('REQUEST_DENIED throws (alerts, not silent)', msg !== null && msg.includes('REQUEST_DENIED'));
    check('status error does NOT leak key', msg !== null && !msg.includes(KEY));
  }
  {
    mockFetch(() => ({ ok: true, json: { status: 'ZERO_RESULTS', results: [] } }));
    const rg = await fetchReverseGeocode(34, -118, KEY);
    check('ZERO_RESULTS => empty results (resolver routes to manual review)', (rg.results?.length ?? 0) === 0);
  }

  // ---- End-to-end: mocked LA response flows into classifier as confirmed_la ----
  console.log('\n=== adapter output feeds classifier correctly ===');
  {
    mockFetch(() => ({ ok: true, json: { status: 'OK', results: [{ address_components: [{ long_name: 'Los Angeles', types: ['locality', 'political'] }, { long_name: 'California', types: ['administrative_area_level_1', 'political'] }] }] } }));
    const rg = await fetchReverseGeocode(34.05, -118.24, KEY);
    const result = classifyLaMembership({ inputAddress: '123 Main St', validationGranularity: 'PREMISE', reverseComponents: rg.results?.[0]?.address_components });
    check('LA reverse-geocode → confirmed_la through the real classifier', result.disposition === 'confirmed_la');
  }

  console.log('\n----------------------------------------');
  console.log(`  ${passed} passed, ${failed} failed`);
  console.log('----------------------------------------');
  if (failed > 0) process.exit(1);
}

main();
