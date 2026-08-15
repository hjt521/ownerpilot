import type { GeneratedDraftEvidence } from './officialFormGeneratedDraft';
import {
  createOfficialFormOwnerReview,
  evaluateOfficialFormOwnerReviewCurrentness,
  type CreateOfficialFormOwnerReviewInput,
  type OfficialFormOwnerReviewResult,
  type OwnerReviewedDocumentCurrentness,
  type OwnerReviewedDocumentEvidence,
} from './officialFormOwnerReview';
import {
  evaluateUd100GeneratedDraftCurrentness,
  type EvaluateUd100DraftCurrentnessInput,
  UD100_GENERATED_DRAFT_ARTIFACT_ROLE,
  UD100_GENERATED_DRAFT_IMPLEMENTATION_ID,
  UD100_GENERATED_DRAFT_IMPLEMENTATION_VERSION,
  UD100_PREPARATION_RUNTIME_MANIFEST_ID,
} from './ud100GeneratedDraft';
import {
  UD100_GENERATION_BINDING,
  UD100_GENERATOR_CONTRACT_VERSION,
} from './ud100GenerationBinding';
import { UD100_OFFICIAL_SOURCE_IDENTITY } from './ud100FieldMapFoundation';

export interface CreateUd100OwnerReviewInput
  extends Omit<CreateOfficialFormOwnerReviewInput, 'generatedDraft'> {
  generatedDraft: GeneratedDraftEvidence;
}

function matchesUd100GeneratedDraftContract(draft: GeneratedDraftEvidence): boolean {
  return draft.artifactClass === 'GENERATED_DRAFT'
    && draft.artifactRole === UD100_GENERATED_DRAFT_ARTIFACT_ROLE
    && draft.officialSourceArtifactId === UD100_OFFICIAL_SOURCE_IDENTITY.artifactId
    && draft.officialSourceSnapshotId === UD100_OFFICIAL_SOURCE_IDENTITY.sourceSnapshotId
    && draft.officialSourceSha256 === UD100_OFFICIAL_SOURCE_IDENTITY.repositorySha256
    && draft.preparationManifestId === UD100_PREPARATION_RUNTIME_MANIFEST_ID
    && draft.mapSnapshotId === UD100_GENERATION_BINDING.mapSnapshotId
    && draft.generatorContractVersion === UD100_GENERATOR_CONTRACT_VERSION
    && draft.generatorImplementationId === UD100_GENERATED_DRAFT_IMPLEMENTATION_ID
    && draft.generatorImplementationVersion === UD100_GENERATED_DRAFT_IMPLEMENTATION_VERSION;
}

function ud100ContextBlocked(): OfficialFormOwnerReviewResult {
  return {
    status: 'BLOCKED',
    blockReason: 'GENERATED_CONTEXT_MISMATCH',
    detail: 'Generated draft evidence does not match the governed UD-100 Stage E.1 contract.',
    evidence: null,
    signing: 'NOT_PERFORMED',
    filing: 'NOT_PERFORMED',
    service: 'NOT_PERFORMED',
    packetComposition: 'NOT_PERFORMED',
    legalSufficiency: 'NOT_EVALUATED',
    autonomousExecution: 'NOT_AUTHORIZED',
  };
}

export function createUd100OwnerReview(
  input: CreateUd100OwnerReviewInput,
): OfficialFormOwnerReviewResult {
  if (!matchesUd100GeneratedDraftContract(input.generatedDraft)) {
    return ud100ContextBlocked();
  }
  return createOfficialFormOwnerReview(input);
}

export function evaluateUd100OwnerReviewCurrentnessFromGeneratedDraftCurrentness(
  review: OwnerReviewedDocumentEvidence,
  currentGeneratedDraft: GeneratedDraftEvidence,
  generatedDraftCurrentness: ReturnType<typeof evaluateUd100GeneratedDraftCurrentness>,
): OwnerReviewedDocumentCurrentness {
  const reasons: string[] = [];
  if (!matchesUd100GeneratedDraftContract(review.generatedDraft)) {
    reasons.push('BOUND_UD100_GENERATED_DRAFT_IDENTITY_CHANGED');
  }
  if (!matchesUd100GeneratedDraftContract(currentGeneratedDraft)) {
    reasons.push('CURRENT_UD100_GENERATED_DRAFT_IDENTITY_CHANGED');
  }

  const genericCurrentness = evaluateOfficialFormOwnerReviewCurrentness(
    review,
    currentGeneratedDraft,
    generatedDraftCurrentness,
  );
  if (genericCurrentness.status === 'OUT_OF_DATE') {
    reasons.push(...genericCurrentness.reasons);
  }

  return reasons.length === 0
    ? { status: 'CURRENT', reasons: [] }
    : { status: 'OUT_OF_DATE', reasons };
}

export function evaluateUd100OwnerReviewCurrentness(
  review: OwnerReviewedDocumentEvidence,
  currentGeneratedDraft: GeneratedDraftEvidence,
  input: EvaluateUd100DraftCurrentnessInput,
): OwnerReviewedDocumentCurrentness {
  const generatedDraftCurrentness = evaluateUd100GeneratedDraftCurrentness(
    currentGeneratedDraft,
    input,
  );
  return evaluateUd100OwnerReviewCurrentnessFromGeneratedDraftCurrentness(
    review,
    currentGeneratedDraft,
    generatedDraftCurrentness,
  );
}
