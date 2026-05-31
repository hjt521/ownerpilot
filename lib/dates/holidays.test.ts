import {
  CA_JUDICIAL_HOLIDAYS,
  EMERGENCY_COURT_CLOSURES,
  getVerifiedHolidaySet,
  getVerifiedHolidaySetForSpan,
} from './holidays';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; console.log(`  \u2713 ${name}`); }
  else { failed++; console.log(`  \u2717 ${name}${detail ? ` \u2014 ${detail}` : ''}`); }
}

console.log('\nA. Missing year throws (forces review gate to block)');
{
  let threw = false;
  try { getVerifiedHolidaySet(2099); } catch { threw = true; }
  check('throws for unloaded year', threw);
}

console.log('\nB. Present-but-unverified year throws');
{
  CA_JUDICIAL_HOLIDAYS[3000] = {
    year: 3000, dates: ['3000-01-01'], verified: false, source: 'test',
  };
  let threw = false;
  try { getVerifiedHolidaySet(3000); } catch { threw = true; }
  check('throws for unverified year', threw);
}

console.log('\nC. Verified year returns its dates + same-year emergency closures');
{
  CA_JUDICIAL_HOLIDAYS[3001] = {
    year: 3001, dates: ['3001-01-01', '3001-12-25'], verified: true, source: 'test',
  };
  EMERGENCY_COURT_CLOSURES.push('3001-07-15'); // same year
  EMERGENCY_COURT_CLOSURES.push('3002-07-15'); // different year, must NOT leak in
  const set = getVerifiedHolidaySet(3001);
  check('includes recurring date', set.has('3001-01-01'));
  check('includes same-year emergency closure', set.has('3001-07-15'));
  check('excludes other-year emergency closure', !set.has('3002-07-15'));
}

console.log('\nD. Span union covers both years, throws if either is missing');
{
  CA_JUDICIAL_HOLIDAYS[3010] = { year: 3010, dates: ['3010-12-25'], verified: true, source: 'test' };
  CA_JUDICIAL_HOLIDAYS[3011] = { year: 3011, dates: ['3011-01-01'], verified: true, source: 'test' };
  const span = getVerifiedHolidaySetForSpan(3010, 3011);
  check('span includes year 1', span.has('3010-12-25'));
  check('span includes year 2', span.has('3011-01-01'));

  let threw = false;
  try { getVerifiedHolidaySetForSpan(3010, 3012); } catch { threw = true; }
  check('span throws when a year is missing', threw);
}

console.log('\nE. Stub ships empty (no unverified real dates baked in)');
{
  const realYears = Object.keys(CA_JUDICIAL_HOLIDAYS)
    .map(Number)
    .filter((y) => y < 2900); // exclude test-injected sentinel years
  check('no production years pre-populated in stub', realYears.length === 0,
    `found ${JSON.stringify(realYears)}`);
}

console.log(`\n${'-'.repeat(40)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`${'-'.repeat(40)}\n`);
if (failed > 0) process.exit(1);
