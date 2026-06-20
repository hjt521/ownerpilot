/**
 * City of Los Angeles observed holidays — VERIFIED business-day source for the
 * LAHD 3-business-day filing deadline.
 *
 * ⚠️  DO NOT POPULATE THE DATED TABLES FROM MEMORY.  ⚠️
 *
 * Authority: Los Angeles Administrative Code § 4.119 (Article 9). This is the
 * CITY business-day calendar — distinct from the JUDICIAL calendar in
 * lib/dates/holidays.ts. The two diverge (e.g. the City observes Cesar Chavez
 * on the last Monday of March and Indigenous Peoples Day in October; the
 * judicial calendar uses March 31 and omits Indigenous Peoples Day, while
 * carrying Lincoln's Birthday and Native American Day the City does not).
 *
 * ROUTING (per broker calendar signoff §2.2):
 *   - LAHD filing deadline (3 City business days, LAMC 151.09.C.9 / 165.05.B.5)
 *     consumes THIS table.
 *   - CCP § 1161 3-day pay-or-quit count + CCP § 1167 UD response consume the
 *     JUDICIAL table (lib/dates/holidays.ts).
 *
 * GATE: getVerifiedCityHolidaySet THROWS for any year missing or unverified, so
 * the review gate blocks production rather than counting against an incomplete
 * set — same discipline as the judicial module.
 *
 * Broker-verified (LAAC § 4.119). Not legal advice; encodes broker-verified rules.
 */

export interface CityHolidayYear {
  year: number;
  /** Observed City-of-LA holiday dates, 'YYYY-MM-DD'. */
  dates: string[];
  /** Flipped to true only after broker primary-source verification. */
  verified: boolean;
  /** Provenance string. */
  source: string;
  /** Broker of record (CalDRE). No attorney attribution — broker-scope posture. */
  verifiedBy?: string;
  /** ISO date the broker verified this year's table, 'YYYY-MM-DD'. */
  verifiedOn?: string;
}

const LA_CITY_SOURCE_2026 =
  'Los Angeles Administrative Code § 4.119 (Article 9), ' +
  'https://codelibrary.amlegal.com/codes/los_angeles/latest/laac/0-0-0-10017 ' +
  '(fetched 2026-06-19); ' +
  'cross-confirmed against City Council Action transmittal April 2, 2026 ' +
  '(Farm Workers Day proclamation under LAAC § 4.119(a)(14) collapsed to (a)(4) ' +
  'date Mon March 30, 2026), ' +
  'http://ens.lacity.org/clk/councilactions/clkcouncilactions2196133_04022026.pdf; ' +
  'Board of Public Works Holiday & Recess Schedule for Calendar Year 2026, ' +
  'https://dpw.lacity.gov/sites/g/files/wph2471/files/2026-05/' +
  'New%20Transmittal%201%20Holiday%20and%20Recess%20Schedule%202026.pdf';

const LA_CITY_SOURCE_2027 =
  'Los Angeles Administrative Code § 4.119 (Article 9), ' +
  'https://codelibrary.amlegal.com/codes/los_angeles/latest/laac/0-0-0-10017 ' +
  '(fetched 2026-06-19); 2027 (a)(14) proclamations to be checked when the ' +
  '2027 City Council Actions open per quarterly refresh discipline.';

/**
 * Per-year City-of-LA observed-holiday tables. Dates are verbatim from the
 * broker verification packet (LAAC § 4.119 cites + day-of-week + shift rule per
 * date). Flat date lists; a cross-year early observance (e.g. 2027-12-31 for
 * NYD-2028) appears in its observance year.
 */
