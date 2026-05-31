/**
 * California judicial holidays — VERIFIED DATA SOURCE.
 *
 * ⚠️  DO NOT POPULATE THIS TABLE FROM MEMORY.  ⚠️
 *
 * Every date in this file must trace to a primary source (CCP § 135,
 * Gov. Code §§ 6700–6701, and the Judicial Council's annual court-holiday
 * schedule). A single wrong or missing holiday silently produces an
 * invalid compliance deadline — which is the exact failure mode the
 * broker-supervised workflow exists to prevent.
 *
 * This file is the code-side mirror of the vetted rules database
 * (rules-DB blocker #5). The intended lifecycle:
 *   1. Holiday dates are entered + attorney/broker-verified in the rules DB.
 *   2. They are exported here (or loaded at runtime from the DB).
 *   3. The engine consumes them as injected data — it never hardcodes them.
 *
 * Until each year below is verified, it must stay marked UNVERIFIED so the
 * review gate can refuse to produce a notice using an unverified year.
 */

export interface HolidayYear {
  year: number;
  /** 'YYYY-MM-DD' strings. */
  dates: string[];
  /** Must be flipped to true only after primary-source verification. */
  verified: boolean;
  /** Free-text provenance, e.g. "Judicial Council 2026 court holiday schedule, retrieved YYYY-MM-DD". */
  source: string;
}

/**
 * STUB. Intentionally unverified and intentionally empty of real dates.
 * Populate from the rules DB before the engine goes live.
 */
export const CA_JUDICIAL_HOLIDAYS: Record<number, HolidayYear> = {
  // 2026: {
  //   year: 2026,
  //   dates: [ /* 'YYYY-MM-DD', ... from verified source */ ],
  //   verified: false,
  //   source: 'TODO: cite Judicial Council 2026 schedule + Gov. Code §§ 6700-6701',
  // },
};

/**
 * Returns the verified holiday set for a year, or throws if that year is
 * missing or unverified. The throw is deliberate: it forces the review gate
 * to block production rather than quietly computing against an empty set.
 */
export function getVerifiedHolidaySet(year: number): Set<string> {
  const entry = CA_JUDICIAL_HOLIDAYS[year];
  if (!entry) {
    throw new Error(
      `No holiday data loaded for ${year}. Populate lib/dates/holidays.ts ` +
        `from the verified rules DB before producing notices for this year.`,
    );
  }
  if (!entry.verified) {
    throw new Error(
      `Holiday data for ${year} is present but UNVERIFIED. Do not produce ` +
        `notices against unverified holiday data.`,
    );
  }
  return new Set(entry.dates);
}
