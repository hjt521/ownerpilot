// Phase C UD-100 domain contracts only.
// No persistence, runtime workflow wiring, filing, document generation, or external effects.

export const UD100_PLAINTIFF_TYPES = ['natural_person', 'corporation', 'llc'] as const;
export type Ud100PlaintiffType = (typeof UD100_PLAINTIFF_TYPES)[number];
export type Ud100PlaintiffTrack = 'natural_person' | 'entity';

export const UD100_CONTROL_STAGES = [
  'Decision Intelligence',
  'Decision Confirmation',
  'Ministerial Filing Engine',
  'Customer Review and Signature',
  'Customer-Controlled Filing',
  'Post-Filing Classification',
] as const;
export type Ud100ControlStage = (typeof UD100_CONTROL_STAGES)[number];

export const UD100_NATURAL_PERSON_STATES = [
  'ud100_not_started',
  'party_identity_pending',
  'party_track_determined',
  'service_authority_gate_pending',
  'facts_pending',
  'document_selection_pending',
  'preparation_eligible',
  'draft_generated',
  'factual_review_pending',
  'owner_confirmation_pending',
  'owner_signature_pending',
  'packet_ready_for_owner_decision',
] as const;

export const UD100_ENTITY_STATES = [
  'ud100_not_started',
  'party_identity_pending',
  'party_track_determined',
  'entity_identity_pending',
  'actor_identity_pending',
  'authority_basis_pending',
  'authority_evidence_pending',
  'authority_verification_pending',
  'representation_boundary_pending',
  'service_authority_gate_pending',
  'preparation_eligible',
  'draft_generated',
  'factual_review_pending',
  'entity_disclosure_pending',
  'signature_permission_pending',
  'submission_permission_pending',
  'packet_ready_for_permitted_next_action',
] as const;

export const UD100_FAIL_CLOSED_STATES = [
  'unsupported_or_uncertain',
  'legal_control_hold',
  'stale_source_hold',
  'external_counsel_consultation_recommended',
] as const;

export type Ud100NaturalPersonState = (typeof UD100_NATURAL_PERSON_STATES)[number];
export type Ud100EntityState = (typeof UD100_ENTITY_STATES)[number];
export type Ud100FailClosedState = (typeof UD100_FAIL_CLOSED_STATES)[number];
export type Ud100WorkflowState = Ud100NaturalPersonState | Ud100EntityState | Ud100FailClosedState;

export type Ud100EntityType = Extract<Ud100PlaintiffType, 'corporation' | 'llc'>;
export type Ud100EntitySignerCategory = 'managing_member' | 'manager' | 'officer' | 'other_authorized_person';
export type Ud100AuthorityVerificationStatus = 'pending' | 'verified' | 'held' | 'unresolved';
export type Ud100DocumentaryDiligenceStatus = 'not_required' | 'required' | 'satisfied' | 'held';

export interface Ud100EntityAuthority {
  readonly entityName: string | null;
  readonly entityType: Ud100EntityType;
  readonly signerIdentity: string | null;
  readonly signerTitleOrRelationship: string | null;
  readonly signerCategory: Ud100EntitySignerCategory | null;
  readonly authorityBasis: string | null;
  readonly signerAttested: boolean;
  readonly verificationStatus: Ud100AuthorityVerificationStatus;
  readonly documentaryDiligenceStatus: Ud100DocumentaryDiligenceStatus;
}

export interface Ud100DecisionToFileConfirmation {
  readonly decisionToFileConfirmed: boolean;
  readonly filingElectionsConfirmed: boolean;
  readonly decisionObjectVersion: string | null;
  readonly factSnapshotHash: string | null;
  readonly controlVersion: string | null;
}

export type Ud100MaterialControlHold =
  | 'none'
  | 'unsupported_or_uncertain'
  | 'legal_control_hold'
  | 'stale_source_hold';

export type Ud100ServiceGate =
  | Readonly<{
      mode: 'free_limited_beta';
      compensationPresent: boolean;
    }>
  | Readonly<{
      mode: 'compensated_phase_c';
      udaLdaComplianceSatisfied: boolean;
    }>;

/** The only authorized filing posture represented by this slice. */
export type Ud100FilingPosture = 'customer_controlled';
export type Ud100RequestedFilingPosture = Ud100FilingPosture | 'autonomous_direct';

/** Preparation, filing, and representation are independent facts. */
export interface Ud100MatterBoundarySnapshot {
  readonly preparation: 'not_prepared' | 'prepared';
  readonly filing: 'not_filed' | 'customer_reported_filed';
  readonly representation: 'none' | 'natural_person_self_represented' | 'external_licensed_counsel_reported';
}

export const UD100_AUDIT_EVENT_TYPES = [
  'plaintiff_type_confirmed',
  'entity_name_confirmed',
  'entity_status_checked',
  'signer_identity_confirmed',
  'signer_authority_attested',
  'authority_document_requested',
  'authority_document_received',
  'filing_decision_confirmed',
  'decision_to_file_confirmed',
  'ministerial_mode_entered',
  'filing_elections_confirmed',
  'packet_generated',
  'packet_reviewed',
  'verification_signed',
  'filing_authorized_by_customer',
  'packet_exported',
  'filing_submitted',
  'tenant_contest_detected',
  'entity_counsel_notice_displayed',
  'natural_person_pro_se_status',
  'form_version_recorded',
  'local_rule_version_recorded',
] as const;
export type Ud100AuditEventType = (typeof UD100_AUDIT_EVENT_TYPES)[number];

export interface Ud100AuditEventContract {
  readonly type: Ud100AuditEventType;
  readonly actor: string;
  readonly timestamp: string;
  readonly workflowId: string;
  readonly artifactVersion: string | null;
  readonly previousState: Ud100WorkflowState | null;
  readonly resultingState: Ud100WorkflowState | null;
  readonly evidenceReferences: readonly string[];
  readonly governingControlVersion: string;
}

export type Ud100MinisterialOperation =
  | 'populate_confirmed_fields'
  | 'validate_factual_completeness'
  | 'identify_missing_facts'
  | 'surface_factual_inconsistency'
  | 'organize_packet'
  | 'preview_packet'
  | 'export_packet';

export type Ud100RequestedOperation =
  | Ud100MinisterialOperation
  | 'recommend_file'
  | 'recommend_not_file'
  | 'select_form_claim_or_remedy'
  | 'select_stronger_legal_theory'
  | 'autonomous_submit'
  | 'sign_for_customer'
  | 'represent_in_court'
  | 'route_to_attorney';

export type Ud100RejectionReason =
  | 'customer_decision_not_confirmed'
  | 'filing_elections_not_confirmed'
  | 'plaintiff_type_unresolved'
  | 'entity_authority_attestation_required'
  | 'entity_authority_unresolved'
  | 'entity_authority_verification_held'
  | 'documentary_diligence_unresolved'
  | 'material_control_held'
  | 'free_beta_compensation_present'
  | 'paid_compliance_gate_unsatisfied'
  | 'prohibited_filing_engine_recommendation'
  | 'autonomous_filing_not_authorized'
  | 'ownerpilot_signature_not_authorized'
  | 'attorney_routing_not_authorized'
  | 'invalid_state_transition'
  | 'representation_boundary_violation';

export type Ud100ValidationResult =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; reason: Ud100RejectionReason }>;
