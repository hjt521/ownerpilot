/**
 * §8.8 acceptance tests for holidays_la_city.ts (broker calendar signoff §2.7).
 * (a) 2026 length 13 + exact dates
 * (b) 2027 length 14 + exact dates (incl. 2027-12-31 cross-year)
 * (c) getVerifiedCityHolidaySet(2025) throws
 * (d) getVerifiedCityHolidaySet(2028) throws
 * (e) union with judicial set = 16 (2026) / 17 (2027)
 */
import {
  LA_CITY_HOLIDAYS,
  getVerifiedCityHolidaySet,
} from './holidays_la_city';
import { getVerifiedHolidaySet } from './holidays';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean) {
  if (cond) {
    passed++;
    console.log('  \u2713 ' + name);
  } else {
    failed++;
    console.log('  \u2717 ' + name);
  }
}
function throws(fn: () => unknown): boolean {
  try {
    fn();
    return false;
  } catch {
    return true;
  }
}

const CITY_2026 = [
  '2026-01-01','2026-01-19','2026-02-16','2026-03-30','2026-05-25','2026-06-19',
  '2026-07-03','2026-09-07','2026-10-12','2026-11-11','2026-11-26','2026-11-27','2026-12-25',
];
const CITY_2027 = [
  '2027-01-01','2027-01-18','2027-02-15','2027-03-29','2027-05-31','2027-06-18',
  '2027-07-05','2027-09-06','2027-10-11','2027-11-11','2027-11-25','2027-11-26',
  '2027-12-24','2027-12-31',
];

console.log('\n=== §8.8(a) 2026 table ===');
check('2026 length is 13', LA_CITY_HOLIDAYS[2026].dates.length === 13);
check('2026 dates match the verified set exactly',
  JSON.stringify(LA_CITY_HOLIDAYS[2026].dates) === JSON.stringify(CITY_2026));
check('2026 verified true', LA_CITY_HOLIDAYS[2026].verified === true);
check('2026 verifiedBy is broker (no attorney token)',
  LA_CITY_HOLIDAYS[2026].verifiedBy === 'Jack Taglyan, CalDRE B9445457');

console.log('\n=== §8.8(b) 2027 table ===');
check('2027 length is 14', LA_CITY_HOLIDAYS[2027].dates.length === 14);
check('2027 dates match the verified set exactly',
  JSON.stringify(LA_CITY_HOLIDAYS[2027].dates) === JSON.stringify(CITY_2027));
check('2027 includes the 2027-12-31 cross-year early observance',
  LA_CITY_HOLIDAYS[2027].dates.includes('2027-12-31'));
check('2027 verified true', LA_CITY_HOLIDAYS[2027].verified === true);

console.log('\n=== §8.8(c)+(d) gate throws on unverified/missing years ===');
check('getVerifiedCityHolidaySet(2025) throws', throws(() => getVerifiedCityHolidaySet(2025)));
check('getVerifiedCityHolidaySet(2028) throws', throws(() => getVerifiedCityHolidaySet(2028)));
check('getVerifiedCityHolidaySet(2026) does NOT throw', !throws(() => getVerifiedCityHolidaySet(2026)));
check('getVerifiedCityHolidaySet(2027) does NOT throw', !throws(() => getVerifiedCityHolidaySet(2027)));

console.log('\n=== §8.8(e) union with judicial set ===');
function unionCardinality(year: number): number {
  const city = getVerifiedCityHolidaySet(year);
  const jud = getVerifiedHolidaySet(year);
  const u = new Set<string>([...city, ...jud]);
  return u.size;
}
const u2026 = unionCardinality(2026);
const u2027 = unionCardinality(2027);
check('2026 city \u222a judicial cardinality is 16', u2026 === 16);
check('2027 city \u222a judicial cardinality is 17', u2027 === 17);

console.log('\n----------------------------------------');
console.log(`  ${passed} passed, ${failed} failed`);
console.log('----------------------------------------');
if (failed > 0) process.exit(1);
