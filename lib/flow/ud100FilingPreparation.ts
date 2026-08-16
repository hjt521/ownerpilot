import { createHash } from 'node:crypto';
import type { NoticeFlowData } from './noticeFlowState';
import {
  CANONICAL_FILING_FACT_REFS,
  projectFilingCanonicalFacts,
  type ComplaintNoticeElection,
  type ComplaintServiceElection,
  type CustomerConfirmedLegalElectionInput,
  type DbaUse,
  type DoeElection,
  type FilingCanonicalFactsProjection,
  type FilingCanonicalFactsSupplementalInput,
  type FilerContact,
  type GovernedControlInput,
  type InitialComplaintLifecycle,
  type LifecycleEventInput,
  type OtherReliefSelections,
  type PastDueRentRelief,
  type PlaintiffRelationship,
  type PlaintiffType,
  type RentalAssistanceFacts,
  type RepresentationStatus,
  type SelectedFilingCourt,
  type SupplementalFactInput,
} from './filingCanonicalFacts';
import {
  produceCaptionOptionalFieldsControl,
  produceCaptionRouteSupport,
  produceLeaseApplicabilityControl,
  produceNoticeElectionConsistencyControl,
  produceServiceElectionConsistency,
} from './ud100GovernedControls';
import {
  evaluateUd100GenerationBinding,
  UD100_GENERATION_BINDING,
} from './ud100GenerationBinding';
import {
  evaluateUd100GeneratedDraftCurrentness,
  generateUd100GeneratedDraft,
  type EvaluateUd100DraftCurrentnessInput,
} from './ud100GeneratedDraft';
import {
  sha256Bytes,
  type FormPreparationAuthorization,
  type GeneratedDraftEvidence,
  type OfficialFormGeneratedDraftResult,
} from './officialFormGeneratedDraft';
import {
  createUd100OwnerReview,
  evaluateUd100OwnerReviewCurrentnessFromGeneratedDraftCurrentness,
} from './ud100OwnerReview';
import {
  OWNER_REVIEW_STATEMENT_ID,
  OWNER_REVIEW_STATEMENT_VERSION,
  type OfficialFormOwnerReviewResult,
  type OwnerReviewedDocumentEvidence,
  type RenderedGeneratedDocumentAcknowledgment,
} from './officialFormOwnerReview';
import {
  UD100_OFFICIAL_SOURCE_IDENTITY,
} from './ud100FieldMapFoundation';
import type {
  OfficialSourceHealth,
  OfficialSourceIdentity,
} from './officialFormFieldMap';
import { evaluateCreatedNoticeSemanticProvenance, restoreCreatedNoticeArtifact } from './createdNoticeArtifact';

export const UD100_FILING_PREPARATION_CONTRACT_ID =
  'ownerpilot-stage-e2-2-ud100-filing-preparation' as const;
export const UD100_FILING_PREPARATION_CONTRACT_VERSION = '1.0.0' as const;

export const UD100_FILING_PREPARATION_COPY = Object.freeze({
  task: 'Complete filing information',
  unsupported: "This version of OwnerPilot can’t prepare this UD-100 configuration yet. Your Notice and recorded facts have not been changed.",
  courtQuestion: 'Which court do you intend to file this case in?',
  courtConfirmation: 'I confirm this is the court I intend to use for this filing.',
  courtBoundary: 'OwnerPilot will use the court you confirm on these filing documents. OwnerPilot has not determined that this is the legally correct filing location.',
  filingChoiceConfirmation: 'I reviewed these filing choices and want OwnerPilot to use them to prepare this complaint.',
  prepareAction: 'Prepare UD-100 for review',
  stale: 'Out of date — prepare an updated document for review.',
  ephemeral: 'Keep this page open while you finish. These filing-preparation answers are not saved as a durable filing record yet. If you refresh or leave, you may need to confirm them again.',
} as const);

export type SupportValueState<T> =
  | { state: 'KNOWN'; value: T }
  | { state: 'UNANSWERED' }
  | { state: 'UNKNOWN' }
  | { state: 'REQUIRES_CONFIRMATION'; reason: string }
  | { state: 'CONFLICT'; values: readonly T[]; reason: string };

