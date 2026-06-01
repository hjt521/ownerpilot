import {
  LA_CITY_HOLIDAYS,
  getVerifiedCityHolidaySet,
  computeLahdFilingDeadline,
} from './laCityCalendar';
import { CA_JUDICIAL_HOLIDAYS } from '../dates/holidays';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; console.log(`  \u2713 ${name}`); }
  else { failed++; console.log(`  \u2717 ${name}${detail ? ` \u2014 ${detail}` : ''}`); }
}

console.log('\n=== Gating (forcing function) ===');

console.log('\n1. 2026 is staged but UNVERIFIED -> throws (gate not bypassed)');
{
  let threw = false;
  try { getVerifiedCityHolidaySet(2026); } catch { threw = true; }
  check('throws while unverified', threw);
  check('committed 2026 is verified:false', LA_CITY_HOLIDAYS[2026].verified === false);
}

console.log('\n2. Missing year throws');
{
  let threw = false;
  try { getVerifiedCityHolidaySet(2099); } catch { threw = true; }
  check('missing year throws', threw);
}

console.log('\n=== SEPARATE from judicial table (the whole point) ===');

console.log('\n3. City and judicial 2026 sets genuinely differ');
{
  // Flip city 2026 verified in-memory ONLY for this comparison (not the file).
  LA_CITY_HOLIDAYS[2026].verified = true;
  const city = getVerifiedCityHolidaySet(2026);
  const judicialEntry = CA_JUDICIAL_HOLIDAYS[2026];
  const judicial = new Set(judicialEntry ? judicialEntry.dates : []);

  // City has Indigenous Peoples' Day; judicial does not.
  check('city has Oct 12', city.has('2026-10-12'));
  check('judicial does NOT have Oct 12', !judicial.has('2026-10-12'));

  // Judicial has Lincoln (Feb 12) and Native American Day (Sep 25); city does not.
  check('city does NOT have Feb 12', !city.has('2026-02-12'));
  check('judicial HAS Feb 12', judicial.has('2026-02-12'));
  check('city does NOT have Sep 25', !city.has('2026-09-25'));
  check('judicial HAS Sep 25', judicial.has('2026-09-25'));

  // Chavez: city Mar 30, judicial Mar 31.
  check('city has Mar 30 (Chavez)', city.has('2026-03-30'));
  check('city does NOT have Mar 31', !city.has('2026-03-31'));
  check('judicial has Mar 31 (Chavez)', judicial.has('2026-03-31'));
  check('judicial does NOT have Mar 30', !judicial.has('2026-03-30'));

  LA_CITY_HOLIDAYS[2026].verified = false; // restore
}

console.log('\n=== Filing-deadline counting (with 2026 verified in-memory) ===');

console.log('\n4. Plain 3-business-day count, no holidays in window');
{
  LA_CITY_HOLIDAYS[2026].verified = true;
  // Service Monday 2026-06-01; next 3 business days = Tue/Wed/Thu = Jun 2,3,4.
  const r = computeLahdFilingDeadline('2026-06-01', 3);
  check('deadline Jun 4', r.filingDeadline === '2026-06-04', r.filingDeadline);
  check('counted 3 days', r.businessDaysCounted.length === 3);
  LA_CITY_HOLIDAYS[2026].verified = false;
}

console.log('\n5. Count skips a CITY holiday (Indigenous Peoples Day Oct 12)');
{
  LA_CITY_HOLIDAYS[2026].verified = true;
  // Service Fri 2026-10-09; Sat/Sun skipped, Mon Oct 12 is a CITY holiday -> skipped.
  // Business days: Tue Oct 13, Wed Oct 14, Thu Oct 15.
  const r = computeLahdFilingDeadline('2026-10-09', 3);
  check('skips Oct 12 city holiday', r.businessDaysCounted.indexOf('2026-10-12') === -1);
  check('deadline Oct 15', r.filingDeadline === '2026-10-15', r.filingDeadline);
  LA_CITY_HOLIDAYS[2026].verified = false;
}

console.log('\n6. SAFETY: a date that is judicial-but-not-city is NOT skipped here');
{
  LA_CITY_HOLIDAYS[2026].verified = true;
  // Native American Day Fri Sep 25 is a JUDICIAL holiday but NOT a city holiday.
  // Service Wed 2026-09-23: business days Thu 24, Fri 25 (counts! not a city holiday), Mon 28.
  const r = computeLahdFilingDeadline('2026-09-23', 3);
  check('Sep 25 IS counted (city open that day)', r.businessDaysCounted.indexOf('2026-09-25') !== -1, JSON.stringify(r.businessDaysCounted));
  check('deadline Mon Sep 28', r.filingDeadline === '2026-09-28', r.filingDeadline);
  LA_CITY_HOLIDAYS[2026].verified = false;
}

console.log('\n7. Unverified year in compute path throws (no silent guess)');
{
  // 2026 left verified:false here.
  let threw = false;
  try { computeLahdFilingDeadline('2026-06-01', 3); } catch { threw = true; }
  check('compute throws when unverified', threw);
}

console.log(`\n${'-'.repeat(40)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`${'-'.repeat(40)}\n`);
if (failed > 0) process.exit(1);
