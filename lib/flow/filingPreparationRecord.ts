import { createHash } from 'node:crypto';
import { canonicalizeGenerationIdentity } from './officialFormGenerationBinding';
import {
  type GeneratedDraftCurrentness,
  type GeneratedDraftEvidence,
} from './officialFormGeneratedDraft';
import {
  computeOwnerReviewRecordId,
  evaluateOfficialFormOwnerReviewCurrentness,
  OWNER_REVIEW_STATEMENT_ID,
  OWNER_REVIEW_STATEMENT_VERSION,
  validateGeneratedDraftForOwnerReview,
  type OwnerReviewedDocumentEvidence,
  type OwnerReviewedDocumentIdentity,
} from './officialFormOwnerReview';

export const FILING_PREPARATION_RECORD_SCHEMA_VERSION = 1 as const;
export const FILING_PREPARATION_RECORD_CLASS = 'FILING_PREPARATION_RECORD' as const;

export interface FilingPreparationRecordIdentity {
  schemaVersion: typeof FILING_PREPARATION_RECORD_SCHEMA_VERSION;
  recordClass: typeof FILING_PREPARATION_RECORD_CLASS;
  ownerReviewEvidence: Readonly<OwnerReviewedDocumentEvidence>;
}

export interface FilingPreparationRecord extends FilingPreparationRecordIdentity {
  filingPreparationRecordId: string;
  persistenceContract: 'SATISFIED';
  persistence: 'NOT_PERFORMED';
  stageF: 'HELD';
  signing: 'NOT_PERFORMED';
  filing: 'NOT_PERFORMED';
  courtSubmission: 'NOT_PERFORMED';
  courtAcceptance: 'NOT_EVALUATED';
  service: 'NOT_PERFORMED';
  packetComposition: 'NOT_PERFORMED';
  legalSufficiency: 'NOT_EVALUATED';
  autonomousExecution: 'NOT_AUTHORIZED';
}

export type FilingPreparationRecordBlockReason =
  | 'INVALID_INPUT_SHAPE'
  | 'INVALID_GENERATED_DRAFT_CURRENTNESS'
  | 'INVALID_GENERATED_DRAFT_EVIDENCE'
  | 'INVALID_OWNER_REVIEW_EVIDENCE'
  | 'OWNER_REVIEW_RECORD_ID_MISMATCH'
  | 'RENDERED_DOCUMENT_BINDING_MISMATCH'
  | 'CURRENT_GENERATED_DRAFT_MISMATCH'
  | 'GENERATED_DRAFT_OUT_OF_DATE'
  | 'OWNER_REVIEW_OUT_OF_DATE'
  | 'FILING_PREPARATION_RECORD_ID_MISMATCH'
  | 'BOUNDARY_INVARIANT_MISMATCH';

export type FilingPreparationRecordBuildResult =
  | {
      status: 'BLOCKED';
      blockReason: FilingPreparationRecordBlockReason;
      detail: string;
      record: null;
      persistence: 'NOT_PERFORMED';
      stageF: 'HELD';
    }
  | {
      status: 'FILING_PREPARATION_RECORD';
      record: FilingPreparationRecord;
      persistence: 'NOT_PERFORMED';
      stageF: 'HELD';
    };

export type FilingPreparationRecordValidationResult =
  | { status: 'VALID'; record: FilingPreparationRecord }
  | {
      status: 'BLOCKED';
      blockReason: FilingPreparationRecordBlockReason;
      detail: string;
      record: null;
    };

export interface CreateFilingPreparationRecordInput {
  ownerReviewEvidence: unknown;
  currentGeneratedDraft: unknown;
  generatedDraftCurrentness: unknown;
}

export interface EvaluateFilingPreparationRecordAdmissionInput {
  record: unknown;
  currentGeneratedDraft: unknown;
  generatedDraftCurrentness: unknown;
}

