/**
 * A.5/A.6 classifier + audit tests — no live calls (all deps injected/mocked).
 * Covers every §5 branch, the §A.7 regression set, and the audit branch dimension.
 */
import {
  classifyPreParcel,
  resolveLaAddressV2,
  type PreParcelInput,
  type ResolverV2Deps,
  type GeocodeAuditRecord,
} from './resolveLaAddressV2';
import type { ValidationGranularity } from './geocodeTypes';
import type { ParsedParcelRecord } from './countyParcelAdapter';
import type { ZimasParcelRecord } from './zimasParcelAdapter';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  \u2713 ' + name); } else { failed++; console.log('  \u2717 ' + name); }
}

const pre = (over: Partial<PreParcelInput>): PreParcelInput => ({
  inputAddress: 'x', validationGranularity: 'PREMISE',
  locality: 'Los Angeles', administrativeAreaLevel1: 'California',
  correction: {}, ...over,
});

// ---- mock dep builders ----
function deps(opts: {
  signals?: Partial<Awaited<ReturnType<ResolverV2Deps['fetchGeocodeSignals']>>>;
  signalsThrow?: boolean;
  countyRecords?: ParsedParcelRecord[];
  countyThrow?: boolean;
  zimasRecords?: ZimasParcelRecord[];
  zimasThrow?: boolean;
  audits?: GeocodeAuditRecord[];
}): ResolverV2Deps {
  return {
    fetchGeocodeSignals: async () => {
      if (opts.signalsThrow) throw new Error('google down');
      return {
        validationGranularity: 'PREMISE', formattedAddress: '1100 Wilshire Blvd, Los Angeles, CA 90017',
        latitude: 34.05, longitude: -118.26, locality: 'Los Angeles', administrativeAreaLevel1: 'California',
        correction: {}, ...opts.signals,
      };
    },
    county: { fetcher: async () => { if (opts.countyThrow) throw new Error('county down'); return opts.countyRecords ?? []; } },
    zimas: { fetcher: async () => { if (opts.zimasThrow) throw new Error('zimas down'); return opts.zimasRecords ?? []; } },
    gateIsOpen: () => true,
    recordAudit: (r) => { opts.audits?.push(r); },
  };
}
const county = (taxRateCity: string | null): ParsedParcelRecord => ({ taxRateCity, situsCity: 'LOS ANGELES CA', ain: 'A', apn: 'P' });
const zimas = (cnclDist: string | null, tract: string | null): ZimasParcelRecord => ({ pind: 'PI', pin: 'PN', tract, cnclDist });

