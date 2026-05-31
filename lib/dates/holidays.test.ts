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

console.log('\nE. Any pre-populated production year is verified (no unverified real dates)');
{
  const productionYears = Object.keys(CA_JUDICIAL_HOLIDAYS)
    .map(Number)
    .filter((y) => y < 2900); // exclude test-injected sentinel years
  // It is fine (expected) for verified years to ship; what must NEVER ship is a
  // pre-populated-but-unverified real year.
  const unverified = productionYears.filter(
    (y) => !CA_JUDICIAL_HOLIDAYS[y].verified,
  );
  check('no unverified production years baked in', unverified.length === 0,
    `unverified: ${JSON.stringify(unverified)}`);
}

console.log('\nF. The verified 2026 table loads and has the expected shape');
{
  let set: Set<string> | null = null;
  let threw = false;
  try { set = getVerifiedHolidaySet(2026); } catch { threw = true; }
  check('2026 no longer throws (now verified)', !threw);
  check('2026 has 14 observed holidays', set !== null && set.size === 14,
    set ? `size ${set.size}` : 'null');
  check('includes observed July 3 (not July 4)',
    set !== null && set.has('2026-07-03') && !set.has('2026-07-04'));
  check('excludes Columbus Day (federal, not CA judicial)',
    set !== null && !set.has('2026-10-12'));
  const entry = CA_JUDICIAL_HOLIDAYS[2026];
  check('2026 entry carries verifiedOn', entry.verifiedOn === '2026-05-31');
  check('2026 entry carries a source citing CRC 1.11',
    typeof entry.source === 'string' && entry.source.includes('rule 1.11'));
}

console.log(`\n${'-'.repeat(40)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`${'-'.repeat(40)}\n`);
if (failed > 0) process.exit(1);