const GENERATED_DRAFT_KEYS = [
  'schemaVersion',
  'artifactClass',
  'artifactRole',
  'officialSourceArtifactId',
  'officialSourceSnapshotId',
  'officialSourceSha256',
  'sourceAdmissionPolicyId',
  'sourceAdmissionStatus',
  'qpdfAssetIdentityDigest',
  'sourcePassACommandDigest',
  'sourcePassAWarningInventoryDigest',
  'sourcePassBCommandDigest',
  'sourcePassBWarningInventoryDigest',
  'sourceWarningInventoryDigest',
  'qpdfIntermediateSha256',
  'xfaPolicyId',
  'xfaDigest',
  'preparationManifestId',
  'preparationSourceId',
  'preparationDerivativeSha256',
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
  'preparedAtISO',
  'generatedPdfSha256',
  'generatedByteLength',
  'generatedDocumentId',
] as const;

const OWNER_REVIEW_KEYS = [
  'schemaVersion',
  'artifactClass',
  'artifactRole',
  'generatedDraft',
  'renderedAcknowledgment',
  'ownerConfirmedExactRenderedDocument',
  'reviewStatementId',
  'reviewStatementVersion',
  'reviewedAtISO',
  'ownerReviewRecordId',
] as const;

const RENDERED_ACK_KEYS = [
  'renderedGeneratedDocumentId',
  'renderedPdfSha256',
  'renderedByteLength',
  'renderedAtISO',
] as const;

