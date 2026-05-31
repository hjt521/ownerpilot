/**
 * 3-Day Pay-or-Quit compliance-period engine.
 *
 * Computes the commencement and expiration dates that must appear on the
 * face of a California 3-Day Notice to Pay Rent or Quit, per the attorney
 * review (post-Eshagian: actual dates required on the notice).
 *
 * LEGAL BASIS (math only — confirmed in attorney review Q4):
 *   - CCP § 12      : exclude the first day (day of service), include the last.
 *   - CCP § 12a     : if the last day is a holiday, it is also excluded.
 *   - AB 2343 (2019): the 3-day count excludes Saturdays, Sundays, and
 *                     judicial holidays.
 *
 * COMMENCEMENT DEFINITION (settled — attorney review Q11):
 *   The period commences on the first counted day — i.e. the day after the
 *   day of service if that day is a non-weekend, non-holiday day; otherwise
 *   the first non-weekend, non-holiday day thereafter. This equals
 *   countedDays[0]. The attorney directed locking the engine to this rule
 *   and NOT shipping the "day after service" alternative, so that option has
 *   been removed.
 *
 * SCOPE BOUNDARY — what this engine does NOT do, on purpose:
 *   - It does not add mailing days for substituted / post-and-mail service.
 *     The attorney flagged that extension as UNSETTLED. The engine raises a
 *     flag so the UI shows her hedge language; it never invents a date.
 *   - It does not validate holiday data. It consumes a verified Set injected
 *     by the caller (see holidays.ts).
 *
 * This is property-management calendar math. It is not legal advice.
 */

export type ServiceMethod = 'personal' | 'substituted' | 'post_and_mail';

export interface CompliancePeriodInput {
  /** Date the notice is (or will be) served, as 'YYYY-MM-DD'. */
  serviceDate: string;
  serviceMethod: ServiceMethod;
  /** Verified CA judicial-holiday set for the relevant year(s), 'YYYY-MM-DD'. */
  holidays: Set<string>;
}

export interface CompliancePeriodResult {
  serviceDate: string;
  /** First day of the 3-day period (for the notice face). */
  commencementDate: string;
  /** Last day to comply; tenant has until the end of this day. */
  expirationDate: string;
  /** The three qualifying days that were counted. */
  countedDays: [string, string, string];
  /**
   * True for substituted / post-and-mail service. When true the UI MUST
   * display the attorney's hedge: the real deadline may be later, and the
   * mailing date must be captured separately. The engine has NOT added days.
   */
  mailingExtensionFlag: boolean;
  /** Human-readable notes for the review gate / audit trail. */
  notes: string[];
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Parse 'YYYY-MM-DD' as a UTC date (no timezone/DST drift). */
function parseISO(iso: string): Date {
  if (!ISO_RE.test(iso)) {
    throw new Error(`Invalid date format: "${iso}". Expected YYYY-MM-DD.`);
  }
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid calendar date: "${iso}".`);
  }
  // Round-trip guard: JS silently rolls impossible dates over (e.g.
  // 2026-02-30 -> 2026-03-02). Reject anything that doesn't survive
  // a parse/format round trip unchanged.
  if (formatISO(d) !== iso) {
    throw new Error(`Impossible calendar date: "${iso}".`);
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
  const day = parseISO(iso).getUTCDay(); // 0 = Sun, 6 = Sat
  return day === 0 || day === 6;
}

function isCountableDay(iso: string, holidays: Set<string>): boolean {
  return !isWeekend(iso) && !holidays.has(iso);
}

/**
 * Compute the compliance period for a 3-day pay-or-quit notice.
 *
 * Counting rule: exclude the day of service, then walk forward collecting
 * the first three days that are not Saturdays, Sundays, or judicial holidays.
 * The third such day is the expiration date.
 */
export function computeCompliancePeriod(
  input: CompliancePeriodInput,
): CompliancePeriodResult {
  const { serviceDate, serviceMethod, holidays } = input;

  // Validate service date parses.
  parseISO(serviceDate);

  const counted: string[] = [];
  let cursor = serviceDate; // day of service is excluded; we step before testing
  // Safety bound: 3 business days can never need more than ~10 calendar days
  // even across a long holiday weekend, but cap the loop defensively.
  let guard = 0;
  while (counted.length < 3) {
    cursor = addDays(cursor, 1);
    if (isCountableDay(cursor, holidays)) {
      counted.push(cursor);
    }
    if (++guard > 60) {
      throw new Error(
        'Could not resolve a 3-day compliance period within 60 days — ' +
          'holiday data is almost certainly malformed.',
      );
    }
  }

  const countedDays = counted as [string, string, string];
  const expirationDate = countedDays[2];

  // Commencement = first counted day (attorney review Q11, settled).
  const commencementDate = countedDays[0];

  const notes: string[] = [];
  notes.push(
    `Count excludes the day of service (CCP § 12) and excludes Saturdays, ` +
      `Sundays, and judicial holidays (AB 2343).`,
  );
  notes.push(
    `Commencement = first counted (non-weekend/non-holiday) day, per ` +
      `attorney review Q11.`,
  );

  const mailingExtensionFlag =
    serviceMethod === 'substituted' || serviceMethod === 'post_and_mail';

  if (mailingExtensionFlag) {
    notes.push(
      `Service method is "${serviceMethod}". The mailing-day extension is ` +
        `legally UNSETTLED (per attorney review). The expiration date above ` +
        `is the personal-service computation. The UI MUST display the ` +
        `attorney's hedge that the actual deadline may be later, and the ` +
        `mailing date must be captured separately. No days were added here.`,
    );
  }

  return {
    serviceDate,
    commencementDate,
    expirationDate,
    countedDays,
    mailingExtensionFlag,
    notes,
  };
}
