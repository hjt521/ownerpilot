/**
 * contactValidation — shared § 1161(2) payee-field heuristics (phone format,
 * P.O.-box detection). Relocated from validatePaymentBranch.ts (C7a slice 4a)
 * so the single-select validator can be retired without losing these utilities,
 * which the advancement step and the future C1 P.O.-box gate depend on.
 *
 * C1 bundle (2026-06-17): adds validatePayeeTrioAndDelivery — the § 1161(2)
 * payee-trio + multi-select P.O.-box gate extracted from validatePaymentBranch
 * (now retired). P.O.-box scope per
 * c1_pobox_scope_multiselect_broker_determination_2026-06-15.
 */
import type { NoticeFlowData } from '../flow/noticeFlowState';

/** US phone: 10 digits, or 11 with a leading country code '1'. Formatting ignored. */
export function isUsPhone(raw: string | undefined): boolean {
  if (raw === undefined) return false;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return true;
  if (digits.length === 11 && digits.startsWith('1')) return true;
  return false;
}

/**
 * Heuristic P.O.-box detector (C1). Anchored to the START of the address line
 * after a whitespace trim, per
 * c1_pobox_scope_multiselect_broker_determination_2026-06-15 §3: a P.O.-box form
 * at the start of the street-address field is flagged; the same tokens appearing
 * mid-string as part of a street name (e.g. "123 PO Box Street") are NOT flagged.
 * Best-effort, not authoritative.
 */
export function looksLikePoBox(raw: string | undefined): boolean {
  if (raw === undefined) return false;
  const s = raw.trim();
  // Start-anchored forms: PO Box / P.O. Box / P O Box / POB / P.O.B. /
  // Post Office Box / Postal Box / Private Mail Box / PMB.
  return /^(p\.?\s*o\.?\s*box|p\.?\s*o\.?\s*b\.?|post\s+office\s+box|postal\s+box|private\s+mail\s+box|pmb)\b/i.test(
    s,
  );
}

function isBlank(s: string | undefined): boolean {
  return s === undefined || s.trim() === '';
}

/**
 * validatePayeeTrioAndDelivery — the § 1161(2) payee-trio + multi-select P.O.-box
 * gate, extracted from validatePaymentBranch (C1 bundle, 2026-06-17). The trio
 * checks (override-name, telephone present + format, street address present) are
 * moved BYTE-IDENTICAL from the retired single-select validator. The P.O.-box
 * gate fires on any in-person leg, per
 * c1_pobox_scope_multiselect_broker_determination_2026-06-15 §1 — it is a property
 * of the in-person leg, not of the historical in_person_and_mail branch.
 *
 * Returns flat { code, message } issues. The produce gate (evaluateCanProduceV4)
 * folds these into payValid and surfaces them as paymentErrors for field-level UI.
 */
export function validatePayeeTrioAndDelivery(
  data: NoticeFlowData,
): { code: string; message: string }[] {
  const issues: { code: string; message: string }[] = [];
  const contact = data.landlordContact ?? {};

  // § 1161(2) payee trio. The payee NAME is derived from the Step-3 landlord
  // identity (Defect #2); the only name owned here is the non-landlord override.
  if (data.payeeIsNonLandlord === true && isBlank(data.payeeOverrideName)) {
    issues.push({
      code: 'PAYEE_OVERRIDE_NAME_REQUIRED',
      message: 'Enter the name of the payee who receives rent.',
    });
  }
  if (isBlank(contact.phone)) {
    issues.push({
      code: 'CONTACT_PHONE_REQUIRED',
      message:
        'A telephone number for the person to whom rent is paid is required ' +
        '(Cal. Code Civ. Proc. § 1161(2)).',
    });
  } else if (!isUsPhone(contact.phone)) {
    issues.push({
      code: 'CONTACT_PHONE_FORMAT',
      message: 'Enter a valid US telephone number (10 digits).',
    });
  }
  if (isBlank(contact.streetAddress)) {
    issues.push({
      code: 'CONTACT_ADDRESS_REQUIRED',
      message:
        'A street address for the person to whom rent is paid is required ' +
        '(Cal. Code Civ. Proc. § 1161(2)).',
    });
  }

  // C1 P.O.-box gate: fires on any in-person leg (determination §1). A P.O. box
  // cannot accept personal delivery. Message locked verbatim from the C1
  // determination §3.
  if (
    (data.paymentMethods ?? []).includes('in_person') &&
    looksLikePoBox(contact.streetAddress)
  ) {
    issues.push({
      code: 'PERSONAL_DELIVERY_POBOX',
      message:
        'A P.O. box cannot accept personal delivery. Enter a street address ' +
        'where payment can be delivered in person.',
    });
  }

  return issues;
}