export const LA_CITY_HOLIDAYS: Record<number, CityHolidayYear> = {
  // 2026 — BROKER-VERIFIED 2026-06-19 (LAAC § 4.119). 13 observed dates.
  2026: {
    year: 2026,
    dates: [
      '2026-01-01', // (a)(1)  New Year's Day — Thu
      '2026-01-19', // (a)(2)  MLK Jr. Birthday — 3rd Mon Jan
      '2026-02-16', // (a)(3)  Washington's Birthday — 3rd Mon Feb
      '2026-03-30', // (a)(4)  Cesar E. Chavez's Birthday — Last Mon Mar [diverges from judicial Mar 31]
      '2026-05-25', // (a)(5)  Memorial Day — Last Mon May
      '2026-06-19', // (a)(6)  Juneteenth — Fri
      '2026-07-03', // (a)(7)  Independence Day — Jul 4 = Sat -> (c) preceding Fri
      '2026-09-07', // (a)(8)  Labor Day — 1st Mon Sep
      '2026-10-12', // (a)(9)  Indigenous Peoples Day — 2nd Mon Oct [diverges from judicial]
      '2026-11-11', // (a)(10) Veterans Day — Wed
      '2026-11-26', // (a)(11) Thanksgiving Day — 4th Thu Nov
      '2026-11-27', // (a)(12) Friday after Thanksgiving
      '2026-12-25', // (a)(13) Christmas Day — Fri
    ],
    verified: true,
    verifiedBy: 'Jack Taglyan, CalDRE B9445457',
    verifiedOn: '2026-06-19',
    source: LA_CITY_SOURCE_2026,
  },

  // 2027 — BROKER-VERIFIED 2026-06-19 (LAAC § 4.119). 14 observed dates
  // (includes 2027-12-31 NYD-2028 early observance per (c) Sat -> preceding Fri).
  2027: {
    year: 2027,
    dates: [
      '2027-01-01', // (a)(1)  New Year's Day — Fri
      '2027-01-18', // (a)(2)  MLK Jr. Birthday — 3rd Mon Jan
      '2027-02-15', // (a)(3)  Washington's Birthday — 3rd Mon Feb
      '2027-03-29', // (a)(4)  Cesar E. Chavez's Birthday — Last Mon Mar [diverges from judicial Mar 31]
      '2027-05-31', // (a)(5)  Memorial Day — Last Mon May
      '2027-06-18', // (a)(6)  Juneteenth — Jun 19 = Sat -> (c) preceding Fri
      '2027-07-05', // (a)(7)  Independence Day — Jul 4 = Sun -> (b) following Mon
      '2027-09-06', // (a)(8)  Labor Day — 1st Mon Sep
      '2027-10-11', // (a)(9)  Indigenous Peoples Day — 2nd Mon Oct [diverges from judicial]
      '2027-11-11', // (a)(10) Veterans Day — Thu
      '2027-11-25', // (a)(11) Thanksgiving Day — 4th Thu Nov
      '2027-11-26', // (a)(12) Friday after Thanksgiving
      '2027-12-24', // (a)(13) Christmas Day — Dec 25 = Sat -> (c) preceding Fri
      '2027-12-31', // (a)(1)  NYD-2028 cross-year — Jan 1 2028 = Sat -> (c) preceding Fri
    ],
    verified: true,
    verifiedBy: 'Jack Taglyan, CalDRE B9445457',
    verifiedOn: '2026-06-19',
    source: LA_CITY_SOURCE_2027,
  },
};

/**
 * Returns the verified City-of-LA holiday set for a year, or THROWS if the year
 * is missing or unverified. The throw forces the review gate to block
 * production rather than counting against an incomplete or unverified set.
 */
export function getVerifiedCityHolidaySet(year: number): Set<string> {
  const entry = LA_CITY_HOLIDAYS[year];
  if (!entry) {
    throw new Error(
      `No City-of-LA holiday data loaded for ${year}. Populate ` +
        `lib/dates/holidays_la_city.ts from LAAC § 4.119 before computing ` +
        `LAHD filing deadlines for this year.`,
    );
  }
  if (!entry.verified) {
    throw new Error(
      `City-of-LA holiday data for ${year} is present but UNVERIFIED. Do not ` +
        `compute LAHD filing deadlines against unverified holiday data.`,
    );
  }
  return new Set(entry.dates);
}
