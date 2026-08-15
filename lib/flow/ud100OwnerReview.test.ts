import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import {
  computeGeneratedDocumentId,
  type GeneratedDraftCurrentness,
  type GeneratedDraftEvidence,
  type GeneratedDraftIdentity,
} from './officialFormGeneratedDraft';
import {
  OWNER_REVIEW_STATEMENT_ID,
  OWNER_REVIEW_STATEMENT_VERSION,
  type OwnerReviewedDocumentEvidence,
} from './officialFormOwnerReview';
import {
  createUd100OwnerReview,
  evaluateUd100OwnerReviewCurrentnessFromGeneratedDraftCurrentness,
} from './ud100OwnerReview';
import {
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

let passed = 0;
const ok = (condition: unknown, message: string) => { assert.ok(condition, message); passed += 1; };
const equal = <T>(actual: T, expected: T, message: string) => { assert.equal(actual, expected, message); passed += 1; };

const baseIdentity: GeneratedDraftIdentity = {
  schemaVersion: 1,
  artifactClass: 'GENERATED_DRAFT',
  artifactRole: UD100_GENERATED_DRAFT_ARTIFACT_ROLE,
  officialSourceArtifactId: UD100_OFFICIAL_SOURCE_IDENTITY.artifactId,
  officialSourceSnapshotId: UD100_OFFICIAL_SOURCE_IDENTITY.sourceSnapshotId,
  officialSourceSha256: UD100_OFFICIAL_SOURCE_IDENTITY.repositorySha256,
  sourceAdmissionPolicyId: 'qpdf-dual-pass-linearization-isolation-v2',
  sourceAdmissionStatus: 'SOURCE_ADMITTED_CLEAN',
  qpdfAssetIdentityDigest: `qpdf-asset:sha256:${'1'.repeat(64)}`,
  sourcePassACommandDigest: `qpdf-command:sha256:${'2'.repeat(64)}`,
  sourcePassAWarningInventoryDigest: `source-warning-inventory:sha256:${'3'.repeat(64)}`,
  sourcePassBCommandDigest: `qpdf-command:sha256:${'4'.repeat(64)}`,
  sourcePassBWarningInventoryDigest: `source-warning-inventory:sha256:${'5'.repeat(64)}`,
  sourceWarningInventoryDigest: `source-warning-inventory:sha256:${'6'.repeat(64)}`,
  qpdfIntermediateSha256: '7'.repeat(64),
  xfaPolicyId: 'acroform-fallback-xfa-disconnection-v1',
  xfaDigest: `xfa:sha256:${'8'.repeat(64)}`,
  preparationManifestId: UD100_PREPARATION_RUNTIME_MANIFEST_ID,
  preparationSourceId: `prep-source:sha256:${'9'.repeat(64)}`,
  preparationDerivativeSha256: 'a'.repeat(64),
  preparationFieldEquivalenceDigest: `field-equivalence:sha256:${'b'.repeat(64)}`,
  preparationSemanticDeltaDigest: `semantic-non-xfa:sha256:${'c'.repeat(64)}`,
  preparationAuthorizationSnapshotId: `preparation-authorization:sha256:${'d'.repeat(64)}`,
  mapSnapshotId: UD100_GENERATION_BINDING.mapSnapshotId,
  referencedFactSnapshotId: `facts:sha256:${'e'.repeat(64)}`,
  generationInputId: `generation-input:sha256:${'f'.repeat(64)}`,
  generatorContractVersion: UD100_GENERATOR_CONTRACT_VERSION,
  generatorImplementationId: UD100_GENERATED_DRAFT_IMPLEMENTATION_ID,
  generatorImplementationVersion: UD100_GENERATED_DRAFT_IMPLEMENTATION_VERSION,
  fieldWritePlanDigest: `write-plan:sha256:${'0'.repeat(64)}`,
  preparedAtISO: '2026-08-15T19:10:00.000Z',
  generatedPdfSha256: '1'.repeat(64),
  generatedByteLength: 45678,
};

function generatedEvidence(
  overrides: Partial<GeneratedDraftIdentity> = {},
): GeneratedDraftEvidence {
  const identity: GeneratedDraftIdentity = { ...baseIdentity, ...overrides };
  return { ...identity, generatedDocumentId: computeGeneratedDocumentId(identity) };
}

const generated = generatedEvidence();

function createReview(draft: GeneratedDraftEvidence = generated): OwnerReviewedDocumentEvidence {
  const result = createUd100OwnerReview({
    generatedDraft: draft,
    renderedAcknowledgment: {
      renderedGeneratedDocumentId: draft.generatedDocumentId,
      renderedPdfSha256: draft.generatedPdfSha256,
      renderedByteLength: draft.generatedByteLength,
      renderedAtISO: '2026-08-15T19:11:00.000Z',
    },
    ownerConfirmedExactRenderedDocument: true,
    reviewedAtISO: '2026-08-15T19:12:00.000Z',
    reviewStatement: {
      statementId: OWNER_REVIEW_STATEMENT_ID,
      statementVersion: OWNER_REVIEW_STATEMENT_VERSION,
    },
  });
  equal(result.status, 'OWNER_REVIEWED_DOCUMENT', 'exact governed UD-100 E.1 evidence is review-admissible');
  if (result.status !== 'OWNER_REVIEWED_DOCUMENT') throw new Error('UD-100 review fixture must be admissible');
  return result.evidence;
}

function requireUd100ContextBlock(draft: GeneratedDraftEvidence, message: string): void {
  const result = createUd100OwnerReview({
    generatedDraft: draft,
    renderedAcknowledgment: {
      renderedGeneratedDocumentId: draft.generatedDocumentId,
      renderedPdfSha256: draft.generatedPdfSha256,
      renderedByteLength: draft.generatedByteLength,
      renderedAtISO: '2026-08-15T19:11:00.000Z',
    },
    ownerConfirmedExactRenderedDocument: true,
    reviewedAtISO: '2026-08-15T19:12:00.000Z',
    reviewStatement: {
      statementId: OWNER_REVIEW_STATEMENT_ID,
      statementVersion: OWNER_REVIEW_STATEMENT_VERSION,
    },
  });
  equal(result.status, 'BLOCKED', message);
  if (result.status !== 'BLOCKED') throw new Error('expected UD-100 context block');
  equal(result.blockReason, 'GENERATED_CONTEXT_MISMATCH', `${message} with fail-closed context reason`);
}

const review = createReview();
equal(review.generatedDraft.officialSourceArtifactId, UD100_OFFICIAL_SOURCE_IDENTITY.artifactId, 'UD-100 review pins exact existing official source artifact');
equal(review.generatedDraft.officialSourceSnapshotId, UD100_OFFICIAL_SOURCE_IDENTITY.sourceSnapshotId, 'UD-100 review pins exact existing official source snapshot');
equal(review.generatedDraft.preparationManifestId, UD100_PREPARATION_RUNTIME_MANIFEST_ID, 'UD-100 review pins existing E.1 preparation manifest');
equal(review.generatedDraft.mapSnapshotId, UD100_GENERATION_BINDING.mapSnapshotId, 'UD-100 review pins existing D.1 map snapshot');
equal(review.generatedDraft.generatorContractVersion, UD100_GENERATOR_CONTRACT_VERSION, 'UD-100 review pins existing generator contract');
equal(review.generatedDraft.generatorImplementationId, UD100_GENERATED_DRAFT_IMPLEMENTATION_ID, 'UD-100 review pins existing E.1 generator implementation');
equal(review.generatedDraft.generatorImplementationVersion, UD100_GENERATED_DRAFT_IMPLEMENTATION_VERSION, 'UD-100 review pins existing E.1 implementation version');

requireUd100ContextBlock(
  generatedEvidence({ officialSourceArtifactId: `different-source:sha256:${'2'.repeat(64)}` }),
  'different official source cannot enter UD-100 review adapter',
);
requireUd100ContextBlock(
  generatedEvidence({ officialSourceSnapshotId: `sha256:${'2'.repeat(64)}` }),
  'different official source snapshot cannot enter UD-100 review adapter',
);
requireUd100ContextBlock(
  generatedEvidence({ preparationManifestId: `preparation-manifest:sha256:${'2'.repeat(64)}` }),
  'different preparation manifest cannot enter UD-100 review adapter',
);
requireUd100ContextBlock(
  generatedEvidence({ mapSnapshotId: `map:sha256:${'2'.repeat(64)}` }),
  'different D.1 map snapshot cannot enter UD-100 review adapter',
);
requireUd100ContextBlock(
  generatedEvidence({ generatorContractVersion: 'different-generator-contract' }),
  'different generator contract cannot enter UD-100 review adapter',
);
requireUd100ContextBlock(
  generatedEvidence({ generatorImplementationVersion: '9.9.9' }),
  'different E.1 implementation cannot enter UD-100 review adapter',
);

const currentE1: GeneratedDraftCurrentness = { status: 'CURRENT', reasons: [] };
equal(
  evaluateUd100OwnerReviewCurrentnessFromGeneratedDraftCurrentness(review, generated, currentE1).status,
  'CURRENT',
  'exact current UD-100 generated document plus exact review binding is CURRENT',
);
const staleE1: GeneratedDraftCurrentness = {
  status: 'OUT_OF_DATE',
  reasons: ['CURRENT_INPUT_BLOCKED:SOURCE_VALIDATION_FAILED'],
};
const staleReview = evaluateUd100OwnerReviewCurrentnessFromGeneratedDraftCurrentness(review, generated, staleE1);
equal(staleReview.status, 'OUT_OF_DATE', 'E.1 OUT_OF_DATE deterministically makes UD-100 review OUT_OF_DATE');
ok(
  staleReview.reasons.includes('GENERATED_DRAFT_OUT_OF_DATE:CURRENT_INPUT_BLOCKED:SOURCE_VALIDATION_FAILED'),
  'UD-100 currentness retains exact E.1 out-of-date reason',
);

const regenerated = generatedEvidence({ generationInputId: `generation-input:sha256:${'2'.repeat(64)}` });
const regeneratedReview = evaluateUd100OwnerReviewCurrentnessFromGeneratedDraftCurrentness(review, regenerated, currentE1);
equal(regeneratedReview.status, 'OUT_OF_DATE', 'regenerated UD-100 cannot inherit prior owner review');
ok(regeneratedReview.reasons.includes('GENERATED_DOCUMENT_ID_CHANGED'), 'regenerated UD-100 reports generatedDocumentId change');
ok(regeneratedReview.reasons.includes('GENERATION_INPUT_CHANGED'), 'regenerated UD-100 reports generation-input drift');
equal(review.generatedDraft.generatedDocumentId, generated.generatedDocumentId, 'historical UD-100 review evidence remains attached to original document');

const changedHash = evaluateUd100OwnerReviewCurrentnessFromGeneratedDraftCurrentness(
  review,
  generatedEvidence({ generatedPdfSha256: '2'.repeat(64) }),
  currentE1,
);
ok(changedHash.reasons.includes('GENERATED_PDF_SHA256_CHANGED'), 'changed UD-100 PDF digest makes review OUT_OF_DATE');
const changedLength = evaluateUd100OwnerReviewCurrentnessFromGeneratedDraftCurrentness(
  review,
  generatedEvidence({ generatedByteLength: generated.generatedByteLength + 1 }),
  currentE1,
);
ok(changedLength.reasons.includes('GENERATED_BYTE_LENGTH_CHANGED'), 'changed UD-100 byte length makes review OUT_OF_DATE');
const changedMap = evaluateUd100OwnerReviewCurrentnessFromGeneratedDraftCurrentness(
  review,
  generatedEvidence({ mapSnapshotId: `map:sha256:${'2'.repeat(64)}` }),
  currentE1,
);
ok(changedMap.reasons.includes('CURRENT_UD100_GENERATED_DRAFT_IDENTITY_CHANGED'), 'changed governed UD-100 contract identity fails adapter currentness');
ok(changedMap.reasons.includes('MAP_SNAPSHOT_CHANGED'), 'changed map provenance is retained as deterministic generic currentness reason');
equal(
  JSON.stringify(changedMap),
  JSON.stringify(evaluateUd100OwnerReviewCurrentnessFromGeneratedDraftCurrentness(
    review,
    generatedEvidence({ mapSnapshotId: `map:sha256:${'2'.repeat(64)}` }),
    currentE1,
  )),
  'UD-100 currentness reasons are deterministic across repeated evaluation',
);

const source = readFileSync('lib/flow/ud100OwnerReview.ts', 'utf8');
ok(source.includes('evaluateUd100GeneratedDraftCurrentness('), 'runtime wrapper delegates generated-draft currentness to existing UD-100 E.1 evaluator');
ok(!source.includes('generateUd100GeneratedDraft('), 'owner-review adapter does not generate a UD-100');
ok(!source.includes('PDFDocument') && !source.includes('pdf-lib'), 'owner-review adapter does not load or write PDF fields');
ok(!source.includes('filingCanonicalFacts'), 'owner-review adapter does not assemble canonical filing facts');
ok(!source.includes('FORM_RELEVANT_FOR_PREPARATION'), 'owner-review adapter does not create preparation-applicability authority');
ok(!source.includes('filingReadiness'), 'owner-review adapter does not decide Filing Readiness');
ok(!source.includes("from 'react'") && !source.includes("from 'next/"), 'owner-review adapter contains no UI/route imports');
ok(!source.includes('localStorage') && !source.includes("from './persistence'"), 'owner-review adapter contains no persistence');
ok(!source.includes('supabase') && !source.includes('database'), 'owner-review adapter contains no API/database/Supabase path');
ok(!source.includes('download') && !source.includes('signature'), 'owner-review adapter contains no download/signature behavior');

console.log(`${passed} Stage E.2.1 UD-100 owner-review assertions passed`);
