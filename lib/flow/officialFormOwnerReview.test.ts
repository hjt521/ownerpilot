import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import {
  computeGeneratedDocumentId,
  type GeneratedDraftCurrentness,
  type GeneratedDraftEvidence,
  type GeneratedDraftIdentity,
} from './officialFormGeneratedDraft';
import {
  computeOwnerReviewRecordId,
  createOfficialFormOwnerReview,
  evaluateOfficialFormOwnerReviewCurrentness,
  OWNER_REVIEW_STATEMENT_ID,
  OWNER_REVIEW_STATEMENT_VERSION,
  type CreateOfficialFormOwnerReviewInput,
  type OwnerReviewedDocumentEvidence,
  type OwnerReviewedDocumentIdentity,
} from './officialFormOwnerReview';

let passed = 0;
const ok = (condition: unknown, message: string) => { assert.ok(condition, message); passed += 1; };
const equal = <T>(actual: T, expected: T, message: string) => { assert.equal(actual, expected, message); passed += 1; };
const notEqual = <T>(actual: T, expected: T, message: string) => { assert.notEqual(actual, expected, message); passed += 1; };

const baseGeneratedIdentity: GeneratedDraftIdentity = {
  schemaVersion: 1,
  artifactClass: 'GENERATED_DRAFT',
  artifactRole: 'OWNER_GENERATED_PREPARATION',
  officialSourceArtifactId: `synthetic-authority:TEST-1:sha256:${'a'.repeat(64)}`,
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
  generatorContractVersion: 'test-generator-contract-v1',
  generatorImplementationId: 'test-generated-draft-implementation',
  generatorImplementationVersion: '1.0.0',
  fieldWritePlanDigest: `write-plan:sha256:${'d'.repeat(64)}`,
  preparedAtISO: '2026-08-15T18:00:00.000Z',
  generatedPdfSha256: 'e'.repeat(64),
  generatedByteLength: 12345,
};

function generatedEvidence(
  overrides: Partial<GeneratedDraftIdentity> = {},
): GeneratedDraftEvidence {
  const identity: GeneratedDraftIdentity = { ...baseGeneratedIdentity, ...overrides };
  return { ...identity, generatedDocumentId: computeGeneratedDocumentId(identity) };
}

const generated = generatedEvidence();
const renderedAtISO = '2026-08-15T18:05:00.000Z';
const reviewedAtISO = '2026-08-15T18:06:00.000Z';

function reviewInput(
  overrides: Partial<CreateOfficialFormOwnerReviewInput> = {},
): CreateOfficialFormOwnerReviewInput {
  return {
    generatedDraft: generated,
    renderedAcknowledgment: {
      renderedGeneratedDocumentId: generated.generatedDocumentId,
      renderedPdfSha256: generated.generatedPdfSha256,
      renderedByteLength: generated.generatedByteLength,
      renderedAtISO,
    },
    ownerConfirmedExactRenderedDocument: true,
    reviewedAtISO,
    reviewStatement: {
      statementId: OWNER_REVIEW_STATEMENT_ID,
      statementVersion: OWNER_REVIEW_STATEMENT_VERSION,
    },
    ...overrides,
  };
}

function requireReview(
  overrides: Partial<CreateOfficialFormOwnerReviewInput> = {},
): OwnerReviewedDocumentEvidence {
  const result = createOfficialFormOwnerReview(reviewInput(overrides));
  equal(result.status, 'OWNER_REVIEWED_DOCUMENT', 'valid exact review input is admissible');
  if (result.status !== 'OWNER_REVIEWED_DOCUMENT') throw new Error('review fixture must be admissible');
  return result.evidence;
}

function requireBlock(
  overrides: Partial<CreateOfficialFormOwnerReviewInput>,
  expectedReason: string,
  message: string,
): void {
  const result = createOfficialFormOwnerReview(reviewInput(overrides));
  equal(result.status, 'BLOCKED', message);
  if (result.status !== 'BLOCKED') throw new Error('expected BLOCKED owner-review result');
  equal(result.blockReason, expectedReason, `${message} with deterministic reason`);
}

