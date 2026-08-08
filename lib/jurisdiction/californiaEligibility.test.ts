import { classifyCaliforniaEligibility } from './californiaEligibility';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

const component = (shortText?: string, longText?: string) => ({
  types: ['administrative_area_level_1'],
  shortText,
  longText,
});

console.log('\n=== P0-A California eligibility ===\n');

check(
  'Fresno / CA structured state passes',
  classifyCaliforniaEligibility([component('CA', 'California')]) === 'CONFIRMED_CALIFORNIA',
);
check(
  'Las Vegas / NV structured state blocks as non-California',
  classifyCaliforniaEligibility([component('NV', 'Nevada')]) === 'NON_CALIFORNIA',
);
check(
  'Phoenix / AZ structured state blocks as non-California',
  classifyCaliforniaEligibility([component('AZ', 'Arizona')]) === 'NON_CALIFORNIA',
);
check(
  'Portland / OR structured state blocks as non-California',
  classifyCaliforniaEligibility([component('OR', 'Oregon')]) === 'NON_CALIFORNIA',
);
check(
  'missing state blocks as unknown',
  classifyCaliforniaEligibility([]) === 'UNKNOWN',
);
check(
  'malformed structured state blocks as unknown',
  classifyCaliforniaEligibility([component('ZZ', 'Not A State')]) === 'UNKNOWN',
);
check(
  'conflicting structured state blocks as unknown',
  classifyCaliforniaEligibility([
    component('CA', 'California'),
    component('NV', 'Nevada'),
  ]) === 'UNKNOWN',
);
check(
  'internally conflicting short/long state blocks as unknown',
  classifyCaliforniaEligibility([component('CA', 'Nevada')]) === 'UNKNOWN',
);
check(
  'legacy reverse-geocode component shape is accepted',
  classifyCaliforniaEligibility([
    { types: ['administrative_area_level_1'], short_name: 'CA', long_name: 'California' },
  ]) === 'CONFIRMED_CALIFORNIA',
);
check(
  'locality-only evidence can never satisfy California eligibility',
  classifyCaliforniaEligibility([
    { types: ['locality'], shortText: 'Los Angeles', longText: 'Los Angeles' },
  ]) === 'UNKNOWN',
);

console.log(`\n${'-'.repeat(40)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`${'-'.repeat(40)}\n`);
if (failed > 0) process.exit(1);
