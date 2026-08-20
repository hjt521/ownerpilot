// lib/testing/e2eIntakeFixture.ts
// E3/E4 shared fixture — the deterministic intake walk for the chat-to-produce E2E. Single source of truth so
// the Perplexity mock (E3), the seed endpoint's complete-session builder (E4), and the Playwright spec never
// drift. PREVIEW/test only; no production code path imports this at runtime except behind the E2E gate.

import type { IntakeField, IntakeState } from '../chat/intakeSchema';

export interface IntakeStep {
  answer: string; // exactly what the owner types in the spec
  field: IntakeField; // the field that answer fills
  value: unknown; // the coerced value the mock emits
  last?: boolean; // the turn after which intake is complete
}

// Ordered to fill all REQUIRED_FIELDS (intakeSchema) by the final turn: in_person payment → no payee fields
// required; landlord_phone and the Lane 2E produce-face fields are explicit. Because the service method is
// personal, personal_delivery is also explicit. The final courtesy_reminder_first turn flips intake_complete.
export const E2E_INTAKE_STEPS: IntakeStep[] = [
  { answer: '5537 La Mirada Ave, Unit 202, Los Angeles, CA 90038', field: 'property_address', value: '5537 La Mirada Ave, Unit 202, Los Angeles, CA 90038' },
  { answer: 'Clifton Alexander', field: 'tenant_names', value: ['Clifton Alexander'] },
  { answer: 'PTAG L LLC', field: 'landlord_or_owner_name', value: 'PTAG L LLC' },
  { answer: '(213) 555-0100', field: 'landlord_phone', value: '(213) 555-0100' },
  { answer: '123 Main St, Los Angeles, CA 90012', field: 'landlord_mailing_address', value: '123 Main St, Los Angeles, CA 90012' },
  { answer: 'May 2026', field: 'rent_period', value: 'May 2026' },
  { answer: '6000', field: 'rent_amount_due', value: 6000 },
  { answer: 'May 1 through May 31, 2026: $6,000', field: 'rent_periods', value: [{ periodStartDate: '2026-05-01', periodEndDate: '2026-05-31', amount: 6000 }] },
  { answer: 'in_person', field: 'payment_methods_accepted', value: ['in_person'] },
  { answer: 'personal', field: 'preferred_service_method', value: 'personal' },
  { answer: 'Monday through Friday, 9:00 AM to 5:00 PM', field: 'personal_delivery', value: { days: 'Monday through Friday', hours: '9:00 AM to 5:00 PM' } },
  { answer: 'English', field: 'language_preference', value: 'en' },
  { answer: 'E2E Manager for PTAG L LLC', field: 'signer_capacity', value: { capacity: 'officer_member_trustee', landlordIdentity: { type: 'entity', entityLegalName: 'PTAG L LLC', entityType: 'llc', managementType: 'manager-managed' }, signerName: 'E2E Manager', signerTitle: 'Manager' } },
  { answer: 'no disputes', field: 'preflight_dispute', value: { tenantFiledComplaint: 'no', tenantWrittenWithholding: 'no', tenantBankruptcy: 'no' } },
  { answer: 'yes', field: 'courtesy_reminder_first', value: true, last: true },
];

/** Ordered owner answers — imported by the Playwright spec so it stays in lockstep with the mock. */
export const E2E_INTAKE_ANSWERS: string[] = E2E_INTAKE_STEPS.map((s) => s.answer);

/** A fully-populated intake_state for a seeded complete session (E4). */
export function completeIntakeState(now: string = new Date().toISOString()): IntakeState {
  const state: Record<string, { value: unknown; confidence: number; updated_at: string }> = {};
  for (const step of E2E_INTAKE_STEPS) {
    state[step.field] = { value: step.value, confidence: 1, updated_at: now };
  }
  return state as IntakeState;
}
