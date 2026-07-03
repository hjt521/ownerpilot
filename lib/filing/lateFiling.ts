// lib/filing/lateFiling.ts
// Lane W6 (omnibus §3.7) — late-filing detection + escape-hatch copy. LAHD requires an eviction notice be filed
// within THREE LA business days of service (LAMC §151.09.C.9 / §165.05.B.5). This computes the filing deadline
// (service_date + 3 LA business days, skipping weekends + LA city holidays) and whether "today" is past it.
// Pure — the modal/regeneration wiring lives at the intake surface; this is the testable core.

import { getVerifiedCityHolidaySet } from '@/lib/dates/holidays_la_city';
import { lockedProseEntry } from '@/lib/compliance/lockedProse';

/** 'YYYY-MM-DD' → UTC-noon Date (avoids TZ edge cases in date-only math). */
function parseIso(d: string): Date {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day, 12));
}
function toIso(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}
function isLaBusinessDay(d: Date, holidays: Set<string>): boolean {
  const dow = d.getUTCDay();
  if (dow === 0 || dow === 6) return false; // Sun / Sat
  return !holidays.has(toIso(d));
}

/**
 * The LAHD filing deadline = the 3rd LA business day AFTER the service date (service day excluded), skipping
 * weekends + LA city holidays. e.g. serve Mon 2026-06-29 → 6/30, 7/1, 7/2 → deadline 2026-07-02.
 */
export function lahdFilingDeadline(serviceDateIso: string): string {
  const start = parseIso(serviceDateIso);
  const holidays = new Set<string>([
    ...getVerifiedCityHolidaySet(start.getUTCFullYear()),
    ...getVerifiedCityHolidaySet(start.getUTCFullYear() + 1), // span year-end
  ]);
  const d = new Date(start);
  let counted = 0;
  while (counted < 3) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (isLaBusinessDay(d, holidays)) counted++;
  }
  return toIso(d);
}

/** True when `today` is strictly after the filing deadline for `serviceDate` (i.e. more than 3 LA business days). */
export function isLateForFiling(serviceDateIso: string, todayIso: string): boolean {
  return parseIso(todayIso).getTime() > parseIso(lahdFilingDeadline(serviceDateIso)).getTime();
}

/** The locked late-filing escape-hatch message with the service date interpolated. */
export function lateFilingMessage(serviceDateIso: string): string {
  // LockedKey: LATE_FILING_ESCAPE_HATCH_EN
  return lockedProseEntry('LATE_FILING_ESCAPE_HATCH_EN').value.replace('${service_date}', serviceDateIso);
}
