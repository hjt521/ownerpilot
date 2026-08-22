import { createHash } from 'node:crypto';
import { canonicalizeGenerationIdentity } from './officialFormGenerationBinding';
import {
  sha256Bytes,
  type GeneratedDraftEvidence,
} from './officialFormGeneratedDraft';
import {
  computeOwnerReviewRecordId,
  OWNER_REVIEW_STATEMENT_ID,
  OWNER_REVIEW_STATEMENT_VERSION,
  validateGeneratedDraftForOwnerReview,
  type OwnerReviewedDocumentEvidence,
  type OwnerReviewedDocumentIdentity,
} from './officialFormOwnerReview';

export const FILING_PREPARATION_CURRENT_STATE_SCHEMA_VERSION = 1 as const;
export const FILING_PREPARATION_CURRENT_STATE_CLASS = 'FILING_PREPARATION_CURRENT_STATE' as const;

export interface FilingPreparationCanonicalSnapshot {
  officialSourceArtifactId: string;
  officialSourceSnapshotId: string;
  officialSourceSha256: string;
  sourceAdmissionPolicyId: string;
  sourceAdmissionStatus:
    | 'SOURCE_ADMITTED_CLEAN'
    | 'SOURCE_ADMITTED_WITH_ISOLATED_LINEARIZATION_WARNINGS';
  qpdfAssetIdentityDigest: string;
  sourcePassACommandDigest: string;
  sourcePassAWarningInventoryDigest: string;
  sourcePassBCommandDigest: string;
  sourcePassBWarningInventoryDigest: string;
  sourceWarningInventoryDigest: string;
  qpdfIntermediateSha256: string;
  xfaPolicyId: string;
  xfaDigest: string;
  preparationManifestId: string;
  preparationSourceId: string;
  preparationDerivativeSha256: string;
  preparationFieldEquivalenceDigest: string;
  preparationSemanticDeltaDigest: string;
  preparationAuthorizationSnapshotId: string;
  mapSnapshotId: string;
  referencedFactSnapshotId: string;
  generationInputId: string;
  generatorContractVersion: string;
  generatorImplementationId: string;
  generatorImplementationVersion: string;
  fieldWritePlanDigest: string;
}

export interface FilingPreparationGeneratedDraftBinding {
  revision: number;
  generatedDraft: Readonly<GeneratedDraftEvidence>;
}

export interface FilingPreparationOwnerReviewBinding {
  revision: number;
  ownerReviewEvidence: Readonly<OwnerReviewedDocumentEvidence>;
}

interface HeldAuthorityBoundary {
  stageF: 'HELD';
  packetComposition: 'NOT_PERFORMED';
  signing: 'NOT_PERFORMED';
  filing: 'NOT_PERFORMED';
  courtSubmission: 'NOT_PERFORMED';
  service: 'NOT_PERFORMED';
  legalSufficiency: 'NOT_EVALUATED';
  autonomousExecution: 'NOT_AUTHORIZED';
}

export interface FilingPreparationCurrentStateIdentity extends HeldAuthorityBoundary {
  schemaVersion: typeof FILING_PREPARATION_CURRENT_STATE_SCHEMA_VERSION;
  recordClass: typeof FILING_PREPARATION_CURRENT_STATE_CLASS;
  authenticatedUserId: string;
  riskpathRecordId: string;
  revision: number;
  preparationSnapshot: Readonly<FilingPreparationCanonicalSnapshot>;
  generatedDraftBinding: Readonly<FilingPreparationGeneratedDraftBinding> | null;
  ownerReviewBinding: Readonly<FilingPreparationOwnerReviewBinding> | null;
}

export interface FilingPreparationCurrentState extends FilingPreparationCurrentStateIdentity {
  filingPreparationCurrentStateId: string;
  generatedDraftBytes: Uint8Array | null;
}

export interface CreateFilingPreparationCurrentStateInput {
  authenticatedUserId: string;
  riskpathRecordId: string;
  revision: number;
  preparationSnapshot: unknown;
  generatedDraftBinding: unknown;
  generatedDraftBytes: unknown;
  ownerReviewBinding: unknown;
}