const review = requireReview();
equal(review.artifactClass, 'OWNER_REVIEWED_DOCUMENT', 'review creates distinct OWNER_REVIEWED_DOCUMENT artifact');
equal(review.artifactRole, 'OWNER_GENERATED_PREPARATION', 'review preserves governed artifact role');
equal(review.generatedDraft.generatedDocumentId, generated.generatedDocumentId, 'review binds exact generatedDocumentId');
equal(review.generatedDraft.generatedPdfSha256, generated.generatedPdfSha256, 'review binds exact generated PDF SHA');
equal(review.generatedDraft.generatedByteLength, generated.generatedByteLength, 'review binds exact generated byte length');
equal(review.generatedDraft.officialSourceArtifactId, generated.officialSourceArtifactId, 'review preserves exact official source artifact identity');
equal(review.generatedDraft.officialSourceSnapshotId, generated.officialSourceSnapshotId, 'review preserves exact official source snapshot identity');
equal(review.generatedDraft.preparationAuthorizationSnapshotId, generated.preparationAuthorizationSnapshotId, 'review preserves preparation authorization snapshot');
equal(review.generatedDraft.mapSnapshotId, generated.mapSnapshotId, 'review preserves exact map snapshot');
equal(review.generatedDraft.referencedFactSnapshotId, generated.referencedFactSnapshotId, 'review preserves referenced fact snapshot');
equal(review.generatedDraft.generationInputId, generated.generationInputId, 'review preserves generation input identity');
equal(review.generatedDraft.generatorContractVersion, generated.generatorContractVersion, 'review preserves generator contract identity');
equal(review.generatedDraft.generatorImplementationId, generated.generatorImplementationId, 'review preserves generator implementation identity');
equal(review.generatedDraft.preparedAtISO, generated.preparedAtISO, 'review preserves exact preparedAtISO');
equal(review.renderedAcknowledgment.renderedAtISO, renderedAtISO, 'review preserves caller-supplied renderedAtISO');
equal(review.reviewedAtISO, reviewedAtISO, 'review preserves caller-supplied reviewedAtISO');

const { ownerReviewRecordId: _storedId, ...reviewIdentity } = review;
equal(computeOwnerReviewRecordId(reviewIdentity), review.ownerReviewRecordId, 'stored ownerReviewRecordId recomputes from governed identity');
equal(requireReview().ownerReviewRecordId, review.ownerReviewRecordId, 'same governed input yields same ownerReviewRecordId');

const identityChanges: readonly [string, OwnerReviewedDocumentIdentity][] = [
  ['generatedDocumentId', {
    ...reviewIdentity,
    generatedDraft: { ...reviewIdentity.generatedDraft, generatedDocumentId: `generated-document:sha256:${'0'.repeat(64)}` },
  }],
  ['generated PDF SHA', {
    ...reviewIdentity,
    generatedDraft: { ...reviewIdentity.generatedDraft, generatedPdfSha256: '0'.repeat(64) },
  }],
  ['generated byte length', {
    ...reviewIdentity,
    generatedDraft: { ...reviewIdentity.generatedDraft, generatedByteLength: generated.generatedByteLength + 1 },
  }],
  ['preparedAtISO', {
    ...reviewIdentity,
    generatedDraft: { ...reviewIdentity.generatedDraft, preparedAtISO: '2026-08-15T18:00:01.000Z' },
  }],
  ['renderedAtISO', {
    ...reviewIdentity,
    renderedAcknowledgment: { ...reviewIdentity.renderedAcknowledgment, renderedAtISO: '2026-08-15T18:05:01.000Z' },
  }],
  ['reviewedAtISO', { ...reviewIdentity, reviewedAtISO: '2026-08-15T18:06:01.000Z' }],
  ['official source identity', {
    ...reviewIdentity,
    generatedDraft: { ...reviewIdentity.generatedDraft, officialSourceSnapshotId: `sha256:${'0'.repeat(64)}` },
  }],
  ['preparation identity', {
    ...reviewIdentity,
    generatedDraft: { ...reviewIdentity.generatedDraft, preparationManifestId: `preparation-manifest:sha256:${'0'.repeat(64)}` },
  }],
  ['preparation authorization', {
    ...reviewIdentity,
    generatedDraft: { ...reviewIdentity.generatedDraft, preparationAuthorizationSnapshotId: `preparation-authorization:sha256:${'0'.repeat(64)}` },
  }],
  ['map snapshot', {
    ...reviewIdentity,
    generatedDraft: { ...reviewIdentity.generatedDraft, mapSnapshotId: `map:sha256:${'0'.repeat(64)}` },
  }],
  ['fact snapshot', {
    ...reviewIdentity,
    generatedDraft: { ...reviewIdentity.generatedDraft, referencedFactSnapshotId: `facts:sha256:${'0'.repeat(64)}` },
  }],
  ['generation input', {
    ...reviewIdentity,
    generatedDraft: { ...reviewIdentity.generatedDraft, generationInputId: `generation-input:sha256:${'0'.repeat(64)}` },
  }],
  ['generator implementation', {
    ...reviewIdentity,
    generatedDraft: { ...reviewIdentity.generatedDraft, generatorImplementationVersion: '2.0.0' },
  }],
];
for (const [name, changed] of identityChanges) {
  notEqual(computeOwnerReviewRecordId(changed), review.ownerReviewRecordId, `${name} changes ownerReviewRecordId`);
}
const changedStatementId = {
  ...reviewIdentity,
  reviewStatementId: 'different-review-statement',
} as unknown as OwnerReviewedDocumentIdentity;
notEqual(computeOwnerReviewRecordId(changedStatementId), review.ownerReviewRecordId, 'review-statement ID changes ownerReviewRecordId');
const changedStatementVersion = {
  ...reviewIdentity,
  reviewStatementVersion: '9.9.9',
} as unknown as OwnerReviewedDocumentIdentity;
notEqual(computeOwnerReviewRecordId(changedStatementVersion), review.ownerReviewRecordId, 'review-statement version changes ownerReviewRecordId');

