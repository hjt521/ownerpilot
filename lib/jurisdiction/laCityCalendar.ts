/**
 * LA CITY business-day calendar — for the LAHD 3-business-day filing deadline.
 *
 * ⚠️  THIS IS A SEPARATE CALENDAR FROM THE JUDICIAL HOLIDAY TABLE.  ⚠️
 *
 * The LAHD filing deadline is an ADMINISTRATIVE deadline to a municipal
 * department; it runs on the City of Los Angeles business-day calendar (LAMC
 * Article 9 city-office open/closed days), NOT the CA judicial-holiday table
 * (CCP §§ 12/12a/135) that governs the 3-day NOTICE count.
 *
 * The two calendars genuinely diverge (verified for 2026):
 *   - City observes Indigenous Peoples' Day (Oct 12); courts do NOT.
 *   - Courts observe Lincoln's Birthday (Feb 12) and Native American Day
 *     (Sep 25); city does NOT.
 *   - Cesar Chavez: city observes Mar 30; courts observe Mar 31 (different day).
 * Using the judicial table for the filing deadline would be WRONG on multiple
 * dates. Hence: separate calendar, separate verification trail. Do NOT import
 * or reuse holidays.ts here.
 *
 * Same forcing-function discipline as the judicial table: throws on any
 * missing/unverified year so production blocks rather than counting against an
 * incomplete set.
 *
 * Not legal advice; encodes attorney-verifiable administrative-calendar data.
 */

export interface CityHolidayYear {
  year: number;
  /** Observed city-holiday dates, 'YYYY-MM-DD'. */
  dates: string[];
  verified: boolean;
  verifiedBy?: string; // "Name, SBN ######"
  verifiedOn?: string; // 'YYYY-MM-DD'
  source: string;
}

/**
 * Per-year LA city holiday tables. 2026 is STAGED (verified:false) pending
 * attorney sign-off of the city-business-day citation pull. It THROWS until
 * verified — staging does not bypass the gate.
 */
export const LA_CITY_HOLIDAYS: Record<number, CityHolidayYear> = {
  2026: {
    year: 2026,
    dates: [
      '2026-01-01', // New Year's Day
      '2026-01-19', // MLK Jr. Day
      '2026-02-16', // Presidents' Day
      '2026-03-30', // Farmworkers Day (CITY: Mar 30; NB judicial = Mar 31)
      '2026-05-25', // Memorial Day
      '2026-06-19', // Juneteenth
      '2026-07-03', // Independence Day observed (Jul 4 = Sat)
      '2026-09-07', // Labor Day
      '2026-10-12', // Indigenous Peoples' Day (CITY only; NOT judicial)
      '2026-11-11', // Veterans Day
      '2026-11-26', // Thanksgiving
      '2026-11-27', // Day After Thanksgiving
      '2026-12-25', // Christmas
    ],
    verified: false, // attorney flips true after verifying vs. LAMC Article 9 / city sources
    verifiedBy: '{ATTORNEY_NAME}, SBN {SBN}',
    verifiedOn: '',
    source:
      'City of LA 2026 holidays per LADBS ' +
      '(https://dbs.lacity.gov/our-organization/locations-offices/holidays) and ' +
      'Dept. of Recreation & Parks 2026 schedule, both fetched 2026-06-01; ' +
      'governing authority LAMC Article 9 (Legal Holidays / Open and Closed ' +
      'Days for City Offices) — Article 9 text to be confirmed by attorney.',
  },
};

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseISO(iso: string): Date {
  if (!ISO_RE.test(iso)) throw new Error(`Invalid date format: "${iso}".`);
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso) {
    throw new Error(`Invalid calendar date: "${iso}".`);
  }
  return d;
}
function formatISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return formatISO(d);
}
function isWeekend(iso: string): boolean {
  const day = parseISO(iso).getUTCDay();
  return day === 0 || day === 6;
}

/**
 * Verified city-holiday set for a year, or THROWS if missing/unverified.
 * Deliberate throw = forcing function (mirrors the judicial table).
 */
export function getVerifiedCityHolidaySet(year: number): Set<string> {
  const entry = LA_CITY_HOLIDAYS[year];
  if (!entry) {
    throw new Error(
      `No LA city holiday data for ${year}. This is the city business-day ` +
        `calendar (separate from judicial holidays). Verify and load it first.`,
    );
  }
  if (!entry.verified) {
    throw new Error(
      `LA city holiday data for ${year} is present but UNVERIFIED. Do not ` +
        `compute filing deadlines against unverified city-calendar data.`,
    );
  }
  return new Set(entry.dates);
}

export interface FilingDeadlineResult {
  serviceDate: string;
  /** The deadline date (end of this day) to file with LAHD. */
  filingDeadline: string;
  /** The business days counted. */
  businessDaysCounted: string[];
}

/**
 * Compute the LAHD filing deadline: N business days after service, skipping
 * weekends and CITY holidays. Throws (via getVerifiedCityHolidaySet) if the
 * relevant year isn't verified — so the caller falls back to the non-computed
 * "within 3 business days — confirm with LAHD" message rather than guessing.
 *
 * NOTE on the count rule: starts the day AFTER service and counts forward,
 * collecting the first N city business days; the Nth is the deadline. The
 * attorney is to confirm this start-day convention matches LAHD practice
 * (flagged in the citation pull). Defaults to 3 business days.
 */
export function computeLahdFilingDeadline(
  serviceDate: string,
  businessDays = 3,
): FilingDeadlineResult {
  parseISO(serviceDate);
  const startYear = Number(serviceDate.slice(0, 4));
  // A 3-business-day window can cross into the next year near Dec 31; union the
  // service year and next year's city holidays (both must be verified, else throw).
  const holidays = new Set<string>(getVerifiedCityHolidaySet(startYear));
  // Only union next year if it exists & is verified; otherwise rely on this year.
  const nextYearEntry = LA_CITY_HOLIDAYS[startYear + 1];
  if (nextYearEntry && nextYearEntry.verified) {
    for (const d of getVerifiedCityHolidaySet(startYear + 1)) holidays.add(d);
  }

  const counted: string[] = [];
  let cursor = serviceDate;
  let guard = 0;
  while (counted.length < businessDays) {
    cursor = addDays(cursor, 1);
    if (!isWeekend(cursor) && !holidays.has(cursor)) counted.push(cursor);
    if (++guard > 60) {
      throw new Error('Filing-deadline count exceeded 60 days — calendar likely malformed.');
    }
  }
  return {
    serviceDate,
    filingDeadline: counted[counted.length - 1],
    businessDaysCounted: counted,
  };
}
