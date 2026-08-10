import { submitSchema } from '../schemas';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  ✓ ' + name); }
  else { failed++; console.log('  ✗ ' + name); }
}

const base = {
  addressRaw: '123 Main St, Los Angeles, CA 90012',
  priorResolverVerdict: 'manual_review',
} as const;

console.log('\n=== broker-confirm outage boundary ===');
check('existing parcel_lookup_inconclusive remains eligible',
  submitSchema.safeParse({ ...base, priorReviewReason: 'parcel_lookup_inconclusive' }).success);
check('existing county_situs_gap remains eligible',
  submitSchema.safeParse({ ...base, priorReviewReason: 'county_situs_gap' }).success);
check('existing county_ambiguous remains eligible',
  submitSchema.safeParse({ ...base, priorReviewReason: 'county_ambiguous' }).success);

for (const reason of ['api_error', 'resolution_failed', 'gate_closed', 'source_health_outage']) {
  check(`${reason} is NOT a broker-confirm review reason`,
    !submitSchema.safeParse({ ...base, priorReviewReason: reason }).success);
}
check('resolution_failed verdict cannot enter broker-confirm even with an allowed reason',
  !submitSchema.safeParse({
    ...base,
    priorResolverVerdict: 'resolution_failed',
    priorReviewReason: 'parcel_lookup_inconclusive',
  }).success);
check('gate_closed verdict cannot enter broker-confirm even with an allowed reason',
  !submitSchema.safeParse({
    ...base,
    priorResolverVerdict: 'gate_closed',
    priorReviewReason: 'parcel_lookup_inconclusive',
  }).success);

console.log(`\n  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
