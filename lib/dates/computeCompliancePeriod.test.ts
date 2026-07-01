import {
  computeCompliancePeriod,
  CompliancePeriodResult,
} from './computeCompliancePeriod';
import { getVerifiedHolidaySet } from './holidays';

/**
 * FICTIONAL TEST FIXTURES — NOT AUTHORITATIVE HOLIDAY DATA.
 * These dates are chosen to exercise the counting logic. They are NOT the
 * real CA judicial-holiday calendar. Production holidays come only from the
 * verified rules DB (see holidays.ts).
 *
 * 2026 weekday anchors used to hand-verify expectations:
 *   2026-06-01 = Monday   2026-12-29 = Tuesday   2027-01-01 = Friday
 */

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean, detail = '') {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function eq(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  check(name, g === w, `got ${g}, want ${w}`);
}

const NO_HOLIDAYS = new Set<string>();

console.log('\n1. Service Monday, no holidays — plain 3 weekdays');
{
  const r = computeCompliancePeriod({
    serviceDate: '2026-06-01',
    serviceMethod: 'personal',
    holidays: NO_HOLIDAYS,
  });
  eq('commencement', r.commencementDate, '2026-06-02');
  eq('expiration', r.expirationDate, '2026-06-04');
  eq('countedDays', r.countedDays, ['2026-06-02', '2026-06-03', '2026-06-04']);
  check('no mailing flag', r.mailingExtensionFlag === false);
}

console.log('\n2. Service Thursday — weekend pushes expiration into next week');
{
  const r = computeCompliancePeriod({
    serviceDate: '2026-06-04',
    serviceMethod: 'personal',
    holidays: NO_HOLIDAYS,
  });
  eq('commencement', r.commencementDate, '2026-06-05');
  eq('expiration', r.expirationDate, '2026-06-09');
  eq('countedDays', r.countedDays, ['2026-06-05', '2026-06-08', '2026-06-09']);
}

console.log('\n3. Service Friday — commencement is first counted day (Q11 locked)');
{
  const def = computeCompliancePeriod({
    serviceDate: '2026-06-05',
    serviceMethod: 'personal',
    holidays: NO_HOLIDAYS,
  });
  eq('expiration', def.expirationDate, '2026-06-10');
  // Friday service: Sat excluded, Day1 = Mon 06-08, Day2 = Tue 06-09, Day3 = Wed 06-10.
  eq('commencement (first counted day)', def.commencementDate, '2026-06-08');
}

console.log('\n4. Mid-week holiday is skipped in the count');
{
  const r = computeCompliancePeriod({
    serviceDate: '2026-06-01',
    serviceMethod: 'personal',
    holidays: new Set(['2026-06-03']), // fictional Wednesday holiday
  });
  eq('countedDays skip holiday', r.countedDays, [
    '2026-06-02',
    '2026-06-04',
    '2026-06-05',
  ]);
  eq('expiration', r.expirationDate, '2026-06-05');
}

console.log('\n5. Holiday adjacent to a weekend (long weekend)');
{
  const r = computeCompliancePeriod({
    serviceDate: '2026-06-05',
    serviceMethod: 'personal',
    holidays: new Set(['2026-06-08']), // fictional Monday holiday
  });
  eq('countedDays', r.countedDays, [
    '2026-06-09',
    '2026-06-10',
    '2026-06-11',
  ]);
  eq('expiration', r.expirationDate, '2026-06-11');
}

console.log('\n6. Substituted service raises the mailing flag (no added days)');
{
  const personal = computeCompliancePeriod({
    serviceDate: '2026-06-01',
    serviceMethod: 'personal',
    holidays: NO_HOLIDAYS,
  });
  const sub = computeCompliancePeriod({
    serviceDate: '2026-06-01',
    serviceMethod: 'substituted',
    holidays: NO_HOLIDAYS,
  });
  check('mailing flag set', sub.mailingExtensionFlag === true);
  eq('expiration identical to personal (no silent +days)', sub.expirationDate, personal.expirationDate);
  check(
    'note documents the filing-stage buffer is off the face',
    sub.notes.some((n) => n.includes('filing buffer') && n.includes('No days were added')),
  );
}

console.log('\n7. Cross-year count with New Year holiday');
{
  const r = computeCompliancePeriod({
    serviceDate: '2026-12-29', // Tuesday
    serviceMethod: 'personal',
    holidays: new Set(['2027-01-01']), // New Year's Day, Friday
  });
  eq('countedDays cross-year', r.countedDays, [
    '2026-12-30',
    '2026-12-31',
    '2027-01-04',
  ]);
  eq('expiration', r.expirationDate, '2027-01-04');
}

console.log('\n8. Bad input is rejected');
{
  let threw = false;
  try {
    computeCompliancePeriod({
      serviceDate: '06/01/2026',
      serviceMethod: 'personal',
      holidays: NO_HOLIDAYS,
    });
  } catch {
    threw = true;
  }
  check('rejects non-ISO date format', threw);

  let threw2 = false;
  try {
    computeCompliancePeriod({
      serviceDate: '2026-02-30',
      serviceMethod: 'personal',
      holidays: NO_HOLIDAYS,
    });
  } catch {
    threw2 = true;
  }
  check('rejects impossible calendar date', threw2);
}

console.log('\n9. [REGRESSION — lahd_eviction…3day_count_defect_broker_ruling_2026-06-30] real CA calendar');
{
  // Uses the PRODUCTION verified holiday set (not fixtures): July 3, 2026 is the observed
  // Independence Day judicial holiday (Jul 4 = Sat, CRC 1.11).
  const holidays = getVerifiedHolidaySet(2026);
  check('verified set includes 2026-07-03 (Independence Day observed)', holidays.has('2026-07-03'));

  // Mandated regression: service Tuesday Jun 30 2026 -> expiration Monday Jul 6 2026.
  // Wed Jul 1 (1), Thu Jul 2 (2), Fri Jul 3 SKIP (holiday), Sat/Sun skip, Mon Jul 6 (3).
  const served0630 = computeCompliancePeriod({
    serviceDate: '2026-06-30',
    serviceMethod: 'personal',
    holidays,
  });
  eq('service 2026-06-30 -> expiration 2026-07-06', served0630.expirationDate, '2026-07-06');
  eq('countedDays skip Jul 3 holiday', served0630.countedDays, ['2026-07-01', '2026-07-02', '2026-07-06']);

  // Control: the engine is correct for the OTHER date too. A notice computed for service
  // 2026-06-29 correctly expires 2026-07-02 (the count finishes before reaching Jul 3, so the
  // holiday is irrelevant). This isolates the production defect to the serviceDate VALUE
  // (Jun 29 computed, Jun 30 served) — NOT the engine and NOT the holiday data.
  const served0629 = computeCompliancePeriod({
    serviceDate: '2026-06-29',
    serviceMethod: 'personal',
    holidays,
  });
  eq('service 2026-06-29 -> expiration 2026-07-02 (engine correct for its input)', served0629.expirationDate, '2026-07-02');
}

console.log(`\n${'-'.repeat(40)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`${'-'.repeat(40)}\n`);

if (failed > 0) process.exit(1);
