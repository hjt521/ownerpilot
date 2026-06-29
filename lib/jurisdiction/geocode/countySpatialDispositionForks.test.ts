/**
 * Pinned disposition-fork regressions for the County spatial method.
 *
 * Governing rulings:
 *  - county_parcel_lookup_method_broker_ruling_2026-06-28 (Decision 1: spatial point-in-polygon)
 *  - county_spatial_zero_and_multi_feature_disposition_broker_ruling_2026-06-28
 *      §2.1 multi-feature disagreement → manual_review (county_ambiguous), ZIMAS NOT consulted
 *      §2.2 zero features + ZIP not in City-of-LA set → manual_review (county_situs_gap), ZIMAS NOT consulted
 *           zero features + ZIP in City-of-LA set → fall through to ZIMAS
 *      §6 MUST-FIX pinned cases (this file)
 *
 * All deps injected; no live calls. A ZIMAS call-spy proves ZIMAS is consulted
 * only on the fall-through branches and never on county_ambiguous / county_situs_gap.
 */
import { resolveLaAddressV2, type ResolverV2Deps, type GeocodeAuditRecord } from './resolveLaAddressV2';
import type { ParsedParcelRecord } from './countyParcelAdapter';
import type { ZimasParcelRecord } from './zimasParcelAdapter';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  ✓ ' + name); } else { failed++; console.log('  ✗ ' + name); }
}

const countyRec = (taxRateCity: string | null): ParsedParcelRecord => ({ taxRateCity, situsCity: 'X', ain: 'A', apn: 'P' });
const zimasRec = (cnclDist: string | null, tract: string | null): ZimasParcelRecord => ({ pind: 'PI', pin: 'PN', tract, cnclDist });

function makeDeps(opts: {
  formattedAddress: string;
  lat?: number;
  lng?: number;
  countyRecords?: ParsedParcelRecord[];
  zimasRecords?: ZimasParcelRecord[];
  audits: GeocodeAuditRecord[];
  zimasCalls: { n: number };
}): ResolverV2Deps {
  return {
    fetchGeocodeSignals: async () => ({
      validationGranularity: 'PREMISE',
      formattedAddress: opts.formattedAddress,
      latitude: opts.lat ?? 34.0939268,
      longitude: opts.lng ?? -118.3105939,
      locality: 'Los Angeles',
      administrativeAreaLevel1: 'California',
      correction: {},
    }),
    county: { fetcher: async () => opts.countyRecords ?? [] },
    zimas: { fetcher: async () => { opts.zimasCalls.n++; return opts.zimasRecords ?? []; } },
    gateIsOpen: () => true,
    recordAudit: (r) => { opts.audits.push(r); },
  };
}

