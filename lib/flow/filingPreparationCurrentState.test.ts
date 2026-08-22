import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import {
  computeGeneratedDocumentId,
  sha256Bytes,
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
  computeFilingPreparationCurrentStateId,
  createFilingPreparationCurrentState,
  validateFilingPreparationCurrentState,
  type CreateFilingPreparationCurrentStateInput,
  type FilingPreparationCanonicalSnapshot,
  type FilingPreparationCurrentState,
} from './filingPreparationCurrentState';

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';
const RISKPATH_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

let assertions = 0;
function equal<T>(actual: T, expected: T, message: string): void {
  assert.equal(actual, expected, message);
  assertions += 1;
}
function ok(condition: unknown, message: string): void {
  assert.ok(condition, message);
  assertions += 1;
}

function draftFixture(bytes = Uint8Array.from([10, 20, 30, 40, 50])): GeneratedDraftEvidence {
  const identity: GeneratedDraftIdentity = {
    schemaVersion: 1,
    artifactClass: 'GENERATED_DRAFT',
    artifactRole: 'OWNER_GENERATED_PREPARATION',
    officialSourceArtifactId: 'synthetic-authority:TEST-1:2026-01-01:sha256:source',
    officialSourceSnapshotId: 'sha256:source',
    officialSourceSha256: '1'.repeat(64),
    sourceAdmissionPolicyId: 'qpdf-dual-pass-linearization-isolation-v2',
    sourceAdmissionStatus: 'SOURCE_ADMITTED_CLEAN',
    qpdfAssetIdentityDigest: 'qpdf-asset:sha256:fixture',
    sourcePassACommandDigest: 'qpdf-command:sha256:pass-a',
    sourcePassAWarningInventoryDigest: 'source-warning-inventory:sha256:pass-a',
    sourcePassBCommandDigest: 'qpdf-command:sha256:pass-b',
    sourcePassBWarningInventoryDigest: 'source-warning-inventory:sha256:pass-b',
    sourceWarningInventoryDigest: 'source-warning-inventory:sha256:all',
    qpdfIntermediateSha256: '2'.repeat(64),
    xfaPolicyId: 'acroform-fallback-xfa-disconnection-v1',
    xfaDigest: 'xfa:sha256:fixture',
    preparationManifestId: 'preparation-runtime-manifest:sha256:fixture',
    preparationSourceId: 'preparation-source:sha256:fixture',
    preparationDerivativeSha256: '3'.repeat(64),
    preparationFieldEquivalenceDigest: 'field-equivalence:sha256:fixture',
    preparationSemanticDeltaDigest: 'semantic-delta:sha256:fixture',
    preparationAuthorizationSnapshotId: 'preparation-authorization:sha256:fixture',
    mapSnapshotId: 'field-map:sha256:fixture',
    referencedFactSnapshotId: 'referenced-facts:sha256:fixture',
    generationInputId: 'generation-input:sha256:fixture',
    generatorContractVersion: 'e2.3-current-state-fixture-v1',
    generatorImplementationId: 'synthetic-current-state-generator',
    generatorImplementationVersion: '1.0.0',
    fieldWritePlanDigest: 'field-write-plan:sha256:fixture',
    preparedAtISO: '2026-08-22T02:10:00.000Z',
    generatedPdfSha256: sha256Bytes(bytes),
    generatedByteLength: bytes.byteLength,
  };
  return { ...identity, generatedDocumentId: computeGeneratedDocumentId(identity) };
}

