/**
 * B.1 integration adapter tests — fetch mocked, no live calls.
 * Verifies correction-flag extraction + component assembly into the V2 shape.
 */
import { buildFetchGeocodeSignals } from './geocodeSignalsAdapter';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  \u2713 ' + name); } else { failed++; console.log('  \u2717 ' + name); }
}

function mockFetch(handler: (url: string) => { ok: boolean; status?: number; json: unknown }) {
  (globalThis as unknown as { fetch: unknown }).fetch = async (url: unknown) => {
    const res = handler(String(url));
    return { ok: res.ok, status: res.status ?? 200, json: async () => res.json } as unknown as Response;
  };
}

const KEY = 'TESTKEY';

async function main() {
  console.log('\n=== happy path: LA address, no correction ===');
  {
    mockFetch((url) => {
      if (url.includes('validateAddress')) return { ok: true, json: { result: { verdict: { validationGranularity: 'PREMISE', hasInferredComponents: false, possibleNextAction: 'CONFIRM' }, address: { formattedAddress: '1100 Wilshire Blvd, Los Angeles, CA 90017' }, geocode: { location: { latitude: 34.05, longitude: -118.26 } } } } };
      return { ok: true, json: { status: 'OK', results: [{ address_components: [{ long_name: 'Los Angeles', types: ['locality'] }, { long_name: 'California', types: ['administrative_area_level_1'] }] }] } };
    });
    const fn = buildFetchGeocodeSignals(KEY);
    const s = await fn('1100 Wilshire Blvd');
    check('granularity extracted', s.validationGranularity === 'PREMISE');
    check('formatted address extracted', s.formattedAddress?.includes('Wilshire') === true);
    check('lat/lng extracted', s.latitude === 34.05 && s.longitude === -118.26);
    check('locality from reverse-geocode', s.locality === 'Los Angeles');
    check('admin1 from reverse-geocode', s.administrativeAreaLevel1 === 'California');
    check('no correction flags set', s.correction.hasInferredComponents === false && s.correction.possibleNextAction === 'CONFIRM');
  }

  console.log('\n=== correction flags: inferred components (the #9 typo class) ===');
  {
    mockFetch((url) => {
      if (url.includes('validateAddress')) return { ok: true, json: { result: { verdict: { validationGranularity: 'PREMISE', hasInferredComponents: true, hasReplacedComponents: true, possibleNextAction: 'FIX' }, address: { formattedAddress: 'corrected' }, geocode: { location: { latitude: 34, longitude: -118 } } } } };
      return { ok: true, json: { status: 'OK', results: [{ address_components: [{ long_name: 'Los Angeles', types: ['locality'] }] }] } };
    });
    const s = await buildFetchGeocodeSignals(KEY)('123 Mian Stret');
    check('hasInferredComponents extracted true', s.correction.hasInferredComponents === true);
    check('hasReplacedComponents extracted true', s.correction.hasReplacedComponents === true);
    check('possibleNextAction FIX extracted', s.correction.possibleNextAction === 'FIX');
  }

  console.log('\n=== no coordinate: returns null locality, carries granularity+correction ===');
  {
    mockFetch((url) => {
      if (url.includes('validateAddress')) return { ok: true, json: { result: { verdict: { validationGranularity: 'OTHER', hasInferredComponents: true } } } };
      return { ok: true, json: { status: 'OK', results: [] } };
    });
    const s = await buildFetchGeocodeSignals(KEY)('PO Box 1');
    check('no lat → undefined', s.latitude === undefined);
    check('no coordinate → null locality', s.locality === null);
    check('still carries granularity', s.validationGranularity === 'OTHER');
    check('still carries correction flag', s.correction.hasInferredComponents === true);
  }

  console.log('\n=== longText component variant normalized ===');
  {
    mockFetch((url) => {
      if (url.includes('validateAddress')) return { ok: true, json: { result: { verdict: { validationGranularity: 'PREMISE' }, geocode: { location: { latitude: 34, longitude: -118 } } } } };
      return { ok: true, json: { status: 'OK', results: [{ address_components: [{ longText: 'Los Angeles', types: ['locality'] }] }] } };
    });
    const s = await buildFetchGeocodeSignals(KEY)('x');
    check('longText variant read as locality (adapter normalizes)', s.locality === 'Los Angeles');
  }

  console.log('\n----------------------------------------');
  console.log(`  ${passed} passed, ${failed} failed`);
  console.log('----------------------------------------');
  if (failed > 0) process.exit(1);
}
main();
