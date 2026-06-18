/**
 * formatUsPhone — human-facing display formatting for US phone numbers on the
 * notice, owner packet, and summary surfaces. Presentation only: the raw value
 * stays in flow state; this just formats for display. Non-standard input is
 * returned trimmed (never mangled) so the wizard can warn instead.
 *
 * Source: packet_test4_broker_compliance_review_2026-06-18.md (phone display)
 */

export const PHONE_FORMATTER_VERSION = 'v1';

/** True when the input is a standard 10-digit (or 1+10) US number. */
export function isStandardUsPhone(raw: string | null | undefined): boolean {
  const d = (raw ?? '').replace(/\D/g, '');
  return d.length === 10 || (d.length === 11 && d.startsWith('1'));
}

/**
 * Format a US phone number as "(NXX) NXX-XXXX".
 *  - "3232514490"   -> "(323) 251-4490"
 *  - "13232514490"  -> "(323) 251-4490" (leading country code 1 handled)
 *  - non-standard   -> trimmed original input (caller may warn)
 */
export function formatUsPhone(raw: string | null | undefined): string {
  const original = (raw ?? '').trim();
  let d = original.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
  if (d.length !== 10) return original;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}
