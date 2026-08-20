import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import {
  computeGeneratedDocumentId,
  type GeneratedDraftCurrentness,
  type GeneratedDraftEvidence,
  type GeneratedDraftIdentity,
} from './officialFormGeneratedDraft';
import {
  createOfficialFormOwnerReview,
  OWNER_REVIEW_STATEMENT_ID,
  OWNER_REVIEW_STATEMENT_VERSION,
  type OwnerReviewedDocumentEvidence,
} from './officialFormOwnerReview';
import {
  createFilingPreparationRecord,
  validateFilingPreparationRecord,
  type FilingPreparationRecord,
} from './filingPreparationRecord';

let passed = 0;
const equal = <T>(actual: T, expected: T, message: string) => { assert.equal(actual, expected, message); passed += 1; };
const ok = (condition: unknown, message: string) => { assert.ok(condition, message); passed += 1; };
const notEqual = <T>(actual: T, expected: T, message: string) => { assert.notEqual(actual, expected, message); passed += 1; };

const baseGeneratedIdentity: GeneratedDraftIdentity = {
  schemaVersion: 1,
  artifactClass: 'GENERATED_DRAFT',
  artifactRole: 'OWNER_GENERATED_PREPARATION',
  officialSourceArtifactId: `synthetic-authority:E23A:sha256:${'a'.repeat(64)}`,
  officialSourceSnapshotId: `sha256:${'a'.repeat(64)}`,
  officialSourceSha256: 'a'.repeat(64),
  sourceAdmissionPolicyId: 'qpdf-dual-pass-linearization-isolation-v2',
  sourceAdmissionStatus: 'SOURCE_ADMITTED_CLEAN',
  qpdfAssetIdentityDigest: `qpdf-asset:sha256:${'b'.repeat(64)}`,
  sourcePassACommandDigest: `qpdf-command:sha256:${'c'.repeat(64)}`,
  sourcePassAWarningInventoryDigest: `source-warning-inventory:sha256:${'d'.repeat(64)}`,
  sourcePassBCommandDigest: `qpdf-command:sha256:${'e'.repeat(64)}`,
  sourcePassBWarningInventoryDigest: `source-warning-inventory:sha256:${'f'.repeat(64)}`,
  sourceWarningInventoryDigest: `source-warning-inventory:sha256:${'1'.repeat(64)}`,
  qpdfIntermediateSha256: '2'.repeat(64),
  xfaPolicyId: 'acroform-fallback-xfa-disconnection-v1',
  xfaDigest: `xfa:sha256:${'3'.repeat(64)}`,
  preparationManifestId: `preparation-manifest:sha256:${'4'.repeat(64)}`,
  preparationSourceId: `prep-source:sha256:${'5'.repeat(64)}`,
  preparationDerivativeSha256: '6'.repeat(64),
  preparationFieldEquivalenceDigest: `field-equivalence:sha256:${'7'.repeat(64)}`,
  preparationSemanticDeltaDigest: `semantic-non-xfa:sha256:${'8'.repeat(64)}`,
  preparationAuthorizationSnapshotId: `preparation-authorization:sha256:${'9'.repeat(64)}`,
  mapSnapshotId: `map:sha256:${'a'.repeat(64)}`,
  referencedFactSnapshotId: `facts:sha256:${'b'.repeat(64)}`,
  generationInputId: `generation-input:sha256:${'c'.repeat(64)}`,
  generatorContractVersion: 'e23a-test-generator-contract-v1',
  generatorImplementationId: 'e23a-test-generated-draft',
  generatorImplementationVersion: '1.0.0',
  fieldWritePlanDigest: `write-plan:sha256:${'d'.repeat(64)}`,
  preparedAtISO: '2026-08-20T17:00:00.000Z',
  generatedPdfSha256: 'e'.repeat(64),
  generatedByteLength: 23456,
};

function generatedEvidence(overrides: Partial<GeneratedDraftIdentity> = {}): GeneratedDraftEvidence {
  const identity: GeneratedDraftIdentity = { ...baseGeneratedIdentity, ...overrides };
  return { ...identity, generatedDocumentId: computeGeneratedDocumentId(identity) };
}

