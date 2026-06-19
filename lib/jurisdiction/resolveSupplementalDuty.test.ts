import { resolveSupplementalDuty } from './resolveSupplementalDuty';
import { HARD_BLOCK_CITIES } from './detectJurisdiction';
import { CA_JURISDICTION_MATRIX } from './caJurisdictionMatrix';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; console.log(`  \u2713 ${name}`); }
  else { failed++; console.log(`  \u2717 ${name}${detail ? ` \u2014 ${detail}` : ''}`); }
}

console.log('\n1. Every hard-block city routes to blocked, regardless of matrix branchState');
{
  for (const city of HARD_BLOCK_CITIES) {
    const r = resolveSupplementalDuty({ address: `123 Main St, ${city}, CA 90000` });
    check(`${city} -> blocked`,
      r.route === 'blocked' && r.reason === 'jurisdiction-not-yet-supported',
      `got ${r.route}/${'reason' in r ? r.reason : ''}`);
  }
}

console.log('\n2. CONFIRM-1: SF and Santa Monica are matrix-LIVE but wrapper-blocked');
{
  // The defining assertion of the Phase 1 ruling §1: wrapper output and matrix
  // branchState are INDEPENDENTLY verified and intentionally NOT equal here.
  const sfMatrix = CA_JURISDICTION_MATRIX.find((r) => r.jurisdictionId === 'ca-san-francisco-city-county')!;
  const smMatrix = CA_JURISDICTION_MATRIX.find((r) => r.jurisdictionId === 'ca-santa-monica-city')!;
  check('SF matrix branchState is LIVE (legal research)', sfMatrix.branchState === 'LIVE');
  check('Santa Monica matrix branchState is LIVE (legal research)', smMatrix.branchState === 'LIVE');

  const sfRoute = resolveSupplementalDuty({ address: '1 Market St, San Francisco, CA 94105' });
  const smRoute = resolveSupplementalDuty({ address: '100 Ocean Ave, Santa Monica, CA 90401' });
  check('SF wrapper route is blocked (operational gate)', sfRoute.route === 'blocked');
  check('Santa Monica wrapper route is blocked (operational gate)', smRoute.route === 'blocked');

  // Explicitly demonstrate the separation: data says LIVE, runtime says blocked.
  check('matrix-LIVE and wrapper-blocked coexist (SF)',
    sfMatrix.branchState === 'LIVE' && sfRoute.route === 'blocked');
}

console.log('\n3. LA-ish address routes to confirmation-required (not blocked, not default)');
{
  const r = resolveSupplementalDuty({ address: '456 Spring St, Los Angeles, CA 90013' });
  check('LA -> confirmation-required',
    r.route === 'confirmation-required' && r.reason === 'jurisdiction-confirmation-required',
    `got ${r.route}`);
}

console.log('\n4. Clearly-elsewhere CA address routes to default (statewide-only)');
{
  const r = resolveSupplementalDuty({ address: '12 Almond Ln, Fresno, CA 93650' });
  check('Fresno -> default', r.route === 'default', r.route);
  if (r.route === 'default') {
    check('default row is the synthetic DEFAULT', r.defaultRow.jurisdictionId === 'ca-default-statewide');
    check('default row requires no supplemental filing', r.defaultRow.supplementalFilingRequired === false);
  }
}

console.log('\n5. reason vocabulary is exactly the two locked Phase 1 values');
{
  const blocked = resolveSupplementalDuty({ address: 'x, Oakland, CA' });
  const confirm = resolveSupplementalDuty({ address: 'x, Los Angeles, CA' });
  const allowed = new Set(['jurisdiction-not-yet-supported', 'jurisdiction-confirmation-required']);
  check('blocked reason in vocabulary', 'reason' in blocked && allowed.has(blocked.reason));
  check('confirm reason in vocabulary', 'reason' in confirm && allowed.has(confirm.reason));
}

console.log('\n6. No matrix lookup on the blocked/confirm branches (default route is the only matrix consumer)');
{
  // Sanity: blocked and confirmation-required carry no matrix row in their shape.
  const blocked = resolveSupplementalDuty({ address: 'x, Berkeley, CA' });
  const confirm = resolveSupplementalDuty({ address: 'x, Los Angeles, CA' });
  check('blocked has no defaultRow', !('defaultRow' in blocked));
  check('confirm has no defaultRow', !('defaultRow' in confirm));
}

console.log('\n7. Discriminated-union routes are exhaustive and well-typed');
{
  const routes = new Set(
    ['1 Market St, San Francisco, CA', '456 Spring St, Los Angeles, CA', '12 Almond Ln, Fresno, CA']
      .map((address) => resolveSupplementalDuty({ address }).route),
  );
  check('exercises blocked', routes.has('blocked'));
  check('exercises confirmation-required', routes.has('confirmation-required'));
  check('exercises default', routes.has('default'));
}

console.log(`\n${'-'.repeat(40)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`${'-'.repeat(40)}\n`);
if (failed > 0) process.exit(1);