async function main() {
  // ---- Trigger case: 5537 La Mirada Ave (ZIP 90038, in LA set) → county confirms LA. ----
  console.log('\n=== trigger case: 5537 La Mirada Ave → confirmed_la (spatial county) ===');
  {
    const audits: GeocodeAuditRecord[] = []; const z = { n: 0 };
    const r = await resolveLaAddressV2(
      '5537 La Mirada Ave, Unit 202, Los Angeles, CA 90038',
      makeDeps({ formattedAddress: '5537 La Mirada Avenue Unit 202, Los Angeles, CA 90038-2376, USA', countyRecords: [countyRec('LOS ANGELES')], zimasRecords: [zimasRec('13', 'LA PALOMA TRACT')], audits, zimasCalls: z }),
    );
    check('La Mirada → confirmed_la via county_confirm', r.disposition === 'confirmed_la' && audits[0].branch === 'county_confirm');
    check('La Mirada → ZIMAS NOT consulted (county confirmed first)', z.n === 0);
    check('La Mirada → audit records queryMethod=spatial_point_in_polygon', audits[0].county?.queryMethod === 'spatial_point_in_polygon');
    check('La Mirada → audit records the coordinate', audits[0].county?.queryCoordinate?.lat === 34.0939268);
    check('La Mirada → audit records featureCount=1', audits[0].county?.featureCount === 1);
  }

  // ---- §6 pin 1: multi-feature disagreement → county_ambiguous, ZIMAS not consulted. ----
  console.log('\n=== §6 pin 1: multi-feature disagreement → county_ambiguous (no ZIMAS) ===');
  {
    const audits: GeocodeAuditRecord[] = []; const z = { n: 0 };
    const r = await resolveLaAddressV2(
      'border parcel',
      makeDeps({ formattedAddress: '1 Border St, Los Angeles, CA 90038', countyRecords: [countyRec('LOS ANGELES'), countyRec('SANTA MONICA')], zimasRecords: [zimasRec('13', 'T')], audits, zimasCalls: z }),
    );
    check('disagreement → manual_review (county_ambiguous)', r.disposition === 'manual_review' && r.reviewReason === 'county_ambiguous' && audits[0].branch === 'county_ambiguous');
    check('disagreement → ZIMAS NOT consulted', z.n === 0);
    check('disagreement → audit captures both TaxRateCity values', JSON.stringify(audits[0].county?.featureTaxRateCities) === JSON.stringify(['LOS ANGELES', 'SANTA MONICA']));
  }

  // ---- §6 pin 2: zero features + non-LA ZIP → county_situs_gap, ZIMAS not consulted. ----
  // NOTE: the ruling's §2.2/§6 example names ZIP 90402, but per the Predicate-5
  // authoritative set 90402 is a STRADDLER (in∪straddler ⇒ in-set), so a zero-feature
  // 90402 address correctly falls through to ZIMAS, not situs_gap. The situs-gap branch
  // requires a genuinely OUT ZIP; 90401 (Santa Monica) is 'out'. Flagged to broker.
  console.log('\n=== §6 pin 2: zero features + out-of-set ZIP (90401) → county_situs_gap (no ZIMAS) ===');
  {
    const audits: GeocodeAuditRecord[] = []; const z = { n: 0 };
    const r = await resolveLaAddressV2(
      'private street SM',
      makeDeps({ formattedAddress: '1 Alley Way, Santa Monica, CA 90401', countyRecords: [], zimasRecords: [zimasRec('13', 'T')], audits, zimasCalls: z }),
    );
    check('zero-features + non-LA ZIP → manual_review (county_situs_gap)', r.disposition === 'manual_review' && r.reviewReason === 'county_situs_gap' && audits[0].branch === 'county_situs_gap');
    check('situs_gap → ZIMAS NOT consulted', z.n === 0);
  }

  // ---- §6 pin 3: zero features + LA ZIP → fall through to ZIMAS. ----
  console.log('\n=== §6 pin 3: zero features + LA ZIP (90038) → fall through to ZIMAS ===');
  {
    const audits: GeocodeAuditRecord[] = []; const z = { n: 0 };
    const r = await resolveLaAddressV2(
      'la-zip gap',
      makeDeps({ formattedAddress: '1 Gap St, Los Angeles, CA 90038', countyRecords: [], zimasRecords: [zimasRec('13', 'LA PALOMA TRACT')], audits, zimasCalls: z }),
    );
    check('zero-features + LA ZIP → ZIMAS consulted', z.n === 1);
    check('zero-features + LA ZIP + ZIMAS confirms → confirmed_la (zimas_confirm)', r.disposition === 'confirmed_la' && audits[0].branch === 'zimas_confirm');
  }

  // ---- Non-negotiable #4 class: single non-LA feature → not_la, ZIMAS not consulted. ----
  console.log('\n=== non-negotiable: county denies (Santa Monica) → not_la (no ZIMAS) ===');
  {
    const audits: GeocodeAuditRecord[] = []; const z = { n: 0 };
    const r = await resolveLaAddressV2(
      'sm property',
      makeDeps({ formattedAddress: '1 Ocean Ave, Santa Monica, CA 90402', countyRecords: [countyRec('SANTA MONICA')], zimasRecords: [zimasRec('13', 'T')], audits, zimasCalls: z }),
    );
    check('county denies → not_la (county_deny)', r.disposition === 'not_la' && audits[0].branch === 'county_deny');
    check('county denies → ZIMAS NOT consulted', z.n === 0);
  }

  console.log('\n----------------------------------------');
  console.log(`  ${passed} passed, ${failed} failed`);
  console.log('----------------------------------------');
  if (failed > 0) process.exit(1);
}

main();
