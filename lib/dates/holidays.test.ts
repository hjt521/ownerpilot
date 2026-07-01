/**
 * E2 — CA judicial holiday table tests (2027 verification).
 * Repo test convention (inline check() runner). Run: npx tsx lib/dates/holidays.test.ts
 *
 * Required by the 2027 citation-pull sign-off
 * (ownerpilot_citation_pull_2027_holidays_for_verification, 2026-06-05):
 *   - the 2027 array has length 15 and contains BOTH 2027-01-01 and 2027-12-31
 *     (the cross-year NYD-2028 observance — table is a flat date list, not a
 *     holiday-keyed map);
 *   - a late-December-2027 3-day count is extended past the 12-31 holiday and the
 *     New-Year weekend into January 2028.
 */

import { CA_JUDICIAL_HOLIDAYS, getVerifiedHolidaySet } from './holidays';
import { computeCompliancePeriod } from './computeCompliancePeriod';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; console.log(`  \u2713 ${name}`); }
  else { failed++; console.log(`  \u2717 ${name}${detail ? ` \u2014 ${detail}` : ''}`); }
}

console.log('\n=== 2027 table is verified with the 15-entry / dual Jan+Dec shape ===\n');
{
  const e = CA_JUDICIAL_HOLIDAYS[2027];
  check('2027 entry present', !!e);
  check('2027 verified === true', e?.verified === true);
  check('2027 has exactly 15 dates', e?.dates.length === 15, `got ${e?.dates.length}`);
  check('2027 verifiedOn recorded', e?.verifiedOn === '2026-06-05');
  // verifiedBy is now the reviewing attorney of record. Asserting the exact
  // string keeps a silent edit to the attribution from passing unnoticed.
  check('2027 verifiedBy = reviewing attorney name + SBN',
    e?.verifiedBy === 'Jack Taglyan, Broker, CalDRE #B9445457');
}
{
  const set = getVerifiedHolidaySet(2027); // must NOT throw now
  check('getVerifiedHolidaySet(2027) does not throw', set instanceof Set);
  check('set size 15', set.size === 15, `got ${set.size}`);
  check('contains 2027-01-01 (NYD 2027)', set.has('2027-01-01'));
  check('contains 2027-12-31 (NYD-2028 observed early)', set.has('2027-12-31'));
  // The four CRC 1.11 weekend shifts the packet calls out:
  check('Juneteenth shifted to 2027-06-18 (Fri)', set.has('2027-06-18') && !set.has('2027-06-19'));
  check('Independence Day shifted to 2027-07-05 (Mon)', set.has('2027-07-05') && !set.has('2027-07-04'));
  check('Christmas shifted to 2027-12-24 (Fri)', set.has('2027-12-24') && !set.has('2027-12-25'));
}

console.log('\n=== Regression: 2026 unchanged; unverified years still throw ===\n');
{
  check('2026 still verified, size 14', getVerifiedHolidaySet(2026).size === 14);
  let threw = false;
  try { getVerifiedHolidaySet(2099); } catch { threw = true; }
  check('unverified year (2099) still throws (gate intact)', threw);
}

console.log('\n=== Shift-date invariants (deploy-time guard, lahd 3-day-count ruling 2026-06-30 §6) ===\n');
{
  // The CRC 1.11 weekend-shift dates that a from-memory or stale table is most likely to miss,
  // and whose absence silently produces a wrong day-count. A missing entry here = a wrong notice.
  const y2026 = getVerifiedHolidaySet(2026);
  check('2026-07-03 present (Independence Day observed; Jul 4 = Sat) — THE defect date',
    y2026.has('2026-07-03') && !y2026.has('2026-07-04'));
  const y2027 = getVerifiedHolidaySet(2027);
  check('2027-07-05 present (Independence Day observed; Jul 4 = Sun)', y2027.has('2027-07-05'));
  check('2027-12-24 present (Christmas observed; Dec 25 = Sat)', y2027.has('2027-12-24'));
  check('2027-12-31 present (NYD-2028 observed early; Jan 1 2028 = Sat)', y2027.has('2027-12-31'));
}

console.log('\n=== Cross-year count: the Dec-31 holiday matters (packet downstream check) ===\n');
{
  // Service Thu 2027-12-30 (personal). Count excludes the service day, then walks
  // forward skipping weekends + holidays:
  //   12-31 Fri  -> HOLIDAY (NYD-2028 observed)   skip
  //   01-01 Sat  -> weekend                       skip
  //   01-02 Sun  -> weekend                       skip
  //   01-03 Mon  -> counted[0] (commencement)
  //   01-04 Tue  -> counted[1]
  //   01-05 Wed  -> counted[2] = expiration
  // NOTE: injects ONLY the 2027 set. Jan 3-5 2028 are not CA judicial holidays, so
  // no 2028 entry is needed for THIS count. (Production unions years via
  // getVerifiedHolidaySetForSpan, which still throws for 2028 until that table is
  // verified — see the 2028 refresh note flagged separately. Not a 2027 blocker.)
  const r = computeCompliancePeriod({
    serviceDate: '2027-12-30',
    serviceMethod: 'personal',
    holidays: getVerifiedHolidaySet(2027),
  });
  check('12-31 is excluded from the counted days', !r.countedDays.includes('2027-12-31'));
  check('commencement = Mon 2028-01-03', r.commencementDate === '2028-01-03', r.commencementDate);
  check('expiration = Wed 2028-01-05', r.expirationDate === '2028-01-05', r.expirationDate);

  // Significance check: WITHOUT the 12-31 holiday the count would land a day
  // earlier (expiration 2028-01-04) — proving the cross-year entry changes the
  // result and must be present.
  const withoutDec31 = new Set(getVerifiedHolidaySet(2027));
  withoutDec31.delete('2027-12-31');
  const r2 = computeCompliancePeriod({
    serviceDate: '2027-12-30', serviceMethod: 'personal', holidays: withoutDec31,
  });
  check('without 12-31 holiday => expiration is one day earlier (2028-01-04)',
    r2.expirationDate === '2028-01-04', r2.expirationDate);
}

console.log(`\n${'-'.repeat(40)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`${'-'.repeat(40)}\n`);
if (failed > 0) process.exit(1);
