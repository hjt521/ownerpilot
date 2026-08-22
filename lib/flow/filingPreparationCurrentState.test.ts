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
function deepEqual(actual: unknown, expected: unknown, message: string): void {
  assert.deepEqual(actual, expected, message);
  assertions += 1;
}

function generatedDraftFixture(bytes = Uint8Array.from([10, 20, 30, 40, 50])): GeneratedDraftEvidence {
  const identity: GeneratedDraftIdentity = {
    schemaVersion: 1,
    artifactClass: 'GENERATED_DRAFT',
    artifactRole: 'OWNER_GENERATED_PREPARATION',
    officialSourceArtifactId: 'synthetic-authority:TEST-1:2026-01-01:sha256:source',
    officialSourceSnapshotId: 'sha256:source',
    officialSourceSha256: '1'.repeat(64),
    sourceAdmissionPolicyId: 'qpdf-dual-pass-linearization-isolation-v2',
    sourceAdmissionStatus: 'SOURCE_ADMITTED_CLEAN',
    qpdfAssetIdentityDigest: 'qpdf-asset:sha256:asset',
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
  return {
    ...identity,
    generatedDocumentId: computeGeneratedDocumentId(identity),
  };
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

function ownerReviewFixture(draft: GeneratedDraftEvidence): OwnerReviewedDocumentEvidence {
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
  assert.equal(result.status, 'OWNER_REVIEWED_DOCUMENT');
  if (result.status !== 'OWNER_REVIEWED_DOCUMENT') throw new Error('synthetic owner review fixture blocked');
  return result.evidence;
}

function baseInput(revision = 1): CreateFilingPreparationCurrentStateInput {
  const draft = generatedDraftFixture();
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
  const draft = generatedDraftFixture(bytes);
  return {
    authenticatedUserId: USER_A,
    riskpathRecordId: RISKPATH_A,
    revision,
    preparationSnapshot: snapshotFromDraft(draft),
    generatedDraftBinding: { revision, generatedDraft: draft },
    generatedDraftBytes: bytes,
    ownerReviewBinding: null,
  };
}

function ownerReviewedInput(revision = 1): CreateFilingPreparationCurrentStateInput {
  const input = generatedInput(revision);
  const binding = input.generatedDraftBinding as { revision: number; generatedDraft: GeneratedDraftEvidence };
  return {
    ...input,
    ownerReviewBinding: {
      revision,
      ownerReviewEvidence: ownerReviewFixture(binding.generatedDraft),
    },
  };
}

function requireBuilt(input: CreateFilingPreparationCurrentStateInput): FilingPreparationCurrentState {
  const result = createFilingPreparationCurrentState(input);
  assert.equal(result.status, 'CURRENT_STATE_REVISION');
  if (result.status !== 'CURRENT_STATE_REVISION') throw new Error(`${result.blockReason}: ${result.detail}`);
  return result.currentState;
}

function main(): void {
  {
    const result = createFilingPreparationCurrentState(baseInput());
    equal(result.status, 'CURRENT_STATE_REVISION', 'valid immutable revision without generated draft is accepted');
    if (result.status === 'CURRENT_STATE_REVISION') {
      equal(result.currentState.schemaVersion, 1, 'schema version is exact v1');
      equal(result.currentState.recordClass, 'FILING_PREPARATION_CURRENT_STATE', 'record class is exact');
      equal(result.currentState.revision, 1, 'revision is preserved');
      equal(result.currentState.generatedDraftBinding, null, 'generated binding is absent when no draft exists');
      equal(result.currentState.generatedDraftBytes, null, 'generated bytes are absent when no draft exists');
      equal(result.currentState.ownerReviewBinding, null, 'Owner Review is absent when no draft exists');
      equal(result.currentState.stageF, 'HELD', 'Stage F remains held');
      equal(result.currentState.filing, 'NOT_PERFORMED', 'filing remains not performed');
      equal(result.currentState.autonomousExecution, 'NOT_AUTHORIZED', 'autonomous execution remains unauthorized');
      ok(/^filing-preparation-current-state:sha256:[0-9a-f]{64}$/.test(result.currentState.filingPreparationCurrentStateId), 'deterministic current-state ID has exact prefix/digest shape');
      equal(validateFilingPreparationCurrentState(result.currentState).status, 'VALID', 'built revision validates exactly');
    }
  }

  {
    const first = requireBuilt(baseInput());
    const again = requireBuilt(baseInput());
    equal(first.filingPreparationCurrentStateId, again.filingPreparationCurrentStateId, 'identical immutable evidence yields identical deterministic ID');
    const secondRevision = requireBuilt(baseInput(2));
    ok(first.filingPreparationCurrentStateId !== secondRevision.filingPreparationCurrentStateId, 'later revision receives a distinct deterministic identity');
  }

  {
    const result = createFilingPreparationCurrentState({
      ...baseInput(),
      generatedDraftCurrentness: { status: 'CURRENT', reasons: [] },
    } as unknown as CreateFilingPreparationCurrentStateInput);
    equal(result.status, 'BLOCKED', 'caller-authored generated currentness assertion is rejected');
    if (result.status === 'BLOCKED') equal(result.blockReason, 'INVALID_INPUT_SHAPE', 'caller currentness fails at exact input-shape boundary');
  }

  {
    const result = createFilingPreparationCurrentState({ ...baseInput(), authenticatedUserId: 'not-a-uuid' });
    equal(result.status, 'BLOCKED', 'malformed authenticated owner UUID fails closed');
    if (result.status === 'BLOCKED') equal(result.blockReason, 'INVALID_AUTHENTICATED_USER_ID', 'malformed owner UUID has exact reason');
  }

  {
    const result = createFilingPreparationCurrentState({ ...baseInput(), riskpathRecordId: 'not-a-uuid' });
    equal(result.status, 'BLOCKED', 'malformed RiskPath UUID fails closed');
    if (result.status === 'BLOCKED') equal(result.blockReason, 'INVALID_RISKPATH_RECORD_ID', 'malformed RiskPath UUID has exact reason');
  }

  for (const revision of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    const result = createFilingPreparationCurrentState({ ...baseInput(), revision });
    equal(result.status, 'BLOCKED', `invalid revision ${String(revision)} fails closed`);
    if (result.status === 'BLOCKED') equal(result.blockReason, 'INVALID_REVISION', 'invalid revision has exact reason');
  }

  {
    const input = generatedInput();
    input.generatedDraftBytes = null;
    const result = createFilingPreparationCurrentState(input);
    equal(result.status, 'BLOCKED', 'generated binding without bytes fails closed');
    if (result.status === 'BLOCKED') equal(result.blockReason, 'GENERATED_DRAFT_BYTES_REQUIRED', 'missing generated bytes has exact reason');
  }

  {
    const input = baseInput();
    input.generatedDraftBytes = Uint8Array.from([1]);
    const result = createFilingPreparationCurrentState(input);
    equal(result.status, 'BLOCKED', 'generated bytes without binding fail closed');
    if (result.status === 'BLOCKED') equal(result.blockReason, 'UNBOUND_GENERATED_DRAFT_BYTES', 'unbound bytes have exact reason');
  }

  {
    const input = generatedInput();
    input.generatedDraftBytes = Uint8Array.from([10, 20]);
    const result = createFilingPreparationCurrentState(input);
    equal(result.status, 'BLOCKED', 'generated byte-length mismatch fails closed');
    if (result.status === 'BLOCKED') equal(result.blockReason, 'GENERATED_DRAFT_BYTE_LENGTH_MISMATCH', 'byte-length mismatch has exact reason');
  }

  {
    const input = generatedInput();
    input.generatedDraftBytes = Uint8Array.from([50, 40, 30, 20, 10]);
    const result = createFilingPreparationCurrentState(input);
    equal(result.status, 'BLOCKED', 'same-length generated SHA-256 mismatch fails closed');
    if (result.status === 'BLOCKED') equal(result.blockReason, 'GENERATED_DRAFT_SHA256_MISMATCH', 'generated SHA mismatch has exact reason');
  }

  {
    const input = generatedInput(2);
    const binding = input.generatedDraftBinding as { revision: number; generatedDraft: GeneratedDraftEvidence };
    input.generatedDraftBinding = { ...binding, revision: 1 };
    const result = createFilingPreparationCurrentState(input);
    equal(result.status, 'BLOCKED', 'generated draft bound to historical revision fails closed');
    if (result.status === 'BLOCKED') equal(result.blockReason, 'GENERATED_DRAFT_REVISION_MISMATCH', 'historical generated binding has exact reason');
  }

  {
    const input = generatedInput();
    input.preparationSnapshot = {
      ...(input.preparationSnapshot as FilingPreparationCanonicalSnapshot),
      mapSnapshotId: 'field-map:sha256:new-current-state',
    };
    const result = createFilingPreparationCurrentState(input);
    equal(result.status, 'BLOCKED', 'self-consistent old generated draft cannot bind a changed preparation snapshot');
    if (result.status === 'BLOCKED') equal(result.blockReason, 'GENERATED_DRAFT_PREPARATION_MISMATCH', 'changed preparation snapshot has exact reason');
  }

  {
    const currentState = requireBuilt(generatedInput());
    equal(validateFilingPreparationCurrentState(currentState).status, 'VALID', 'generated-draft revision validates with exact bytes');
    ok(currentState.generatedDraftBytes instanceof Uint8Array, 'exact generated bytes remain bound to current-state revision');
  }

  {
    const input = baseInput();
    const unrelatedDraft = generatedDraftFixture();
    input.ownerReviewBinding = {
      revision: 1,
      ownerReviewEvidence: ownerReviewFixture(unrelatedDraft),
    };
    const result = createFilingPreparationCurrentState(input);
    equal(result.status, 'BLOCKED', 'Owner Review without generated-draft binding fails closed');
    if (result.status === 'BLOCKED') equal(result.blockReason, 'OWNER_REVIEW_REQUIRES_GENERATED_DRAFT', 'unbound Owner Review has exact reason');
  }

  {
    const input = ownerReviewedInput(2);
    const binding = input.ownerReviewBinding as { revision: number; ownerReviewEvidence: OwnerReviewedDocumentEvidence };
    input.ownerReviewBinding = { ...binding, revision: 1 };
    const result = createFilingPreparationCurrentState(input);
    equal(result.status, 'BLOCKED', 'Owner Review bound to historical revision fails closed');
    if (result.status === 'BLOCKED') equal(result.blockReason, 'OWNER_REVIEW_REVISION_MISMATCH', 'historical Owner Review binding has exact reason');
  }

  {
    const input = generatedInput();
    const alternateBytes = Uint8Array.from([11, 21, 31, 41, 51]);
    const alternateDraft = generatedDraftFixture(alternateBytes);
    input.ownerReviewBinding = {
      revision: 1,
      ownerReviewEvidence: ownerReviewFixture(alternateDraft),
    };
    const result = createFilingPreparationCurrentState(input);
    equal(result.status, 'BLOCKED', 'Owner Review of a different generated document cannot bind current revision');
    if (result.status === 'BLOCKED') equal(result.blockReason, 'OWNER_REVIEW_GENERATED_DRAFT_MISMATCH', 'Owner Review generated mismatch has exact reason');
  }

  {
    const input = ownerReviewedInput();
    const binding = structuredClone(input.ownerReviewBinding) as { revision: number; ownerReviewEvidence: OwnerReviewedDocumentEvidence };
    binding.ownerReviewEvidence.ownerReviewRecordId = `owner-review:sha256:${'f'.repeat(64)}`;
    input.ownerReviewBinding = binding;
    const result = createFilingPreparationCurrentState(input);
    equal(result.status, 'BLOCKED', 'intrinsically invalid Owner Review evidence fails closed');
    if (result.status === 'BLOCKED') equal(result.blockReason, 'OWNER_REVIEW_INVALID', 'Owner Review deterministic identity corruption has exact reason');
  }

  {
    const currentState = requireBuilt(ownerReviewedInput());
    equal(validateFilingPreparationCurrentState(currentState).status, 'VALID', 'exact Owner Review binding validates against exact generated revision');
    equal(currentState.ownerReviewBinding?.revision, currentState.revision, 'Owner Review binds exact current-state revision');
    equal(
      currentState.ownerReviewBinding?.ownerReviewEvidence.generatedDraft.generatedDocumentId,
      currentState.generatedDraftBinding?.generatedDraft.generatedDocumentId,
      'Owner Review binds exact generated-document identity',
    );
  }

  {
    const currentState = structuredClone(requireBuilt(baseInput()));
    currentState.stageF = 'RELEASED' as unknown as 'HELD';
    const result = validateFilingPreparationCurrentState(currentState);
    equal(result.status, 'BLOCKED', 'downstream authority mutation fails closed');
    if (result.status === 'BLOCKED') equal(result.blockReason, 'BOUNDARY_INVARIANT_MISMATCH', 'Stage F mutation has exact reason');
  }

  {
    const currentState = structuredClone(requireBuilt(baseInput()));
    currentState.filingPreparationCurrentStateId = `filing-preparation-current-state:sha256:${'0'.repeat(64)}`;
    const result = validateFilingPreparationCurrentState(currentState);
    equal(result.status, 'BLOCKED', 'deterministic state ID mismatch fails closed');
    if (result.status === 'BLOCKED') equal(result.blockReason, 'CURRENT_STATE_ID_MISMATCH', 'state ID mismatch has exact reason');
  }

  {
    const currentState = requireBuilt(baseInput());
    const identity = {
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
    equal(computeFilingPreparationCurrentStateId(identity), currentState.filingPreparationCurrentStateId, 'public deterministic ID helper recomputes exact revision identity');
  }

  {
    const first = requireBuilt({ ...baseInput(), authenticatedUserId: USER_A });
    const otherOwner = requireBuilt({ ...baseInput(), authenticatedUserId: USER_B });
    ok(first.filingPreparationCurrentStateId !== otherOwner.filingPreparationCurrentStateId, 'owner identity participates in deterministic current-state identity');
  }

  {
    const sql = readFileSync('supabase/staged-migrations/059_e2_3d0b_filing_preparation_current_state.sql', 'utf8');
    ok(sql.includes('create table public.filing_preparation_current_state_revisions'), 'migration creates only the authorized current-state relation');
    ok(sql.includes('unique (riskpath_record_id, revision)'), 'migration rejects duplicate RiskPath/revision pairs');
    ok(sql.includes('alter table public.filing_preparation_current_state_revisions enable row level security'), 'RLS is enabled');
    ok(sql.includes('alter table public.filing_preparation_current_state_revisions force row level security'), 'RLS is forced');
    ok(sql.includes('revoke all on public.filing_preparation_current_state_revisions from anon, authenticated'), 'migration revokes inherited anon/authenticated table authority');
    ok(sql.includes('grant select, insert on public.filing_preparation_current_state_revisions to authenticated'), 'authenticated role receives only SELECT and INSERT');
    ok(!/grant[^;]*(update|delete)/i.test(sql), 'migration grants no authenticated UPDATE or DELETE authority');
    ok(sql.includes('user_id = (select auth.uid())'), 'RLS binds row user to authenticated owner');
    ok(sql.includes('rp.user_id = (select auth.uid())'), 'RLS independently binds referenced RiskPath to same authenticated owner');
    ok(!sql.includes('security definer'), 'migration adds no SECURITY DEFINER bypass');
    ok(!sql.includes('service_role'), 'migration adds no service-role runtime path');
    ok(!sql.includes('create trigger'), 'migration adds no trigger machinery');
    ok(!sql.includes('create function'), 'migration adds no RPC/function machinery');
    ok(sql.includes("state_payload -> 'generatedDraftBinding' = 'null'::jsonb"), 'migration enforces absent binding => absent generated bytes');
    ok(sql.includes('generated_draft_bytes is not null'), 'migration requires bytes for generated-draft binding');
    ok(sql.includes('octet_length(generated_draft_bytes)'), 'migration checks generated byte length against bound evidence');
    ok(sql.includes("jsonb_typeof(state_payload -> 'ownerReviewBinding') = 'object'"), 'migration validates Owner Review binding shape');
    ok(sql.includes("state_payload #>> '{ownerReviewBinding,ownerReviewEvidence,generatedDraft,generatedDocumentId}'"), 'migration binds Owner Review to exact generated-document identity');
    ok(sql.includes("not (state_payload ? 'generatedDraftCurrentness')"), 'migration rejects caller-authored currentness assertion in durable payload');
    ok(!sql.includes('filing_preparation_records '), 'new current-state substrate does not source state from filing_preparation_records');
  }

  {
    const source = readFileSync('lib/flow/filingPreparationCurrentState.ts', 'utf8');
    ok(!source.includes('generatedDraftCurrentness'), 'pure current-state contract contains no caller-authored currentness authority');
    ok(!source.includes('@supabase/'), 'pure current-state contract performs no Supabase access');
    ok(!source.includes('localStorage'), 'pure current-state contract performs no browser persistence');
    ok(!source.includes('service_role'), 'pure current-state contract contains no privileged service-role path');
    ok(!source.includes('filingPreparationRecord'), 'current-state contract is not circularly sourced from filing-preparation record evidence');
    ok(!source.includes('fetch('), 'pure current-state contract performs no network/runtime source resolution');
  }

  {
    const record = requireBuilt(ownerReviewedInput());
    const { generatedDraftBytes: ignoredBytes, ...statePayload } = record;
    void ignoredBytes;
    equal(statePayload.filingPreparationCurrentStateId, record.filingPreparationCurrentStateId, 'durable JSON payload retains deterministic row identity');
    equal(statePayload.authenticatedUserId, USER_A, 'durable JSON payload retains exact authenticated owner identity');
    equal(statePayload.riskpathRecordId, RISKPATH_A, 'durable JSON payload retains exact RiskPath identity');
    equal(statePayload.revision, 1, 'durable JSON payload retains exact immutable revision');
    deepEqual(statePayload.generatedDraftBinding, record.generatedDraftBinding, 'durable payload retains exact generated-draft evidence binding');
    deepEqual(statePayload.ownerReviewBinding, record.ownerReviewBinding, 'durable payload retains exact Owner Review evidence binding');
  }

  console.log(`filingPreparationCurrentState.test.ts: ${assertions} assertions passed`);
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
