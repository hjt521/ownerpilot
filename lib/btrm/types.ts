// lib/btrm/types.ts
// BTRM-001 shared data model (spec §4). Every BTRM component (ENR/BAE/TM/CM/ICOA/RIE/OCM/CS/POL) imports these
// types rather than defining its own — one shape per concept, matching the ratified spec
// (constitution/enterprise/BTRM-001_behavioral_trust_and_resolution_model.md). Types only in this file; runtime
// validation (zod) lives alongside each component that constructs the value, per house convention
// (e.g. lib/riskpath/lahdFilingRecord.ts).
//
// NOTE ON POSTURE: nothing in this file is wired into any runtime path. Constructing these types has no effect
// on the application until a stage explicitly reads/writes them behind its own flag (lib/btrm/flag.ts).

import type { ExplainabilityEnvelope } from './envelope';

/** Provenance classes (spec §4 Provenance enum) — the strength of an evidentiary claim. Every derived event
 *  MUST carry one; ENR-001 defaults to the WEAKEST compatible class (BTRM-001 §12 self-critique #3). */
export type Provenance =
  | 'confirmed_fact'
  | 'document_supported'
  | 'unverified_statement'
  | 'disputed_statement'
  | 'ai_inference'
  | 'unknown';

/** Provenance strength ordering, weakest first — used by ENR-001's "default to weakest" rule and by CM-001's
 *  penalty for provenance uncertainty. Do not reorder without updating both call sites. */
export const PROVENANCE_STRENGTH: Record<Provenance, number> = {
  unknown: 0,
  ai_inference: 1,
  disputed_statement: 2,
  unverified_statement: 3,
  document_supported: 4,
  confirmed_fact: 5,
};

/** A caller-supplied hint that an EvidenceItem records a promise/deadline (spec §3.1 "commitment extraction").
 *  ENR-001 is deterministic pre-processing, not a learned model — it does not infer implied promises from free
 *  text (that would be inference, and would blur into BAE-001/AI-inference territory, spec §3.1 non-goals). It
 *  only materializes a Commitment when a caller has already identified one via this hint. */
export interface CommitmentHint {
  committer: string;
  description: string;
  promisedBy: string; // ISO 8601 — the deadline the commitment names
}

/** Raw evidence, as collected (spec §4 EvidenceItem). Original content is IMMUTABLE and never replaced by an
 *  AI-generated summary (BTRM-001 §3.1). */
export interface EvidenceItem {
  id: string;
  source: string;
  timestamp: string; // ISO 8601; may be null-flagged via timestampUncertain below rather than omitted
  timestampUncertain?: boolean;
  authorOrOrigin: string;
  evidenceType: string; // e.g. 'message' | 'email' | 'payment_record' | 'notice' | 'photo' | 'document' | ...
  originalContentRef: string; // pointer to the immutable stored original — never the mutated/derived value
  relatedProperty?: string;
  relatedMatter: string;
  verificationStatus: 'verified' | 'unverified' | 'disputed';
  extractionConfidence?: number; // 0..1, optional — how confident the extraction step is, distinct from CM-001
  accessPermissions: string[]; // owner-scoped ACL tags
  commitmentHint?: CommitmentHint; // see CommitmentHint above — ENR-001 never derives this itself
}

/** One entry in ENR-001's provenance ledger (spec §4 ProvenanceLedger, spec §5 ENR.normalize output). Records,
 *  for a single derived TimelineEvent or Commitment, which class it was assigned and why — the audit trail
 *  CM-001 (Stage 3, evidence sufficiency) and any human reviewer can walk back to source evidence. ENR-001 does
 *  NOT compute cross-item corroboration here (spec §4 ConfidenceAssessment.corroboration is CM-001's job); this
 *  ledger only explains the classification ENR-001 itself performed. */
export interface ProvenanceLedgerEntry {
  targetId: string; // a TimelineEvent.id or Commitment.id
  targetType: 'timeline_event' | 'commitment';
  provenance: Provenance;
  sourceItemIds: string[]; // EvidenceItem.id(s) this classification rests on (>1 only for exact-duplicate merges)
  rationale: string; // plain-language reason for the assigned class — never a bare enum with no explanation
}

export interface ProvenanceLedger {
  entries: ProvenanceLedgerEntry[];
}

/** A reconstructed point in the matter timeline (spec §4 TimelineEvent). */
export interface TimelineEvent {
  id: string;
  matterId: string;
  occurredAt: string; // ISO 8601
  occurredAtUncertain?: boolean;
  eventType: string;
  participants: string[];
  sourceItemIds: string[]; // links back to EvidenceItem.id — never orphaned
  provenance: Provenance;
  disputed: boolean;
  behavioralHint?: BehavioralHint; // see BehavioralHint below — BAE-001 never derives this itself
}

/** A tracked promise/deadline (spec §4 Commitment). A representation CREATES a commitment; it does not itself
 *  prove fulfillment (BTRM-001 §2 tier 4). */