export type SupportDoePosture = 'NO_DOES' | 'USES_DOES';
export type SupportLeasePosture = 'NO_AGREEMENT' | 'AGREEMENT_OR_OTHER';
export type SupportNoticePosture = 'PAY_RENT_OR_QUIT_3_DAY' | 'OTHER';
export type SupportServicePosture = 'PERSONAL_HAND_DELIVERY' | 'OTHER';
export type SupportOtherNoticesPosture = 'NO_OTHER_NOTICES' | 'OTHER_NOTICES';
export type SupportFixedTermPosture = 'DO_NOT_SELECT' | 'SELECT';
export type SupportOptionalReliefPosture = 'PAST_DUE_RENT_ONLY' | 'OTHER_RELIEF';

export interface Ud100PhaseASupportAnswers {
  plaintiffRelationship?: SupportValueState<PlaintiffRelationship>;
  plaintiffType?: SupportValueState<PlaintiffType>;
  representationStatus?: SupportValueState<RepresentationStatus>;
  dbaUse?: SupportValueState<DbaUse>;
  doePosture?: SupportValueState<SupportDoePosture>;
  initialComplaintLifecycle?: SupportValueState<InitialComplaintLifecycle>;
  leasePosture?: SupportValueState<SupportLeasePosture>;
  noticePosture?: SupportValueState<SupportNoticePosture>;
  servicePosture?: SupportValueState<SupportServicePosture>;
  otherNoticesPosture?: SupportValueState<SupportOtherNoticesPosture>;
  fixedTermPosture?: SupportValueState<SupportFixedTermPosture>;
  optionalReliefPosture?: SupportValueState<SupportOptionalReliefPosture>;
}

/**
 * These values are not customer answers. They are accepted only by the pure
 * orchestration contract so an already-authoritative caller can supply current
 * governed evidence. The public E.2.2 route must never deserialize them from a
 * browser request. Missing evidence therefore fails closed in the live route.
 */
export interface Ud100AuthoritativePreparationInputs {
  initialComplaintLifecycle?: LifecycleEventInput<InitialComplaintLifecycle>;
  municipalClassification?: GovernedControlInput<'WITHIN_CITY_LIMITS' | 'UNINCORPORATED_AREA'>;
  plaintiffStandingControl?: GovernedControlInput<'SUPPORTED'>;
  jurisdictionSupportControl?: GovernedControlInput<'SUPPORTED_INITIAL_UD100' | 'UNSUPPORTED'>;
  tpaClassificationControl?: GovernedControlInput<'SUBJECT_AT_FAULT'>;
  localControl?: GovernedControlInput<'NOT_SUBJECT'>;
  civilClassificationControl?: GovernedControlInput<'LIMITED_LE_10000' | 'LIMITED_GT_10000' | 'UNLIMITED'>;
  rentalAssistanceControl?: GovernedControlInput<'APPLICABLE'>;
  udaDisclosureControl?: GovernedControlInput<'NO_COMPENSATED_ASSISTANT'>;
}

export interface Ud100PhaseBCompletionInput {
  propertyZip?: SupplementalFactInput<string>;
  propertyUnitConfirmation?: SupplementalFactInput<'NO_UNIT'>;
  selectedFilingCourt?: CustomerConfirmedLegalElectionInput<SelectedFilingCourt>;
  filerContact?: SupplementalFactInput<FilerContact>;
  premisesAge?: SupplementalFactInput<string>;
  rentDueAtService?: SupplementalFactInput<number>;
  rentalAssistanceFacts?: SupplementalFactInput<RentalAssistanceFacts>;
  doeElection?: CustomerConfirmedLegalElectionInput<DoeElection>;
  noticeComplaintElection?: CustomerConfirmedLegalElectionInput<ComplaintNoticeElection>;
  serviceComplaintElection?: CustomerConfirmedLegalElectionInput<ComplaintServiceElection>;
  fixedTermExpirationElection?: CustomerConfirmedLegalElectionInput<'DO_NOT_SELECT'>;
  pastDueRentRelief?: CustomerConfirmedLegalElectionInput<PastDueRentRelief>;
  otherReliefSelections?: CustomerConfirmedLegalElectionInput<OtherReliefSelections>;
}

export interface FilingChoiceConfirmation {
  confirmed: boolean;
  confirmationId: string;
  confirmedAtISO: string;
}

export interface Ud100PreparationContext {
  data: NoticeFlowData | null;
  phaseA: Ud100PhaseASupportAnswers;
  phaseB?: Ud100PhaseBCompletionInput;
  authoritative?: Ud100AuthoritativePreparationInputs;
}