const RECORD_KEYS = [
  'schemaVersion',
  'recordClass',
  'ownerReviewEvidence',
  'filingPreparationRecordId',
  'persistenceContract',
  'persistence',
  'stageF',
  'signing',
  'filing',
  'courtSubmission',
  'courtAcceptance',
  'service',
  'packetComposition',
  'legalSufficiency',
  'autonomousExecution',
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

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

function generatedDraftShape(value: unknown): value is GeneratedDraftEvidence {
  if (!isPlainObject(value) || !hasExactKeys(value, GENERATED_DRAFT_KEYS)) return false;
  if (value.schemaVersion !== 1
    || value.artifactClass !== 'GENERATED_DRAFT'
    || value.artifactRole !== 'OWNER_GENERATED_PREPARATION') return false;
  if (value.sourceAdmissionStatus !== 'SOURCE_ADMITTED_CLEAN'
    && value.sourceAdmissionStatus !== 'SOURCE_ADMITTED_WITH_ISOLATED_LINEARIZATION_WARNINGS') return false;
  return true;
}

function generatedCurrentnessShape(value: unknown): value is GeneratedDraftCurrentness {
  if (!isPlainObject(value) || !hasExactKeys(value, ['status', 'reasons']) || !Array.isArray(value.reasons)) {
    return false;
  }
  if (value.reasons.some(reason => typeof reason !== 'string')) return false;
  if (value.status === 'CURRENT') return value.reasons.length === 0;
  return value.status === 'OUT_OF_DATE';
}

function validateOwnerReviewEvidence(value: unknown):
  | { status: 'VALID'; evidence: OwnerReviewedDocumentEvidence }
  | { status: 'BLOCKED'; blockReason: FilingPreparationRecordBlockReason; detail: string } {
  if (!isPlainObject(value) || !hasExactKeys(value, OWNER_REVIEW_KEYS)) {
    return { status: 'BLOCKED', blockReason: 'INVALID_OWNER_REVIEW_EVIDENCE', detail: 'Owner-review evidence has an invalid serialized shape.' };
  }
  if (value.schemaVersion !== 1
    || value.artifactClass !== 'OWNER_REVIEWED_DOCUMENT'
    || value.artifactRole !== 'OWNER_GENERATED_PREPARATION'
    || value.ownerConfirmedExactRenderedDocument !== true
    || value.reviewStatementId !== OWNER_REVIEW_STATEMENT_ID
    || value.reviewStatementVersion !== OWNER_REVIEW_STATEMENT_VERSION
    || !exactUtcIso(value.reviewedAtISO)
    || !nonempty(value.ownerReviewRecordId)
    || !/^owner-review:sha256:[0-9a-f]{64}$/.test(value.ownerReviewRecordId)) {
    return { status: 'BLOCKED', blockReason: 'INVALID_OWNER_REVIEW_EVIDENCE', detail: 'Owner-review identity, finite values, or affirmative confirmation are invalid.' };
  }
  if (!generatedDraftShape(value.generatedDraft)) {
    return { status: 'BLOCKED', blockReason: 'INVALID_GENERATED_DRAFT_EVIDENCE', detail: 'Bound generated-draft evidence has an invalid serialized shape.' };
  }
  const generatedValidation = validateGeneratedDraftForOwnerReview(value.generatedDraft);
  if (generatedValidation.status === 'BLOCKED') {
    return { status: 'BLOCKED', blockReason: 'INVALID_GENERATED_DRAFT_EVIDENCE', detail: generatedValidation.detail };
  }
  if (!isPlainObject(value.renderedAcknowledgment)
    || !hasExactKeys(value.renderedAcknowledgment, RENDERED_ACK_KEYS)
    || !nonempty(value.renderedAcknowledgment.renderedGeneratedDocumentId)
    || !sha256Hex(value.renderedAcknowledgment.renderedPdfSha256)
    || !Number.isInteger(value.renderedAcknowledgment.renderedByteLength)
    || Number(value.renderedAcknowledgment.renderedByteLength) <= 0
    || !exactUtcIso(value.renderedAcknowledgment.renderedAtISO)) {
    return { status: 'BLOCKED', blockReason: 'INVALID_OWNER_REVIEW_EVIDENCE', detail: 'Rendered-document acknowledgment has an invalid serialized shape or value.' };
  }

  const generated = value.generatedDraft;
  const rendered = value.renderedAcknowledgment as unknown as OwnerReviewedDocumentEvidence['renderedAcknowledgment'];
  if (rendered.renderedGeneratedDocumentId !== generated.generatedDocumentId
    || rendered.renderedPdfSha256 !== generated.generatedPdfSha256
    || rendered.renderedByteLength !== generated.generatedByteLength
    || String(value.reviewedAtISO) < rendered.renderedAtISO) {
    return { status: 'BLOCKED', blockReason: 'RENDERED_DOCUMENT_BINDING_MISMATCH', detail: 'Rendered-document acknowledgment does not bind the exact reviewed generated bytes/identity.' };
  }

  const evidence = value as unknown as OwnerReviewedDocumentEvidence;
  const { ownerReviewRecordId, ...identity } = evidence;
  try {
    if (computeOwnerReviewRecordId(identity as OwnerReviewedDocumentIdentity) !== ownerReviewRecordId) {
      return { status: 'BLOCKED', blockReason: 'OWNER_REVIEW_RECORD_ID_MISMATCH', detail: 'ownerReviewRecordId does not recompute from the exact canonical review evidence.' };
    }
  } catch {
    return { status: 'BLOCKED', blockReason: 'INVALID_OWNER_REVIEW_EVIDENCE', detail: 'Owner-review identity cannot be canonically evaluated.' };
  }
  return { status: 'VALID', evidence };
}

function validateCurrentGeneratedDraft(value: unknown):
  | { status: 'VALID'; evidence: GeneratedDraftEvidence }
  | { status: 'BLOCKED'; blockReason: FilingPreparationRecordBlockReason; detail: string } {
  if (!generatedDraftShape(value)) {
    return { status: 'BLOCKED', blockReason: 'INVALID_GENERATED_DRAFT_EVIDENCE', detail: 'Current generated-draft evidence has an invalid serialized shape.' };
  }
  const validation = validateGeneratedDraftForOwnerReview(value);
  if (validation.status === 'BLOCKED') {
    return { status: 'BLOCKED', blockReason: 'INVALID_GENERATED_DRAFT_EVIDENCE', detail: validation.detail };
  }
  return { status: 'VALID', evidence: value };
}

function boundaryFieldsAreExact(value: Record<string, unknown>): boolean {
  return value.persistenceContract === 'SATISFIED'
    && value.persistence === 'NOT_PERFORMED'
    && value.stageF === 'HELD'
    && value.signing === 'NOT_PERFORMED'
    && value.filing === 'NOT_PERFORMED'
    && value.courtSubmission === 'NOT_PERFORMED'
    && value.courtAcceptance === 'NOT_EVALUATED'
    && value.service === 'NOT_PERFORMED'
    && value.packetComposition === 'NOT_PERFORMED'
    && value.legalSufficiency === 'NOT_EVALUATED'
    && value.autonomousExecution === 'NOT_AUTHORIZED';
}

function blocked(
  blockReason: FilingPreparationRecordBlockReason,
  detail: string,
): FilingPreparationRecordBuildResult {
  return {
    status: 'BLOCKED',
    blockReason,
    detail,
    record: null,
    persistence: 'NOT_PERFORMED',
    stageF: 'HELD',
  };
}

export function computeFilingPreparationRecordId(identity: FilingPreparationRecordIdentity): string {
  return `filing-preparation-record:sha256:${createHash('sha256')
    .update(canonicalizeGenerationIdentity(identity))
    .digest('hex')}`;
}

export function validateFilingPreparationRecord(value: unknown): FilingPreparationRecordValidationResult {
  if (!isPlainObject(value) || !hasExactKeys(value, RECORD_KEYS)) {
    return { status: 'BLOCKED', blockReason: 'INVALID_INPUT_SHAPE', detail: 'Filing-preparation record has an invalid serialized shape.', record: null };
  }
  if (value.schemaVersion !== FILING_PREPARATION_RECORD_SCHEMA_VERSION
    || value.recordClass !== FILING_PREPARATION_RECORD_CLASS
    || !nonempty(value.filingPreparationRecordId)
    || !/^filing-preparation-record:sha256:[0-9a-f]{64}$/.test(value.filingPreparationRecordId)) {
    return { status: 'BLOCKED', blockReason: 'INVALID_INPUT_SHAPE', detail: 'Filing-preparation record identity fields are invalid.', record: null };
  }
  if (!boundaryFieldsAreExact(value)) {
    return { status: 'BLOCKED', blockReason: 'BOUNDARY_INVARIANT_MISMATCH', detail: 'E2.3 record boundary/persistence invariants are invalid.', record: null };
  }
  const ownerReview = validateOwnerReviewEvidence(value.ownerReviewEvidence);
  if (ownerReview.status === 'BLOCKED') return { ...ownerReview, record: null };

  const record = value as unknown as FilingPreparationRecord;
  const identity: FilingPreparationRecordIdentity = {
    schemaVersion: record.schemaVersion,
    recordClass: record.recordClass,
    ownerReviewEvidence: record.ownerReviewEvidence,
  };
  let recomputed: string;
  try {
    recomputed = computeFilingPreparationRecordId(identity);
  } catch {
    return { status: 'BLOCKED', blockReason: 'INVALID_INPUT_SHAPE', detail: 'Filing-preparation record cannot be canonically evaluated.', record: null };
  }
  if (recomputed !== record.filingPreparationRecordId) {
    return { status: 'BLOCKED', blockReason: 'FILING_PREPARATION_RECORD_ID_MISMATCH', detail: 'filingPreparationRecordId does not recompute from exact canonical evidence.', record: null };
  }
  return { status: 'VALID', record };
}

export function evaluateFilingPreparationRecordAdmission(
  input: EvaluateFilingPreparationRecordAdmissionInput,
): FilingPreparationRecordBuildResult {
  const recordValidation = validateFilingPreparationRecord(input.record);
  if (recordValidation.status === 'BLOCKED') return blocked(recordValidation.blockReason, recordValidation.detail);
  if (!generatedCurrentnessShape(input.generatedDraftCurrentness)) {
    return blocked('INVALID_GENERATED_DRAFT_CURRENTNESS', 'Generated-draft currentness evidence has an invalid finite shape.');
  }
  const currentGenerated = validateCurrentGeneratedDraft(input.currentGeneratedDraft);
  if (currentGenerated.status === 'BLOCKED') return blocked(currentGenerated.blockReason, currentGenerated.detail);

  const record = recordValidation.record;
  const boundGenerated = record.ownerReviewEvidence.generatedDraft;
  if (canonicalizeGenerationIdentity(boundGenerated) !== canonicalizeGenerationIdentity(currentGenerated.evidence)) {
    return blocked('CURRENT_GENERATED_DRAFT_MISMATCH', 'The reviewed generated draft is not the exact supplied current generated draft.');
  }
  if (input.generatedDraftCurrentness.status === 'OUT_OF_DATE') {
    return blocked('GENERATED_DRAFT_OUT_OF_DATE', 'Canonical generated-draft currentness is OUT_OF_DATE.');
  }

  const ownerCurrentness = evaluateOfficialFormOwnerReviewCurrentness(
    record.ownerReviewEvidence,
    currentGenerated.evidence,
    input.generatedDraftCurrentness,
  );
  if (ownerCurrentness.status === 'OUT_OF_DATE') {
    return blocked('OWNER_REVIEW_OUT_OF_DATE', `Canonical owner-review currentness is OUT_OF_DATE: ${ownerCurrentness.reasons.join(',')}`);
  }

  return {
    status: 'FILING_PREPARATION_RECORD',
    record,
    persistence: 'NOT_PERFORMED',
    stageF: 'HELD',
  };
}

export function createFilingPreparationRecord(
  input: CreateFilingPreparationRecordInput,
): FilingPreparationRecordBuildResult {
  const ownerReview = validateOwnerReviewEvidence(input.ownerReviewEvidence);
  if (ownerReview.status === 'BLOCKED') return blocked(ownerReview.blockReason, ownerReview.detail);
  if (!generatedCurrentnessShape(input.generatedDraftCurrentness)) {
    return blocked('INVALID_GENERATED_DRAFT_CURRENTNESS', 'Generated-draft currentness evidence has an invalid finite shape.');
  }
  const currentGenerated = validateCurrentGeneratedDraft(input.currentGeneratedDraft);
  if (currentGenerated.status === 'BLOCKED') return blocked(currentGenerated.blockReason, currentGenerated.detail);

  const identity: FilingPreparationRecordIdentity = {
    schemaVersion: FILING_PREPARATION_RECORD_SCHEMA_VERSION,
    recordClass: FILING_PREPARATION_RECORD_CLASS,
    ownerReviewEvidence: structuredClone(ownerReview.evidence),
  };
  const record: FilingPreparationRecord = {
    ...identity,
    filingPreparationRecordId: computeFilingPreparationRecordId(identity),
    persistenceContract: 'SATISFIED',
    persistence: 'NOT_PERFORMED',
    stageF: 'HELD',
    signing: 'NOT_PERFORMED',
    filing: 'NOT_PERFORMED',
    courtSubmission: 'NOT_PERFORMED',
    courtAcceptance: 'NOT_EVALUATED',
    service: 'NOT_PERFORMED',
    packetComposition: 'NOT_PERFORMED',
    legalSufficiency: 'NOT_EVALUATED',
    autonomousExecution: 'NOT_AUTHORIZED',
  };

  return evaluateFilingPreparationRecordAdmission({
    record,
    currentGeneratedDraft: currentGenerated.evidence,
    generatedDraftCurrentness: input.generatedDraftCurrentness,
  });
}