function reviewedEvidence(generated: GeneratedDraftEvidence): OwnerReviewedDocumentEvidence {
  const result = createOfficialFormOwnerReview({
    generatedDraft: generated,
    renderedAcknowledgment: {
      renderedGeneratedDocumentId: generated.generatedDocumentId,
      renderedPdfSha256: generated.generatedPdfSha256,
      renderedByteLength: generated.generatedByteLength,
      renderedAtISO: '2026-08-20T17:01:00.000Z',
    },
    ownerConfirmedExactRenderedDocument: true,
    reviewedAtISO: '2026-08-20T17:02:00.000Z',
    reviewStatement: {
      statementId: OWNER_REVIEW_STATEMENT_ID,
      statementVersion: OWNER_REVIEW_STATEMENT_VERSION,
    },
  });
  equal(result.status, 'OWNER_REVIEWED_DOCUMENT', 'canonical owner-review fixture is admissible');
  if (result.status !== 'OWNER_REVIEWED_DOCUMENT') throw new Error('owner-review fixture must be admissible');
  return result.evidence;
}

const current: GeneratedDraftCurrentness = { status: 'CURRENT', reasons: [] };
const generated = generatedEvidence();
const review = reviewedEvidence(generated);

function requireRecord(ownerReview: unknown = review, currentGeneratedDraft: unknown = generated, currentness: unknown = current): FilingPreparationRecord {
  const result = createFilingPreparationRecord({
    ownerReviewEvidence: ownerReview,
    currentGeneratedDraft,
    generatedDraftCurrentness: currentness,
  });
  equal(result.status, 'FILING_PREPARATION_RECORD', 'valid canonical E2.3 input produces a record');
  if (result.status !== 'FILING_PREPARATION_RECORD') throw new Error('record fixture must be admissible');
  return result.record;
}

function requireBlock(ownerReview: unknown, currentGeneratedDraft: unknown, currentness: unknown, reason: string, message: string): void {
  const result = createFilingPreparationRecord({
    ownerReviewEvidence: ownerReview,
    currentGeneratedDraft,
    generatedDraftCurrentness: currentness,
  });
  equal(result.status, 'BLOCKED', message);
  if (result.status !== 'BLOCKED') throw new Error('expected blocked filing-preparation record');
  equal(result.blockReason, reason, `${message} with deterministic reason`);
  equal(result.persistence, 'NOT_PERFORMED', `${message} preserves no-persistence boundary`);
  equal(result.stageF, 'HELD', `${message} preserves Stage F hold`);
}

const record = requireRecord();
const sameRecord = requireRecord();
equal(record.schemaVersion, 1, 'record schema version is 1');
equal(record.recordClass, 'FILING_PREPARATION_RECORD', 'record class is bounded E2.3 record');
equal(record.filingPreparationRecordId, sameRecord.filingPreparationRecordId, 'identical canonical evidence yields identical deterministic record ID');
equal(record.ownerReviewEvidence.ownerReviewRecordId, review.ownerReviewRecordId, 'record binds exact ownerReviewRecordId');
equal(record.ownerReviewEvidence.generatedDraft.generatedDocumentId, generated.generatedDocumentId, 'record binds exact generatedDocumentId');
equal(record.ownerReviewEvidence.generatedDraft.generatedPdfSha256, generated.generatedPdfSha256, 'record binds exact generated PDF SHA');
equal(record.ownerReviewEvidence.generatedDraft.generatedByteLength, generated.generatedByteLength, 'record binds exact generated byte length');
equal(record.ownerReviewEvidence.generatedDraft.officialSourceSnapshotId, generated.officialSourceSnapshotId, 'record binds official-source snapshot identity');
equal(record.ownerReviewEvidence.generatedDraft.preparationManifestId, generated.preparationManifestId, 'record binds preparation identity');
equal(record.ownerReviewEvidence.generatedDraft.preparationSourceId, generated.preparationSourceId, 'record binds preparation source identity');
equal(record.ownerReviewEvidence.generatedDraft.mapSnapshotId, generated.mapSnapshotId, 'record binds map identity');
equal(record.ownerReviewEvidence.generatedDraft.referencedFactSnapshotId, generated.referencedFactSnapshotId, 'record binds canonical fact identity');
equal(record.ownerReviewEvidence.generatedDraft.generationInputId, generated.generationInputId, 'record binds generation input identity');
equal(record.ownerReviewEvidence.generatedDraft.generatorImplementationVersion, generated.generatorImplementationVersion, 'record binds generator identity');
equal(record.ownerReviewEvidence.reviewStatementId, OWNER_REVIEW_STATEMENT_ID, 'record binds exact review statement');
equal(record.persistenceContract, 'SATISFIED', 'pure record satisfies only persistence contract');
equal(record.persistence, 'NOT_PERFORMED', 'record construction does not claim persistence');
equal(record.stageF, 'HELD', 'record construction preserves Stage F hold');
equal(record.signing, 'NOT_PERFORMED', 'record construction performs no signing');
equal(record.filing, 'NOT_PERFORMED', 'record construction performs no filing');
equal(record.courtSubmission, 'NOT_PERFORMED', 'record construction performs no court submission');
equal(record.service, 'NOT_PERFORMED', 'record construction performs no service');
equal(record.packetComposition, 'NOT_PERFORMED', 'record construction composes no packet');
equal(record.legalSufficiency, 'NOT_EVALUATED', 'record construction determines no legal sufficiency');
equal(record.autonomousExecution, 'NOT_AUTHORIZED', 'record construction grants no execution authority');
equal(validateFilingPreparationRecord(record).status, 'VALID', 'exact record validates intrinsically');