export interface Commitment {
  id: string;
  matterId: string;
  committer: string;
  description: string;
  promisedBy: string; // ISO date/time the commitment names as its deadline
  createdFromEventId: string;
  status: 'open' | 'fulfilled' | 'partially_fulfilled' | 'fulfilled_late' | 'not_fulfilled' | 'modified';
  fulfilledEventId?: string;
}

/** The seven behavioral dimensions BAE-001 observes independently (spec §3.2). */
export type BehavioralDimension =
  | 'performance'
  | 'commitment'
  | 'communication'
  | 'documentation'
  | 'cooperation'
  | 'consistency'
  | 'resolution';

/** Closed behavioral event vocabulary (spec §3.2). Extensible only by a ratified amendment to BTRM-001 — do not
 *  add ad hoc values at a call site. */
export type BehavioralEventClass =
  | 'commitment_made'
  | 'commitment_modified'
  | 'commitment_fulfilled'
  | 'commitment_partially_fulfilled'
  | 'commitment_fulfilled_late'
  | 'commitment_not_fulfilled'
  | 'deadline_acknowledged'
  | 'deadline_missed'
  | 'delay_disclosed_proactively'
  | 'delay_disclosed_after_the_fact'
  | 'documentation_supplied'
  | 'documentation_requested_not_supplied'
  | 'communication_answered'
  | 'communication_ignored'
  | 'contradiction_made'
  | 'contradiction_voluntarily_corrected'
  | 'agreement_accepted'
  | 'agreement_rejected'
  | 'agreement_breached'
  | 'cooperation_increased'
  | 'cooperation_declined'
  | 'conflict_escalated'
  | 'conflict_deescalated'
  | 'required_action_completed'
  | 'required_action_incomplete';

/** A caller-supplied hint that a TimelineEvent represents a specific behavioral event (spec §3.2 closed
 *  vocabulary). BAE-001 derives 'commitment_*' and 'deadline_missed' observations itself, deterministically,
 *  from Commitment/TimelineEvent structure alone (spec fields already carry that signal). Everything else in
 *  the closed vocabulary (documentation supplied/requested, communication answered/ignored, contradiction
 *  made/corrected, agreement accepted/rejected/breached, cooperation increased/declined, conflict
 *  escalated/de-escalated, required action completed/incomplete, delay disclosed, deadline acknowledged)
 *  describes a semantic judgment about evidence content that ENR-001's structured output does not carry
 *  (TimelineEvent.eventType is a passthrough of evidenceType, not a classification of what happened) — BAE-001
 *  does not infer these from free text (that would be inference, not descriptive classification, spec §3.2).
 *  A caller (a future, separately-scoped classification step) supplies this hint once it has determined the
 *  event class; BAE-001's role stays limited to turning it into a properly-shaped, dimension-tagged
 *  BehavioralObservation. Dimension is always computed centrally from eventClass (see lib/btrm/bae/dimensions.ts)
 *  — never taken from the hint — so there is a single source of truth for the eventClass->dimension mapping. */
export interface BehavioralHint {
  eventClass: BehavioralEventClass;
  subjectId: string;
  magnitude?: number;
}

/** A single descriptive behavioral fact (spec §3.2). BAE-001's ONLY output type — never a character label. */
export interface BehavioralObservation {
  id: string;
  matterId: string;
  subjectId: string; // the party whose behavior is being described (symmetry: owner OR tenant OR vendor OR agent)
  dimension: BehavioralDimension;
  eventClass: BehavioralEventClass;
  sourceEventIds: string[]; // links to TimelineEvent.id
  provenance: Provenance;
  observedAt: string; // ISO 8601 — when BAE-001 recorded the observation, not when the underlying event occurred
  magnitude?: number; // optional scalar (e.g. days late) — descriptive only, never a judgment
}

/** Reliance levels (spec §3.3 / TM-001). 'indeterminate' is MANDATORY when evidence is insufficient — never
 *  silently default to a numeric-feeling level in that case. */
export type RelianceLevel = 'no_reliance' | 'limited' | 'conditional' | 'operational' | 'elevated' | 'indeterminate';

/** TM-001's independent reliance dimensions (spec §3.3). No dimension is combined into a single score. */
export interface RelianceDimensions {
  performance: RelianceLevel;
  commitment: RelianceLevel;
  communication: RelianceLevel;
  documentation: RelianceLevel;
  agreement: RelianceLevel;
  representationConsistency: RelianceLevel;
  resolutionParticipation: RelianceLevel;
}

/** A claim-specific reliance assessment (spec §4 RelianceAssessment). NEVER a permanent/global score — always
 *  scoped to claimRef + context, time-bounded via validUntil. */
export interface RelianceAssessment {
  id: string;
  matterId: string;
  subjectId: string;
  claimRef: string; // the specific claim/commitment/representation this assessment is about
  context: string; // decision context this assessment is valid for
  decisionUse: string;
  dimensions: RelianceDimensions;
  relianceLevel: RelianceLevel; // headline level for claimRef, still explained by dimensions — not a fused score
  supportingFactors: string[];
  limitingFactors: string[];
  validUntil: string; // ISO 8601 — reliance assessments expire
  confidenceRef: string; // links to a ConfidenceAssessment.id — trust and confidence are reported separately
  riskIfWrong: string;
  humanReviewRequired: boolean;
}