function snapshotFromDraft(draft: GeneratedDraftEvidence): FilingPreparationCanonicalSnapshot {
  return {
    officialSourceArtifactId: draft.officialSourceArtifactId,
    officialSourceSnapshotId: draft.officialSourceSnapshotId,
    officialSourceSha256: draft.officialSourceSha256,
    sourceAdmissionPolicyId: draft.sourceAdmissionPolicyId,
    sourceAdmissionStatus: draft.sourceAdmissionStatus,
    qpdfAssetIdentityDigest: draft.qpdfAssetIdentityDigest,
    sourcePassACommandDigest: draft.sourcePassACommandDigest,
    sourcePassAWarningInventoryDigest: draft.sourcePassAWarningInventoryDigest,
    sourcePassBCommandDigest: draft.sourcePassBCommandDigest,
    sourcePassBWarningInventoryDigest: draft.sourcePassBWarningInventoryDigest,
    sourceWarningInventoryDigest: draft.sourceWarningInventoryDigest,
    qpdfIntermediateSha256: draft.qpdfIntermediateSha256,
    xfaPolicyId: draft.xfaPolicyId,
    xfaDigest: draft.xfaDigest,
    preparationManifestId: draft.preparationManifestId,
    preparationSourceId: draft.preparationSourceId,
    preparationDerivativeSha256: draft.preparationDerivativeSha256,
    preparationFieldEquivalenceDigest: draft.preparationFieldEquivalenceDigest,
    preparationSemanticDeltaDigest: draft.preparationSemanticDeltaDigest,
    preparationAuthorizationSnapshotId: draft.preparationAuthorizationSnapshotId,
    mapSnapshotId: draft.mapSnapshotId,
    referencedFactSnapshotId: draft.referencedFactSnapshotId,
    generationInputId: draft.generationInputId,
    generatorContractVersion: draft.generatorContractVersion,
    generatorImplementationId: draft.generatorImplementationId,
    generatorImplementationVersion: draft.generatorImplementationVersion,
    fieldWritePlanDigest: draft.fieldWritePlanDigest,
  };
}

function reviewFixture(draft: GeneratedDraftEvidence): OwnerReviewedDocumentEvidence {
  const result = createOfficialFormOwnerReview({
    generatedDraft: draft,
    renderedAcknowledgment: {
      renderedGeneratedDocumentId: draft.generatedDocumentId,
      renderedPdfSha256: draft.generatedPdfSha256,
      renderedByteLength: draft.generatedByteLength,
      renderedAtISO: '2026-08-22T02:11:00.000Z',
    },
    ownerConfirmedExactRenderedDocument: true,
    reviewedAtISO: '2026-08-22T02:12:00.000Z',
    reviewStatement: {
      statementId: OWNER_REVIEW_STATEMENT_ID,
      statementVersion: OWNER_REVIEW_STATEMENT_VERSION,
    },
  });
  if (result.status !== 'OWNER_REVIEWED_DOCUMENT') throw new Error('synthetic Owner Review fixture unexpectedly blocked');
  return result.evidence;
}

function baseInput(revision = 1): CreateFilingPreparationCurrentStateInput {
  const draft = draftFixture();
  return {
    authenticatedUserId: USER_A,
    riskpathRecordId: RISKPATH_A,
    revision,
    preparationSnapshot: snapshotFromDraft(draft),
    generatedDraftBinding: null,
    generatedDraftBytes: null,
    ownerReviewBinding: null,
  };
}

function generatedInput(revision = 1): CreateFilingPreparationCurrentStateInput {
  const bytes = Uint8Array.from([10, 20, 30, 40, 50]);
  const draft = draftFixture(bytes);
  return {
    ...baseInput(revision),
    preparationSnapshot: snapshotFromDraft(draft),
    generatedDraftBinding: { revision, generatedDraft: draft },
    generatedDraftBytes: bytes,
  };
}

function reviewedInput(revision = 1): CreateFilingPreparationCurrentStateInput {
  const input = generatedInput(revision);
  const generated = input.generatedDraftBinding as { revision: number; generatedDraft: GeneratedDraftEvidence };
  return {
    ...input,
    ownerReviewBinding: { revision, ownerReviewEvidence: reviewFixture(generated.generatedDraft) },
  };
}

function requireBuilt(input: CreateFilingPreparationCurrentStateInput): FilingPreparationCurrentState {
  const result = createFilingPreparationCurrentState(input);
  if (result.status !== 'CURRENT_STATE_REVISION') throw new Error('synthetic current-state fixture unexpectedly blocked');
  return result.currentState;
}

