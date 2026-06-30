// lib/decision2/__tests__/normalize.test.ts
// Lane 5 Decision 2 — normalization re-exports the resolver SSOT (ruling §2.2).
// Expected outputs are the LIVE resolver-actual values (captured from normalizeAddressForJurisdictionKey),
// NOT the master-prompt example values where they differ. See the resolver-behavior addendum for the two
// divergent cases (directionals not collapsed; accented chars removed, not transliterated).

import { normalizeAddress } from '../normalize';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok -', name); }
}

const cases: Array<[string, string]> = [
  ['123 Main Street',       '123 MAIN STREET'],
  ['123 Main St',           '123 MAIN STREET'],
  ['123 main st',           '123 MAIN STREET'],
  ['  123   Main  St.  ',   '123 MAIN STREET'],
  ['123 N Main St',         '123 N MAIN STREET'],
  ['123 North Main Street', '123 NORTH MAIN STREET'],   // resolver does NOT collapse directionals (addendum)
  ['123 Main St, Unit 4',   '123 MAIN STREET UNIT 4'],
  ['123 Main St #4',        '123 MAIN STREET UNIT 4'],  // # → UNIT per resolver ABBR map
  ['123 Pico Blvd',         '123 PICO BOULEVARD'],
  ['456 Pico Boulevard',    '456 PICO BOULEVARD'],
  ['789 Café Ave',          '789 CAF AVENUE'],          // resolver removes 'É' entirely, not 'É'→'E' (addendum)
  ['100 Main St.',          '100 MAIN STREET'],
  ['100  Main  St',         '100 MAIN STREET'],
];

for (const [input, expected] of cases) {
  check(`${JSON.stringify(input)} → ${JSON.stringify(expected)}`, normalizeAddress(input) === expected);
}

// Idempotence: every SSOT output is a fixed point of the SSOT (ruling: 13 inputs × normalize∘normalize).
for (const [input] of cases) {
  const once = normalizeAddress(input);
  check(`idempotent: ${JSON.stringify(input)}`, normalizeAddress(once) === once);
}

// Empty / nullish input → empty string (ruling: empty-string test).
check('empty string → ""', normalizeAddress('') === '');
check('whitespace-only → ""', normalizeAddress('   ') === '');

if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log('\nnormalize: all passed');
