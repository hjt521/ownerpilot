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
 *   This engine computes the notice's facial compliance period only — the 3 business
 *   days the tenant has to cure, per CCP § 1161 and the day-count rules in CCP §§ 12,
 *   12a, 135 (AB 2343 eff. 9/1/2019: weekends and judicial holidays excluded).
 *
 *   It does NOT add the +5 calendar day mailing buffer for substituted or
 *   posting-and-mailing service. The +5 is a FILING-STAGE rule (governing when the
 *   landlord may file the unlawful detainer), not a NOTICE-FACE rule. Putting it on
 *   the face would misstate the statutory 3-day demand under CCP § 1161(2).
 *
 *   For substituted / post-and-mail, the engine raises `mailingExtensionFlag: true`
 *   so the UI displays the attorney-approved filing-stage guidance (see A2(b) copy
 *   in ownerpilot_service_and_payment_redesign_attorney_ruling.md). The flag's only
 *   job is to trigger that already-approved UI copy. The engine does not invent or
 *   render any date based on the +5.
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
   * When `true`, the produced notice's face shows the statutory 3-business-day
   * compliance period only (CCP § 1161; weekends/holidays excluded per CCP
   * §§ 12, 12a, 135 and AB 2343). The face deadline is the tenant's correct
   * cure deadline and is not extended by the service method.
   *
   * The flag's sole job is to trigger the UI's filing-stage guidance — the
   * attorney-approved A2(b) copy — telling the landlord that most California
   * courts require an additional 5 calendar days after the face deadline before
   * an unlawful detainer may be filed. The +5 is a landlord filing buffer, not
   * a tenant cure extension; it never appears on the notice face. The engine
   * does not add days here.
   *
   * The service-method mailing date must be captured separately by the
   * signer/serve step for the proof of service; the engine does not derive it.
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
      `Method is substituted / post-and-mail. The compliance period above is ` +
        `computed from the statutory 3 business days only (CCP § 1161, ` +
        `weekends/holidays excluded). The +5 calendar day filing buffer is NOT ` +
        `applied here — it lives in the UI's approved filing-stage guidance, ` +
        `not on the notice face. mailingExtensionFlag is raised solely to ` +
        `trigger that UI display. No days were added to the face date.`,
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