const callerSelectedId = structuredClone(record);
callerSelectedId.filingPreparationRecordId = `filing-preparation-record:sha256:${'0'.repeat(64)}`;
equal(validateFilingPreparationRecord(callerSelectedId).status, 'BLOCKED', 'caller-selected/tampered record ID fails closed');
notEqual(callerSelectedId.filingPreparationRecordId, record.filingPreparationRecordId, 'implementation-owned deterministic ID differs from caller tamper');

const tamperedOwnerReviewId = structuredClone(review);
tamperedOwnerReviewId.ownerReviewRecordId = `owner-review:sha256:${'0'.repeat(64)}`;
requireBlock(tamperedOwnerReviewId, generated, current, 'OWNER_REVIEW_RECORD_ID_MISMATCH', 'tampered ownerReviewRecordId blocks');

const generatedFieldMutations: readonly [string, keyof GeneratedDraftEvidence, unknown][] = [
  ['generatedDocumentId', 'generatedDocumentId', `generated-document:sha256:${'0'.repeat(64)}`],
  ['generated PDF SHA', 'generatedPdfSha256', '0'.repeat(64)],
  ['generated byte length', 'generatedByteLength', generated.generatedByteLength + 1],
  ['official source artifact', 'officialSourceArtifactId', `synthetic-authority:E23A:sha256:${'0'.repeat(64)}`],
  ['official source snapshot', 'officialSourceSnapshotId', `sha256:${'0'.repeat(64)}`],
  ['official source hash', 'officialSourceSha256', '0'.repeat(64)],
  ['preparation manifest', 'preparationManifestId', `preparation-manifest:sha256:${'0'.repeat(64)}`],
  ['preparation source', 'preparationSourceId', `prep-source:sha256:${'0'.repeat(64)}`],
  ['map snapshot', 'mapSnapshotId', `map:sha256:${'0'.repeat(64)}`],
  ['fact snapshot', 'referencedFactSnapshotId', `facts:sha256:${'0'.repeat(64)}`],
  ['generation input', 'generationInputId', `generation-input:sha256:${'0'.repeat(64)}`],
  ['generator identity', 'generatorImplementationVersion', '9.9.9'],
];
for (const [name, field, value] of generatedFieldMutations) {
  const tampered = structuredClone(review) as unknown as { generatedDraft: Record<string, unknown> };
  tampered.generatedDraft[field] = value;
  const result = createFilingPreparationRecord({ ownerReviewEvidence: tampered, currentGeneratedDraft: generated, generatedDraftCurrentness: current });
  equal(result.status, 'BLOCKED', `${name} tampering fails closed`);
}

const extraNestedKey = structuredClone(review) as unknown as { generatedDraft: Record<string, unknown> };
extraNestedKey.generatedDraft.fabricated = 'value';
requireBlock(extraNestedKey, generated, current, 'INVALID_GENERATED_DRAFT_EVIDENCE', 'extra nested generated-draft key fails closed');

