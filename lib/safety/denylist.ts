// lib/safety/denylist.ts
// Canonical PII denylist (generalized per lane7 A15 ruling §7 item 4). Two surfaces:
//   - enforceDenylist(params): KEY-shape check (+ email-shaped values) — used by Lane 6 analytics (re-exported there).
//   - scanFreeText(text): CONTENT-pattern scan for free-text fields (Notion mirror summary/notes) — Lane 7.
// Lane 6's lib/analytics/denylist.ts re-exports enforceDenylist from here so there is ONE denied-key list.

const DENIED_KEYS = new Set([
  'address', 'address_raw', 'address_normalized',
  'tenant_name', 'landlord_name',
  'email', 'requester_contact',
  'phone',
  'payee_account_number',
  'magic_link_token', 'requester_token',
  'free_text', 'field_value',
  'ip', 'ip_address',
  'user_agent_full',
]);

const EMAIL_RE = /@[a-z0-9.-]+\.[a-z]{2,}/i;

/** KEY-based denylist (Lane 6 analytics event params). Throws on a denied key or email-shaped value. */
export function enforceDenylist(params: Record<string, unknown>): void {
  for (const key of Object.keys(params)) {
    if (DENIED_KEYS.has(key)) {
      throw new Error(`Analytics denylist violation: param "${key}" is not allowed`);
    }
    const v = params[key];
    if (typeof v === 'string' && EMAIL_RE.test(v)) {
      throw new Error(`Analytics denylist violation: param "${key}" appears to contain an email`);
    }
  }
}

/** Free-text PII patterns for content scanning (Notion mirror summary/notes). High-signal shapes only;
 *  false positives are triaged by the broker per the A15 ruling §4.3 (block → notify → exempt or fix). */
const FREE_TEXT_PII: Array<{ name: string; re: RegExp }> = [
  { name: 'email',          re: EMAIL_RE },
  { name: 'phone',          re: /\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/ },
  { name: 'ssn',            re: /\b\d{3}-\d{2}-\d{4}\b/ },
  { name: 'long_digit_run', re: /\b\d{9,}\b/ }, // account-number-like (>=9 consecutive digits)
];

/** Scan free text for PII-shaped content. Returns the names of matched patterns (empty = clean). */
export function scanFreeText(text: string): string[] {
  const hits: string[] = [];
  for (const { name, re } of FREE_TEXT_PII) {
    if (re.test(text)) hits.push(name);
  }
  return hits;
}