requireBlock({
  renderedAcknowledgment: {
    ...reviewInput().renderedAcknowledgment,
    renderedGeneratedDocumentId: `generated-document:sha256:${'0'.repeat(64)}`,
  },
}, 'RENDERED_GENERATED_DOCUMENT_ID_MISMATCH', 'wrong rendered generatedDocumentId blocks');
requireBlock({
  renderedAcknowledgment: { ...reviewInput().renderedAcknowledgment, renderedPdfSha256: '0'.repeat(64) },
}, 'RENDERED_PDF_SHA256_MISMATCH', 'wrong rendered PDF SHA blocks');
requireBlock({
  renderedAcknowledgment: { ...reviewInput().renderedAcknowledgment, renderedByteLength: generated.generatedByteLength + 1 },
}, 'RENDERED_BYTE_LENGTH_MISMATCH', 'wrong rendered byte length blocks');
requireBlock({ ownerConfirmedExactRenderedDocument: false }, 'OWNER_CONFIRMATION_REQUIRED', 'false affirmation blocks');
requireBlock({ ownerConfirmedExactRenderedDocument: undefined as unknown as boolean }, 'OWNER_CONFIRMATION_REQUIRED', 'absent affirmation blocks');
requireBlock({
  renderedAcknowledgment: { ...reviewInput().renderedAcknowledgment, renderedAtISO: 'invalid' },
}, 'INVALID_RENDERED_AT', 'malformed renderedAtISO blocks');
requireBlock({ reviewedAtISO: '2026-08-15 18:06:00Z' }, 'INVALID_REVIEWED_AT', 'malformed reviewedAtISO blocks');
requireBlock({ reviewedAtISO: '2026-08-15T18:04:59.999Z' }, 'REVIEW_BEFORE_RENDER', 'review before render blocks');
equal(requireReview({ reviewedAtISO: renderedAtISO }).reviewedAtISO, renderedAtISO, 'equal render/review timestamps are admissible');
requireBlock({
  reviewStatement: { statementId: 'wrong', statementVersion: OWNER_REVIEW_STATEMENT_VERSION },
}, 'REVIEW_STATEMENT_IDENTITY_MISMATCH', 'wrong review-statement ID blocks');
requireBlock({
  reviewStatement: { statementId: OWNER_REVIEW_STATEMENT_ID, statementVersion: '2.0.0' },
}, 'REVIEW_STATEMENT_IDENTITY_MISMATCH', 'wrong review-statement version blocks');
requireBlock({
  generatedDraft: { ...generated, artifactClass: 'OWNER_REVIEWED_DOCUMENT' } as unknown as GeneratedDraftEvidence,
}, 'GENERATED_ARTIFACT_CLASS_MISMATCH', 'wrong generated artifactClass blocks');
requireBlock({
  generatedDraft: { ...generated, artifactRole: 'WRONG_ROLE' } as unknown as GeneratedDraftEvidence,
}, 'GENERATED_ARTIFACT_ROLE_MISMATCH', 'wrong generated artifactRole blocks');
requireBlock({
  generatedDraft: { ...generated, generatedPdfSha256: 'short' } as unknown as GeneratedDraftEvidence,
}, 'INVALID_GENERATED_DRAFT_IDENTITY', 'malformed generated identity blocks');
requireBlock({
  generatedDraft: { ...generated, mapSnapshotId: `map:sha256:${'0'.repeat(64)}` },
}, 'GENERATED_PROVENANCE_INCONSISTENT', 'internally inconsistent E.1 provenance blocks');

