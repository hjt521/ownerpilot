/**
 * ZIMAS adapter tests — no live calls (fetcher injected/mocked).
 * Covers the two-signal rule, the OUTLA sentinel rejection (ratification §4),
 * the v6 seven-parcel acceptance fixture, fail-closed paths, and audit fields.
 */
import {
  classifyZimasParcel,
  lookupZimasParcel,
  cnclDistIsValidLa,
  tractIsNonBlank,
  zimasCacheKey,
  type ZimasParcelRecord,
  type ZimasLookupResult,
} from './zimasParcelAdapter';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  \u2713 ' + name); } else { failed++; console.log('  \u2717 ' + name); }
}
const rec = (cnclDist: string | null, tract: string | null, pind = 'P', pin = 'PN'): ZimasParcelRecord =>
  ({ pind, pin, tract, cnclDist });

async function main() {
  console.log('\n=== cnclDistIsValidLa boundary cases ===');
  check('CD "1" valid', cnclDistIsValidLa('1') === true);
  check('CD "15" valid', cnclDistIsValidLa('15') === true);
  check('CD "4" valid', cnclDistIsValidLa('4') === true);
  check('CD "0" invalid', cnclDistIsValidLa('0') === false);
  check('CD "16" invalid', cnclDistIsValidLa('16') === false);
  check('CD "-1" invalid', cnclDistIsValidLa('-1') === false);
  check('CD "OUTLA" invalid (sentinel)', cnclDistIsValidLa('OUTLA') === false);
  check('CD " 11 " (padded) valid', cnclDistIsValidLa(' 11 ') === true);
  check('CD null invalid', cnclDistIsValidLa(null) === false);
  check('CD "" invalid', cnclDistIsValidLa('') === false);

  console.log('\n=== tractIsNonBlank ===');
  check('TRACT "IVANHOE" non-blank', tractIsNonBlank('IVANHOE') === true);
  check('TRACT " " blank', tractIsNonBlank(' ') === false);
  check('TRACT null blank', tractIsNonBlank(null) === false);

  console.log('\n=== §4 MANDATED: OUTLA sentinel must REJECT ===');
  {
    const r = classifyZimasParcel([rec('OUTLA', ' ', '120B165-2', '120B165     2')]);
    check('OUTLA + blank TRACT → zimas_inconclusive', r.verdict === 'zimas_inconclusive');
    check('OUTLA + blank TRACT → fail reason both_invalid', r.audit.zimasTwoSignalFailReason === 'both_invalid');
    check('OUTLA → two_signal_passed false', r.audit.zimasTwoSignalPassed === false);
    check('OUTLA → council_district null', r.audit.zimasCouncilDistrict === null);
    check('OUTLA → raw CNCL_DIST captured in audit', r.audit.zimasCnclDist === 'OUTLA');
    check('OUTLA → parcelFound true (a feature WAS returned)', r.audit.parcelFound === true);
  }

  console.log('\n=== v6 §2 seven-parcel ACCEPTANCE fixture (all must confirm) ===');
  const v6La: [string, string, string][] = [
    // [tag, CNCL_DIST, TRACT]
    ['#1 Silver Lake', '4', 'IVANHOE'],
    ['#3 North Hills', '6', 'TR 2899'],
    ['#15 DTLA Wilshire', '1', 'TR 060706-C'],
    ['v5-5 Venice', '11', 'GOLDEN BAY TRACT'],
    ['v5-6 West LA', '5', 'TR 5609'],
    ['v5-7 Sherman Oaks', '4', 'TR 65249-C'],
    ['TR 9358 (#4 parcel)', '11', 'TR 9358'],
  ];
  for (const [tag, cd, tract] of v6La) {
    const r = classifyZimasParcel([rec(cd, tract)]);
    check(`${tag} (CD=${cd}) → zimas_confirms_la`, r.verdict === 'zimas_confirms_la');
    check(`${tag} → council_district ${cd}`, r.audit.zimasCouncilDistrict === parseInt(cd, 10));
  }

  console.log('\n=== fail-reason branches ===');
  check('valid CD + blank TRACT → tract_blank',
    classifyZimasParcel([rec('11', '  ')]).audit.zimasTwoSignalFailReason === 'tract_blank');
  check('invalid CD + valid TRACT → cncl_dist_invalid',
    classifyZimasParcel([rec('99', 'TR 1234')]).audit.zimasTwoSignalFailReason === 'cncl_dist_invalid');
  check('both bad → both_invalid',
    classifyZimasParcel([rec('OUTLA', '')]).audit.zimasTwoSignalFailReason === 'both_invalid');

  console.log('\n=== no parcel / multi-parcel ===');
  check('no parcel → zimas_inconclusive', classifyZimasParcel([]).verdict === 'zimas_inconclusive');
  check('no parcel → parcelFound false', classifyZimasParcel([]).audit.parcelFound === false);
  check('multi-parcel → zimas_inconclusive (fail-closed)',
    classifyZimasParcel([rec('11', 'TR 1'), rec('11', 'TR 2')]).verdict === 'zimas_inconclusive');
  check('multi-parcel → failureMode multi_parcel',
    classifyZimasParcel([rec('11', 'TR 1'), rec('11', 'TR 2')]).audit.failureMode === 'multi_parcel');

  console.log('\n=== boundary_adjacent shipped null initially (§3.4) ===');
  check('confirmed parcel → boundary_adjacent null (tracked follow-up)',
    classifyZimasParcel([rec('4', 'IVANHOE')]).audit.zimasBoundaryAdjacent === null);

  console.log('\n=== lookupZimasParcel: §3 retry-on-timeout-only + telemetry + cache ===');
  {
    let calls = 0;
    const r = await lookupZimasParcel(34.05, -118.24, { fetcher: async () => { calls++; throw new Error('network down'); } });
    check('non-timeout error → zimas_inconclusive (fail-closed)', r.verdict === 'zimas_inconclusive');
    check('non-timeout error → NOT retried (1 attempt) [§3.1]', calls === 1);
    check('non-timeout error → telemetry records 1 attempt (network_error)',
      r.audit.zimasAttempts === 1 && r.audit.zimasAttemptOutcomes?.[0] === 'network_error');
    check('never confirms on error', r.verdict !== ('zimas_confirms_la' as unknown));
  }
  {
    let calls = 0;
    const r = await lookupZimasParcel(34, -118, { fetcher: async () => { calls++; const e = new Error('x'); e.name = 'AbortError'; throw e; }, timeoutMs: 5 });
    check('AbortError → failureMode timeout', r.audit.failureMode === 'timeout');
    check('timeout → retried once (2 attempts) [§3.1]', calls === 2);
    check('timeout → telemetry: 2 attempts, both timeout',
      r.audit.zimasAttempts === 2 && r.audit.zimasAttemptOutcomes?.length === 2 && (r.audit.zimasAttemptOutcomes ?? []).every((o) => o === 'timeout'));
  }
  {
    const r = await lookupZimasParcel(34.07, -118.30, { fetcher: async () => [rec('11', 'TR 1')] });
    check('success → telemetry attempts=1, outcome success',
      r.audit.zimasAttempts === 1 && r.audit.zimasAttemptOutcomes?.[0] === 'success');
  }
  {
    const store = new Map<string, ZimasLookupResult>();
    const cache = { get: async (k: string) => store.get(k) ?? null, set: async (k: string, v: ZimasLookupResult) => { store.set(k, v); } };
    let fetches = 0;
    const deps = { fetcher: async () => { fetches++; return [rec('11', 'TR 9358')]; }, cache };
    const a = await lookupZimasParcel(34.052150, -118.263850, deps);
    const b = await lookupZimasParcel(34.052150, -118.263850, deps);
    check('lookup success → confirms', a.verdict === 'zimas_confirms_la');
    check('second identical lookup from cache (fetcher once)', fetches === 1 && b.verdict === 'zimas_confirms_la');
  }

  console.log('\n=== cache key ===');
  check('cache key rounds to 6 dp', zimasCacheKey(34.0521501, -118.2638509) === 'zimas:34.052150,-118.263851');

  console.log('\n----------------------------------------');
  console.log(`  ${passed} passed, ${failed} failed`);
  console.log('----------------------------------------');
  if (failed > 0) process.exit(1);
}
main();