const fabricatedAdmissionEnum = structuredClone(review) as unknown as { generatedDraft: Record<string, unknown> };
fabricatedAdmissionEnum.generatedDraft.sourceAdmissionStatus = 'SOURCE_ADMITTED_MAYBE';
requireBlock(fabricatedAdmissionEnum, generated, current, 'INVALID_GENERATED_DRAFT_EVIDENCE', 'fabricated generated enum fails closed');

const renderedMismatch = structuredClone(review) as unknown as { renderedAcknowledgment: { renderedPdfSha256: string } };
renderedMismatch.renderedAcknowledgment.renderedPdfSha256 = '0'.repeat(64);
requireBlock(renderedMismatch, generated, current, 'RENDERED_DOCUMENT_BINDING_MISMATCH', 'mismatched rendered hash fails closed');

const missingConfirmation = structuredClone(review) as unknown as Record<string, unknown>;
missingConfirmation.ownerConfirmedExactRenderedDocument = false;
requireBlock(missingConfirmation, generated, current, 'INVALID_OWNER_REVIEW_EVIDENCE', 'missing affirmative exact review fails closed');

const badStatement = structuredClone(review) as unknown as Record<string, unknown>;
badStatement.reviewStatementVersion = '999.0.0';
requireBlock(badStatement, generated, current, 'INVALID_OWNER_REVIEW_EVIDENCE', 'invalid review statement version fails closed');

const staleGenerated: GeneratedDraftCurrentness = { status: 'OUT_OF_DATE', reasons: ['GENERATION_INPUT_CHANGED'] };
requireBlock(review, generated, staleGenerated, 'GENERATED_DRAFT_OUT_OF_DATE', 'OUT_OF_DATE generated draft blocks E2.3 admission');

const regenerated = generatedEvidence({ generationInputId: `generation-input:sha256:${'0'.repeat(64)}` });
requireBlock(review, regenerated, current, 'CURRENT_GENERATED_DRAFT_MISMATCH', 'historical owner review cannot silently rebind to regenerated bytes/identity');

requireBlock(review, generated, { status: 'CURRENT', reasons: ['fabricated'] }, 'INVALID_GENERATED_DRAFT_CURRENTNESS', 'malformed CURRENT currentness fails closed');
requireBlock(review, generated, { status: 'CURRENTISH', reasons: [] }, 'INVALID_GENERATED_DRAFT_CURRENTNESS', 'fabricated currentness enum fails closed');

const falsePersistence = structuredClone(record) as unknown as Record<string, unknown>;
falsePersistence.persistence = 'PERFORMED';
const falsePersistenceResult = validateFilingPreparationRecord(falsePersistence);
equal(falsePersistenceResult.status, 'BLOCKED', 'false persistence claim fails record validation');
if (falsePersistenceResult.status === 'BLOCKED') equal(falsePersistenceResult.blockReason, 'BOUNDARY_INVARIANT_MISMATCH', 'false persistence claim has deterministic boundary reason');

const falseStageF = structuredClone(record) as unknown as Record<string, unknown>;
falseStageF.stageF = 'AUTHORIZED';
equal(validateFilingPreparationRecord(falseStageF).status, 'BLOCKED', 'attempt to turn valid record into Stage F authority fails closed');

const extraRecordKey = structuredClone(record) as unknown as Record<string, unknown>;
extraRecordKey.filed = true;
equal(validateFilingPreparationRecord(extraRecordKey).status, 'BLOCKED', 'extra serialized execution field fails closed');

const source = readFileSync(new URL('./filingPreparationRecord.ts', import.meta.url), 'utf8');
ok(!source.includes('localStorage'), 'record core contains no localStorage persistence');
ok(!source.includes('supabase') && !source.includes('database'), 'record core contains no Supabase/database persistence');
ok(!source.includes("from 'react'") && !source.includes("from 'next/"), 'record core contains no UI/API framework import');
ok(!source.includes('ud100FilingPreparation'), 'record core does not synthesize/import historical PR #389 filing-preparation state');

console.log(`${passed} E2.3A filing-preparation record assertions passed`);