export type Ud100SupportCheckResult =
  | {
      status: 'SUPPORTED';
      ownerState: 'Needs information';
      detail: 'Current configuration is within the bounded UD-100 preparation profile.';
      blockers: readonly [];
    }
  | {
      status: 'NEEDS_INFORMATION';
      ownerState: 'Needs information';
      detail: string;
      blockers: readonly string[];
    }
  | {
      status: 'UNSUPPORTED_CONFIGURATION';
      ownerState: 'Cannot continue';
      detail: typeof UD100_FILING_PREPARATION_COPY.unsupported;
      blockers: readonly string[];
    }
  | {
      status: 'CANNOT_CONTINUE';
      ownerState: 'Cannot continue';
      detail: string;
      blockers: readonly string[];
    };

export type Ud100CompletionEvaluation =
  | {
      status: 'READY_FOR_PREPARATION';
      support: Extract<Ud100SupportCheckResult, { status: 'SUPPORTED' }>;
      facts: FilingCanonicalFactsProjection & { status: 'READY' };
      supplemental: FilingCanonicalFactsSupplementalInput;
    }
  | {
      status: 'BLOCKED';
      ownerState: 'Needs information' | 'Cannot continue';
      detail: string;
      support: Ud100SupportCheckResult;
      facts: FilingCanonicalFactsProjection | null;
    };

export interface Ud100GenerationRuntimeInputs {
  officialSourceIdentity: OfficialSourceIdentity;
  officialSourceHealth: OfficialSourceHealth | null | undefined;
  officialSourceBytes: Uint8Array;
  preparationDerivativeBytes: Uint8Array;
}

export type Ud100PrepareResult =
  | {
      status: 'BLOCKED';
      ownerState: 'Needs information' | 'Cannot continue';
      detail: string;
      generation: null;
      facts: FilingCanonicalFactsProjection | null;
      preparationAuthorization: null;
    }
  | {
      status: 'GENERATED_DRAFT';
      ownerState: 'Needs owner review';
      detail: 'Exact generated bytes are ready for owner review.';
      generation: Extract<OfficialFormGeneratedDraftResult, { status: 'GENERATED_DRAFT' }>;
      facts: FilingCanonicalFactsProjection & { status: 'READY' };
      preparationAuthorization: FormPreparationAuthorization;
    };

export interface Ud100ReviewInput extends Ud100PreparationContext, Ud100GenerationRuntimeInputs {
  generatedDraft: GeneratedDraftEvidence;
  generatedBytes: Uint8Array;
  renderedAcknowledgment: RenderedGeneratedDocumentAcknowledgment;
  ownerConfirmedExactRenderedDocument: boolean;
  reviewedAtISO: string;
}

export type Ud100ReviewResult =
  | {
      status: 'BLOCKED';
      ownerState: 'Cannot continue';
      detail: string;
      review: null;
      currentness: 'OUT_OF_DATE' | 'BLOCKED';
    }
  | {
      status: 'OWNER_REVIEWED_DOCUMENT';
      ownerState: 'Needs owner review';
      detail: 'Owner review is bound to the exact rendered generated document.';
      review: Extract<OfficialFormOwnerReviewResult, { status: 'OWNER_REVIEWED_DOCUMENT' }>;
      currentness: 'CURRENT';
    };

function knownValue<T>(input: SupportValueState<T> | undefined): T | null {
  return input?.state === 'KNOWN' ? input.value : null;
}

function supportStateProblem(label: string, input: SupportValueState<unknown> | undefined): string | null {
  if (!input || input.state === 'UNANSWERED') return `${label} is unanswered.`;
  if (input.state === 'UNKNOWN') return `${label} is unknown.`;
  if (input.state === 'REQUIRES_CONFIRMATION') return `${label} requires confirmation.`;
  if (input.state === 'CONFLICT') return `${label} is conflicting.`;
  return null;
}

function currentControl(input: GovernedControlInput<unknown> | undefined): boolean {
  return !!input
    && input.state === 'KNOWN'
    && !!input.control
    && input.control.status === 'CURRENT'
    && input.control.controlId.trim() !== ''
    && input.control.controlVersion.trim() !== ''
    && input.control.resultId.trim() !== '';
}

function currentLifecycle(input: LifecycleEventInput<unknown> | undefined): boolean {
  return !!input
    && input.state === 'KNOWN'
    && !!input.event
    && input.event.sourceId.trim() !== ''
    && input.event.eventId.trim() !== ''
    && input.event.eventType.trim() !== '';
}