async function main() {
  // ============ PURE classifyPreParcel — §5 steps 1–4 ============
  console.log('\n=== step 1: granularity gate ===');
  check('coarse granularity → manual_review coarse_granularity',
    (() => { const o = classifyPreParcel(pre({ validationGranularity: 'ROUTE' })); return o.kind === 'terminal' && o.reviewReason === 'coarse_granularity'; })());

  console.log('\n=== step 1a: PROXIMITY-locality-deny (§4.3) ===');
  check('PROXIMITY + non-LA locality + California → not_la (1a)',
    (() => { const o = classifyPreParcel(pre({ validationGranularity: 'PREMISE_PROXIMITY' as ValidationGranularity, locality: 'Santa Monica' })); return o.kind === 'terminal' && o.disposition === 'not_la' && o.branch === 'granularity_proximity_deny'; })());
  check('BOUNDARY: PROXIMITY + locality "Los Angeles" → does NOT trigger 1a, falls to coarse',
    (() => { const o = classifyPreParcel(pre({ validationGranularity: 'PREMISE_PROXIMITY' as ValidationGranularity, locality: 'Los Angeles' })); return o.kind === 'terminal' && o.reviewReason === 'coarse_granularity'; })());
  check('PROXIMITY + non-LA locality but admin1 not California → coarse (not 1a)',
    (() => { const o = classifyPreParcel(pre({ validationGranularity: 'PREMISE_PROXIMITY' as ValidationGranularity, locality: 'Reno', administrativeAreaLevel1: 'Nevada' })); return o.kind === 'terminal' && o.reviewReason === 'coarse_granularity'; })());

  console.log('\n=== step 2: correction-flag gate (§4.2) ===');
  check('hasInferredComponents → input_corrected',
    (() => { const o = classifyPreParcel(pre({ correction: { hasInferredComponents: true } })); return o.kind === 'terminal' && o.reviewReason === 'input_corrected'; })());
  check('hasReplacedComponents → input_corrected',
    (() => { const o = classifyPreParcel(pre({ correction: { hasReplacedComponents: true } })); return o.kind === 'terminal' && o.reviewReason === 'input_corrected'; })());
  check('possibleNextAction FIX → input_corrected',
    (() => { const o = classifyPreParcel(pre({ correction: { possibleNextAction: 'FIX' } })); return o.kind === 'terminal' && o.reviewReason === 'input_corrected'; })());
  check('correction gate fires AFTER granularity (coarse+corrected → coarse)',
    (() => { const o = classifyPreParcel(pre({ validationGranularity: 'ROUTE', correction: { hasInferredComponents: true } })); return o.kind === 'terminal' && o.reviewReason === 'coarse_granularity'; })());

  console.log('\n=== step 3: locality presence ===');
  check('null locality → no_locality',
    (() => { const o = classifyPreParcel(pre({ locality: null })); return o.kind === 'terminal' && o.reviewReason === 'no_locality'; })());

  console.log('\n=== step 4: geocode locality check ===');
  check('locality LA + California → proceed_to_parcel',
    classifyPreParcel(pre({})).kind === 'proceed_to_parcel');
  check('locality Glendale → not_la (locality_not_la)',
    (() => { const o = classifyPreParcel(pre({ locality: 'Glendale' })); return o.kind === 'terminal' && o.disposition === 'not_la' && o.branch === 'locality_not_la'; })());
  check('locality LA but admin1 not California → not_la',
    (() => { const o = classifyPreParcel(pre({ administrativeAreaLevel1: 'Texas' })); return o.kind === 'terminal' && o.disposition === 'not_la'; })());

  // ============ ORCHESTRATOR — §5 steps 5–6 ============
  console.log('\n=== step 5: County branch ===');
  {
    const r = await resolveLaAddressV2('x', deps({ countyRecords: [county('LOS ANGELES')] }));
    check('County confirms → confirmed_la (county_confirm)', r.disposition === 'confirmed_la' && r.audit.branch === 'county_confirm');
    check('ZIMAS NOT consulted on county confirm', r.audit.zimas === undefined);
  }
  {
    const r = await resolveLaAddressV2('x', deps({ countyRecords: [county('SANTA MONICA')] }));
    check('County denies → not_la (county_deny)', r.disposition === 'not_la' && r.audit.branch === 'county_deny');
    check('ZIMAS NOT consulted on county deny', r.audit.zimas === undefined);
  }

  console.log('\n=== step 6: ZIMAS fallback (County inconclusive) ===');
  {
    const r = await resolveLaAddressV2('x', deps({ countyRecords: [], zimasRecords: [zimas('11', 'TR 9358')] }));
    check('County inconclusive + ZIMAS two-signal pass → confirmed_la (zimas_confirm)', r.disposition === 'confirmed_la' && r.audit.branch === 'zimas_confirm');
    check('County audit present (was consulted)', r.audit.county !== undefined);
    check('ZIMAS audit present', r.audit.zimas !== undefined);
  }
  {
    const r = await resolveLaAddressV2('x', deps({ countyRecords: [], zimasRecords: [] }));
    check('County inconclusive + ZIMAS miss → manual_review parcel_lookup_inconclusive', r.disposition === 'manual_review' && r.reviewReason === 'parcel_lookup_inconclusive' && r.audit.branch === 'zimas_miss');
  }
  {
    // OUTLA through the full stack: County inconclusive, ZIMAS returns OUTLA stub → reject → manual_review.
    const r = await resolveLaAddressV2('x', deps({ countyRecords: [], zimasRecords: [zimas('OUTLA', ' ')] }));
    check('§4 OUTLA through full stack → manual_review parcel_lookup_inconclusive', r.disposition === 'manual_review' && r.reviewReason === 'parcel_lookup_inconclusive');
    check('OUTLA audit: zimas two_signal_passed false', r.audit.zimas?.zimasTwoSignalPassed === false);
  }

  // ============ §A.7 MANDATED REGRESSION TESTS ============
  console.log('\n=== §A.7 regression: #5 unincorporated → not_la via County ===');
  {
    const r = await resolveLaAddressV2('11460 S Normandie Ave', deps({
      signals: { locality: 'Los Angeles', administrativeAreaLevel1: 'California' }, // Google says LA (the trap)
      countyRecords: [county('unincorporated')],
    }));
    check('#5: Google-LA + County unincorporated → not_la (county_deny)', r.disposition === 'not_la' && r.audit.branch === 'county_deny');
  }
  console.log('\n=== §A.7 regression: #4 Santa Monica → not_la via County ===');
  {
    const r = await resolveLaAddressV2('1600 Main St', deps({
      signals: { locality: 'Los Angeles', administrativeAreaLevel1: 'California' }, // border: Google said LA
      countyRecords: [county('SANTA MONICA')],
    }));
    check('#4: County TaxRateCity SANTA MONICA → not_la', r.disposition === 'not_la' && r.audit.branch === 'county_deny');
  }
  console.log('\n=== §A.7 regression: North Hills → confirmed_la via ZIMAS fallback ===');
  {
    // County misses (query-format miss), ZIMAS spatial hit with valid CD+tract.
    const r = await resolveLaAddressV2('8401 Sepulveda Blvd', deps({
      signals: { locality: 'Los Angeles', administrativeAreaLevel1: 'California' },
      countyRecords: [], // County miss
      zimasRecords: [zimas('6', 'TR 2899')], // ZIMAS confirms
    }));
    check('North Hills: County miss + ZIMAS confirm → confirmed_la (zimas_confirm)', r.disposition === 'confirmed_la' && r.audit.branch === 'zimas_confirm');
  }
  console.log('\n=== §A.7 regression: #9 typo → input_corrected ===');
  {
    const r = await resolveLaAddressV2('123 Mian Stret', deps({
      signals: { correction: { hasReplacedComponents: true } },
    }));
    check('#9: Google corrected input → manual_review input_corrected', r.disposition === 'manual_review' && r.reviewReason === 'input_corrected' && r.audit.branch === 'correction_flag');
  }

  // ============ fail-closed ============
  console.log('\n=== fail-closed paths ===');
  {
    const r = await resolveLaAddressV2('x', deps({ signalsThrow: true }));
    check('Google fetch throws → manual_review api_error (never confirm)', r.disposition === 'manual_review' && r.reviewReason === 'api_error');
  }
  {
    // County throws → adapter fail-closes to inconclusive → ZIMAS consulted.
    const r = await resolveLaAddressV2('x', deps({ countyThrow: true, zimasRecords: [zimas('11', 'TR 1')] }));
    check('County throws → falls through to ZIMAS (no false not_la)', r.disposition === 'confirmed_la' && r.audit.branch === 'zimas_confirm');
  }
  {
    // Both parcel sources fail → manual_review, never confirm.
    const r = await resolveLaAddressV2('x', deps({ countyThrow: true, zimasThrow: true }));
    check('both parcel sources fail → manual_review parcel_lookup_inconclusive', r.disposition === 'manual_review' && r.reviewReason === 'parcel_lookup_inconclusive');
  }

  // ============ audit completeness ============
  console.log('\n=== audit record completeness ===');
  {
    const audits: GeocodeAuditRecord[] = [];
    await resolveLaAddressV2('x', deps({ countyRecords: [], zimasRecords: [zimas('11', 'TR 9358')], audits }));
    const a = audits[0];
    check('audit recorded via sink', audits.length === 1);
    check('audit has branch dimension', a.branch === 'zimas_confirm');
    check('audit has county sub-record', a.county?.verdict === 'county_inconclusive');
    check('audit has zimas sub-record with council district', a.zimas?.zimasCouncilDistrict === 11);
    check('audit echoes correction flags', a.hasInferredComponents === false && a.possibleNextAction === null);
  }

  console.log('\n----------------------------------------');
  console.log(`  ${passed} passed, ${failed} failed`);
  console.log('----------------------------------------');
  if (failed > 0) process.exit(1);
}
main();
