/**
 * California judicial holidays — VERIFIED DATA SOURCE.
 *
 * ⚠️  DO NOT POPULATE THE DATED TABLES FROM MEMORY.  ⚠️
 *
 * Statutory basis: CCP § 135 (incorporating Gov. Code §§ 6700-6701). The
 * attorney review directs sourcing the holiday table from § 135 directly,
 * refreshing annually, and logging which table version produced each notice.
 *
 * § 135 RECURRING JUDICIAL HOLIDAYS (the rules — stable year to year):
 *   - New Year's Day (Jan 1)
 *   - Martin Luther King Jr. Day (3rd Monday in January)
 *   - Presidents' Day (3rd Monday in February)
 *   - Cesar Chavez Day (Mar 31)
 *   - Memorial Day (last Monday in May)
 *   - Juneteenth (Jun 19)
 *   - Independence Day (Jul 4)
 *   - Labor Day (1st Monday in September)
 *   - Veterans Day (Nov 11)
 *   - Thanksgiving Day (4th Thursday in November)
 *   - Day after Thanksgiving (4th Friday in November)
 *   - Christmas Day (Dec 25)
 *   PLUS the § 135 catch-alls that CANNOT be computed in advance:
 *   - Any day appointed by the President or Governor for a public fast,
 *     thanksgiving, or holiday.
 *   - Any day a court is closed by order (weather, emergency, etc.).
 *
 * WHY THIS IS NOT JUST A HARD-CODED ARRAY:
 * The catch-alls are the maintenance trap the attorney named. A fixed-date
 * holiday that lands on a weekend is observed on an adjacent weekday in many
 * systems, and emergency closures appear with no notice. So this module:
 *   1. Stores a per-year DATED table that must be verified before use.
 *   2. Lets an admin add emergency-closure dates via the override list.
 *   3. THROWS for any year that is missing or unverified, so the review gate
 *      blocks production rather than counting against an incomplete set.
 *
 * The dated tables below are the code-side mirror of the vetted rules DB
 * (rules-DB blocker #5). Populate them from the official Judicial Council /
 * § 135 source, set verified: true, and cite the source, before go-live.
 */

export interface HolidayYear {
  year: number;
  /** Observed judicial-holiday dates, 'YYYY-MM-DD'. */
  dates: string[];
  /** Must be flipped to true only after primary-source verification. */
  verified: boolean;
  /** Provenance, e.g. "CCP § 135 + Judicial Council 2026 schedule, retrieved YYYY-MM-DD". */
  source: string;
}

/**
 * Per-year dated tables. STUB — intentionally unverified and empty of real
 * dates until populated from the official source in the citation pull.
 *
 * Example shape once populated (DATES BELOW ARE ILLUSTRATIVE, NOT VERIFIED):
 *   2026: {
 *     year: 2026,
 *     dates: ['2026-01-01', '2026-01-19', ...],
 *     verified: true,
 *     source: 'CCP § 135; Judicial Council 2026 court holiday schedule, retrieved 2026-06-01',
 *   },
 */
export const CA_JUDICIAL_HOLIDAYS: Record<number, HolidayYear> = {
  // Populate from verified source before go-live. See header.
};

/**
 * Admin-managed emergency / appointed closures that are not on the recurring
 * § 135 list (e.g. a court closed by order for weather, or a day appointed by
 * the Governor). Add 'YYYY-MM-DD' entries here when the Judicial Council or a
 * court announces one. These supplement the per-year table for that date's year.
 *
 * Each entry should be auditable; in the rules DB this carries who added it,
 * when, and the order/announcement it traces to.
 */
export const EMERGENCY_COURT_CLOSURES: string[] = [
  // '2026-MM-DD',  // e.g. court closed by order — cite the announcement
];

/**
 * Returns the verified holiday set for a year (recurring + any emergency
 * closures in that year), or THROWS if the year is missing or unverified.
 * The throw is deliberate: it forces the review gate to block production
 * rather than quietly computing against an empty or unverified set.
 */
export function getVerifiedHolidaySet(year: number): Set<string> {
  const entry = CA_JUDICIAL_HOLIDAYS[year];
  if (!entry) {
    throw new Error(
      `No holiday data loaded for ${year}. Populate lib/dates/holidays.ts ` +
        `from the verified rules DB (CCP § 135 source) before producing ` +
        `notices for this year.`,
    );
  }
  if (!entry.verified) {
    throw new Error(
      `Holiday data for ${year} is present but UNVERIFIED. Do not produce ` +
        `notices against unverified holiday data.`,
    );
  }
  const set = new Set(entry.dates);
  for (const d of EMERGENCY_COURT_CLOSURES) {
    if (d.startsWith(`${year}-`)) set.add(d);
  }
  return set;
}

/**
 * A 3-day count can cross a year boundary (e.g. service on Dec 30). Callers
 * should union the sets for every year the count might touch. This helper
 * unions a service year and the next year so the engine never counts against
 * a missing set near New Year's.
 */
export function getVerifiedHolidaySetForSpan(
  startYear: number,
  endYear: number,
): Set<string> {
  const set = new Set<string>();
  for (let y = startYear; y <= endYear; y++) {
    for (const d of getVerifiedHolidaySet(y)) set.add(d);
  }
  return set;
}
