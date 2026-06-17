/**
 * contactValidation — shared § 1161(2) payee-field heuristics (phone format,
 * P.O.-box detection). Relocated from validatePaymentBranch.ts (C7a slice 4a)
 * so the single-select validator can be retired without losing these utilities,
 * which the advancement step and the future C1 P.O.-box gate depend on.
 */

/** US phone: 10 digits, or 11 with a leading country code '1'. Formatting ignored. */
export function isUsPhone(raw: string | undefined): boolean {
  if (raw === undefined) return false;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return true;
  if (digits.length === 11 && digits.startsWith('1')) return true;
  return false;
}

/** Heuristic P.O.-box detector (C1): best-effort, not authoritative. */
export function looksLikePoBox(raw: string | undefined): boolean {
  if (raw === undefined) return false;
  // Matches "PO Box", "P.O. Box", "P O Box", "Post Office Box", "POB 123".
  return /\b(p\.?\s*o\.?\s*box|post\s+office\s+box|\bpob)\b/i.test(raw);
}
