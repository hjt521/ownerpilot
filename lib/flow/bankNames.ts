/**
 * normalizeBankName — display normalization for the BANK row on the notice and
 * owner packet. This is presentation formatting of user-entered input, not legal
 * face-prose: it never touches the account number, the branch address, or any
 * statutory sentence. The raw value remains in flow state; only the rendered
 * value is normalized.
 *
 * Source: packet_test4_broker_compliance_review_2026-06-18.md (bank-name display)
 * Authority: broker_blanket_authorization_2026-06-15.md / CalDRE B9445457
 */

export const BANK_NAME_NORMALIZER_VERSION = 'v1';

/** Keys are lowercased + space-collapsed input; values are canonical display. */
export const BANK_NAME_MAP: Readonly<Record<string, string>> = {
  'chase': 'Chase Bank',
  'chase bank': 'Chase Bank',
  'jpmorgan chase': 'JPMorgan Chase Bank, N.A.',
  'jpmorgan chase bank': 'JPMorgan Chase Bank, N.A.',
  'bank of america': 'Bank of America',
  'bofa': 'Bank of America',
  'boa': 'Bank of America',
  'wells fargo': 'Wells Fargo Bank',
  'wells fargo bank': 'Wells Fargo Bank',
  'citi': 'Citibank',
  'citibank': 'Citibank',
  'us bank': 'U.S. Bank',
  'u.s. bank': 'U.S. Bank',
  'usbank': 'U.S. Bank',
  'capital one': 'Capital One',
  'pnc': 'PNC Bank',
  'pnc bank': 'PNC Bank',
  'td bank': 'TD Bank',
  'td': 'TD Bank',
};

/** Title-case a single token, leaving existing all-caps acronyms untouched. */
function titleCaseToken(tok: string): string {
  if (!tok) return tok;
  // Preserve acronyms already uppercase (2+ chars, all caps), e.g. "PNC", "TD".
  if (tok.length >= 2 && tok === tok.toUpperCase() && /[A-Z]/.test(tok)) return tok;
  // Keep tokens containing internal capitals as-is (e.g. "JPMorgan", "BancorpSouth").
  if (/[A-Z]/.test(tok.slice(1))) return tok;
  return tok.charAt(0).toUpperCase() + tok.slice(1).toLowerCase();
}

/**
 * Normalize a bank name for display.
 *  - Trims and collapses whitespace.
 *  - Maps known banks to canonical names (e.g. "chase" -> "Chase Bank").
 *  - Otherwise applies reasonable title case without mangling acronyms.
 */
export function normalizeBankName(raw: string | null | undefined): string {
  const cleaned = (raw ?? '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  const key = cleaned.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(BANK_NAME_MAP, key)) return BANK_NAME_MAP[key];
  return cleaned.split(' ').map(titleCaseToken).join(' ');
}
