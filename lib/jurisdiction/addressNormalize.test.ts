/**
 * addressNormalize snapshot guard (Decision 2 produce-gate ruling §3.3/§3.4).
 * Pins the normalized output of reference addresses. If the function drifts, this
 * fails — same discipline as locked-prose, applied to a code-path invariant.
 */
import { normalizeAddressForJurisdictionKey as norm } from './addressNormalize';

let passed = 0, failed = 0;
function eq(name: string, got: string, want: string) {
  if (got === want) { passed++; console.log('  ✓ ' + name); }
  else { failed++; console.log(`  ✗ ${name}\n      got:  ${got}\n      want: ${want}`); }
}

// ---- §3.3 required cases + §3.2 worked example ----
eq('5537 La Mirada example (ruling §3.2)',
  norm('5537 La Mirada Ave. #202, Los Angeles, CA 90029-1234'),
  '5537 LA MIRADA AVENUE UNIT 202 LOS ANGELES CA 90029');

eq('1200 Wilshire (already-confirmed case)',
  norm('1200 Wilshire Blvd, Los Angeles, CA 90017'),
  '1200 WILSHIRE BOULEVARD LOS ANGELES CA 90017');

eq('non-LA Pasadena',
  norm('123 Main St., Pasadena, CA 91101'),
  '123 MAIN STREET PASADENA CA 91101');

eq('ambiguous PO Box Beverly Hills',
  norm('PO Box 123, Beverly Hills, CA 90210'),
  'PO BOX 123 BEVERLY HILLS CA 90210');

eq('edge: hyphenated street number + Apt',
  norm('5537-A La Mirada Ave Apt 202'),
  '5537-A LA MIRADA AVENUE UNIT 202');

// ---- additional snapshot coverage (§3.4 ~10 reference addresses) ----
eq('STE → SUITE', norm('456 Spring St Ste 700, Los Angeles, CA 90013'),
  '456 SPRING STREET SUITE 700 LOS ANGELES CA 90013');
eq('Dr/Ln/Rd/Ct/Pl expansion', norm('1 Oak Dr'), '1 OAK DRIVE');
eq('idempotent on already-normalized', norm('1200 WILSHIRE BOULEVARD LOS ANGELES CA 90017'),
  '1200 WILSHIRE BOULEVARD LOS ANGELES CA 90017');
eq('collapses whitespace + drops commas/periods',
  norm('  789   Foo  Ave.,   LA,  CA   90001 '), '789 FOO AVENUE LA CA 90001');
eq('bare # becomes UNIT', norm('10 A St # 5'), '10 A STREET UNIT 5');
eq('empty input', norm(''), '');

console.log('\n----------------------------------------');
console.log(`  ${passed} passed, ${failed} failed`);
console.log('----------------------------------------');
if (failed > 0) process.exit(1);
