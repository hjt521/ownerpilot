import { createHash } from 'node:crypto';
import { canonicalizeGenerationIdentity } from './officialFormGenerationBinding';
import {
  computeGeneratedDocumentId,
  type GeneratedDraftCurrentness,
  type GeneratedDraftEvidence,
  type GeneratedDraftIdentity,
} from './officialFormGeneratedDraft';

export const OFFICIAL_FORM_OWNER_REVIEW_SCHEMA_VERSION = 1 as const;
export const OWNER_REVIEW_STATEMENT_ID = 'owner-exact-rendered-document-review-v1' as const;
export const OWNER_REVIEW_STATEMENT_VERSION = '1.0.0' as const;

export interface OwnerReviewStatementIdentity {
  statementId: string;
  statementVersion: string;
}

export interface RenderedGeneratedDocumentAcknowledgment {
  renderedGeneratedDocumentId: string;
  renderedPdfSha256: string;
  renderedByteLength: number;
  renderedAtISO: string;
}

export interface CreateOfficialFormOwnerReviewInput {
  generatedDraft: GeneratedDraftEvidence;
  renderedAcknowledgment: RenderedGeneratedDocumentAcknowledgment;
  ownerConfirmedExactRenderedDocument: boolean;
  reviewedAtISO: string;
  reviewStatement: OwnerReviewStatementIdentity;
}

export type OwnerReviewBlockReason =
  | 'GENERATED_ARTIFACT_CLASS_MISMATCH'
  | 'GENERATED_ARTIFACT_ROLE_MISMATCH'
  | 'INVALID_GENERATED_DRAFT_IDENTITY'
  | 'GENERATED_PROVENANCE_INCONSISTENT'
  | 'GENERATED_CONTEXT_MISMATCH'
  | 'RENDERED_GENERATED_DOCUMENT_ID_MISMATCH'
  | 'RENDERED_PDF_SHA256_MISMATCH'
  | 'RENDERED_BYTE_LENGTH_MISMATCH'
  | 'INVALID_RENDERED_AT'
  | 'INVALID_REVIEWED_AT'
  | 'REVIEW_BEFORE_RENDER'
  | 'OWNER_CONFIRMATION_REQUIRED'
  | 'REVIEW_STATEMENT_IDENTITY_MISMATCH';

export interface OwnerReviewedDocumentIdentity {
  schemaVersion: typeof OFFICIAL_FORM_OWNER_REVIEW_SCHEMA_VERSION;
  artifactClass: 'OWNER_REVIEWED_DOCUMENT';
  artifactRole: 'OWNER_GENERATED_PREPARATION';
  generatedDraft: Readonly<GeneratedDraftEvidence>;
  renderedAcknowledgment: Readonly<RenderedGeneratedDocumentAcknowledgment>;
  ownerConfirmedExactRenderedDocument: true;
  reviewStatementId: typeof OWNER_REVIEW_STATEMENT_ID;
  reviewStatementVersion: typeof OWNER_REVIEW_STATEMENT_VERSION;
  reviewedAtISO: string;
}

export interface OwnerReviewedDocumentEvidence extends OwnerReviewedDocumentIdentity {
  ownerReviewRecordId: string;
}

export type OfficialFormOwnerReviewResult =
  | {
      status: 'BLOCKED';
      blockReason: OwnerReviewBlockReason;
      detail: string;
      evidence: null;
      signing: 'NOT_PERFORMED';
      filing: 'NOT_PERFORMED';
      service: 'NOT_PERFORMED';
      packetComposition: 'NOT_PERFORMED';
      legalSufficiency: 'NOT_EVALUATED';
      autonomousExecution: 'NOT_AUTHORIZED';
    }
  | {
      status: 'OWNER_REVIEWED_DOCUMENT';
      evidence: OwnerReviewedDocumentEvidence;
      signing: 'NOT_PERFORMED';
      filing: 'NOT_PERFORMED';
      service: 'NOT_PERFORMED';
      packetComposition: 'NOT_PERFORMED';
      legalSufficiency: 'NOT_EVALUATED';
      autonomousExecution: 'NOT_AUTHORIZED';
    };

export type OwnerReviewedDocumentCurrentness =
  | { status: 'CURRENT'; reasons: readonly string[] }
  | { status: 'OUT_OF_DATE'; reasons: readonly string[] };

