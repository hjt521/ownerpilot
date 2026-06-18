/**
 * Tenant-name sanitation + light validation for Step 2 (Property & Tenant).
 * Goal: catch obvious test data, leading punctuation, and keyboard-mash input
 * WITHOUT over-policing real names (hyphens, apostrophes, periods, initials,
 * and spaces are all allowed). Sanitation is display-safe; it never blocks a
 * legitimate legal name. Warning copy below is calm, plain-language UI copy.
 *
 * Source: packet_test4_broker_compliance_review_2026-06-18.md (tenant-name hygiene)
 */

export const TENANT_NAME_COPY_VERSION = 'v1';

export const TENANT_NAME_WARN_GENERIC =
  "Please enter the tenant's full legal name as it appears on the lease.";
export const TENANT_NAME_WARN_SUSPICIOUS =
  'This tenant name looks incomplete or mistyped. Please review before producing the notice.';
export const TENANT_NAME_WARN_PUNCTUATION =
  'Tenant names should not begin with punctuation. Please review this name.';

export type TenantNameLevel = 'ok' | 'warn' | 'block';

export interface TenantNameResult {
  /** Cleaned value safe to store/render. */
  value: string;
  level: TenantNameLevel;
  /** Whether production should be blocked (only truly empty values block). */
  blocking: boolean;
  /** Calm message for warn/block; empty when ok. */
  message: string;
}

/** Trim, strip accidental leading/trailing commas, collapse duplicate spaces. */
export function sanitizeTenantName(raw: string | null | undefined): string {
  return (raw ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[,\s]+|[,\s]+$/g, '')
    .trim();
}

// Obvious placeholder / test tokens (exact, case-insensitive).
const PLACEHOLDER_WORDS = new Set([
  'test', 'tester', 'testing', 'tenant', 'tenants', 'name', 'asdf', 'asdfgh',
  'asdfasdf', 'qwerty', 'qwer', 'xxx', 'xxxx', 'none', 'na', 'n/a', 'tbd',
  'placeholder', 'sample', 'example', 'foo', 'bar', 'baz', 'abc', 'aaa',
]);

function looksLikeKeyboardMash(value: string): boolean {
  const lower = value.toLowerCase();
  if (PLACEHOLDER_WORDS.has(lower)) return true;
  // A run of 3+ identical letters (e.g. "xxxx", "aaaa").
  if (/([a-z])\1{2,}/i.test(value)) return true;
  // Any alphabetic token of length >= 4 with no vowel (e.g. "kjhlk", "knkl").
  const tokens = lower.split(' ').filter(Boolean);
  const noVowelMash = tokens.some(
    (t) => /^[a-z]+$/.test(t) && t.length >= 4 && !/[aeiouy]/.test(t),
  );
  if (noVowelMash) return true;
  return false;
}

/** Validate a single tenant name; returns the cleaned value + a calm signal. */
export function validateTenantName(raw: string | null | undefined): TenantNameResult {
  const original = (raw ?? '').trim();
  const value = sanitizeTenantName(original);

  if (!value) {
    return { value, level: 'block', blocking: true, message: TENANT_NAME_WARN_GENERIC };
  }
  // Leading punctuation on the original entry (after trim, before comma-strip).
  if (/^[^\p{L}\p{N}]/u.test(original)) {
    return { value, level: 'warn', blocking: false, message: TENANT_NAME_WARN_PUNCTUATION };
  }
  // Symbols-only / no letters at all.
  if (!/\p{L}/u.test(value)) {
    return { value, level: 'warn', blocking: false, message: TENANT_NAME_WARN_SUSPICIOUS };
  }
  // Too short to be a real name.
  if (value.replace(/[^\p{L}]/gu, '').length < 2) {
    return { value, level: 'warn', blocking: false, message: TENANT_NAME_WARN_SUSPICIOUS };
  }
  if (looksLikeKeyboardMash(value)) {
    return { value, level: 'warn', blocking: false, message: TENANT_NAME_WARN_SUSPICIOUS };
  }
  return { value, level: 'ok', blocking: false, message: '' };
}

/** Sanitize a list of tenant names, dropping empties; returns cleaned names. */
export function sanitizeTenantNames(raw: Array<string | null | undefined>): string[] {
  return (raw ?? []).map(sanitizeTenantName).filter(Boolean);
}

/** Validate a list; blocking is true if any entry is empty/blocking. */
export function validateTenantNames(raw: Array<string | null | undefined>): {
  results: TenantNameResult[];
  cleaned: string[];
  blocking: boolean;
} {
  const results = (raw ?? []).map(validateTenantName);
  const cleaned = results.map((r) => r.value).filter(Boolean);
  const blocking = cleaned.length === 0 || results.some((r) => r.blocking);
  return { results, cleaned, blocking };
}
