// lib/chat/intakeMerge.ts
// AI-first /chat rebuild — server-side merge (§E.3) + independent completion gate (§E.4).

import {
  IntakeState, IntakeField, ExtractedField, REQUIRED_FIELDS,
} from './intakeSchema';

/** §E.3 — merge extracted_fields into intake_state; only overwrite if new confidence >= existing. */
export function mergeIntake(state: IntakeState, extracted: ExtractedField[]): IntakeState {
  const next: IntakeState = { ...state };
  const now = new Date().toISOString();
  for (const ef of extracted) {
    const incoming = ef.confidence ?? 0;
    const existing = next[ef.field]?.confidence ?? -1;        // unset = -1 so any first value lands
    if (incoming >= existing) {
      next[ef.field] = { value: ef.value, confidence: incoming, updated_at: now };
    }
  }
  return next;
}

/** §E.4 — independent completeness check; returns the list of still-missing required fields. */
export function missingRequiredFields(state: IntakeState): IntakeField[] {
  const isEmpty = (v: unknown) =>
    v === undefined || v === null ||
    (typeof v === 'string' && v.trim() === '') ||
    (Array.isArray(v) && v.length === 0);

  const missing = REQUIRED_FIELDS.filter((f) => isEmpty(state[f]?.value));

  // Conditional EFT requirement: bank fields required only when EFT is an accepted method.
  const methods = state['payment_methods_accepted']?.value as string[] | undefined;
  if (Array.isArray(methods) && methods.includes('eft')) {
    for (const f of ['payee_bank_name', 'payee_account_number'] as IntakeField[]) {
      if (isEmpty(state[f]?.value)) missing.push(f);
    }
  }

  // Lane 2E conditional: personal-delivery days/hours required only when the service method is personal
  // (personal delivery is where those hours print on the face). Ruling 2026-07-01 §4.
  const serviceMethod = state['preferred_service_method']?.value;
  if (serviceMethod === 'personal' && isEmpty(state['personal_delivery']?.value)) {
    missing.push('personal_delivery');
  }
  return missing;
}

/** True only when the model claims complete AND the server independently agrees (§E.4). */
export function intakeIsComplete(state: IntakeState, modelClaim: boolean): boolean {
  return modelClaim && missingRequiredFields(state).length === 0;
}