export type FilingPreparationCurrentStateBlockReason =
  | 'INVALID_INPUT_SHAPE'
  | 'INVALID_AUTHENTICATED_USER_ID'
  | 'INVALID_RISKPATH_RECORD_ID'
  | 'INVALID_REVISION'
  | 'INVALID_PREPARATION_SNAPSHOT'
  | 'INVALID_GENERATED_DRAFT_BINDING'
  | 'GENERATED_DRAFT_REVISION_MISMATCH'
  | 'GENERATED_DRAFT_PREPARATION_MISMATCH'
  | 'GENERATED_DRAFT_BYTES_REQUIRED'
  | 'UNBOUND_GENERATED_DRAFT_BYTES'
  | 'GENERATED_DRAFT_BYTE_LENGTH_MISMATCH'
  | 'GENERATED_DRAFT_SHA256_MISMATCH'
  | 'INVALID_OWNER_REVIEW_BINDING'
  | 'OWNER_REVIEW_REQUIRES_GENERATED_DRAFT'
  | 'OWNER_REVIEW_REVISION_MISMATCH'
  | 'OWNER_REVIEW_GENERATED_DRAFT_MISMATCH'
  | 'OWNER_REVIEW_INVALID'
  | 'CURRENT_STATE_ID_MISMATCH'
  | 'BOUNDARY_INVARIANT_MISMATCH';

export type FilingPreparationCurrentStateBuildResult =
  | {
      status: 'BLOCKED';
      blockReason: FilingPreparationCurrentStateBlockReason;
      detail: string;
      currentState: null;
      stageF: 'HELD';
    }
  | {
      status: 'CURRENT_STATE_REVISION';
      currentState: FilingPreparationCurrentState;
      stageF: 'HELD';
    };

export type FilingPreparationCurrentStateValidationResult =
  | { status: 'VALID'; currentState: FilingPreparationCurrentState }
  | {
      status: 'BLOCKED';
      blockReason: FilingPreparationCurrentStateBlockReason;
      detail: string;
      currentState: null;
    };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CURRENT_STATE_ID_RE = /^filing-preparation-current-state:sha256:[0-9a-f]{64}$/;

const CREATE_INPUT_KEYS = [
  'authenticatedUserId',
  'riskpathRecordId',
  'revision',
  'preparationSnapshot',
  'generatedDraftBinding',
  'generatedDraftBytes',
  'ownerReviewBinding',
] as const;

const CURRENT_STATE_KEYS = [
  'schemaVersion',
  'recordClass',
  'authenticatedUserId',
  'riskpathRecordId',
  'revision',
  'preparationSnapshot',
  'generatedDraftBinding',
  'ownerReviewBinding',
  'stageF',
  'packetComposition',
  'signing',
  'filing',
  'courtSubmission',
  'service',
  'legalSufficiency',
  'autonomousExecution',
  'filingPreparationCurrentStateId',
  'generatedDraftBytes',
] as const;

const PREPARATION_SNAPSHOT_KEYS = [
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
] as const satisfies readonly (keyof FilingPreparationCanonicalSnapshot)[];

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

const HELD_AUTHORITY_BOUNDARY: HeldAuthorityBoundary = Object.freeze({
  stageF: 'HELD',
  packetComposition: 'NOT_PERFORMED',
  signing: 'NOT_PERFORMED',
  filing: 'NOT_PERFORMED',
  courtSubmission: 'NOT_PERFORMED',
  service: 'NOT_PERFORMED',
  legalSufficiency: 'NOT_EVALUATED',
  autonomousExecution: 'NOT_AUTHORIZED',
});

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

