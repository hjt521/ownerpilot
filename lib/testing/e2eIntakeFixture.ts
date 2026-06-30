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
// required; landlord_phone is not required. The 10th turn (courtesy_reminder_first) flips intake_complete.
export const E2E_INTAKE_STEPS: IntakeStep[] = [
  { answer: '5537 La Mirada Ave, Unit 202, Los Angeles, CA 90038', field: 'property_address', value: '5537 La Mirada Ave, Unit 202, Los Angeles, CA 90038' },
  { answer: 'Clifton Alexander', field: 'tenant_names', value: ['Clifton Alexander'] },
  { answer: 'PTAG L LLC', field: 'landlord_or_owner_name', value: 'PTAG L LLC' },
  { answer: '123 Main St, Los Angeles, CA 90012', field: 'landlord_mailing_address', value: '123 Main St, Los Angeles, CA 90012' },
  { answer: 'May 2026', field: 'rent_period', value: 'May 2026' },
  { answer: '6000', field: 'rent_amount_due', value: 6000 },
  { answer: 'in_person', field: 'payment_methods_accepted', value: ['in_person'] },
  { answer: 'personal', field: 'preferred_service_method', value: 'personal' },
  { answer: 'English', field: 'language_preference', value: 'en' },
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