function hasExactPositiveConfirmation<T>(input: CustomerConfirmedLegalElectionInput<T> | undefined): boolean {
  return !!input
    && input.state === 'KNOWN'
    && !!input.confirmation
    && input.confirmation.confirmationId.trim() !== ''
    && input.confirmation.confirmedAtISO.trim() !== '';
}

function exactUtcIso(value: string): boolean {
  if (!value.trim()) return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

function allOptionalReliefFalse(value: OtherReliefSelections): boolean {
  return !value.fairRentalValue
    && !value.statutoryDamages
    && !value.relocationDamages
    && !value.forfeiture
    && !value.attorneyFees
    && !value.otherRelief
    && !value.otherAllegations;
}

function unsupported(label: string): Ud100SupportCheckResult {
  return {
    status: 'UNSUPPORTED_CONFIGURATION',
    ownerState: 'Cannot continue',
    detail: UD100_FILING_PREPARATION_COPY.unsupported,
    blockers: [label],
  };
}

function cannotContinue(blockers: readonly string[]): Ud100SupportCheckResult {
  return {
    status: 'CANNOT_CONTINUE',
    ownerState: 'Cannot continue',
    detail: 'OwnerPilot is missing current governed evidence required for this preparation step. Your Notice and recorded facts have not been changed.',
    blockers,
  };
}

export function evaluateUd100FilingSupport(
  input: Ud100PreparationContext,
): Ud100SupportCheckResult {
  const restored = input.data ? restoreCreatedNoticeArtifact(input.data) : null;
  if (!restored || !input.data?.createdNoticeArtifact) {
    return cannotContinue(['Exact current Created Notice identity is unavailable.']);
  }
  const semantic = evaluateCreatedNoticeSemanticProvenance(input.data.createdNoticeArtifact);
  if (semantic.status !== 'PROVEN') {
    return cannotContinue(['Created Notice semantic provenance is not exact and PROVEN.']);
  }

  const answerEntries: readonly [string, SupportValueState<unknown> | undefined][] = [
    ['Plaintiff relationship', input.phaseA.plaintiffRelationship],
    ['Plaintiff type', input.phaseA.plaintiffType],
    ['Representation status', input.phaseA.representationStatus],
    ['DBA posture', input.phaseA.dbaUse],
    ['Doe-defendant posture', input.phaseA.doePosture],
    ['Initial complaint posture', input.phaseA.initialComplaintLifecycle],
    ['Rental-agreement posture', input.phaseA.leasePosture],
    ['Notice allegation posture', input.phaseA.noticePosture],
    ['Service allegation posture', input.phaseA.servicePosture],
    ['Other-notices posture', input.phaseA.otherNoticesPosture],
    ['Fixed-term posture', input.phaseA.fixedTermPosture],
    ['Optional-relief posture', input.phaseA.optionalReliefPosture],
  ];
  const unresolvedAnswers = answerEntries
    .map(([label, value]) => supportStateProblem(label, value))
    .filter((value): value is string => !!value);
  if (unresolvedAnswers.length > 0) {
    return {
      status: 'NEEDS_INFORMATION',
      ownerState: 'Needs information',
      detail: 'Complete the bounded support questions before OwnerPilot asks for the remaining filing information.',
      blockers: unresolvedAnswers,
    };
  }

  if (knownValue(input.phaseA.plaintiffRelationship) !== 'OWNER') return unsupported('Current profile supports plaintiff relationship OWNER only.');
  if (knownValue(input.phaseA.plaintiffType) !== 'INDIVIDUAL_OVER_18') return unsupported('Current profile supports an individual plaintiff over 18 only.');
  if (knownValue(input.phaseA.representationStatus) !== 'SELF_REPRESENTED') return unsupported('Current profile supports the self-represented caption route only.');
  if (knownValue(input.phaseA.dbaUse) !== 'NO_DBA') return unsupported('Current profile supports NO_DBA only.');
  if (knownValue(input.phaseA.doePosture) !== 'NO_DOES') return unsupported('Current profile does not support Doe defendants.');
  if (knownValue(input.phaseA.initialComplaintLifecycle) !== 'INITIAL_PREFILING') return unsupported('Current profile supports the initial prefiling complaint only.');
  if (knownValue(input.phaseA.leasePosture) !== 'NO_AGREEMENT') return unsupported('Current profile supports explicit NO_AGREEMENT only.');
  if (knownValue(input.phaseA.noticePosture) !== 'PAY_RENT_OR_QUIT_3_DAY') return unsupported('Current profile supports the exact 3-Day Notice to Pay Rent or Quit allegation only.');
  if (knownValue(input.phaseA.servicePosture) !== 'PERSONAL_HAND_DELIVERY') return unsupported('Current profile supports personal hand delivery only.');
  if (knownValue(input.phaseA.otherNoticesPosture) !== 'NO_OTHER_NOTICES') return unsupported('Current profile supports explicit NO_OTHER_NOTICES only.');
  if (knownValue(input.phaseA.fixedTermPosture) !== 'DO_NOT_SELECT') return unsupported('Current profile does not support a fixed-term expiration theory.');
  if (knownValue(input.phaseA.optionalReliefPosture) !== 'PAST_DUE_RENT_ONLY') return unsupported('Current profile does not support additional optional relief.');

  const authoritativeBlockers: string[] = [];
  const authoritative = input.authoritative;
  if (!currentLifecycle(authoritative?.initialComplaintLifecycle)
    || authoritative?.initialComplaintLifecycle?.state !== 'KNOWN'
    || authoritative.initialComplaintLifecycle.value !== 'INITIAL_PREFILING') {
    authoritativeBlockers.push('Current initial-complaint lifecycle evidence is unavailable or unsupported.');
  }
  const governed: readonly [string, GovernedControlInput<unknown> | undefined, unknown][] = [
    ['municipal classification', authoritative?.municipalClassification, undefined],
    ['plaintiff standing/capacity', authoritative?.plaintiffStandingControl, 'SUPPORTED'],
    ['jurisdiction support', authoritative?.jurisdictionSupportControl, 'SUPPORTED_INITIAL_UD100'],
    ['TPA / just-cause classification', authoritative?.tpaClassificationControl, 'SUBJECT_AT_FAULT'],
    ['local rent/eviction control', authoritative?.localControl, 'NOT_SUBJECT'],
    ['civil classification', authoritative?.civilClassificationControl, undefined],
    ['rental-assistance control', authoritative?.rentalAssistanceControl, 'APPLICABLE'],
    ['uncompensated document-assistant control', authoritative?.udaDisclosureControl, 'NO_COMPENSATED_ASSISTANT'],
  ];
  for (const [label, value, requiredValue] of governed) {
    if (!currentControl(value)) {
      authoritativeBlockers.push(`Current governed ${label} evidence is unavailable.`);
      continue;
    }
    if (requiredValue !== undefined && value?.state === 'KNOWN' && value.value !== requiredValue) {
      authoritativeBlockers.push(`Current governed ${label} evidence is outside the bounded profile.`);
    }
  }
  if (authoritativeBlockers.length > 0) return cannotContinue(authoritativeBlockers);

  return {
    status: 'SUPPORTED',
    ownerState: 'Needs information',
    detail: 'Current configuration is within the bounded UD-100 preparation profile.',
    blockers: [],
  };
}

function buildSupplemental(input: Ud100PreparationContext): FilingCanonicalFactsSupplementalInput | null {
  const phaseB = input.phaseB;
  const authoritative = input.authoritative;
  if (!phaseB || !authoritative) return null;

  const plaintiffRelationship: SupplementalFactInput<PlaintiffRelationship> = {
    state: 'KNOWN',
    value: 'OWNER',
  };
  const plaintiffType: SupplementalFactInput<PlaintiffType> = {
    state: 'KNOWN',
    value: 'INDIVIDUAL_OVER_18',
  };
  const dbaUse: SupplementalFactInput<DbaUse> = { state: 'KNOWN', value: 'NO_DBA' };
  const leaseStatus: SupplementalFactInput<'NO_AGREEMENT'> = { state: 'KNOWN', value: 'NO_AGREEMENT' };
  const otherNoticesFact: SupplementalFactInput<'NO_OTHER_NOTICES'> = { state: 'KNOWN', value: 'NO_OTHER_NOTICES' };

  const caption = produceCaptionRouteSupport({
    data: input.data,
    plaintiffRelationship,
    plaintiffType,
    filerContact: phaseB.filerContact,
  });
  const captionOptionalFieldsControl = produceCaptionOptionalFieldsControl(caption.captionRouteControl);
  const leaseApplicabilityControl = produceLeaseApplicabilityControl(leaseStatus);
  const noticeElectionConsistencyControl = produceNoticeElectionConsistencyControl({
    data: input.data,
    noticeComplaintElection: phaseB.noticeComplaintElection,
  });
  const service = produceServiceElectionConsistency({
    data: input.data,
    serviceComplaintElection: phaseB.serviceComplaintElection,
  });

  return {
    propertyZip: phaseB.propertyZip,
    propertyUnitConfirmation: phaseB.propertyUnitConfirmation,
    preparation: {
      selectedFilingCourt: phaseB.selectedFilingCourt,
      municipalClassification: authoritative.municipalClassification,
      initialComplaintLifecycle: authoritative.initialComplaintLifecycle,
      captionRouteControl: caption.captionRouteControl,
      captionFormValueControl: caption.captionFormValueControl,
      jurisdictionSupportControl: authoritative.jurisdictionSupportControl,
      plaintiffRelationship,
      plaintiffType,
      plaintiffStandingControl: authoritative.plaintiffStandingControl,
      dbaUse,
      doeElection: phaseB.doeElection,
      filerContact: phaseB.filerContact,
      captionOptionalFieldsControl,
      premisesAge: phaseB.premisesAge,
      tpaClassificationControl: authoritative.tpaClassificationControl,
      localControl: authoritative.localControl,
      civilClassificationControl: authoritative.civilClassificationControl,
      leaseStatus,
      leaseApplicabilityControl,
      noticeComplaintElection: phaseB.noticeComplaintElection,
      noticeElectionConsistencyControl,
      serviceComplaintElection: phaseB.serviceComplaintElection,
      serviceElectionConsistencyControl: service.serviceElectionConsistencyControl,
      serviceFacts: service.serviceFacts,
      rentDueAtService: phaseB.rentDueAtService,
      fixedTermExpirationElection: phaseB.fixedTermExpirationElection,
      rentalAssistanceFacts: phaseB.rentalAssistanceFacts,
      rentalAssistanceControl: authoritative.rentalAssistanceControl,
      otherNoticesFact,
      pastDueRentRelief: phaseB.pastDueRentRelief,
      otherReliefSelections: phaseB.otherReliefSelections,
      udaDisclosureControl: authoritative.udaDisclosureControl,
    },
  };
}

export function evaluateUd100FilingCompletion(
  input: Ud100PreparationContext,
  runtime: Pick<Ud100GenerationRuntimeInputs, 'officialSourceIdentity' | 'officialSourceHealth'> = {
    officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY,
    officialSourceHealth: 'CURRENT',
  },
): Ud100CompletionEvaluation {
  const support = evaluateUd100FilingSupport(input);
  if (support.status !== 'SUPPORTED') {
    return {
      status: 'BLOCKED',
      ownerState: support.ownerState,
      detail: support.detail,
      support,
      facts: null,
    };
  }

  const supplemental = buildSupplemental(input);
  if (!supplemental) {
    return {
      status: 'BLOCKED',
      ownerState: 'Needs information',
      detail: 'Complete the remaining filing information before preparing the complaint.',
      support,
      facts: null,
    };
  }
  const facts = projectFilingCanonicalFacts(input.data, supplemental);
  if (facts.status !== 'READY') {
    return {
      status: 'BLOCKED',
      ownerState: 'Cannot continue',
      detail: 'The exact Created Notice cannot be projected into current filing facts.',
      support,
      facts,
    };
  }
  const binding = evaluateUd100GenerationBinding(
    runtime.officialSourceIdentity,
    runtime.officialSourceHealth,
    facts,
  );
  if (binding.status !== 'GENERATION_BINDING_READY') {
    const unresolved = binding.status === 'BLOCKED'
      ? binding.detail
      : 'The current governed filing projection is incomplete.';
    return {
      status: 'BLOCKED',
      ownerState: 'Cannot continue',
      detail: unresolved,
      support,
      facts,
    };
  }

  return { status: 'READY_FOR_PREPARATION', support, facts, supplemental };
}

function filingChoiceIsCurrent(value: FilingChoiceConfirmation | undefined): boolean {
  return !!value
    && value.confirmed === true
    && value.confirmationId.trim() !== ''
    && exactUtcIso(value.confirmedAtISO);
}

function digest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function buildUd100PreparationAuthorization(
  facts: FilingCanonicalFactsProjection & { status: 'READY' },
): FormPreparationAuthorization {
  const target = {
    artifactId: UD100_OFFICIAL_SOURCE_IDENTITY.artifactId,
    authorityKey: UD100_OFFICIAL_SOURCE_IDENTITY.authorityKey,
    formId: UD100_OFFICIAL_SOURCE_IDENTITY.formId,
    revisionEffective: UD100_OFFICIAL_SOURCE_IDENTITY.revisionEffective,
    sourceSnapshotId: UD100_OFFICIAL_SOURCE_IDENTITY.sourceSnapshotId,
  };
  const identity = {
    contractId: UD100_FILING_PREPARATION_CONTRACT_ID,
    contractVersion: UD100_FILING_PREPARATION_CONTRACT_VERSION,
    createdNoticeIdentity: facts.createdNoticeIdentity,
    target,
    mapSnapshotId: UD100_GENERATION_BINDING.mapSnapshotId,
  };
  const id = digest(identity);
  return {
    authorizationId: `ud100-preparation-authorization:sha256:${id}`,
    resultId: `ud100-preparation-relevance:sha256:${id}`,
    controlId: UD100_FILING_PREPARATION_CONTRACT_ID,
    controlVersion: UD100_FILING_PREPARATION_CONTRACT_VERSION,
    status: 'CURRENT',
    decision: 'FORM_RELEVANT_FOR_PREPARATION',
    target,
    createdNoticeIdentity: facts.createdNoticeIdentity,
  };
}

export async function prepareUd100Filing(input: {
  context: Ud100PreparationContext;
  filingChoiceConfirmation?: FilingChoiceConfirmation;
  preparedAtISO: string;
  runtime: Ud100GenerationRuntimeInputs;
}): Promise<Ud100PrepareResult> {
  if (!filingChoiceIsCurrent(input.filingChoiceConfirmation)) {
    return {
      status: 'BLOCKED',
      ownerState: 'Needs information',
      detail: 'Confirm the filing choices before preparing the UD-100.',
      generation: null,
      facts: null,
      preparationAuthorization: null,
    };
  }
  if (!exactUtcIso(input.preparedAtISO)) {
    return {
      status: 'BLOCKED',
      ownerState: 'Cannot continue',
      detail: 'Preparation timestamp is invalid.',
      generation: null,
      facts: null,
      preparationAuthorization: null,
    };
  }
  if (input.runtime.officialSourceIdentity.artifactId !== UD100_OFFICIAL_SOURCE_IDENTITY.artifactId
    || input.runtime.officialSourceIdentity.sourceSnapshotId !== UD100_OFFICIAL_SOURCE_IDENTITY.sourceSnapshotId
    || input.runtime.officialSourceIdentity.repositorySha256 !== UD100_OFFICIAL_SOURCE_IDENTITY.repositorySha256
    || input.runtime.officialSourceHealth !== 'CURRENT'
    || sha256Bytes(input.runtime.officialSourceBytes) !== UD100_OFFICIAL_SOURCE_IDENTITY.repositorySha256) {
    return {
      status: 'BLOCKED',
      ownerState: 'Cannot continue',
      detail: 'The exact current controlled UD-100 source is unavailable or changed.',
      generation: null,
      facts: null,
      preparationAuthorization: null,
    };
  }

  const completion = evaluateUd100FilingCompletion(input.context, input.runtime);
  if (completion.status !== 'READY_FOR_PREPARATION') {
    return {
      status: 'BLOCKED',
      ownerState: completion.ownerState,
      detail: completion.detail,
      generation: null,
      facts: completion.facts,
      preparationAuthorization: null,
    };
  }
  const authorization = buildUd100PreparationAuthorization(completion.facts);
  const generation = await generateUd100GeneratedDraft({
    officialSourceIdentity: input.runtime.officialSourceIdentity,
    officialSourceHealth: input.runtime.officialSourceHealth,
    officialSourceBytes: input.runtime.officialSourceBytes,
    preparationAuthorization: authorization,
    preparationDerivativeBytes: input.runtime.preparationDerivativeBytes,
    facts: completion.facts,
    preparedAtISO: input.preparedAtISO,
  });
  if (generation.status !== 'GENERATED_DRAFT') {
    return {
      status: 'BLOCKED',
      ownerState: 'Cannot continue',
      detail: generation.detail,
      generation: null,
      facts: completion.facts,
      preparationAuthorization: null,
    };
  }

  return {
    status: 'GENERATED_DRAFT',
    ownerState: 'Needs owner review',
    detail: 'Exact generated bytes are ready for owner review.',
    generation,
    facts: completion.facts,
    preparationAuthorization: authorization,
  };
}

function currentnessInput(
  completion: Extract<Ud100CompletionEvaluation, { status: 'READY_FOR_PREPARATION' }>,
  authorization: FormPreparationAuthorization,
  runtime: Ud100GenerationRuntimeInputs,
  draftBytes: Uint8Array,
): EvaluateUd100DraftCurrentnessInput {
  return {
    officialSourceIdentity: runtime.officialSourceIdentity,
    officialSourceHealth: runtime.officialSourceHealth,
    officialSourceBytes: runtime.officialSourceBytes,
    preparationAuthorization: authorization,
    preparationDerivativeBytes: runtime.preparationDerivativeBytes,
    facts: completion.facts,
    draftBytes,
  };
}

export function reviewUd100Filing(input: Ud100ReviewInput): Ud100ReviewResult {
  const completion = evaluateUd100FilingCompletion(input, input);
  if (completion.status !== 'READY_FOR_PREPARATION') {
    return {
      status: 'BLOCKED',
      ownerState: 'Cannot continue',
      detail: UD100_FILING_PREPARATION_COPY.stale,
      review: null,
      currentness: 'OUT_OF_DATE',
    };
  }
  const authorization = buildUd100PreparationAuthorization(completion.facts);
  if (sha256Bytes(input.generatedBytes) !== input.generatedDraft.generatedPdfSha256
    || input.generatedBytes.byteLength !== input.generatedDraft.generatedByteLength) {
    return {
      status: 'BLOCKED',
      ownerState: 'Cannot continue',
      detail: 'The retained PDF bytes do not match the exact generated document identity.',
      review: null,
      currentness: 'BLOCKED',
    };
  }

  const generatedCurrentness = evaluateUd100GeneratedDraftCurrentness(
    input.generatedDraft,
    currentnessInput(completion, authorization, input, input.generatedBytes),
  );
  if (generatedCurrentness.status !== 'CURRENT') {
    return {
      status: 'BLOCKED',
      ownerState: 'Cannot continue',
      detail: UD100_FILING_PREPARATION_COPY.stale,
      review: null,
      currentness: 'OUT_OF_DATE',
    };
  }

  const review = createUd100OwnerReview({
    generatedDraft: input.generatedDraft,
    renderedAcknowledgment: input.renderedAcknowledgment,
    ownerConfirmedExactRenderedDocument: input.ownerConfirmedExactRenderedDocument,
    reviewedAtISO: input.reviewedAtISO,
    reviewStatement: {
      statementId: OWNER_REVIEW_STATEMENT_ID,
      statementVersion: OWNER_REVIEW_STATEMENT_VERSION,
    },
  });
  if (review.status !== 'OWNER_REVIEWED_DOCUMENT') {
    return {
      status: 'BLOCKED',
      ownerState: 'Cannot continue',
      detail: review.detail,
      review: null,
      currentness: 'BLOCKED',
    };
  }

  const reviewCurrentness = evaluateUd100OwnerReviewCurrentnessFromGeneratedDraftCurrentness(
    review.evidence,
    input.generatedDraft,
    generatedCurrentness,
  );
  if (reviewCurrentness.status !== 'CURRENT') {
    return {
      status: 'BLOCKED',
      ownerState: 'Cannot continue',
      detail: UD100_FILING_PREPARATION_COPY.stale,
      review: null,
      currentness: 'OUT_OF_DATE',
    };
  }

  return {
    status: 'OWNER_REVIEWED_DOCUMENT',
    ownerState: 'Needs owner review',
    detail: 'Owner review is bound to the exact rendered generated document.',
    review,
    currentness: 'CURRENT',
  };
}

export function invalidateOwnerReviewOnCurrentnessChange(
  review: OwnerReviewedDocumentEvidence,
  generatedDraft: GeneratedDraftEvidence,
  generatedCurrentness: ReturnType<typeof evaluateUd100GeneratedDraftCurrentness>,
): 'CURRENT' | 'OUT_OF_DATE' {
  return evaluateUd100OwnerReviewCurrentnessFromGeneratedDraftCurrentness(
    review,
    generatedDraft,
    generatedCurrentness,
  ).status;
}

export const E2_2_AUTHORITY_BOUNDARY = Object.freeze({
  durablePersistence: 'NOT_AUTHORIZED',
  signing: 'NOT_AUTHORIZED',
  filing: 'NOT_AUTHORIZED',
  eFiling: 'NOT_AUTHORIZED',
  courtFeePayment: 'NOT_AUTHORIZED',
  packetComposition: 'NOT_AUTHORIZED',
  serviceExecution: 'NOT_AUTHORIZED',
  externalCommunication: 'NOT_AUTHORIZED',
  attorneyRouting: 'NOT_AUTHORIZED',
  autonomousContinuation: 'NOT_AUTHORIZED',
  productionAction: 'NOT_AUTHORIZED',
} as const);
