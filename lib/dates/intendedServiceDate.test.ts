// lib/dates/intendedServiceDate.test.ts — PR-A validator (§2.3 req 4 + req 6/7 window cases).
// Plain tsx suite (process.exit on failure), per scripts/run_tests.mjs.

import { validateIntendedServiceDate, MAX_LEAD_DAYS } from './intendedServiceDate';
import { computeCompliancePeriod } from './computeCompliancePeriod';
import { getVerifiedHolidaySet } from './holidays';

let passed = 0;
let failed = 0;
const check = (n: string, c: boolean, d = '') => {
  c ? passed++ : (failed++, console.log(`  ✗ ${n}${d ? ` — ${d}` : ''}`));
  if (c) console.log(`  ✓ ${n}`);
};

const GEN = '2026-06-30'; // generation day for these cases

// Window: earliest = generation day; latest = +30.
check('same-day (generation day) is allowed', validateIntendedServiceDate('2026-06-30', GEN).ok);
check('+1 day allowed', validateIntendedServiceDate('2026-07-01', GEN).ok);
check('+30 days allowed (boundary)', validateIntendedServiceDate('2026-07-30', GEN).ok);

{
  const r = validateIntendedServiceDate('2026-07-31', GEN); // +31
  check('+31 days rejected (beyond max lead)', !r.ok && r.error === 'beyond_max_lead');
}
{
  const r = validateIntendedServiceDate('2026-06-29', GEN); // yesterday
  check('back-dated (before generation) rejected', !r.ok && r.error === 'before_generation');
}
{
  const r = validateIntendedServiceDate('', GEN);
  check('missing rejected (no silent fallback)', !r.ok && r.error === 'missing');
}
{
  const r = validateIntendedServiceDate(null, GEN);
  check('null rejected', !r.ok && r.error === 'missing');
}
{
  const r = validateIntendedServiceDate('06/30/2026', GEN);
  check('non-ISO format rejected', !r.ok && r.error === 'bad_format');
}
{
  const r = validateIntendedServiceDate('2026-02-30', GEN);
  check('impossible calendar date rejected', !r.ok && r.error === 'impossible_date');
}

check('MAX_LEAD_DAYS is 30', MAX_LEAD_DAYS === 30);

// §2.3 req 6 — intake→produce coherence: a validated intendedServiceDate of 2026-06-30 must drive the engine
// to expiration 2026-07-06 (the corrected Clifton Alexander case). Dated/serviceDate coherence is enforced at
// the produce-wiring layer (PR-A remaining slice); here we pin the date→expiration half end-to-end.
{
  const intended = '2026-06-30';
  check('intended 2026-06-30 validates against same-day generation', validateIntendedServiceDate(intended, intended).ok);
  const period = computeCompliancePeriod({
    serviceDate: intended,
    serviceMethod: 'personal',
    holidays: getVerifiedHolidaySet(2026),
  });
  check('intended 2026-06-30 -> expiration 2026-07-06', period.expirationDate === '2026-07-06', period.expirationDate);
}

console.log(`\n${'-'.repeat(40)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(40)}`);
if (failed > 0) process.exit(1);
