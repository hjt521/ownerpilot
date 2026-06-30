// lib/riskpath/paths.ts
// AI-first /chat rebuild — Resolve & Document path catalog + field specs.
// Authoritative source: resolve_and_document_layer_broker_ruling_2026-06-28.md §3 (catalog) + §6 (field specs, LOCKED).
// Engineering shape (broker: "whatever shape engineering picks"). NO unmarked fields; NO free-form "additional terms".

import type { RiskPathStatus } from './transitions';
import type { CounselRouteTrigger } from './triggers';

// Lane4 Fork 3 (RULED 2026-06-29): Phase 1 ships 6 paths, NOT 7. The master-summary's
// "Payment Plan default / breach record" path is DEFERRED — not in v1. If a future broker ruling
// adds it, it attaches here as 'payment_plan_breach' with its own §6-style field spec + a
// payment-plan-default enum + transition rules (all broker-authored). DO NOT add it speculatively.
export type DocumentPathId =
  | 'payment_received'
  | 'post_deadline_payment'
  | 'payment_plan'
  | 'move_out_agreement'
  | 'surrender_record'
  | 'ud_settlement_intake';

export interface DocumentPath {
  id: DocumentPathId;
  pdfTitle: string;
  uiLabel: string;
  signer: 'owner_record' | 'tenant_signed';
  required: string[];
  optional: string[];
  prohibited: string[];
  /** RiskPath status this path drives toward (informational; transitions enforced in transitions.ts). */
  resolvesTo: RiskPathStatus | null;
  /** A §4 trigger that this path can raise mid-flow (or null). */
  inlineTrigger?: CounselRouteTrigger;
}

const NOTE_NEUTRAL_BACKGROUND = 'neutral background note ("a 3-Day Notice was served on [date]")';

