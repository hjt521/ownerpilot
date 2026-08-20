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
  evaluateOfficialFormOwnerReviewCurrentness,
  OWNER_REVIEW_STATEMENT_ID,
  OWNER_REVIEW_STATEMENT_VERSION,
  type OwnerReviewedDocumentEvidence,
} from './officialFormOwnerReview';
import {
  createFilingPreparationRecord,
  evaluateFilingPreparationRecordAdmission,
  type FilingPreparationRecord,
} from './filingPreparationRecord';
import { evaluateFilingPreparationProgression } from './filingPreparationProgression';

let passed = 0;
const equal = <T>(actual: T, expected: T, message: string) => { assert.equal(actual, expected, message); passed += 1; };
const ok = (condition: unknown, message: string) => { assert.ok(condition, message); passed += 1; };

const generatedIdentity: GeneratedDraftIdentity = {
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

function generated(overrides: Partial<GeneratedDraftIdentity> = {}): GeneratedDraftEvidence {
  const identity = { ...generatedIdentity, ...overrides } as GeneratedDraftIdentity;
  return { ...identity, generatedDocumentId: computeGeneratedDocumentId(identity) };
}

function reviewed(draft: GeneratedDraftEvidence): OwnerReviewedDocumentEvidence {
  const result = createOfficialFormOwnerReview({
    generatedDraft: draft,
    renderedAcknowledgment: {
      renderedGeneratedDocumentId: draft.generatedDocumentId,
      renderedPdfSha256: draft.generatedPdfSha256,
      renderedByteLength: draft.generatedByteLength,
      renderedAtISO: '2026-08-20T17:01:00.000Z',
    },
    ownerConfirmedExactRenderedDocument: true,
    reviewedAtISO: '2026-08-20T17:02:00.000Z',
    reviewStatement: { statementId: OWNER_REVIEW_STATEMENT_ID, statementVersion: OWNER_REVIEW_STATEMENT_VERSION },
  });
  equal(result.status, 'OWNER_REVIEWED_DOCUMENT', 'progression fixture owner review is canonical');
  if (result.status !== 'OWNER_REVIEWED_DOCUMENT') throw new Error('review fixture must be admissible');
  return result.evidence;
}

const current: GeneratedDraftCurrentness = { status: 'CURRENT', reasons: [] };
const draft = generated();
const ownerReview = reviewed(draft);
const built = createFilingPreparationRecord({ ownerReviewEvidence: ownerReview, currentGeneratedDraft: draft, generatedDraftCurrentness: current });
equal(built.status, 'FILING_PREPARATION_RECORD', 'progression fixture record is admissible');
if (built.status !== 'FILING_PREPARATION_RECORD') throw new Error('record fixture must be admissible');
const record: FilingPreparationRecord = built.record;

const success = evaluateFilingPreparationProgression({ record, currentGeneratedDraft: draft, generatedDraftCurrentness: current });
equal(success.status, 'E2_3_RECORD_CURRENT', 'exact canonical record may progress only to current E2.3 state');
if (success.status !== 'E2_3_RECORD_CURRENT') throw new Error('current progression must succeed');
equal(success.persistenceContract, 'SATISFIED', 'successful evaluation reports only persistence contract satisfaction');
equal(success.persistence, 'NOT_PERFORMED', 'successful evaluation performs no persistence');
equal(success.nextGovernedStage, 'STAGE_F_HELD', 'successful evaluation keeps next governed stage held');
equal(success.stageF, 'HELD', 'successful evaluation preserves Stage F hold');
equal(success.signing, 'NOT_PERFORMED', 'successful evaluation performs no signing');
equal(success.filing, 'NOT_PERFORMED', 'successful evaluation performs no filing');
equal(success.courtSubmission, 'NOT_PERFORMED', 'successful evaluation performs no court submission');
equal(success.courtAcceptance, 'NOT_EVALUATED', 'successful evaluation claims no court acceptance');
equal(success.service, 'NOT_PERFORMED', 'successful evaluation performs no service');
equal(success.packetComposition, 'NOT_PERFORMED', 'successful evaluation composes no Filing/Service Packet');
equal(success.legalSufficiency, 'NOT_EVALUATED', 'successful evaluation establishes no legal sufficiency');
equal(success.autonomousExecution, 'NOT_AUTHORIZED', 'successful evaluation grants no autonomous authority');
ok(!('packetReady' in success), 'successful result has no packet-ready state');
ok(!('submitted' in success), 'successful result has no submission state');
ok(!('eFiled' in success), 'successful result has no e-filing state');
ok(!('courtAccepted' in success), 'successful result has no court-accepted state');
ok(!('stageFAuthority' in success), 'successful result has no Stage F authority token');

function requireBlocked(
  candidateRecord: unknown,
  currentGeneratedDraft: unknown,
  currentness: unknown,
  reason: string,
  message: string,
): void {
  const result = evaluateFilingPreparationProgression({ record: candidateRecord, currentGeneratedDraft, generatedDraftCurrentness: currentness });
  equal(result.status, 'BLOCKED', message);
  if (result.status !== 'BLOCKED') throw new Error('expected blocked progression');
  equal(result.blockReason, reason, `${message} with deterministic reason`);
  equal(result.persistenceContract, 'NOT_SATISFIED', `${message} does not report persistence contract satisfied`);
  equal(result.persistence, 'NOT_PERFORMED', `${message} performs no persistence`);
  equal(result.nextGovernedStage, 'STAGE_F_HELD', `${message} preserves Stage F boundary`);
  equal(result.stageF, 'HELD', `${message} preserves Stage F hold`);
  equal(result.signing, 'NOT_PERFORMED', `${message} performs no signing`);
  equal(result.filing, 'NOT_PERFORMED', `${message} performs no filing`);
  equal(result.autonomousExecution, 'NOT_AUTHORIZED', `${message} grants no execution authority`);
}

requireBlocked(
  record,
  draft,
  { status: 'OUT_OF_DATE', reasons: ['REFERENCED_FACT_SNAPSHOT_CHANGED'] },
  'GENERATED_DRAFT_OUT_OF_DATE',
  'stale generated draft blocks progression',
);

const regenerated = generated({ generatedPdfSha256: '0'.repeat(64) });
const ownerOutOfDate = evaluateOfficialFormOwnerReviewCurrentness(ownerReview, regenerated, current);
equal(ownerOutOfDate.status, 'OUT_OF_DATE', 'canonical owner-review evaluator marks historical review OUT_OF_DATE for regenerated current bytes');
if (ownerOutOfDate.status !== 'OUT_OF_DATE') throw new Error('historical owner review must be OUT_OF_DATE');
ok(ownerOutOfDate.reasons.includes('GENERATED_PDF_SHA256_CHANGED'), 'canonical owner-review OUT_OF_DATE evidence identifies changed generated PDF hash');

const ownerOutOfDateAdmission = evaluateFilingPreparationRecordAdmission({
  record,
  currentGeneratedDraft: regenerated,
  generatedDraftCurrentness: current,
});
equal(ownerOutOfDateAdmission.status, 'BLOCKED', 'canonical owner-review OUT_OF_DATE evidence blocks E2.3 admission');
if (ownerOutOfDateAdmission.status !== 'BLOCKED') throw new Error('owner-review OUT_OF_DATE must block E2.3 admission');
equal(ownerOutOfDateAdmission.persistence, 'NOT_PERFORMED', 'owner-review OUT_OF_DATE admission performs no persistence');
equal(ownerOutOfDateAdmission.stageF, 'HELD', 'owner-review OUT_OF_DATE admission preserves Stage F hold');
requireBlocked(record, regenerated, current, 'CURRENT_GENERATED_DRAFT_MISMATCH', 'canonical owner-review OUT_OF_DATE evidence cannot reach E2_3_RECORD_CURRENT');

const tamperedId = structuredClone(record);
tamperedId.filingPreparationRecordId = `filing-preparation-record:sha256:${'0'.repeat(64)}`;
requireBlocked(tamperedId, draft, current, 'FILING_PREPARATION_RECORD_ID_MISMATCH', 'tampered record identity blocks progression');

const falsePersistence = structuredClone(record) as unknown as Record<string, unknown>;
falsePersistence.persistence = 'PERFORMED';
requireBlocked(falsePersistence, draft, current, 'BOUNDARY_INVARIANT_MISMATCH', 'false persistence claim blocks progression');

const falseFiling = structuredClone(record) as unknown as Record<string, unknown>;
falseFiling.filing = 'PERFORMED';
requireBlocked(falseFiling, draft, current, 'BOUNDARY_INVARIANT_MISMATCH', 'attempted filing claim blocks progression');

const falseStageF = structuredClone(record) as unknown as Record<string, unknown>;
falseStageF.stageF = 'AUTHORIZED';
requireBlocked(falseStageF, draft, current, 'BOUNDARY_INVARIANT_MISMATCH', 'attempted Stage F authority blocks progression');

const extraSerializedField = structuredClone(record) as unknown as Record<string, unknown>;
extraSerializedField.packetReady = true;
requireBlocked(extraSerializedField, draft, current, 'INVALID_INPUT_SHAPE', 'unknown serialized packet state fails closed');

requireBlocked(record, draft, { status: 'CURRENT', reasons: ['unexpected'] }, 'INVALID_GENERATED_DRAFT_CURRENTNESS', 'malformed currentness shape blocks progression');
requireBlocked(record, draft, { status: 'READY_TO_FILE', reasons: [] }, 'INVALID_GENERATED_DRAFT_CURRENTNESS', 'fabricated filing-state enum cannot become E2.3 currentness');

const nestedTamper = structuredClone(record) as unknown as { ownerReviewEvidence: { renderedAcknowledgment: Record<string, unknown> } };
nestedTamper.ownerReviewEvidence.renderedAcknowledgment.fabricated = 'court-ready';
requireBlocked(nestedTamper, draft, current, 'INVALID_OWNER_REVIEW_EVIDENCE', 'malformed nested owner-review shape blocks progression');

const source = readFileSync(new URL('./filingPreparationProgression.ts', import.meta.url), 'utf8');
ok(!source.includes('localStorage'), 'progression core contains no local persistence');
ok(!source.includes('supabase') && !source.includes('database'), 'progression core contains no database/Supabase integration');
ok(!source.includes('fetch(') && !source.includes("from 'next/"), 'progression core contains no network/API route');
ok(!source.includes('ud100FilingPreparation'), 'progression core does not synthesize historical PR #389 state');

console.log(`${passed} E2.3A filing-preparation progression assertions passed`);