/** Confidence bands (spec §3.4 / CM-001) — sufficiency of the EVIDENCE, independent of the subject. */
export type ConfidenceBand = 'high' | 'moderate' | 'low' | 'insufficient';

export interface ConfidenceAssessment {
  id: string;
  targetRef: string; // the RelianceAssessment.id or other artifact this confidence measure is about
  completeness: number; // 0..1
  corroboration: number; // 0..1
  timelineCertainty: number; // 0..1
  contradictions: string[];
  missing: string[];
  band: ConfidenceBand;
}

/** Support labels for inferred interests/constraints (spec §3.5 / ICOA-001). Never asserted as fact. */
export type SupportLabel = 'confirmed' | 'likely' | 'possible' | 'unknown';

export interface InterestConstraint {
  id: string;
  matterId: string;
  partyId: string;
  kind: 'interest' | 'constraint';
  statement: string;
  supportLabel: SupportLabel;
  sourceEventIds: string[];
}

/** A caller-supplied candidate interest/constraint to evaluate (spec §3.5). ICOA-001 does not invent WHAT an
 *  interest or constraint is from free text — identifying the candidate statement (e.g. "tenant wants a payment
 *  plan") is a separately-scoped classification step, the same posture ENR-001's commitmentHint and BAE-001's
 *  behavioralHint already establish. ICOA-001's own job is strictly the SupportLabel a candidate deserves given
 *  the referenced evidence — never asserting the candidate as fact, never generating the candidate itself. */
export interface InterestConstraintHint {
  matterId: string;
  partyId: string;
  kind: 'interest' | 'constraint';
  statement: string;
  explicitlyStatedEventId?: string; // a TimelineEvent where the party is recorded directly stating this
  relatedEventIds?: string[]; // additional TimelineEvent.id references offered as supporting pattern evidence
  relatedCommitmentIds?: string[]; // additional Commitment.id references offered as supporting pattern evidence
}

/** A resolution option (spec §3.6 / RIE-001). Every option must carry an ExplainabilityEnvelope (see envelope.ts). */
export interface ResolutionOption {
  id: string;
  matterId: string;
  type: string; // e.g. 'payment_plan' | 'cure_agreement' | 'clarification_request' | ...
  purpose: string;
  requiredConditions: string[];
  expectedBenefit: string;
  materialRisks: string[];
  relianceAssumptions: string[]; // RelianceAssessment.id references this option depends on
  missingInformation: string[];
  reversibility: 'fully_reversible' | 'partially_reversible' | 'not_reversible';
  deadlineImplications?: string;
  documentationRequired: string[];
  recommendedCommunicationRef?: string; // links to a CS-001 recommendation
  materialConsequence: boolean; // true => humanReviewRequired MUST be true downstream (state-machine guard, §6)
  /** Stage 5 (RIE-001, `lib/btrm/rie/`): true whenever materialConsequence is true, or whenever the reliance/
   *  confidence records cited in support of this option are too weak or insufficient to act on without review.
   *  §6/§11's guard (lib/btrm/safeguards/guard.ts assertHumanReviewGated) enforces this is never false when
   *  materialConsequence is true. */
  humanReviewRequired: boolean;
  /** Spec §5: "Every returned assessment/option must carry an explainability envelope … Outputs missing the
   *  envelope are invalid (no black-box results)." Populated by lib/btrm/rie/options.ts before an option is ever
   *  returned to a caller — see lib/btrm/envelope.ts assertCompleteEnvelope. */
  envelope: ExplainabilityEnvelope;
}

/** Qualitative support bands (spec §3.7 / OCM-001). Numeric probabilities are PROHIBITED at this stage
 *  (BTRM-001 §3.7, §15) — do not add a numeric field here without a separate Founder-gated amendment. */
export type SupportBand = 'strongly_supported' | 'supported' | 'uncertain' | 'weakly_supported' | 'insufficient_evidence';

export interface OutcomeComparison {
  id: string;
  matterId: string;
  optionIds: string[];
  supportBand: SupportBand;
  rationale: string;
}

/** Recorded actual outcome (spec §3.9 / POL-001). Feeds back into ENR-001/BAE-001 with recency+relevance
 *  weighting — never a stored per-person score. */
export type OutcomeResult =
  | 'accepted'
  | 'rejected'
  | 'no_response'
  | 'completed_on_time'
  | 'completed_late'
  | 'partially_completed'
  | 'breached'
  | 'replaced_by_another_agreement'
  | 'escalated'
  | 'resolved_by_move_out'
  | 'resolved_by_payment'
  | 'referred_externally';

export interface OutcomeRecord {
  id: string;
  matterId: string;
  optionId: string;
  result: OutcomeResult;
  contextNotes?: string; // e.g. "documented emergency" — preserved so recency weighting doesn't flatten context
  recordedAt: string;
}