const currentE1: GeneratedDraftCurrentness = { status: 'CURRENT', reasons: [] };
equal(evaluateOfficialFormOwnerReviewCurrentness(review, generated, currentE1).status, 'CURRENT', 'exact current generated document plus exact review binding is CURRENT');
const staleE1: GeneratedDraftCurrentness = { status: 'OUT_OF_DATE', reasons: ['GENERATION_INPUT_CHANGED'] };
const staleFromE1 = evaluateOfficialFormOwnerReviewCurrentness(review, generated, staleE1);
equal(staleFromE1.status, 'OUT_OF_DATE', 'E.1 OUT_OF_DATE makes owner review OUT_OF_DATE');
ok(staleFromE1.reasons.includes('GENERATED_DRAFT_OUT_OF_DATE:GENERATION_INPUT_CHANGED'), 'E.1 out-of-date reason is retained deterministically');

const regenerated = generatedEvidence({ generationInputId: `generation-input:sha256:${'0'.repeat(64)}` });
const regeneratedResult = evaluateOfficialFormOwnerReviewCurrentness(review, regenerated, currentE1);
ok(regeneratedResult.reasons.includes('GENERATED_DOCUMENT_ID_CHANGED'), 'regenerated generatedDocumentId makes prior review out of date');
ok(regeneratedResult.reasons.includes('GENERATION_INPUT_CHANGED'), 'regeneration reports changed generation input');
const changedHash = evaluateOfficialFormOwnerReviewCurrentness(review, generatedEvidence({ generatedPdfSha256: '0'.repeat(64) }), currentE1);
ok(changedHash.reasons.includes('GENERATED_PDF_SHA256_CHANGED'), 'changed generated PDF SHA makes review out of date');
const changedLength = evaluateOfficialFormOwnerReviewCurrentness(review, generatedEvidence({ generatedByteLength: generated.generatedByteLength + 1 }), currentE1);
ok(changedLength.reasons.includes('GENERATED_BYTE_LENGTH_CHANGED'), 'changed generated byte length makes review out of date');
const changedProvenance = evaluateOfficialFormOwnerReviewCurrentness(review, generatedEvidence({ mapSnapshotId: `map:sha256:${'0'.repeat(64)}` }), currentE1);
ok(changedProvenance.reasons.includes('MAP_SNAPSHOT_CHANGED'), 'changed governed provenance makes review out of date');
equal(
  JSON.stringify(changedProvenance),
  JSON.stringify(evaluateOfficialFormOwnerReviewCurrentness(review, generatedEvidence({ mapSnapshotId: `map:sha256:${'0'.repeat(64)}` }), currentE1)),
  'currentness reasons are deterministic across repeated evaluation',
);
notEqual(review.generatedDraft.generatedDocumentId, regenerated.generatedDocumentId, 'old review never automatically attaches to regenerated document');
equal(review.generatedDraft.generatedDocumentId, generated.generatedDocumentId, 'historical review evidence remains bound to original generated document');

const successResult = createOfficialFormOwnerReview(reviewInput());
const successJson = JSON.stringify(successResult);
ok(!successJson.includes('SIGNED'), 'review contract does not confer SIGNED');
ok(!successJson.includes('FILED'), 'review contract does not confer FILED');
ok(!successJson.includes('COURT_ACCEPTED'), 'review contract does not confer COURT_ACCEPTED');
ok(!successJson.includes('packet completion'), 'review contract does not confer packet completion');
ok(!successJson.includes('service completion'), 'review contract does not confer service completion');
ok(!successJson.includes('legal sufficiency'), 'review contract does not confer legal sufficiency');
ok(!successJson.includes('AUTONOMOUS_EXECUTION'), 'review contract does not confer autonomous execution');

const source = readFileSync('lib/flow/officialFormOwnerReview.ts', 'utf8');
ok(!source.includes('Date.now('), 'owner-review core has no Date.now time source');
ok(!source.includes('new Date()'), 'owner-review core has no zero-argument Date time source');
ok(!source.includes('Math.random(') && !source.includes('randomUUID'), 'owner-review identity has no random source');
ok(!source.includes("from './persistence'") && !source.includes('localStorage'), 'owner-review core has no persistence import');
ok(!source.includes('supabase') && !source.includes('database'), 'owner-review core has no API/database/Supabase import');
ok(!source.includes("from 'react'") && !source.includes("from 'next/"), 'owner-review core has no UI framework import');
ok(!source.includes('Version 1') && !source.includes('Draft #'), 'owner-review core introduces no numeric customer document version');

console.log(`${passed} Stage E.2.1 official-form owner-review assertions passed`);