function main(): void {
  {
    const state = requireBuilt(baseInput());
    equal(state.schemaVersion, 1, 'schema version is v1');
    equal(state.recordClass, 'FILING_PREPARATION_CURRENT_STATE', 'record class is exact');
    equal(state.revision, 1, 'revision is exact');
    equal(state.generatedDraftBinding, null, 'draft binding can be absent');
    equal(state.generatedDraftBytes, null, 'draft bytes are absent iff draft binding absent');
    equal(state.ownerReviewBinding, null, 'Owner Review can be absent');
    equal(state.stageF, 'HELD', 'Stage F remains held');
    equal(state.filing, 'NOT_PERFORMED', 'filing is not performed');
    ok(/^filing-preparation-current-state:sha256:[0-9a-f]{64}$/.test(state.filingPreparationCurrentStateId), 'state ID has exact deterministic prefix');
    equal(validateFilingPreparationCurrentState(state).status, 'VALID', 'built state validates');
  }

  {
    const first = requireBuilt(baseInput());
    equal(first.filingPreparationCurrentStateId, requireBuilt(baseInput()).filingPreparationCurrentStateId, 'same immutable evidence is deterministic');
    ok(first.filingPreparationCurrentStateId !== requireBuilt(baseInput(2)).filingPreparationCurrentStateId, 'later revision has a different identity');
    ok(first.filingPreparationCurrentStateId !== requireBuilt({ ...baseInput(), authenticatedUserId: USER_B }).filingPreparationCurrentStateId, 'owner identity participates in state identity');
  }

  {
    const result = createFilingPreparationCurrentState({
      ...baseInput(),
      generatedDraftCurrentness: { status: 'CURRENT', reasons: [] },
    } as unknown as CreateFilingPreparationCurrentStateInput);
    equal(result.status, 'BLOCKED', 'caller currentness assertion is rejected');
    if (result.status === 'BLOCKED') equal(result.blockReason, 'INVALID_INPUT_SHAPE', 'caller currentness fails exact input shape');
  }

  for (const [field, value, reason] of [
    ['authenticatedUserId', 'not-a-uuid', 'INVALID_AUTHENTICATED_USER_ID'],
    ['riskpathRecordId', 'not-a-uuid', 'INVALID_RISKPATH_RECORD_ID'],
    ['revision', 0, 'INVALID_REVISION'],
    ['revision', -1, 'INVALID_REVISION'],
    ['revision', 1.5, 'INVALID_REVISION'],
  ] as const) {
    const result = createFilingPreparationCurrentState({ ...baseInput(), [field]: value });
    equal(result.status, 'BLOCKED', `${field} malformed value fails closed`);
    if (result.status === 'BLOCKED') equal(result.blockReason, reason, `${field} has exact block reason`);
  }

  {
    const input = generatedInput();
    input.generatedDraftBytes = null;
    const result = createFilingPreparationCurrentState(input);
    equal(result.status, 'BLOCKED', 'draft binding without bytes fails closed');
    if (result.status === 'BLOCKED') equal(result.blockReason, 'GENERATED_DRAFT_BYTES_REQUIRED', 'missing bytes has exact reason');
  }

  {
    const input = baseInput();
    input.generatedDraftBytes = Uint8Array.from([1]);
    const result = createFilingPreparationCurrentState(input);
    equal(result.status, 'BLOCKED', 'bytes without draft binding fail closed');
    if (result.status === 'BLOCKED') equal(result.blockReason, 'UNBOUND_GENERATED_DRAFT_BYTES', 'unbound bytes has exact reason');
  }

  {
    const input = generatedInput();
    input.generatedDraftBytes = Uint8Array.from([10, 20]);
    const result = createFilingPreparationCurrentState(input);
    equal(result.status, 'BLOCKED', 'byte length mismatch fails closed');
    if (result.status === 'BLOCKED') equal(result.blockReason, 'GENERATED_DRAFT_BYTE_LENGTH_MISMATCH', 'byte length mismatch has exact reason');
  }

  {
    const input = generatedInput();
    input.generatedDraftBytes = Uint8Array.from([50, 40, 30, 20, 10]);
    const result = createFilingPreparationCurrentState(input);
    equal(result.status, 'BLOCKED', 'same-length byte hash mismatch fails closed');
    if (result.status === 'BLOCKED') equal(result.blockReason, 'GENERATED_DRAFT_SHA256_MISMATCH', 'byte hash mismatch has exact reason');
  }

  {
    const input = generatedInput(2);
    const binding = input.generatedDraftBinding as { revision: number; generatedDraft: GeneratedDraftEvidence };
    input.generatedDraftBinding = { ...binding, revision: 1 };
    const result = createFilingPreparationCurrentState(input);
    equal(result.status, 'BLOCKED', 'historical generated binding cannot become current');
    if (result.status === 'BLOCKED') equal(result.blockReason, 'GENERATED_DRAFT_REVISION_MISMATCH', 'historical generated binding has exact reason');
  }

  {
    const input = generatedInput();
    input.preparationSnapshot = {
      ...(input.preparationSnapshot as FilingPreparationCanonicalSnapshot),
      mapSnapshotId: 'field-map:sha256:new-state',
    };
    const result = createFilingPreparationCurrentState(input);
    equal(result.status, 'BLOCKED', 'old draft cannot bind changed current preparation snapshot');
    if (result.status === 'BLOCKED') equal(result.blockReason, 'GENERATED_DRAFT_PREPARATION_MISMATCH', 'preparation mismatch has exact reason');
  }

  {
    const state = requireBuilt(generatedInput());
    equal(validateFilingPreparationCurrentState(state).status, 'VALID', 'exact draft bytes/evidence revision validates');
    ok(state.generatedDraftBytes instanceof Uint8Array, 'generated bytes remain exact revision evidence');
  }

  {
    const input = baseInput();
    input.ownerReviewBinding = { revision: 1, ownerReviewEvidence: reviewFixture(draftFixture()) };
    const result = createFilingPreparationCurrentState(input);
    equal(result.status, 'BLOCKED', 'Owner Review without draft binding fails closed');
    if (result.status === 'BLOCKED') equal(result.blockReason, 'OWNER_REVIEW_REQUIRES_GENERATED_DRAFT', 'unbound review has exact reason');
  }

  {
    const input = reviewedInput(2);
    const review = input.ownerReviewBinding as { revision: number; ownerReviewEvidence: OwnerReviewedDocumentEvidence };
    input.ownerReviewBinding = { ...review, revision: 1 };
    const result = createFilingPreparationCurrentState(input);
    equal(result.status, 'BLOCKED', 'historical Owner Review cannot become current');
    if (result.status === 'BLOCKED') equal(result.blockReason, 'OWNER_REVIEW_REVISION_MISMATCH', 'historical review has exact reason');
  }

  {
    const input = generatedInput();
    input.ownerReviewBinding = {
      revision: 1,
      ownerReviewEvidence: reviewFixture(draftFixture(Uint8Array.from([11, 21, 31, 41, 51]))),
    };
    const result = createFilingPreparationCurrentState(input);
    equal(result.status, 'BLOCKED', 'review of different generated identity fails closed');
    if (result.status === 'BLOCKED') equal(result.blockReason, 'OWNER_REVIEW_GENERATED_DRAFT_MISMATCH', 'review draft mismatch has exact reason');
  }

  {
    const input = reviewedInput();
    const review = structuredClone(input.ownerReviewBinding) as { revision: number; ownerReviewEvidence: OwnerReviewedDocumentEvidence };
    review.ownerReviewEvidence.ownerReviewRecordId = `owner-review:sha256:${'f'.repeat(64)}`;
    input.ownerReviewBinding = review;
    const result = createFilingPreparationCurrentState(input);
    equal(result.status, 'BLOCKED', 'intrinsically invalid Owner Review fails closed');
    if (result.status === 'BLOCKED') equal(result.blockReason, 'OWNER_REVIEW_INVALID', 'review identity corruption has exact reason');
  }

  {
    const state = requireBuilt(reviewedInput());
    equal(validateFilingPreparationCurrentState(state).status, 'VALID', 'exact Owner Review binding validates');
    equal(state.ownerReviewBinding?.revision, state.revision, 'Owner Review binds exact revision');
    equal(state.ownerReviewBinding?.ownerReviewEvidence.generatedDraft.generatedDocumentId, state.generatedDraftBinding?.generatedDraft.generatedDocumentId, 'Owner Review binds exact generated document');
  }

  {
    const state = structuredClone(requireBuilt(baseInput()));
    state.stageF = 'RELEASED' as unknown as 'HELD';
    const result = validateFilingPreparationCurrentState(state);
    equal(result.status, 'BLOCKED', 'downstream authority mutation fails closed');
    if (result.status === 'BLOCKED') equal(result.blockReason, 'BOUNDARY_INVARIANT_MISMATCH', 'Stage F mutation has exact reason');
  }

  {
    const state = structuredClone(requireBuilt(baseInput()));
    state.filingPreparationCurrentStateId = `filing-preparation-current-state:sha256:${'0'.repeat(64)}`;
    const result = validateFilingPreparationCurrentState(state);
    equal(result.status, 'BLOCKED', 'deterministic state ID mismatch fails closed');
    if (result.status === 'BLOCKED') equal(result.blockReason, 'CURRENT_STATE_ID_MISMATCH', 'state ID mismatch has exact reason');
  }

  {
    const state = requireBuilt(baseInput());
    const { filingPreparationCurrentStateId: ignoredId, generatedDraftBytes: ignoredBytes, ...identity } = state;
    void ignoredId;
    void ignoredBytes;
    equal(computeFilingPreparationCurrentStateId(identity), state.filingPreparationCurrentStateId, 'public deterministic ID helper recomputes exact identity');
  }

  {
    const sql = readFileSync('supabase/staged-migrations/059_e2_3d0b_filing_preparation_current_state.sql', 'utf8');
    ok(sql.includes('create table public.filing_preparation_current_state_revisions'), 'migration creates authorized relation');
    ok(sql.includes('unique (riskpath_record_id, revision)'), 'duplicate RiskPath/revision is rejected');
    ok(sql.includes('enable row level security') && sql.includes('force row level security'), 'RLS is enabled and forced');
    ok(sql.includes('revoke all on public.filing_preparation_current_state_revisions from anon, authenticated'), 'anon/authenticated inherited authority is revoked');
    ok(sql.includes('grant select, insert on public.filing_preparation_current_state_revisions to authenticated'), 'authenticated receives SELECT/INSERT only');
    ok(!/grant[^;]*(update|delete)/i.test(sql), 'no UPDATE/DELETE grant exists');
    ok(sql.includes('user_id = (select auth.uid())') && sql.includes('rp.user_id = (select auth.uid())'), 'RLS binds row and RiskPath to same owner');
    ok(!sql.toLowerCase().includes('security definer') && !sql.includes('service_role'), 'no privileged bypass exists');
    ok(!sql.toLowerCase().includes('create trigger') && !sql.toLowerCase().includes('create function'), 'no trigger/RPC machinery exists');
    ok(sql.includes("state_payload -> 'generatedDraftBinding' = 'null'::jsonb"), 'absent draft binding requires absent bytes');
    ok(sql.includes('octet_length(generated_draft_bytes)'), 'generated byte length is checked');
    ok(sql.includes("state_payload #>> '{ownerReviewBinding,ownerReviewEvidence,generatedDraft,generatedDocumentId}'"), 'Owner Review is bound to exact generated identity');
    ok(sql.includes("not (state_payload ? 'generatedDraftCurrentness')"), 'durable payload rejects caller currentness assertion');
    ok(!sql.includes('filing_preparation_records '), 'substrate is not circularly sourced from filing-preparation records');
  }

  {
    const source = readFileSync('lib/flow/filingPreparationCurrentState.ts', 'utf8');
    ok(!source.includes('generatedDraftCurrentness'), 'contract has no caller currentness authority');
    ok(!source.includes('@supabase/') && !source.includes('fetch('), 'contract has no DB/network source adapter');
    ok(!source.includes('localStorage') && !source.includes('service_role'), 'contract has no browser/privileged persistence');
    ok(!source.includes('filingPreparationRecord'), 'contract is not circularly sourced from filing-preparation record evidence');
  }

  console.log(`filingPreparationCurrentState.test.ts: ${assertions} assertions passed`);
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
