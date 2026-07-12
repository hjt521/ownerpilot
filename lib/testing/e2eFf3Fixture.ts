// lib/testing/e2eFf3Fixture.ts
// FF-3 E2E shared fixture (Gate-2 Playwright build; ruling §4 Gate 2). Single source of truth for the FF-3
// capture walk so the seed endpoint (seed-ff3-session) and the spec (ff3-capture.spec.ts) never drift.
// PREVIEW/test only — no production runtime path imports this.
//
// The FF-3 scripted category is deterministic (no LLM): once a session has every non-scripted required field AND
// the base scripted categories captured, the next owner turn opens FF-3 (flag on) and the server parses each
// answer directly. So a session seeded "FF-3-ready" (base complete, ff3_capture_status null) drives the whole
// FF-3 flow through /api/chat with no model dependency.

import type { IntakeState } from '../chat/intakeSchema';

/** A base-complete intake_state: every non-scripted required field + all four base scripted categories captured,
 *  so with the flag on nextScriptedCategory returns 'ff3_intake' on the next turn. rent_periods sum to $6,000 so a
 *  later notice amount of $6,000 reconciles to MATCH once the reconciliation gate is wired (post-042). */
export function ff3ReadyIntakeState(now: string = new Date().toISOString()): IntakeState {
  const f = (value: unknown) => ({ value, confidence: 1, updated_at: now });
  return {
    property_address: f('5537 La Mirada Ave, Unit 202, Los Angeles, CA 90038'),
    tenant_names: f(['Clifton Alexander']),
    landlord_or_owner_name: f('PTAG L LLC'),
    landlord_mailing_address: f('123 Main St, Los Angeles, CA 90012'),
    rent_period: f('monthly'),
    rent_amount_due: f(6000),
    payment_methods_accepted: f(['in_person']),
    preferred_service_method: f('personal'),
    language_preference: f('en'),
    // Base scripted categories — present so FF-3 is the only remaining scripted category.
    signer_capacity: f({ capacity: 'owner', landlordIdentity: { type: 'entity', entityLegalName: 'PTAG L LLC', entityType: 'llc' }, signerName: 'PTAG L LLC', signerTitle: 'Manager' }),
    rent_periods: f([
      { periodStartDate: '2026-05-01', periodEndDate: '2026-05-31', amount: 3000 },
      { periodStartDate: '2026-06-01', periodEndDate: '2026-06-30', amount: 3000 },
    ]),
    personal_delivery: f({ days: 'Mon-Fri', hours: '9:00 AM to 5:00 PM' }),
    preflight_dispute: f({ tenantFiledComplaint: 'no', tenantWrittenWithholding: 'no', tenantBankruptcy: 'no' }),
  } as IntakeState;
}

/** Happy path — 3-day pay-or-quit (captures amount_owed = $6,000, matching the seeded ledger). */
export const FF3_HAPPY_PATH_ANSWERS = [
  '3-day pay or quit',    // notice_type
  'non-payment of rent',  // just_cause
  '2',                    // bedrooms
  '$3,000',               // contract_monthly_rent
  '$6,000',               // amount_of_rent_owed (conditional branch fires: pay-or-quit)
  'yes, that is correct', // confirm → complete
] as const;

/** Reconciliation-mismatch path — 3-day pay-or-quit, but the typed amount ($6,300) DIVERGES from the seeded
 *  rent-ledger total ($6,000), so the produce-time reconciliation gate fires (Block C / Gate-4 evidence path). */
export const FF3_RECONCILE_MISMATCH_ANSWERS = [
  '3-day pay or quit',    // notice_type
  'non-payment of rent',  // just_cause
  '2',                    // bedrooms
  '$3,000',               // contract_monthly_rent
  '$6,300',               // amount_of_rent_owed — $300 over the $6,000 ledger → mismatch at produce
  'yes, that is correct', // confirm → complete → /chat/review
] as const;

/** Non-fault path — 60-day termination; amount_owed is SKIPPED (conditional branch does NOT fire). */
export const FF3_NONFAULT_ANSWERS = [
  '60-day termination',   // notice_type
  'owner move-in',        // just_cause
  'studio',               // bedrooms = 0
  '$2,400',               // contract_monthly_rent → straight to confirm (no amount question)
  'looks right',          // confirm → complete
] as const;

/** Escalation off-ramp — three unparseable notice-type answers trip the rule of three → broker review. */
export const FF3_ESCALATION_ANSWERS = [
  'purple monkey dishwasher',
  'total nonsense here',
  'still not an answer',
] as const;

/** The first owner message that opens FF-3 (content is arbitrary; the server overrides the reply with the
 *  verbatim notice-type first-ask). */
export const FF3_OPENER = 'ready when you are';