function nonempty(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function sha256Hex(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

function exactUtcIso(value: unknown): value is string {
  if (!nonempty(value)) return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

function blocked(
  blockReason: OwnerReviewBlockReason,
  detail: string,
): OfficialFormOwnerReviewResult {
  return {
    status: 'BLOCKED',
    blockReason,
    detail,
    evidence: null,
    signing: 'NOT_PERFORMED',
    filing: 'NOT_PERFORMED',
    service: 'NOT_PERFORMED',
    packetComposition: 'NOT_PERFORMED',
    legalSufficiency: 'NOT_EVALUATED',
    autonomousExecution: 'NOT_AUTHORIZED',
  };
}

const GENERATED_IDENTITY_STRING_FIELDS = [
  'officialSourceArtifactId',
  'officialSourceSnapshotId',
  'sourceAdmissionPolicyId',
  'sourceAdmissionStatus',
  'qpdfAssetIdentityDigest',
  'sourcePassACommandDigest',
  'sourcePassAWarningInventoryDigest',
  'sourcePassBCommandDigest',
  'sourcePassBWarningInventoryDigest',
  'sourceWarningInventoryDigest',
  'xfaPolicyId',
  'xfaDigest',
  'preparationManifestId',
  'preparationSourceId',
  'preparationFieldEquivalenceDigest',
  'preparationSemanticDeltaDigest',
  'preparationAuthorizationSnapshotId',
  'mapSnapshotId',
  'referencedFactSnapshotId',
  'generationInputId',
  'generatorContractVersion',
  'generatorImplementationId',
  'generatorImplementationVersion',
  'fieldWritePlanDigest',
] as const satisfies readonly (keyof GeneratedDraftEvidence)[];

type GeneratedValidation =
  | { status: 'VALID' }
  | {
      status: 'BLOCKED';
      reason:
        | 'GENERATED_ARTIFACT_CLASS_MISMATCH'
        | 'GENERATED_ARTIFACT_ROLE_MISMATCH'
        | 'INVALID_GENERATED_DRAFT_IDENTITY'
        | 'GENERATED_PROVENANCE_INCONSISTENT';
      detail: string;
    };

export function validateGeneratedDraftForOwnerReview(
  value: GeneratedDraftEvidence,
): GeneratedValidation {
  const draft = value as unknown as Partial<GeneratedDraftEvidence>;
  if (draft.artifactClass !== 'GENERATED_DRAFT') {
    return {
      status: 'BLOCKED',
      reason: 'GENERATED_ARTIFACT_CLASS_MISMATCH',
      detail: 'Owner review requires exact Stage E.1 GENERATED_DRAFT evidence.',
    };
  }
  if (draft.artifactRole !== 'OWNER_GENERATED_PREPARATION') {
    return {
      status: 'BLOCKED',
      reason: 'GENERATED_ARTIFACT_ROLE_MISMATCH',
      detail: 'Generated draft artifact role does not match owner-generated preparation.',
    };
  }

  if (
    draft.schemaVersion !== 1
    || !nonempty(draft.generatedDocumentId)
    || !/^generated-document:sha256:[0-9a-f]{64}$/.test(draft.generatedDocumentId)
    || !sha256Hex(draft.generatedPdfSha256)
    || !sha256Hex(draft.officialSourceSha256)
    || !sha256Hex(draft.qpdfIntermediateSha256)
    || !sha256Hex(draft.preparationDerivativeSha256)
    || !Number.isInteger(draft.generatedByteLength)
    || (draft.generatedByteLength ?? 0) <= 0
    || !exactUtcIso(draft.preparedAtISO)
    || GENERATED_IDENTITY_STRING_FIELDS.some(field => !nonempty(draft[field]))
  ) {
    return {
      status: 'BLOCKED',
      reason: 'INVALID_GENERATED_DRAFT_IDENTITY',
      detail: 'Generated draft evidence is malformed or incomplete.',
    };
  }

  const { generatedDocumentId, ...identity } = draft as GeneratedDraftEvidence;
  let recomputed: string;
  try {
    recomputed = computeGeneratedDocumentId(identity as GeneratedDraftIdentity);
  } catch {
    return {
      status: 'BLOCKED',
      reason: 'INVALID_GENERATED_DRAFT_IDENTITY',
      detail: 'Generated draft identity cannot be canonically evaluated.',
    };
  }
  if (recomputed !== generatedDocumentId) {
    return {
      status: 'BLOCKED',
      reason: 'GENERATED_PROVENANCE_INCONSISTENT',
      detail: 'Generated draft evidence does not match its deterministic Stage E.1 document identity.',
    };
  }

  return { status: 'VALID' };
}

export function computeOwnerReviewRecordId(
  identity: OwnerReviewedDocumentIdentity,
): string {
  return `owner-review:sha256:${createHash('sha256')
    .update(canonicalizeGenerationIdentity(identity))
    .digest('hex')}`;
}

export function createOfficialFormOwnerReview(
  input: CreateOfficialFormOwnerReviewInput,
): OfficialFormOwnerReviewResult {
  const generated = validateGeneratedDraftForOwnerReview(input.generatedDraft);
  if (generated.status === 'BLOCKED') {
    return blocked(generated.reason, generated.detail);
  }

  const rendered = input.renderedAcknowledgment;
  if (rendered.renderedGeneratedDocumentId !== input.generatedDraft.generatedDocumentId) {
    return blocked(
      'RENDERED_GENERATED_DOCUMENT_ID_MISMATCH',
      'Rendered-document acknowledgment does not identify the exact generated document.',
    );
  }
  if (rendered.renderedPdfSha256 !== input.generatedDraft.generatedPdfSha256) {
    return blocked(
      'RENDERED_PDF_SHA256_MISMATCH',
      'Rendered-document acknowledgment PDF digest does not match the generated draft.',
    );
  }
  if (rendered.renderedByteLength !== input.generatedDraft.generatedByteLength) {
    return blocked(
      'RENDERED_BYTE_LENGTH_MISMATCH',
      'Rendered-document acknowledgment byte length does not match the generated draft.',
    );
  }
  if (!exactUtcIso(rendered.renderedAtISO)) {
    return blocked(
      'INVALID_RENDERED_AT',
      'renderedAtISO must be an exact caller-supplied UTC ISO timestamp.',
    );
  }
  if (!exactUtcIso(input.reviewedAtISO)) {
    return blocked(
      'INVALID_REVIEWED_AT',
      'reviewedAtISO must be an exact caller-supplied UTC ISO timestamp.',
    );
  }
  if (input.reviewedAtISO < rendered.renderedAtISO) {
    return blocked(
      'REVIEW_BEFORE_RENDER',
      'Owner review cannot precede the supplied rendered-document acknowledgment.',
    );
  }
  if (input.ownerConfirmedExactRenderedDocument !== true) {
    return blocked(
      'OWNER_CONFIRMATION_REQUIRED',
      'Owner review requires literal affirmative confirmation of the exact rendered document.',
    );
  }
  if (
    input.reviewStatement.statementId !== OWNER_REVIEW_STATEMENT_ID
    || input.reviewStatement.statementVersion !== OWNER_REVIEW_STATEMENT_VERSION
  ) {
    return blocked(
      'REVIEW_STATEMENT_IDENTITY_MISMATCH',
      'Owner-review statement identity/version does not match the governed evidence contract.',
    );
  }

  const identity: OwnerReviewedDocumentIdentity = {
    schemaVersion: OFFICIAL_FORM_OWNER_REVIEW_SCHEMA_VERSION,
    artifactClass: 'OWNER_REVIEWED_DOCUMENT',
    artifactRole: 'OWNER_GENERATED_PREPARATION',
    generatedDraft: structuredClone(input.generatedDraft),
    renderedAcknowledgment: structuredClone(rendered),
    ownerConfirmedExactRenderedDocument: true,
    reviewStatementId: OWNER_REVIEW_STATEMENT_ID,
    reviewStatementVersion: OWNER_REVIEW_STATEMENT_VERSION,
    reviewedAtISO: input.reviewedAtISO,
  };
  const evidence: OwnerReviewedDocumentEvidence = {
    ...identity,
    ownerReviewRecordId: computeOwnerReviewRecordId(identity),
  };

  return {
    status: 'OWNER_REVIEWED_DOCUMENT',
    evidence,
    signing: 'NOT_PERFORMED',
    filing: 'NOT_PERFORMED',
    service: 'NOT_PERFORMED',
    packetComposition: 'NOT_PERFORMED',
    legalSufficiency: 'NOT_EVALUATED',
    autonomousExecution: 'NOT_AUTHORIZED',
  };
}

function same(valueA: unknown, valueB: unknown): boolean {
  return canonicalizeGenerationIdentity(valueA) === canonicalizeGenerationIdentity(valueB);
}

function addGeneratedIdentityChangeReasons(
  reasons: string[],
  historical: GeneratedDraftEvidence,
  current: GeneratedDraftEvidence,
): void {
  const comparisons: readonly [string, unknown, unknown][] = [
    ['GENERATED_DOCUMENT_ID_CHANGED', historical.generatedDocumentId, current.generatedDocumentId],
    ['GENERATED_PDF_SHA256_CHANGED', historical.generatedPdfSha256, current.generatedPdfSha256],
    ['GENERATED_BYTE_LENGTH_CHANGED', historical.generatedByteLength, current.generatedByteLength],
    [
      'OFFICIAL_SOURCE_IDENTITY_CHANGED',
      [historical.officialSourceArtifactId, historical.officialSourceSnapshotId, historical.officialSourceSha256],
      [current.officialSourceArtifactId, current.officialSourceSnapshotId, current.officialSourceSha256],
    ],
    [
      'PREPARATION_IDENTITY_CHANGED',
      [
        historical.sourceAdmissionPolicyId,
        historical.sourceAdmissionStatus,
        historical.qpdfAssetIdentityDigest,
        historical.sourcePassACommandDigest,
        historical.sourcePassAWarningInventoryDigest,
        historical.sourcePassBCommandDigest,
        historical.sourcePassBWarningInventoryDigest,
        historical.sourceWarningInventoryDigest,
        historical.qpdfIntermediateSha256,
        historical.xfaPolicyId,
        historical.xfaDigest,
        historical.preparationManifestId,
        historical.preparationSourceId,
        historical.preparationDerivativeSha256,
        historical.preparationFieldEquivalenceDigest,
        historical.preparationSemanticDeltaDigest,
      ],
      [
        current.sourceAdmissionPolicyId,
        current.sourceAdmissionStatus,
        current.qpdfAssetIdentityDigest,
        current.sourcePassACommandDigest,
        current.sourcePassAWarningInventoryDigest,
        current.sourcePassBCommandDigest,
        current.sourcePassBWarningInventoryDigest,
        current.sourceWarningInventoryDigest,
        current.qpdfIntermediateSha256,
        current.xfaPolicyId,
        current.xfaDigest,
        current.preparationManifestId,
        current.preparationSourceId,
        current.preparationDerivativeSha256,
        current.preparationFieldEquivalenceDigest,
        current.preparationSemanticDeltaDigest,
      ],
    ],
    ['PREPARATION_AUTHORIZATION_CHANGED', historical.preparationAuthorizationSnapshotId, current.preparationAuthorizationSnapshotId],
    ['MAP_SNAPSHOT_CHANGED', historical.mapSnapshotId, current.mapSnapshotId],
    ['REFERENCED_FACT_SNAPSHOT_CHANGED', historical.referencedFactSnapshotId, current.referencedFactSnapshotId],
    ['GENERATION_INPUT_CHANGED', historical.generationInputId, current.generationInputId],
    [
      'GENERATOR_IDENTITY_CHANGED',
      [historical.generatorContractVersion, historical.generatorImplementationId, historical.generatorImplementationVersion],
      [current.generatorContractVersion, current.generatorImplementationId, current.generatorImplementationVersion],
    ],
    ['FIELD_WRITE_PLAN_CHANGED', historical.fieldWritePlanDigest, current.fieldWritePlanDigest],
    ['PREPARED_AT_CHANGED', historical.preparedAtISO, current.preparedAtISO],
  ];

  for (const [reason, historicalValue, currentValue] of comparisons) {
    if (!same(historicalValue, currentValue)) reasons.push(reason);
  }
}

export function evaluateOfficialFormOwnerReviewCurrentness(
  review: OwnerReviewedDocumentEvidence,
  currentGeneratedDraft: GeneratedDraftEvidence,
  generatedDraftCurrentness: GeneratedDraftCurrentness,
): OwnerReviewedDocumentCurrentness {
  const reasons: string[] = [];

  const { ownerReviewRecordId, ...reviewIdentity } = review;
  try {
    if (computeOwnerReviewRecordId(reviewIdentity) !== ownerReviewRecordId) {
      reasons.push('OWNER_REVIEW_RECORD_ID_CHANGED');
    }
  } catch {
    reasons.push('OWNER_REVIEW_RECORD_ID_INVALID');
  }

  const boundGenerated = validateGeneratedDraftForOwnerReview(review.generatedDraft);
  if (boundGenerated.status === 'BLOCKED') {
    reasons.push(`BOUND_GENERATED_DRAFT_INVALID:${boundGenerated.reason}`);
  }

  const currentGenerated = validateGeneratedDraftForOwnerReview(currentGeneratedDraft);
  if (currentGenerated.status === 'BLOCKED') {
    reasons.push(`CURRENT_GENERATED_DRAFT_INVALID:${currentGenerated.reason}`);
  }

  if (generatedDraftCurrentness.status === 'OUT_OF_DATE') {
    if (generatedDraftCurrentness.reasons.length === 0) {
      reasons.push('GENERATED_DRAFT_OUT_OF_DATE');
    } else {
      for (const reason of generatedDraftCurrentness.reasons) {
        reasons.push(`GENERATED_DRAFT_OUT_OF_DATE:${reason}`);
      }
    }
  }

  addGeneratedIdentityChangeReasons(reasons, review.generatedDraft, currentGeneratedDraft);

  return reasons.length === 0
    ? { status: 'CURRENT', reasons: [] }
    : { status: 'OUT_OF_DATE', reasons };
}
