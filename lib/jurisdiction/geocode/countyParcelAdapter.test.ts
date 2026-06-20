/**
 * County parcel adapter tests — no live calls (fetcher injected/mocked).
 * Covers the §A.2 binding behaviors + the #4/#5 regression classes.
 */
import {
  classifyCountyParcel,
  lookupCountyParcel,
  normalizeJurisdiction,
  parseAddressForCounty,
  type ParsedParcelRecord,
  type CountyLookupResult,
} from './countyParcelAdapter';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  \u2713 ' + name); } else { failed++; console.log('  \u2717 ' + name); }
}
const rec = (taxRateCity: string | null, situsCity: string | null = null, ain = 'A1', apn = 'P1'): ParsedParcelRecord =>
  ({ taxRateCity, situsCity, ain, apn });

async function main() {
  console.log('\n=== classifyCountyParcel: core branches ===');
  check('TaxRateCity "LOS ANGELES" → county_confirms_la',
    classifyCountyParcel([rec('LOS ANGELES')]).verdict === 'county_confirms_la');
  check('TaxRateCity "los angeles" (lower) → county_confirms_la',
    classifyCountyParcel([rec('los angeles')]).verdict === 'county_confirms_la');
  check('TaxRateCity " Los Angeles " (padded) → county_confirms_la',
    classifyCountyParcel([rec('  Los Angeles  ')]).verdict === 'county_confirms_la');
  check('TaxRateCity "unincorporated" → county_denies_la',
    classifyCountyParcel([rec('unincorporated')]).verdict === 'county_denies_la');
  check('TaxRateCity "SANTA MONICA" → county_denies_la',
    classifyCountyParcel([rec('SANTA MONICA')]).verdict === 'county_denies_la');
  check('TaxRateCity "GLENDALE" → county_denies_la',
    classifyCountyParcel([rec('GLENDALE')]).verdict === 'county_denies_la');
  check('no parcels → county_inconclusive',
    classifyCountyParcel([]).verdict === 'county_inconclusive');
  check('parcel found but TaxRateCity null → county_inconclusive',
    classifyCountyParcel([rec(null)]).verdict === 'county_inconclusive');

  console.log('\n=== §2.3 prohibition: SitusCity must NOT drive the decision ===');
  {
    // #5 West Athens shape: SitusCity says "LOS ANGELES CA" (the trap), TaxRateCity says "unincorporated".
    const r = classifyCountyParcel([rec('unincorporated', 'LOS ANGELES CA')]);
    check('#5 regression: SitusCity="LOS ANGELES CA" + TaxRateCity="unincorporated" → county_denies_la',
      r.verdict === 'county_denies_la');
    check('#5 regression: SitusCity still captured in audit (forensic)',
      r.audit.situsCityRaw === 'LOS ANGELES CA');
    check('#5 regression: TaxRateCity captured raw',
      r.audit.taxRateCityRaw === 'unincorporated');
  }
  {
    // Inverse trap: SitusCity not "los angeles" but TaxRateCity IS → still confirms (decision reads only TaxRateCity).
    const r = classifyCountyParcel([rec('LOS ANGELES', 'SOME MAILING NAME')]);
    check('decision reads ONLY TaxRateCity (SitusCity differs, still confirms)',
      r.verdict === 'county_confirms_la');
  }

  console.log('\n=== multi-parcel handling ===');
  check('multiple parcels agree on LA → confirms',
    classifyCountyParcel([rec('LOS ANGELES'), rec('Los Angeles')]).verdict === 'county_confirms_la');
  check('multiple parcels disagree → inconclusive (fail-closed)',
    classifyCountyParcel([rec('LOS ANGELES'), rec('CULVER CITY')]).verdict === 'county_ambiguous');

  console.log('\n=== audit fields ===');
  {
    const r = classifyCountyParcel([rec('LOS ANGELES', 'LOS ANGELES CA', 'AIN123', 'APN456')]);
    check('audit parcelFound true', r.audit.parcelFound === true);
    check('audit AIN captured', r.audit.ain === 'AIN123');
    check('audit APN captured', r.audit.apn === 'APN456');
  }
  check('empty → audit parcelFound false', classifyCountyParcel([]).audit.parcelFound === false);

  console.log('\n=== normalize ===');
  check('normalize collapses whitespace', normalizeJurisdiction('LOS   ANGELES') === 'los angeles');
  check('normalize trims + lowercases', normalizeJurisdiction('  Unincorporated ') === 'unincorporated');

  console.log('\n=== parseAddressForCounty (stem-matching, ruling §2.4) ===');
  {
    const s = parseAddressForCounty('1100 Wilshire Boulevard, Los Angeles, CA 90017-1916, USA');
    check('house extracted', s.house === '1100');
    check('suffix "Boulevard" stripped → stem "Wilshire"', s.stem === 'Wilshire');
    check('5-digit zip from zip+4', s.zip === '90017');
  }
  {
    const s = parseAddressForCounty('11460 S Normandie Avenue, Los Angeles, CA 90044, USA');
    check('directional preserved in stem (S Normandie)', s.stem === 'S Normandie');
    check('house 11460', s.house === '11460');
  }
  {
    const s = parseAddressForCounty('1600 Main Street, Santa Monica, CA 90401, USA');
    check('Street stripped → stem "Main"', s.stem === 'Main');
    check('zip 90401', s.zip === '90401');
  }
  {
    // REGRESSION: a 5-digit house number must NOT hijack the ZIP parse.
    const s = parseAddressForCounty('11460 S Normandie Avenue, Los Angeles, CA 90044, USA');
    check('5-digit house: zip is 90044 not 11460', s.zip === '90044');
    check('5-digit house: house is 11460', s.house === '11460');
    const s2 = parseAddressForCounty('11919 Culver Boulevard, Los Angeles, CA 90066, USA');
    check('5-digit house #2: zip is 90066 not 11919', s2.zip === '90066');
  }

  console.log('\n=== lookupCountyParcel: fail-closed + retry + cache ===');
  {
    // Fetcher always throws → after one retry, inconclusive with failureMode.
    let calls = 0;
    const r = await lookupCountyParcel('123 Main St, Los Angeles, CA 90001', {
      fetcher: async () => { calls++; throw new Error('network down'); },
    });
    check('fetcher throw → county_inconclusive (fail-closed)', r.verdict === 'county_inconclusive');
    check('retried once (2 attempts total)', calls === 2);
    check('failureMode recorded', r.audit.failureMode === 'network_error');
  }
  {
    // Timeout (AbortError) categorized as timeout.
    const r = await lookupCountyParcel('x', {
      fetcher: async () => { const e = new Error('aborted'); e.name = 'AbortError'; throw e; },
      timeoutMs: 5,
    });
    check('AbortError → failureMode timeout', r.audit.failureMode === 'timeout');
  }
  {
    // Success path through lookup → confirms, and caches.
    const store = new Map<string, CountyLookupResult>();
    const cache = {
      get: async (k: string) => store.get(k) ?? null,
      set: async (k: string, v: CountyLookupResult) => { store.set(k, v); },
    };
    let fetches = 0;
    const deps = { fetcher: async () => { fetches++; return [rec('LOS ANGELES')]; }, cache };
    const a = await lookupCountyParcel('1100 Wilshire Blvd, Los Angeles, CA 90017', deps);
    const b = await lookupCountyParcel('1100 Wilshire Blvd, Los Angeles, CA 90017', deps);
    check('lookup success → confirms', a.verdict === 'county_confirms_la');
    check('second identical lookup served from cache (fetcher called once)', fetches === 1 && b.verdict === 'county_confirms_la');
  }

  console.log('\n----------------------------------------');
  console.log(`  ${passed} passed, ${failed} failed`);
  console.log('----------------------------------------');
  if (failed > 0) process.exit(1);
}
main();
