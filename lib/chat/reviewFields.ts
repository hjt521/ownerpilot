// lib/chat/reviewFields.ts
// AI-first /chat/review — pure display + edit-validation layer over intake_state.
// G8 anti-echo: payee_account_number is MASKED for display ("ending in 4490"), never shown in full on review.

import { intakeFieldValueSchema, type IntakeField, type IntakeState } from './intakeSchema';

export interface ReviewField { field: IntakeField; label: string; display: string; sensitive: boolean; }
export interface ReviewGroup { heading: string; fields: ReviewField[]; }

const LABELS: Record<IntakeField, string> = {
  property_address: 'Property address', tenant_names: 'Tenant(s)', landlord_or_owner_name: 'Landlord / owner',
  landlord_phone: 'Landlord phone', landlord_mailing_address: 'Landlord mailing address',
  rent_period: 'Rent period', rent_amount_due: 'Amount due', payment_methods_accepted: 'Payment methods',
  payee_bank_name: 'Bank name', payee_bank_address: 'Bank address', payee_account_number: 'Account number',
  preferred_service_method: 'Service method', language_preference: 'Language', courtesy_reminder_first: 'Courtesy reminder first',
  // Lane 2E produce-completeness fields (labels keep the LABELS map exhaustive over IntakeField).
  rent_periods: 'Rent periods', signer_capacity: 'Signer', personal_delivery: 'Personal-delivery days/hours',
  preflight_dispute: 'Dispute check',
};

const GROUPS: { heading: string; fields: IntakeField[] }[] = [
  { heading: 'Property & tenant', fields: ['property_address', 'tenant_names'] },
  { heading: 'Rent owed', fields: ['rent_period', 'rent_amount_due'] },
  { heading: 'Landlord & payment', fields: ['landlord_or_owner_name', 'landlord_phone', 'landlord_mailing_address', 'payment_methods_accepted', 'payee_bank_name', 'payee_bank_address', 'payee_account_number'] },
  { heading: 'Service & preferences', fields: ['preferred_service_method', 'language_preference', 'courtesy_reminder_first'] },
];

/** Mask an account number to its last 4 (G8). "" if empty. */
export function maskAccountNumber(v: unknown): string {
  const s = String(v ?? '').replace(/\s/g, '');
  if (!s) return '';
  return s.length <= 4 ? `ending in ${s}` : `ending in ${s.slice(-4)}`;
}

function displayValue(field: IntakeField, value: unknown): string {
  if (value === undefined || value === null || value === '') return '—';
  if (field === 'payee_account_number') return maskAccountNumber(value);
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

/** Group the intake_state into display sections (empty fields shown as "—"). Account number masked. */
export function groupIntakeForReview(state: IntakeState): ReviewGroup[] {
  return GROUPS.map((g) => ({
    heading: g.heading,
    fields: g.fields.map((field) => ({
      field, label: LABELS[field],
      display: displayValue(field, state[field]?.value),
      sensitive: field === 'payee_account_number',
    })),
  }));
}

/** Coerce a form-string edit to the field's expected type before validation. */
function coerce(field: IntakeField, raw: string): unknown {
  switch (field) {
    case 'rent_amount_due': return Number(raw);
    case 'tenant_names': return raw.split(',').map((s) => s.trim()).filter(Boolean);
    case 'payment_methods_accepted': return raw.split(',').map((s) => s.trim()).filter(Boolean);
    case 'courtesy_reminder_first': return raw === 'true' || raw === 'yes';
    default: return raw;
  }
}

export interface EditResult { ok: boolean; value?: unknown; error?: string; }

/** Validate (and coerce) a single inline edit against the locked intake field schema. */
export function validateFieldEdit(field: IntakeField, raw: string): EditResult {
  const value = coerce(field, raw);
  const parsed = intakeFieldValueSchema.safeParse({ [field]: value });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid value' };
  return { ok: true, value };
}
