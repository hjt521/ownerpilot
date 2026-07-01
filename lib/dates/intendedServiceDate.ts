// lib/dates/intendedServiceDate.ts
// PR-A (daycount_defect_workflow_fork_broker_ruling_2026-06-30 §2.3 req 4) — validation for the captured
// intended service date that drives the 3-day notice's facial day-count.
//
// Window: earliest = the day of generation (no back-dating); latest = generation + 30 days (the broker-set
// max lead time — beyond that the holiday table / statutory text may drift between produce and serve).
// Required, ISO 'YYYY-MM-DD'. No silent fallback: an absent or out-of-window value is an error, never a
// default-to-today (defaulting is the exact mechanism that produced the original defect).

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export const MAX_LEAD_DAYS = 30;

export type IntendedServiceDateError =
  | 'missing'
  | 'bad_format'
  | 'impossible_date'
  | 'before_generation'
  | 'beyond_max_lead';

export interface IntendedServiceDateResult {
  ok: boolean;
  error?: IntendedServiceDateError;
  message?: string;
}

function parseUTC(iso: string): Date | null {
  if (!ISO_RE.test(iso)) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  if (d.toISOString().slice(0, 10) !== iso) return null; // reject rollovers (e.g. 2026-02-30)
  return d;
}

function daysBetweenUTC(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/**
 * Validate an intended service date against the day of generation.
 * @param intendedISO  the captured intended service date ('YYYY-MM-DD')
 * @param generationISO the day the notice is being produced ('YYYY-MM-DD'); defaults to today (UTC)
 */
export function validateIntendedServiceDate(
  intendedISO: string | null | undefined,
  generationISO: string = new Date().toISOString().slice(0, 10),
): IntendedServiceDateResult {
  if (!intendedISO) {
    return { ok: false, error: 'missing', message: 'An intended service date is required.' };
  }
  const intended = parseUTC(intendedISO);
  if (!intended) {
    return {
      ok: false,
      error: ISO_RE.test(intendedISO) ? 'impossible_date' : 'bad_format',
      message: `Invalid service date: "${intendedISO}". Expected a real calendar date as YYYY-MM-DD.`,
    };
  }
  const gen = parseUTC(generationISO);
  if (!gen) {
    return { ok: false, error: 'bad_format', message: `Invalid generation date: "${generationISO}".` };
  }
  const lead = daysBetweenUTC(gen, intended);
  if (lead < 0) {
    return {
      ok: false,
      error: 'before_generation',
      message: 'The service date cannot be earlier than today. A notice cannot be back-dated.',
    };
  }
  if (lead > MAX_LEAD_DAYS) {
    return {
      ok: false,
      error: 'beyond_max_lead',
      message: `The service date cannot be more than ${MAX_LEAD_DAYS} days ahead. Regenerate closer to the actual service day.`,
    };
  }
  return { ok: true };
}