function positiveIntegralRevision(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function boundaryFieldsAreExact(value: Record<string, unknown>): boolean {
  return value.stageF === 'HELD'
    && value.packetComposition === 'NOT_PERFORMED'
    && value.signing === 'NOT_PERFORMED'
    && value.filing === 'NOT_PERFORMED'
    && value.courtSubmission === 'NOT_PERFORMED'
    && value.service === 'NOT_PERFORMED'
    && value.legalSufficiency === 'NOT_EVALUATED'
    && value.autonomousExecution === 'NOT_AUTHORIZED';
}

function preparationSnapshotShape(value: unknown): value is FilingPreparationCanonicalSnapshot {
  if (!isPlainObject(value) || !hasExactKeys(value, PREPARATION_SNAPSHOT_KEYS)) return false;
  if (PREPARATION_SNAPSHOT_KEYS.some(key => !nonempty(value[key]))) return false;
  if (!sha256Hex(value.officialSourceSha256)
    || !sha256Hex(value.qpdfIntermediateSha256)
    || !sha256Hex(value.preparationDerivativeSha256)) return false;
  return value.sourceAdmissionStatus === 'SOURCE_ADMITTED_CLEAN'
    || value.sourceAdmissionStatus === 'SOURCE_ADMITTED_WITH_ISOLATED_LINEARIZATION_WARNINGS';
}

function generatedDraftShape(value: unknown): value is GeneratedDraftEvidence {
  if (!isPlainObject(value) || !hasExactKeys(value, GENERATED_DRAFT_KEYS)) return false;
  if (value.schemaVersion !== 1
    || value.artifactClass !== 'GENERATED_DRAFT'
    || value.artifactRole !== 'OWNER_GENERATED_PREPARATION') return false;
  return validateGeneratedDraftForOwnerReview(value as unknown as GeneratedDraftEvidence).status === 'VALID';
}

function snapshotMatchesGeneratedDraft(
  snapshot: FilingPreparationCanonicalSnapshot,
  draft: GeneratedDraftEvidence,
): boolean {
  return PREPARATION_SNAPSHOT_KEYS.every(key => snapshot[key] === draft[key]);
}

function generatedBindingValidation(
  value: unknown,
  revision: number,
  snapshot: FilingPreparationCanonicalSnapshot,
):
  | { status: 'ABSENT' }
  | { status: 'VALID'; binding: FilingPreparationGeneratedDraftBinding }
  | { status: 'BLOCKED'; blockReason: FilingPreparationCurrentStateBlockReason; detail: string } {
  if (value === null) return { status: 'ABSENT' };
  if (!isPlainObject(value) || !hasExactKeys(value, ['revision', 'generatedDraft'])) {
    return { status: 'BLOCKED', blockReason: 'INVALID_GENERATED_DRAFT_BINDING', detail: 'Generated-draft binding has an invalid serialized shape.' };
  }
  if (!positiveIntegralRevision(value.revision)) {
    return { status: 'BLOCKED', blockReason: 'INVALID_GENERATED_DRAFT_BINDING', detail: 'Generated-draft binding revision must be a positive integer.' };
  }
  if (value.revision !== revision) {
    return { status: 'BLOCKED', blockReason: 'GENERATED_DRAFT_REVISION_MISMATCH', detail: 'Generated-draft evidence must bind the exact current-state revision.' };
  }
  if (!generatedDraftShape(value.generatedDraft)) {
    return { status: 'BLOCKED', blockReason: 'INVALID_GENERATED_DRAFT_BINDING', detail: 'Generated-draft evidence is malformed or intrinsically invalid.' };
  }
  if (!snapshotMatchesGeneratedDraft(snapshot, value.generatedDraft)) {
    return { status: 'BLOCKED', blockReason: 'GENERATED_DRAFT_PREPARATION_MISMATCH', detail: 'Generated-draft evidence does not match the exact committed preparation snapshot.' };
  }
  return {
    status: 'VALID',
    binding: {
      revision,
      generatedDraft: value.generatedDraft,
    },
  };
}

function ownerReviewEvidenceValidation(
  value: unknown,
):
  | { status: 'VALID'; evidence: OwnerReviewedDocumentEvidence }
  | { status: 'BLOCKED'; detail: string } {
  if (!isPlainObject(value) || !hasExactKeys(value, OWNER_REVIEW_KEYS)) {
    return { status: 'BLOCKED', detail: 'Owner Review evidence has an invalid serialized shape.' };
  }
  if (value.schemaVersion !== 1
    || value.artifactClass !== 'OWNER_REVIEWED_DOCUMENT'
    || value.artifactRole !== 'OWNER_GENERATED_PREPARATION'
    || value.ownerConfirmedExactRenderedDocument !== true
    || value.reviewStatementId !== OWNER_REVIEW_STATEMENT_ID
    || value.reviewStatementVersion !== OWNER_REVIEW_STATEMENT_VERSION
    || !exactUtcIso(value.reviewedAtISO)
    || !nonempty(value.ownerReviewRecordId)
    || !/^owner-review:sha256:[0-9a-f]{64}$/.test(value.ownerReviewRecordId)
    || !generatedDraftShape(value.generatedDraft)) {
    return { status: 'BLOCKED', detail: 'Owner Review identity or bound generated-draft evidence is invalid.' };
  }
  if (!isPlainObject(value.renderedAcknowledgment)
    || !hasExactKeys(value.renderedAcknowledgment, RENDERED_ACK_KEYS)
    || !nonempty(value.renderedAcknowledgment.renderedGeneratedDocumentId)
    || !sha256Hex(value.renderedAcknowledgment.renderedPdfSha256)
    || !positiveIntegralRevision(value.renderedAcknowledgment.renderedByteLength)
    || !exactUtcIso(value.renderedAcknowledgment.renderedAtISO)) {
    return { status: 'BLOCKED', detail: 'Owner Review rendered-document acknowledgment is invalid.' };
  }

  const generatedDraft = value.generatedDraft;
  const rendered = value.renderedAcknowledgment;
  if (rendered.renderedGeneratedDocumentId !== generatedDraft.generatedDocumentId
    || rendered.renderedPdfSha256 !== generatedDraft.generatedPdfSha256
    || rendered.renderedByteLength !== generatedDraft.generatedByteLength
    || String(value.reviewedAtISO) < String(rendered.renderedAtISO)) {
    return { status: 'BLOCKED', detail: 'Owner Review does not intrinsically bind the exact rendered generated draft.' };
  }

  const evidence = value as unknown as OwnerReviewedDocumentEvidence;
  const { ownerReviewRecordId, ...identity } = evidence;
  try {
    if (computeOwnerReviewRecordId(identity as OwnerReviewedDocumentIdentity) !== ownerReviewRecordId) {
      return { status: 'BLOCKED', detail: 'Owner Review deterministic record identity does not recompute.' };
    }
  } catch {
    return { status: 'BLOCKED', detail: 'Owner Review identity cannot be canonically evaluated.' };
  }
  return { status: 'VALID', evidence };
}

function ownerReviewBindingValidation(
  value: unknown,
  revision: number,
  generatedBinding: FilingPreparationGeneratedDraftBinding | null,
):
  | { status: 'ABSENT' }
  | { status: 'VALID'; binding: FilingPreparationOwnerReviewBinding }
  | { status: 'BLOCKED'; blockReason: FilingPreparationCurrentStateBlockReason; detail: string } {
  if (value === null) return { status: 'ABSENT' };
  if (generatedBinding === null) {
    return { status: 'BLOCKED', blockReason: 'OWNER_REVIEW_REQUIRES_GENERATED_DRAFT', detail: 'Owner Review cannot bind a revision without an exact generated-draft binding.' };
  }
  if (!isPlainObject(value) || !hasExactKeys(value, ['revision', 'ownerReviewEvidence'])) {
    return { status: 'BLOCKED', blockReason: 'INVALID_OWNER_REVIEW_BINDING', detail: 'Owner Review binding has an invalid serialized shape.' };
  }
  if (!positiveIntegralRevision(value.revision)) {
    return { status: 'BLOCKED', blockReason: 'INVALID_OWNER_REVIEW_BINDING', detail: 'Owner Review binding revision must be a positive integer.' };
  }
  if (value.revision !== revision) {
    return { status: 'BLOCKED', blockReason: 'OWNER_REVIEW_REVISION_MISMATCH', detail: 'Owner Review evidence must bind the exact current-state revision.' };
  }
  const validated = ownerReviewEvidenceValidation(value.ownerReviewEvidence);
  if (validated.status === 'BLOCKED') {
    return { status: 'BLOCKED', blockReason: 'OWNER_REVIEW_INVALID', detail: validated.detail };
  }
  if (canonicalizeGenerationIdentity(validated.evidence.generatedDraft)
    !== canonicalizeGenerationIdentity(generatedBinding.generatedDraft)) {
    return { status: 'BLOCKED', blockReason: 'OWNER_REVIEW_GENERATED_DRAFT_MISMATCH', detail: 'Owner Review must bind the exact generated document identity on this revision.' };
  }
  return {
    status: 'VALID',
    binding: {
      revision,
      ownerReviewEvidence: validated.evidence,
    },
  };
}

function generatedBytesValidation(
  value: unknown,
  generatedBinding: FilingPreparationGeneratedDraftBinding | null,
):
  | { status: 'VALID'; bytes: Uint8Array | null }
  | { status: 'BLOCKED'; blockReason: FilingPreparationCurrentStateBlockReason; detail: string } {
  if (generatedBinding === null) {
    if (value !== null) {
      return { status: 'BLOCKED', blockReason: 'UNBOUND_GENERATED_DRAFT_BYTES', detail: 'Generated-draft bytes cannot exist without a generated-draft binding.' };
    }
    return { status: 'VALID', bytes: null };
  }
  if (!(value instanceof Uint8Array)) {
    return { status: 'BLOCKED', blockReason: 'GENERATED_DRAFT_BYTES_REQUIRED', detail: 'An exact generated-draft binding requires the exact generated bytes.' };
  }
  const evidence = generatedBinding.generatedDraft;
  if (value.byteLength !== evidence.generatedByteLength) {
    return { status: 'BLOCKED', blockReason: 'GENERATED_DRAFT_BYTE_LENGTH_MISMATCH', detail: 'Generated bytes do not match the bound canonical byte length.' };
  }
  if (sha256Bytes(value) !== evidence.generatedPdfSha256) {
    return { status: 'BLOCKED', blockReason: 'GENERATED_DRAFT_SHA256_MISMATCH', detail: 'Generated bytes do not match the bound canonical SHA-256.' };
  }
  return { status: 'VALID', bytes: value };
}

function blocked(
  blockReason: FilingPreparationCurrentStateBlockReason,
  detail: string,
): FilingPreparationCurrentStateBuildResult {
  return {
    status: 'BLOCKED',
    blockReason,
    detail,
    currentState: null,
    stageF: 'HELD',
  };
}

function validationBlocked(
  blockReason: FilingPreparationCurrentStateBlockReason,
  detail: string,
): FilingPreparationCurrentStateValidationResult {
  return { status: 'BLOCKED', blockReason, detail, currentState: null };
}

export function computeFilingPreparationCurrentStateId(
  identity: FilingPreparationCurrentStateIdentity,
): string {
  return `filing-preparation-current-state:sha256:${createHash('sha256')
    .update(canonicalizeGenerationIdentity(identity))
    .digest('hex')}`;
}

export function createFilingPreparationCurrentState(
  input: CreateFilingPreparationCurrentStateInput,
): FilingPreparationCurrentStateBuildResult {
  if (!isPlainObject(input) || !hasExactKeys(input, CREATE_INPUT_KEYS)) {
    return blocked('INVALID_INPUT_SHAPE', 'Current-state creation input has an invalid shape or contains unauthorized caller assertions.');
  }
  if (!nonempty(input.authenticatedUserId) || !UUID_RE.test(input.authenticatedUserId)) {
    return blocked('INVALID_AUTHENTICATED_USER_ID', 'Authenticated owner identity must be an exact UUID.');
  }
  if (!nonempty(input.riskpathRecordId) || !UUID_RE.test(input.riskpathRecordId)) {
    return blocked('INVALID_RISKPATH_RECORD_ID', 'RiskPath identity must be an exact UUID.');
  }
  if (!positiveIntegralRevision(input.revision)) {
    return blocked('INVALID_REVISION', 'Current-state revision must be a positive safe integer.');
  }
  if (!preparationSnapshotShape(input.preparationSnapshot)) {
    return blocked('INVALID_PREPARATION_SNAPSHOT', 'Canonical preparation snapshot is malformed or incomplete.');
  }

  const generatedBinding = generatedBindingValidation(
    input.generatedDraftBinding,
    input.revision,
    input.preparationSnapshot,
  );
  if (generatedBinding.status === 'BLOCKED') return blocked(generatedBinding.blockReason, generatedBinding.detail);
  const exactGeneratedBinding = generatedBinding.status === 'VALID' ? generatedBinding.binding : null;

  const bytes = generatedBytesValidation(input.generatedDraftBytes, exactGeneratedBinding);
  if (bytes.status === 'BLOCKED') return blocked(bytes.blockReason, bytes.detail);

  const ownerReviewBinding = ownerReviewBindingValidation(
    input.ownerReviewBinding,
    input.revision,
    exactGeneratedBinding,
  );
  if (ownerReviewBinding.status === 'BLOCKED') return blocked(ownerReviewBinding.blockReason, ownerReviewBinding.detail);
  const exactOwnerReviewBinding = ownerReviewBinding.status === 'VALID' ? ownerReviewBinding.binding : null;

  const identity: FilingPreparationCurrentStateIdentity = {
    schemaVersion: FILING_PREPARATION_CURRENT_STATE_SCHEMA_VERSION,
    recordClass: FILING_PREPARATION_CURRENT_STATE_CLASS,
    authenticatedUserId: input.authenticatedUserId,
    riskpathRecordId: input.riskpathRecordId,
    revision: input.revision,
    preparationSnapshot: structuredClone(input.preparationSnapshot),
    generatedDraftBinding: exactGeneratedBinding === null ? null : structuredClone(exactGeneratedBinding),
    ownerReviewBinding: exactOwnerReviewBinding === null ? null : structuredClone(exactOwnerReviewBinding),
    ...HELD_AUTHORITY_BOUNDARY,
  };
  const currentState: FilingPreparationCurrentState = {
    ...identity,
    filingPreparationCurrentStateId: computeFilingPreparationCurrentStateId(identity),
    generatedDraftBytes: bytes.bytes === null ? null : new Uint8Array(bytes.bytes),
  };

  return {
    status: 'CURRENT_STATE_REVISION',
    currentState,
    stageF: 'HELD',
  };
}

export function validateFilingPreparationCurrentState(
  value: unknown,
): FilingPreparationCurrentStateValidationResult {
  if (!isPlainObject(value) || !hasExactKeys(value, CURRENT_STATE_KEYS)) {
    return validationBlocked('INVALID_INPUT_SHAPE', 'Current-state revision has an invalid serialized/runtime shape.');
  }
  if (value.schemaVersion !== FILING_PREPARATION_CURRENT_STATE_SCHEMA_VERSION
    || value.recordClass !== FILING_PREPARATION_CURRENT_STATE_CLASS
    || !nonempty(value.filingPreparationCurrentStateId)
    || !CURRENT_STATE_ID_RE.test(value.filingPreparationCurrentStateId)) {
    return validationBlocked('INVALID_INPUT_SHAPE', 'Current-state identity fields are invalid.');
  }
  if (!boundaryFieldsAreExact(value)) {
    return validationBlocked('BOUNDARY_INVARIANT_MISMATCH', 'Downstream authority boundary constants are not exact held/not-performed values.');
  }
  if (!nonempty(value.authenticatedUserId) || !UUID_RE.test(value.authenticatedUserId)) {
    return validationBlocked('INVALID_AUTHENTICATED_USER_ID', 'Authenticated owner identity must be an exact UUID.');
  }
  if (!nonempty(value.riskpathRecordId) || !UUID_RE.test(value.riskpathRecordId)) {
    return validationBlocked('INVALID_RISKPATH_RECORD_ID', 'RiskPath identity must be an exact UUID.');
  }
  if (!positiveIntegralRevision(value.revision)) {
    return validationBlocked('INVALID_REVISION', 'Current-state revision must be a positive safe integer.');
  }
  if (!preparationSnapshotShape(value.preparationSnapshot)) {
    return validationBlocked('INVALID_PREPARATION_SNAPSHOT', 'Canonical preparation snapshot is malformed or incomplete.');
  }

  const generatedBinding = generatedBindingValidation(value.generatedDraftBinding, value.revision, value.preparationSnapshot);
  if (generatedBinding.status === 'BLOCKED') return validationBlocked(generatedBinding.blockReason, generatedBinding.detail);
  const exactGeneratedBinding = generatedBinding.status === 'VALID' ? generatedBinding.binding : null;

  const bytes = generatedBytesValidation(value.generatedDraftBytes, exactGeneratedBinding);
  if (bytes.status === 'BLOCKED') return validationBlocked(bytes.blockReason, bytes.detail);

  const ownerReviewBinding = ownerReviewBindingValidation(value.ownerReviewBinding, value.revision, exactGeneratedBinding);
  if (ownerReviewBinding.status === 'BLOCKED') return validationBlocked(ownerReviewBinding.blockReason, ownerReviewBinding.detail);

  const currentState = value as unknown as FilingPreparationCurrentState;
  const identity: FilingPreparationCurrentStateIdentity = {
    schemaVersion: currentState.schemaVersion,
    recordClass: currentState.recordClass,
    authenticatedUserId: currentState.authenticatedUserId,
    riskpathRecordId: currentState.riskpathRecordId,
    revision: currentState.revision,
    preparationSnapshot: currentState.preparationSnapshot,
    generatedDraftBinding: currentState.generatedDraftBinding,
    ownerReviewBinding: currentState.ownerReviewBinding,
    stageF: currentState.stageF,
    packetComposition: currentState.packetComposition,
    signing: currentState.signing,
    filing: currentState.filing,
    courtSubmission: currentState.courtSubmission,
    service: currentState.service,
    legalSufficiency: currentState.legalSufficiency,
    autonomousExecution: currentState.autonomousExecution,
  };
  let recomputed: string;
  try {
    recomputed = computeFilingPreparationCurrentStateId(identity);
  } catch {
    return validationBlocked('INVALID_INPUT_SHAPE', 'Current-state identity cannot be canonically evaluated.');
  }
  if (recomputed !== currentState.filingPreparationCurrentStateId) {
    return validationBlocked('CURRENT_STATE_ID_MISMATCH', 'Current-state deterministic identity does not recompute from the exact immutable revision evidence.');
  }

  return { status: 'VALID', currentState };
}