export const DOCUMENT_PATHS: Record<DocumentPathId, DocumentPath> = {
  payment_received: {
    id: 'payment_received',
    pdfTitle: 'Payment Received & Notice Closure Record',
    uiLabel: 'Payment Received',
    signer: 'owner_record',
    required: [
      'landlord_name', 'tenant_names', 'property_address', 'notice_date', 'service_date',
      'amount_demanded', 'amount_paid', 'date_received', 'time_received', 'payment_method',
      'tenant_remains_in_possession_confirmation', 'notice_status_closed',
      'owner_acknowledgment_line', 'timestamp_footer',
    ],
    optional: ['receipt_proof_upload'],
    prohibited: ['release_language', 'waiver_language'],
    resolvesTo: 'payment_received',
  },

  post_deadline_payment: {
    id: 'post_deadline_payment',
    pdfTitle: 'Post-Deadline Payment Acceptance & Notice Closure Record',
    uiLabel: 'Post-Deadline Payment Acceptance',
    signer: 'owner_record',
    required: [
      'landlord_name', 'tenant_names', 'property_address', 'notice_date', 'service_date',
      'amount_demanded', 'amount_paid', 'date_received', 'time_received', 'payment_method',
      'tenant_remains_in_possession_confirmation', 'notice_status_closed',
      'owner_acknowledgment_line', 'timestamp_footer',
      'accepted_after_deadline_statement', // "payment was accepted after the notice deadline of [date]"
    ],
    optional: ['receipt_proof_upload'],
    prohibited: ['release_language', 'waiver_language'],
    resolvesTo: 'post_deadline_payment_accepted',
    inlineTrigger: 'full_payment_post_deadline_continue_evict', // §6.2: "preserve eviction option" -> counsel-route
  },

  payment_plan: {
    id: 'payment_plan',
    pdfTitle: 'Post-Notice Payment Plan Agreement',
    uiLabel: 'Payment Plan',
    signer: 'tenant_signed',
    required: [
      'parties', 'property', NOTE_NEUTRAL_BACKGROUND, 'amount_paid_so_far', 'remaining_balance',
      'payment_schedule', 'payment_method', 'tenant_remains_in_possession_confirmation',
      'what_happens_if_payment_missed_neutral', 'signature_lines',
    ],
    optional: ['receipt_upload'],
    // §11 Path A: reservation-of-rights toggle is ABSENT (not hidden, not feature-flagged). See RESERVATION_OF_RIGHTS_SLOT.
    prohibited: ['release', 'waiver', 'confidentiality', 'attorney_fees', 'no_admission', 'reservation_of_rights_clause'],
    resolvesTo: 'payment_plan_active',
    inlineTrigger: 'partial_payment_continue_evict',
  },

  move_out_agreement: {
    id: 'move_out_agreement',
    pdfTitle: 'Move-Out Agreement / Mutual Agreement to Vacate and Surrender Possession',
    uiLabel: 'Move-Out Agreement',
    signer: 'tenant_signed',
    required: [
      'parties', 'property', NOTE_NEUTRAL_BACKGROUND, 'move_out_date', 'move_out_time',
      'key_return_method', 'possession_surrender_confirmation',
      'security_deposit_reservation_note', // neutral: "security deposit handling will follow CA Civil Code § 1950.5"
      'no_self_help_no_lockout_reminder', 'signature_lines_landlord_tenant', 'date_lines',
    ],
    optional: [
      'neutral_payment_terms', 'personal_property_note', 'forwarding_address', 'mutual_lease_termination_branch',
    ],
    prohibited: [
      'credits_or_waivers_of_past_due_rent', 'release_of_claims', 'confidentiality', 'attorney_fees',
      'no_admission', 'judgment_language', 'dismissal_language', 'court_filing_terms',
    ],
    resolvesTo: 'move_out_agreement_drafted',
    inlineTrigger: 'prohibited_agreement_terms',
  },

  surrender_record: {
    id: 'surrender_record',
    pdfTitle: 'Surrender of Possession & Key Return Record',
    uiLabel: 'Surrender Record',
    signer: 'owner_record',
    required: [
      'tenant_vacated_date', 'possession_confirmed_date', 'method_of_confirmation',
      'keys_returned_yn', 'key_return_details_if_yes', 'owner_acknowledgment', 'timestamp_footer',
    ],
    optional: [
      'photos_uploaded', 'personal_property_note', 'forwarding_address',
      'security_deposit_followup_flag', 'tenant_signature_if_present',
    ],
    prohibited: ['anything_beyond_recordkeeping'],
    resolvesTo: 'surrender_record_saved',
  },

  ud_settlement_intake: {
    id: 'ud_settlement_intake',
    pdfTitle: 'Intake for Counsel — Not a Settlement Agreement',
    uiLabel: 'UD Settlement Intake',
    signer: 'owner_record',
    required: [
      'ud_case_filed_confirmation', 'court_case_number_if_known', 'desired_terms_owner_notes_only',
      'payment_terms_summary', 'move_out_date_if_any', 'consult_counsel_acknowledgment',
    ],
    optional: [],
    prohibited: [
      'draft_settlement_agreement', 'stipulation', 'dismissal', 'court_form_document', 'any_pdf_beyond_intake_summary',
    ],
    resolvesTo: 'counsel_recommended',
  },
};

/** §3 branch: Mutual Lease Termination toggle inside Move-Out Agreement (NOT a separate path). */
export const MUTUAL_LEASE_TERMINATION_BRANCH = {
  parentPath: 'move_out_agreement' as DocumentPathId,
  toggleLabel: 'This agreement also ends the lease entirely.',
  pdfTitleWhenOn: 'Move-Out Agreement / Mutual Lease Termination & Surrender',
  addsClauses: ['lease_end_date', 'mutual_release_from_future_rent'], // 2 clauses per §3
  resolvesTo: 'mutual_termination_drafted' as RiskPathStatus,
};

/** §3 banned PDF title — never use pre-UD-filing ("Stipulation" reads as court terminology). */
export const BANNED_DOCUMENT_TITLE = 'Stipulated Agreement to Vacate';

/**
 * §11 §0 FORK — reservation-of-rights clause. Path A default: NO toggle, NO language.
 * Per ruling §11, engineering must NOT author/stub the clause or leave a flippable flag.
 * This slot holds NO language and is inert until a broker ruling supplies attorney-drafted text.
 */
export const RESERVATION_OF_RIGHTS_SLOT = {
  present: false as const,
  clauseText: null as null, // [BROKER ATTORNEY DRAFTING REQUIRED] — do not author
  note: '[BROKER ATTORNEY DRAFTING REQUIRED] — Path A default (ruling §11): not present in UI/schema/enum set.',
};
