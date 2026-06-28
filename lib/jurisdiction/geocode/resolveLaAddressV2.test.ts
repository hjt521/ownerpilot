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

  console.log('\n=== step 2 (was correction; now post-parcel) — pre-parcel no longer gates on correction ===');
  check('corrected input alone still PROCEEDS pre-parcel (correction is post-parcel now)',
    classifyPreParcel(pre({ correction: { hasReplacedComponents: true } })).kind === 'proceed_to_parcel');
  check('hasInferredComponents=true alone → proceeds (clean-LA class)',
    classifyPreParcel(pre({ correction: { hasInferredComponents: true, hasReplacedComponents: false, possibleNextAction: 'CONFIRM_ADD_SUBPREMISES' } })).kind === 'proceed_to_parcel');

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
  console.log('\n=== §A.7 regression: #9 typo → input_corrected (Q2 asymmetric) ===');
  {
    // #9 case A: corrected address CONFIRMS in County → suppressed to input_corrected.
    const r = await resolveLaAddressV2('123 Mian Stret', deps({
      signals: { correction: { hasReplacedComponents: true }, locality: 'Los Angeles', administrativeAreaLevel1: 'California' },
      countyRecords: [county('LOS ANGELES')], // corrected addr resolves LA
    }));
    check('#9 caseA: corrected + County confirm → SUPPRESSED to input_corrected', r.disposition === 'manual_review' && r.reviewReason === 'input_corrected' && r.audit.branch === 'correction_suppressed');
  }
  {
    // #9 case B: corrected address falls through both → correction gate catches it.
    const r = await resolveLaAddressV2('123 Mian Stret', deps({
      signals: { correction: { hasReplacedComponents: true }, locality: 'Los Angeles', administrativeAreaLevel1: 'California' },
      countyRecords: [], zimasRecords: [], // both fall through
    }));
    check('#9 caseB: corrected + both fall-through → input_corrected (correction_inconclusive)', r.disposition === 'manual_review' && r.reviewReason === 'input_corrected' && r.audit.branch === 'correction_inconclusive');
  }

  console.log('\n=== Q2 §5 checklist: asymmetric suppression ===');
  {
    // Santa Monica: County DENIES → deny passthrough, correction gate does NOT fire.
    const r = await resolveLaAddressV2('1600 Main St', deps({
      signals: { correction: { hasReplacedComponents: true }, locality: 'Los Angeles', administrativeAreaLevel1: 'California' },
      countyRecords: [county('SANTA MONICA')],
    }));
    check('#4 Santa Monica: corrected + County deny → not_la (deny NOT suppressed)', r.disposition === 'not_la' && r.audit.branch === 'county_deny');
  }
  {
    // Synthetic: corrected + County confirm → suppressed.
    const r = await resolveLaAddressV2('x', deps({
      signals: { correction: { hasReplacedComponents: true } },
      countyRecords: [county('LOS ANGELES')],
    }));
    check('asymmetric-suppress: corrected + County confirm → input_corrected', r.disposition === 'manual_review' && r.reviewReason === 'input_corrected' && r.audit.branch === 'correction_suppressed');
  }
  {
    // Synthetic: corrected + County deny → passthrough not_la.
    const r = await resolveLaAddressV2('x', deps({
      signals: { correction: { hasReplacedComponents: true } },
      countyRecords: [county('GLENDALE')],
    }));
    check('asymmetric-passthrough: corrected + County deny → not_la (not suppressed)', r.disposition === 'not_la' && r.audit.branch === 'county_deny');
  }
  {
    // Clean confirm (not corrected) → stays confirmed_la.
    const r = await resolveLaAddressV2('x', deps({
      signals: { correction: {} },
      countyRecords: [county('LOS ANGELES')],
    }));
    check('clean + County confirm → confirmed_la (no suppression)', r.disposition === 'confirmed_la' && r.audit.branch === 'county_confirm');
  }
  {
    // Corrected + ZIMAS confirm → suppressed.
    const r = await resolveLaAddressV2('x', deps({
      signals: { correction: { hasReplacedComponents: true } },
      countyRecords: [], zimasRecords: [zimas('11', 'TR 9358')],
    }));
    check('asymmetric-suppress at ZIMAS: corrected + ZIMAS confirm → input_corrected', r.disposition === 'manual_review' && r.reviewReason === 'input_corrected' && r.audit.branch === 'correction_suppressed');
  }

  // ============ fail-closed ============
  console.log('\n=== v3 County ruling: situs-gap + ambiguous (§5 checklist) ===');
  {
    // #4 Santa Monica: County 0 features + ZIP 90401 NOT in City-of-LA set → county_situs_gap.
    const r = await resolveLaAddressV2('1600 Main St', deps({
      signals: { formattedAddress: '1600 Main Street, Santa Monica, CA 90401, USA', correction: { hasReplacedComponents: true } },
      countyRecords: [], // County situs gap
      zimasRecords: [zimas('11', 'TR 9358')], // ZIMAS WOULD confirm (border artifact) — must NOT be reached
    }));
    check('#4: County 0-features + non-LA ZIP → county_situs_gap', r.disposition === 'manual_review' && r.reviewReason === 'county_situs_gap' && r.audit.branch === 'county_situs_gap');
    check('#4 anti-regression: ZIMAS NOT reached (no border-artifact confirm)', r.audit.zimas === undefined);
    check('#4: NOT confirmed_la (the non-negotiable)', r.disposition !== ('confirmed_la' as unknown));
    check('#4 audit: zero-features flag true', r.audit.countyQueryReturnedZeroFeatures === true);
    check('#4 audit: zip-in-LA-set false', r.audit.countyZipInLaZipSet === false);
  }
  {
    // #5 West Athens: County now MATCHES (suffix fix) → unincorporated → not_la.
    const r = await resolveLaAddressV2('11460 S Normandie Ave', deps({
      signals: { formattedAddress: '11460 S Normandie Avenue, Los Angeles, CA 90044, USA' },
      countyRecords: [county('unincorporated')],
    }));
    check('#5: County unincorporated → not_la (county_deny)', r.disposition === 'not_la' && r.audit.branch === 'county_deny');
  }
  {
    // #3 North Hills counterfactual: County gap BUT ZIP 91343 IS in City-of-LA set → fall to ZIMAS.
    const r = await resolveLaAddressV2('8401 Sepulveda Blvd', deps({
      signals: { formattedAddress: '8401 Sepulveda Boulevard, North Hills, CA 91343, USA' },
      countyRecords: [], // County gap
      zimasRecords: [zimas('6', 'TR 2899')], // ZIMAS confirms (correct)
    }));
    check('#3: County gap + in-LA ZIP → falls to ZIMAS → confirmed_la', r.disposition === 'confirmed_la' && r.audit.branch === 'zimas_confirm');
    check('#3 audit: zip-in-LA-set true', r.audit.countyZipInLaZipSet === true);
  }
  {
    // County ambiguous: >1 parcel, conflicting TaxRateCity → manual_review (county_ambiguous).
    const r = await resolveLaAddressV2('x', deps({
      countyRecords: [county('LOS ANGELES'), county('CULVER CITY')],
    }));
    check('county_ambiguous: conflicting TaxRateCity → manual_review (county_ambiguous)', r.disposition === 'manual_review' && r.reviewReason === 'county_ambiguous' && r.audit.branch === 'county_ambiguous');
  }
  {
    // Suffix-fix confirm: clean LA address resolves via County (not by ZIMAS accident).
    const r = await resolveLaAddressV2('1100 Wilshire Blvd', deps({
      signals: { formattedAddress: '1100 Wilshire Boulevard, Los Angeles, CA 90017, USA' },
      countyRecords: [county('LOS ANGELES')],
    }));
    check('suffix-fix: clean LA → confirmed_la via County (not ZIMAS)', r.disposition === 'confirmed_la' && r.audit.branch === 'county_confirm');
  }
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

  // ============ predicate-6 Slice 1: dynamic gate default (behavior-neutral) ============
  console.log('\n=== dynamic gate default (no gateIsOpen override) ===');
  {
    // No gateIsOpen, no reader → fail closed (throws). The default gate is now the dynamic
    // parcel-health gate; with no reader it returns false.
    const base = deps({});
    const noGate: Record<string, unknown> = { ...base };
    delete noGate.gateIsOpen;
    let threw = false;
    try { await resolveLaAddressV2('x', noGate as unknown as ResolverV2Deps); } catch { threw = true; }
    check('no override + no reader → throws gate-closed (fail closed)', threw);
  }
  {
    // Post-flip (parcelEndpointHealthCheckLive=true): the dynamic gate READS the reader (no
    // static short-circuit now that the flag is true). Empty rows → both endpoints missing →
    // gate closed → throws; the reader IS invoked.
    const base = deps({});
    const noGate: Record<string, unknown> = { ...base };
    delete noGate.gateIsOpen;
    let readerCalled: boolean = false;
    noGate.parcelHealthReader = { read: async () => { readerCalled = true; return []; } };
    let threw = false;
    try { await resolveLaAddressV2('x', noGate as unknown as ResolverV2Deps); } catch { threw = true; }
    check('flag true + reader empty → gate-closed (missing endpoints)', threw);
    check('dynamic gate active post-flip: reader IS invoked', readerCalled);
  }
  {
    // Post-flip: both endpoints live + fresh → gate OPENS → resolver runs (no gate-closed throw).
    const base = deps({});
    const noGate: Record<string, unknown> = { ...base };
    delete noGate.gateIsOpen;
    const fresh = new Date().toISOString();
    noGate.parcelHealthReader = { read: async () => ([
      { endpoint: 'county', currentStatus: 'live', lastProbeAt: fresh },
      { endpoint: 'zimas', currentStatus: 'live', lastProbeAt: fresh },
    ]) };
    let opened = true;
    try { await resolveLaAddressV2('x', noGate as unknown as ResolverV2Deps); } catch { opened = false; }
    check('flag true + both live/fresh → gate OPEN, resolver runs (no gate-closed throw)', opened);
  }
  {
    // The v6 corpus injects gateIsOpen: () => true everywhere (deps() helper) → the override
    // surface is preserved and the dynamic default never runs in the corpus. Sanity-assert it.
    check('gateIsOpen override surface preserved in deps() helper', typeof deps({}).gateIsOpen === 'function');
  }

  console.log('\n----------------------------------------');
  console.log(`  ${passed} passed, ${failed} failed`);
  console.log('----------------------------------------');
  if (failed > 0) process.exit(1);
}
main();
