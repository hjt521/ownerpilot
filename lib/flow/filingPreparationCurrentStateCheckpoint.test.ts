import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import {
  createFilingPreparationCurrentState,
  type CreateFilingPreparationCurrentStateInput,
  type FilingPreparationCanonicalSnapshot,
  type FilingPreparationCurrentState,
} from './filingPreparationCurrentState';
import {
  createFilingPreparationCurrentStateCheckpoint,
  type OwnerReviewCheckpointInput,
} from './filingPreparationCurrentStateCheckpoint';
import {
  createFilingPreparationCurrentStateSupabaseStore,
  type AppendFilingPreparationCurrentStateInput,
  type ExpectedFilingPreparationCurrentState,
  type FilingPreparationCurrentStateSupabaseClient,
} from './filingPreparationCurrentStateSupabaseStore';
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

const USER_A = '11111111-1111-4111-8111-111111111111';
const RISKPATH_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TABLE = 'filing_preparation_current_state_revisions';
const READ_COLUMNS = 'filing_preparation_current_state_id,user_id,riskpath_record_id,revision,state_payload,generated_draft_bytes';
const NONE = { status: 'NONE' } as const satisfies ExpectedFilingPreparationCurrentState;

type DbRow = Record<string, unknown>;

function draftFixture(
  bytes = Uint8Array.from([10, 20, 30, 40, 50]),
  overrides: Partial<GeneratedDraftIdentity> = {},
): GeneratedDraftEvidence {
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
    ...overrides,
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
  if (result.status !== 'OWNER_REVIEWED_DOCUMENT') throw new Error('synthetic Owner Review blocked');
  return result.evidence;
}

function appendInput(snapshot = snapshotFromDraft(draftFixture())): AppendFilingPreparationCurrentStateInput {
  return {
    riskpathRecordId: RISKPATH_A,
    preparationSnapshot: snapshot,
    generatedDraft: null,
    generatedDraftBytes: null,
    ownerReviewEvidence: null,
  };
}

function builtState(
  revision: number,
  mode: 'BASE' | 'GENERATED' | 'REVIEWED' = 'BASE',
  draft = draftFixture(),
): FilingPreparationCurrentState {
  const input: CreateFilingPreparationCurrentStateInput = {
    authenticatedUserId: USER_A,
    riskpathRecordId: RISKPATH_A,
    revision,
    preparationSnapshot: snapshotFromDraft(draft),
    generatedDraftBinding: mode === 'BASE' ? null : { revision, generatedDraft: draft },
    generatedDraftBytes: mode === 'BASE' ? null : Uint8Array.from([10, 20, 30, 40, 50]),
    ownerReviewBinding: mode === 'REVIEWED'
      ? { revision, ownerReviewEvidence: reviewFixture(draft) }
      : null,
  };
  const result = createFilingPreparationCurrentState(input);
  if (result.status !== 'CURRENT_STATE_REVISION') throw new Error(`state fixture blocked: ${result.blockReason}`);
  return result.currentState;
}

function expectedCurrent(state: FilingPreparationCurrentState): ExpectedFilingPreparationCurrentState {
  return {
    status: 'CURRENT',
    filingPreparationCurrentStateId: state.filingPreparationCurrentStateId,
    revision: state.revision,
  };
}

function bytea(bytes: Uint8Array | null): string | null {
  return bytes === null ? null : `\\x${Buffer.from(bytes).toString('hex')}`;
}

function toDbRow(state: FilingPreparationCurrentState): DbRow {
  const { generatedDraftBytes, ...statePayload } = state;
  return {
    filing_preparation_current_state_id: state.filingPreparationCurrentStateId,
    user_id: state.authenticatedUserId,
    riskpath_record_id: state.riskpathRecordId,
    revision: state.revision,
    state_payload: statePayload,
    generated_draft_bytes: bytea(generatedDraftBytes),
  };
}

class SharedDb {
  rows: DbRow[] = [];
  barrier: (() => Promise<void>) | null = null;
}

class FakeClient implements FilingPreparationCurrentStateSupabaseClient {
  authResponse: any = { data: { user: { id: USER_A } }, error: null };
  operationCount = 0;
  insertCount = 0;
  fromCalls: string[] = [];
  inserted: DbRow[] = [];

  constructor(readonly db = new SharedDb()) {}

  readonly auth = {
    getUser: async (): Promise<any> => {
      this.operationCount += 1;
      return this.authResponse;
    },
  };

  from(table: string): any {
    this.operationCount += 1;
    this.fromCalls.push(table);
    return {
      insert: async (values: DbRow): Promise<any> => {
        this.operationCount += 1;
        this.insertCount += 1;
        this.inserted.push(structuredClone(values));
        const duplicate = this.db.rows.some(row =>
          (row.riskpath_record_id === values.riskpath_record_id && row.revision === values.revision)
          || row.filing_preparation_current_state_id === values.filing_preparation_current_state_id);
        if (duplicate) return { data: null, error: { code: '23505', message: 'duplicate' } };
        const stored = structuredClone(values);
        this.db.rows.push(stored);
        return { data: null, error: null };
      },
      select: (columns: string): any => {
        this.operationCount += 1;
        assert.equal(columns, READ_COLUMNS);
        const filters: Array<{ column: string; value: string | number }> = [];
        let order: { column: string; ascending: boolean } | null = null;
        let limit: number | null = null;
        const query: any = {
          eq: (column: string, value: string | number): any => {
            this.operationCount += 1;
            filters.push({ column, value });
            return query;
          },
          order: (column: string, options: { ascending: boolean }): any => {
            this.operationCount += 1;
            order = { column, ascending: options.ascending };
            return query;
          },
          limit: (count: number): any => {
            this.operationCount += 1;
            limit = count;
            return query;
          },
          maybeSingle: async (): Promise<any> => {
            this.operationCount += 1;
            let rows = this.db.rows.filter(row => filters.every(({ column, value }) => row[column] === value));
            if (order !== null) {
              const exactOrder = order as { column: string; ascending: boolean };
              rows = [...rows].sort((a, b) => {
                const av = Number(a[exactOrder.column]);
                const bv = Number(b[exactOrder.column]);
                return exactOrder.ascending ? av - bv : bv - av;
              });
            }
            if (limit !== null) rows = rows.slice(0, limit);
            let row: DbRow | null = rows.length === 0 ? null : structuredClone(rows[0]);
            const isLatest = order !== null && (order as { column: string }).column === 'revision';
            if (isLatest && this.db.barrier !== null) {
              const captured = row;
              await this.db.barrier();
              row = captured;
            }
            return { data: row, error: null };
          },
        };
        return query;
      },
    };
  }
}

function barrier(target: number): () => Promise<void> {
  let count = 0;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  return async () => {
    count += 1;
    if (count === target) release();
    await gate;
  };
}

async function rejects(action: () => Promise<unknown>, message: string): Promise<void> {
  let threw = false;
  try {
    await action();
  } catch {
    threw = true;
  }
  assert.equal(threw, true, message);
}

function changedSnapshot(snapshot: FilingPreparationCanonicalSnapshot): FilingPreparationCanonicalSnapshot {
  return { ...snapshot, referencedFactSnapshotId: `${snapshot.referencedFactSnapshotId}:changed` };
}

function reversedSnapshot(snapshot: FilingPreparationCanonicalSnapshot): FilingPreparationCanonicalSnapshot {
  return Object.fromEntries(Object.entries(snapshot).reverse()) as unknown as FilingPreparationCanonicalSnapshot;
}

function assertHeld(state: FilingPreparationCurrentState): void {
  assert.equal(state.stageF, 'HELD');
  assert.equal(state.packetComposition, 'NOT_PERFORMED');
  assert.equal(state.signing, 'NOT_PERFORMED');
  assert.equal(state.filing, 'NOT_PERFORMED');
  assert.equal(state.courtSubmission, 'NOT_PERFORMED');
  assert.equal(state.service, 'NOT_PERFORMED');
  assert.equal(state.legalSufficiency, 'NOT_EVALUATED');
  assert.equal(state.autonomousExecution, 'NOT_AUTHORIZED');
}

function validOwnerReviewInput(state: FilingPreparationCurrentState): OwnerReviewCheckpointInput {
  if (state.generatedDraftBinding === null) throw new Error('fixture requires generated draft');
  const draft = state.generatedDraftBinding.generatedDraft;
  return {
    ownerAction: 'OWNER_REVIEW_CHECKPOINT',
    riskpathRecordId: RISKPATH_A,
    expectedCurrent: expectedCurrent(state) as Extract<ExpectedFilingPreparationCurrentState, { status: 'CURRENT' }>,
    renderedAcknowledgment: {
      renderedGeneratedDocumentId: draft.generatedDocumentId,
      renderedPdfSha256: draft.generatedPdfSha256,
      renderedByteLength: draft.generatedByteLength,
      renderedAtISO: '2026-08-22T03:00:00.000Z',
    },
    ownerConfirmedExactRenderedDocument: true,
    reviewedAtISO: '2026-08-22T03:01:00.000Z',
    reviewStatement: {
      statementId: OWNER_REVIEW_STATEMENT_ID,
      statementVersion: OWNER_REVIEW_STATEMENT_VERSION,
    },
  };
}

async function main(): Promise<void> {
  let passed = 0;
  const equal = <T>(actual: T, expected: T, message: string): void => {
    assert.deepEqual(actual, expected, message);
    passed += 1;
  };
  const ok = (condition: unknown, message: string): void => {
    assert.ok(condition, message);
    passed += 1;
  };
  const mustReject = async (action: () => Promise<unknown>, message: string): Promise<void> => {
    await rejects(action, message);
    passed += 1;
  };

  const inertClient = new FakeClient();
  const inertCheckpoint = createFilingPreparationCurrentStateCheckpoint(
    createFilingPreparationCurrentStateSupabaseStore(inertClient),
  );
  equal(inertClient.operationCount, 0, 'checkpoint construction is inert');

  const explicitActionClient = new FakeClient();
  const explicitActionCheckpoint = createFilingPreparationCurrentStateCheckpoint(
    createFilingPreparationCurrentStateSupabaseStore(explicitActionClient),
  );
  await mustReject(
    () => explicitActionCheckpoint.preparationCheckpoint({
      riskpathRecordId: RISKPATH_A,
      expectedCurrent: NONE,
      preparationSnapshot: snapshotFromDraft(draftFixture()),
    } as any),
    'preparation checkpoint cannot omit explicit owner action',
  );
  equal(explicitActionClient.operationCount, 0, 'missing owner action fails before auth/database operations');

  const callerAuthorityClient = new FakeClient();
  const callerAuthorityCheckpoint = createFilingPreparationCurrentStateCheckpoint(
    createFilingPreparationCurrentStateSupabaseStore(callerAuthorityClient),
  );
  await mustReject(
    () => callerAuthorityCheckpoint.preparationCheckpoint({
      ownerAction: 'PREPARATION_CHECKPOINT',
      riskpathRecordId: RISKPATH_A,
      expectedCurrent: NONE,
      preparationSnapshot: snapshotFromDraft(draftFixture()),
      authenticatedUserId: USER_A,
      revision: 77,
    } as any),
    'checkpoint caller cannot choose authenticated user or next revision',
  );
  equal(callerAuthorityClient.operationCount, 0, 'caller authority injection fails before auth/database operations');

  const malformedExpectedClient = new FakeClient();
  const malformedStore = createFilingPreparationCurrentStateSupabaseStore(malformedExpectedClient);
  await mustReject(
    () => malformedStore.appendNextIfCurrent({ status: 'CURRENT', revision: 1 } as any, appendInput()),
    'guarded append requires exact expected current-state ID and revision',
  );
  equal(malformedExpectedClient.operationCount, 0, 'malformed expected-current fails before auth/database operations');

  const casClient = new FakeClient();
  const casStore = createFilingPreparationCurrentStateSupabaseStore(casClient);
  const firstCas = await casStore.appendNextIfCurrent(NONE, appendInput());
  if (firstCas.status !== 'INSERTED') throw new Error('first guarded append unexpectedly conflicted');
  equal(firstCas.currentState.revision, 1, 'expected NONE creates revision 1 only when no latest exists');
  equal(casClient.insertCount, 1, 'first guarded append performs one insert');
  const noneConflict = await casStore.appendNextIfCurrent(NONE, appendInput(changedSnapshot(firstCas.currentState.preparationSnapshot)));
  equal(noneConflict, { status: 'CONFLICT', reloadRequired: true, currentState: null }, 'expected NONE conflicts once a current revision exists');
  equal(casClient.insertCount, 1, 'expected-NONE conflict performs zero inserts');
  const staleConflict = await casStore.appendNextIfCurrent({
    status: 'CURRENT',
    filingPreparationCurrentStateId: firstCas.currentState.filingPreparationCurrentStateId,
    revision: 99,
  }, appendInput(changedSnapshot(firstCas.currentState.preparationSnapshot)));
  equal(staleConflict.status, 'CONFLICT', 'stale expected revision conflicts');
  equal(casClient.insertCount, 1, 'stale expected revision performs zero inserts and no retry');

  const raceState = builtState(1);
  const sharedRace = new SharedDb();
  sharedRace.rows.push(toDbRow(raceState));
  sharedRace.barrier = barrier(2);
  const writerA = new FakeClient(sharedRace);
  const writerB = new FakeClient(sharedRace);
  const raceInput = appendInput(changedSnapshot(raceState.preparationSnapshot));
  const raceResults = await Promise.all([
    createFilingPreparationCurrentStateSupabaseStore(writerA).appendNextIfCurrent(expectedCurrent(raceState), raceInput),
    createFilingPreparationCurrentStateSupabaseStore(writerB).appendNextIfCurrent(expectedCurrent(raceState), raceInput),
  ]);
  equal(raceResults.map(result => result.status).sort(), ['CONFLICT', 'INSERTED'], 'two guarded writers yield one insert and one conflict');
  equal(writerA.insertCount + writerB.insertCount, 2, 'each concurrent writer attempts at most one insert');
  equal(sharedRace.rows.filter(row => row.revision === 2).length, 1, 'concurrent race creates only one immutable next revision');

  const firstCheckpointClient = new FakeClient();
  const firstCheckpoint = createFilingPreparationCurrentStateCheckpoint(
    createFilingPreparationCurrentStateSupabaseStore(firstCheckpointClient),
  );
  const baseSnapshot = snapshotFromDraft(draftFixture());
  const firstCheckpointResult = await firstCheckpoint.preparationCheckpoint({
    ownerAction: 'PREPARATION_CHECKPOINT',
    riskpathRecordId: RISKPATH_A,
    expectedCurrent: NONE,
    preparationSnapshot: baseSnapshot,
  });
  if (firstCheckpointResult.status !== 'INSERTED') throw new Error('first preparation checkpoint unexpectedly did not insert');
  equal(firstCheckpointResult.currentState.revision, 1, 'first explicit preparation checkpoint creates revision 1');
  equal(firstCheckpointResult.currentState.generatedDraftBinding, null, 'first preparation checkpoint carries no generated draft');
  equal(firstCheckpointResult.currentState.ownerReviewBinding, null, 'first preparation checkpoint carries no Owner Review');
  assertHeld(firstCheckpointResult.currentState);

  const firstInsertCount = firstCheckpointClient.insertCount;
  const noneCheckpointConflict = await firstCheckpoint.preparationCheckpoint({
    ownerAction: 'PREPARATION_CHECKPOINT',
    riskpathRecordId: RISKPATH_A,
    expectedCurrent: NONE,
    preparationSnapshot: changedSnapshot(baseSnapshot),
  });
  equal(noneCheckpointConflict.status, 'CONFLICT', 'checkpoint expected NONE conflicts against existing latest state');
  equal(firstCheckpointClient.insertCount, firstInsertCount, 'checkpoint expected-NONE conflict performs zero inserts');

  const unchangedResult = await firstCheckpoint.preparationCheckpoint({
    ownerAction: 'PREPARATION_CHECKPOINT',
    riskpathRecordId: RISKPATH_A,
    expectedCurrent: expectedCurrent(firstCheckpointResult.currentState),
    preparationSnapshot: reversedSnapshot(baseSnapshot),
  });
  equal(unchangedResult.status, 'UNCHANGED', 'canonically identical preparation snapshot returns UNCHANGED');
  equal(firstCheckpointClient.insertCount, firstInsertCount, 'UNCHANGED preparation checkpoint performs zero inserts');

  const staleCheckpointResult = await firstCheckpoint.preparationCheckpoint({
    ownerAction: 'PREPARATION_CHECKPOINT',
    riskpathRecordId: RISKPATH_A,
    expectedCurrent: {
      status: 'CURRENT',
      filingPreparationCurrentStateId: firstCheckpointResult.currentState.filingPreparationCurrentStateId,
      revision: 2,
    },
    preparationSnapshot: changedSnapshot(baseSnapshot),
  });
  equal(staleCheckpointResult.status, 'CONFLICT', 'stale checkpoint action conflicts');
  equal(firstCheckpointClient.insertCount, firstInsertCount, 'stale checkpoint action performs zero inserts');

  const historicalReviewed = builtState(1, 'REVIEWED');
  const materialClient = new FakeClient();
  materialClient.db.rows.push(toDbRow(historicalReviewed));
  const historicalRowBefore = structuredClone(materialClient.db.rows[0]);
  const materialCheckpoint = createFilingPreparationCurrentStateCheckpoint(
    createFilingPreparationCurrentStateSupabaseStore(materialClient),
  );
  const materialResult = await materialCheckpoint.preparationCheckpoint({
    ownerAction: 'PREPARATION_CHECKPOINT',
    riskpathRecordId: RISKPATH_A,
    expectedCurrent: expectedCurrent(historicalReviewed),
    preparationSnapshot: changedSnapshot(historicalReviewed.preparationSnapshot),
  });
  if (materialResult.status !== 'INSERTED') throw new Error('material preparation change unexpectedly did not insert');
  equal(materialResult.currentState.revision, 2, 'material preparation change appends next immutable revision');
  equal(materialResult.currentState.generatedDraftBinding, null, 'material preparation change clears generated-draft binding');
  equal(materialResult.currentState.generatedDraftBytes, null, 'material preparation change clears generated bytes');
  equal(materialResult.currentState.ownerReviewBinding, null, 'material preparation change clears Owner Review binding');
  equal(materialClient.db.rows[0], historicalRowBefore, 'historical prior revision is never overwritten');
  assertHeld(materialResult.currentState);

  const generatedRequiresCurrentClient = new FakeClient();
  const generatedRequiresCurrent = createFilingPreparationCurrentStateCheckpoint(
    createFilingPreparationCurrentStateSupabaseStore(generatedRequiresCurrentClient),
  );
  await mustReject(
    () => generatedRequiresCurrent.generatedDraftCheckpoint({
      ownerAction: 'GENERATED_DRAFT_CHECKPOINT',
      riskpathRecordId: RISKPATH_A,
      expectedCurrent: NONE,
      generatedDraft: draftFixture(),
      generatedDraftBytes: Uint8Array.from([10, 20, 30, 40, 50]),
    } as any),
    'generated-draft checkpoint requires an existing expected current state',
  );
  equal(generatedRequiresCurrentClient.operationCount, 0, 'generated checkpoint expected NONE fails before auth/database operations');

  const preparationState = builtState(1);
  const mismatchGeneratedClient = new FakeClient();
  mismatchGeneratedClient.db.rows.push(toDbRow(preparationState));
  const mismatchGeneratedCheckpoint = createFilingPreparationCurrentStateCheckpoint(
    createFilingPreparationCurrentStateSupabaseStore(mismatchGeneratedClient),
  );
  const mismatchedDraft = draftFixture(undefined, { generationInputId: 'generation-input:sha256:different' });
  await mustReject(
    () => mismatchGeneratedCheckpoint.generatedDraftCheckpoint({
      ownerAction: 'GENERATED_DRAFT_CHECKPOINT',
      riskpathRecordId: RISKPATH_A,
      expectedCurrent: expectedCurrent(preparationState) as Extract<ExpectedFilingPreparationCurrentState, { status: 'CURRENT' }>,
      generatedDraft: mismatchedDraft,
      generatedDraftBytes: Uint8Array.from([10, 20, 30, 40, 50]),
    }),
    'generated draft/preparation mismatch fails closed before insert',
  );
  equal(mismatchGeneratedClient.insertCount, 0, 'generated preparation mismatch performs zero inserts');

  const badBytesClient = new FakeClient();
  badBytesClient.db.rows.push(toDbRow(preparationState));
  const badBytesCheckpoint = createFilingPreparationCurrentStateCheckpoint(
    createFilingPreparationCurrentStateSupabaseStore(badBytesClient),
  );
  await mustReject(
    () => badBytesCheckpoint.generatedDraftCheckpoint({
      ownerAction: 'GENERATED_DRAFT_CHECKPOINT',
      riskpathRecordId: RISKPATH_A,
      expectedCurrent: expectedCurrent(preparationState) as Extract<ExpectedFilingPreparationCurrentState, { status: 'CURRENT' }>,
      generatedDraft: draftFixture(),
      generatedDraftBytes: Uint8Array.from([10, 20, 30]),
    }),
    'generated checkpoint requires exact bound bytes',
  );
  equal(badBytesClient.insertCount, 0, 'generated byte mismatch performs zero inserts');

  const generatedClient = new FakeClient();
  generatedClient.db.rows.push(toDbRow(preparationState));
  const generatedCheckpoint = createFilingPreparationCurrentStateCheckpoint(
    createFilingPreparationCurrentStateSupabaseStore(generatedClient),
  );
  const generatedResult = await generatedCheckpoint.generatedDraftCheckpoint({
    ownerAction: 'GENERATED_DRAFT_CHECKPOINT',
    riskpathRecordId: RISKPATH_A,
    expectedCurrent: expectedCurrent(preparationState) as Extract<ExpectedFilingPreparationCurrentState, { status: 'CURRENT' }>,
    generatedDraft: draftFixture(),
    generatedDraftBytes: Uint8Array.from([10, 20, 30, 40, 50]),
  });
  if (generatedResult.status !== 'INSERTED') throw new Error('generated checkpoint unexpectedly conflicted');
  equal(generatedResult.currentState.revision, 2, 'generated checkpoint appends next revision');
  equal(generatedResult.currentState.ownerReviewBinding, null, 'generated checkpoint carries no prior Owner Review');
  equal([...(generatedResult.currentState.generatedDraftBytes as Uint8Array)], [10, 20, 30, 40, 50], 'generated checkpoint preserves exact draft bytes');
  assertHeld(generatedResult.currentState);

  const reviewedHistoricalDraft = draftFixture();
  const reviewedHistoricalState = builtState(1, 'REVIEWED', reviewedHistoricalDraft);
  const regenerationClient = new FakeClient();
  regenerationClient.db.rows.push(toDbRow(reviewedHistoricalState));
  const regenerationCheckpoint = createFilingPreparationCurrentStateCheckpoint(
    createFilingPreparationCurrentStateSupabaseStore(regenerationClient),
  );
  const regeneratedDraft = draftFixture(undefined, { preparedAtISO: '2026-08-22T04:00:00.000Z' });
  const regenerationResult = await regenerationCheckpoint.generatedDraftCheckpoint({
    ownerAction: 'GENERATED_DRAFT_CHECKPOINT',
    riskpathRecordId: RISKPATH_A,
    expectedCurrent: expectedCurrent(reviewedHistoricalState) as Extract<ExpectedFilingPreparationCurrentState, { status: 'CURRENT' }>,
    generatedDraft: regeneratedDraft,
    generatedDraftBytes: Uint8Array.from([10, 20, 30, 40, 50]),
  });
  if (regenerationResult.status !== 'INSERTED') throw new Error('regeneration checkpoint unexpectedly conflicted');
  equal(regenerationResult.currentState.ownerReviewBinding, null, 'new generated draft invalidates prior Owner Review');
  equal(regenerationResult.currentState.generatedDraftBinding?.generatedDraft.generatedDocumentId, regeneratedDraft.generatedDocumentId, 'new generated draft becomes exact current binding');

  const noDraftState = builtState(1);
  const noDraftReviewClient = new FakeClient();
  noDraftReviewClient.db.rows.push(toDbRow(noDraftState));
  const noDraftReviewCheckpoint = createFilingPreparationCurrentStateCheckpoint(
    createFilingPreparationCurrentStateSupabaseStore(noDraftReviewClient),
  );
  const syntheticGeneratedForAck = draftFixture();
  await mustReject(
    () => noDraftReviewCheckpoint.ownerReviewCheckpoint({
      ownerAction: 'OWNER_REVIEW_CHECKPOINT',
      riskpathRecordId: RISKPATH_A,
      expectedCurrent: expectedCurrent(noDraftState) as Extract<ExpectedFilingPreparationCurrentState, { status: 'CURRENT' }>,
      renderedAcknowledgment: {
        renderedGeneratedDocumentId: syntheticGeneratedForAck.generatedDocumentId,
        renderedPdfSha256: syntheticGeneratedForAck.generatedPdfSha256,
        renderedByteLength: syntheticGeneratedForAck.generatedByteLength,
        renderedAtISO: '2026-08-22T03:00:00.000Z',
      },
      ownerConfirmedExactRenderedDocument: true,
      reviewedAtISO: '2026-08-22T03:01:00.000Z',
      reviewStatement: { statementId: OWNER_REVIEW_STATEMENT_ID, statementVersion: OWNER_REVIEW_STATEMENT_VERSION },
    }),
    'Owner Review checkpoint requires latest exact generated draft and bytes',
  );
  equal(noDraftReviewClient.insertCount, 0, 'Owner Review without current generated draft performs zero inserts');

  const generatedState = builtState(1, 'GENERATED');
  const falseConfirmationClient = new FakeClient();
  falseConfirmationClient.db.rows.push(toDbRow(generatedState));
  const falseConfirmationCheckpoint = createFilingPreparationCurrentStateCheckpoint(
    createFilingPreparationCurrentStateSupabaseStore(falseConfirmationClient),
  );
  await mustReject(
    () => falseConfirmationCheckpoint.ownerReviewCheckpoint({
      ...validOwnerReviewInput(generatedState),
      ownerConfirmedExactRenderedDocument: false,
    }),
    'false owner confirmation blocks Owner Review checkpoint',
  );
  equal(falseConfirmationClient.operationCount, 0, 'false owner confirmation blocks before auth/database operations');

  const reviewValidationClient = new FakeClient();
  reviewValidationClient.db.rows.push(toDbRow(generatedState));
  const reviewValidationCheckpoint = createFilingPreparationCurrentStateCheckpoint(
    createFilingPreparationCurrentStateSupabaseStore(reviewValidationClient),
  );
  const validReview = validOwnerReviewInput(generatedState);
  await mustReject(
    () => reviewValidationCheckpoint.ownerReviewCheckpoint({
      ...validReview,
      renderedAcknowledgment: { ...validReview.renderedAcknowledgment, renderedGeneratedDocumentId: 'generated-document:sha256:' + '0'.repeat(64) },
    }),
    'rendered document ID mismatch blocks Owner Review',
  );
  await mustReject(
    () => reviewValidationCheckpoint.ownerReviewCheckpoint({
      ...validReview,
      renderedAcknowledgment: { ...validReview.renderedAcknowledgment, renderedPdfSha256: '0'.repeat(64) },
    }),
    'rendered PDF SHA mismatch blocks Owner Review',
  );
  await mustReject(
    () => reviewValidationCheckpoint.ownerReviewCheckpoint({
      ...validReview,
      renderedAcknowledgment: { ...validReview.renderedAcknowledgment, renderedByteLength: validReview.renderedAcknowledgment.renderedByteLength + 1 },
    }),
    'rendered byte-length mismatch blocks Owner Review',
  );
  await mustReject(
    () => reviewValidationCheckpoint.ownerReviewCheckpoint({
      ...validReview,
      renderedAcknowledgment: { ...validReview.renderedAcknowledgment, renderedAtISO: 'not-a-timestamp' },
    }),
    'invalid rendered timestamp blocks Owner Review',
  );
  await mustReject(
    () => reviewValidationCheckpoint.ownerReviewCheckpoint({
      ...validReview,
      reviewedAtISO: '2026-08-22T02:59:00.000Z',
    }),
    'review-before-render blocks Owner Review',
  );
  await mustReject(
    () => reviewValidationCheckpoint.ownerReviewCheckpoint({
      ...validReview,
      reviewStatement: { statementId: 'wrong', statementVersion: OWNER_REVIEW_STATEMENT_VERSION },
    }),
    'wrong review statement identity blocks Owner Review',
  );
  equal(reviewValidationClient.insertCount, 0, 'all invalid Owner Review inputs perform zero inserts');

  const successfulReviewClient = new FakeClient();
  successfulReviewClient.db.rows.push(toDbRow(generatedState));
  const successfulReviewCheckpoint = createFilingPreparationCurrentStateCheckpoint(
    createFilingPreparationCurrentStateSupabaseStore(successfulReviewClient),
  );
  const successfulReview = await successfulReviewCheckpoint.ownerReviewCheckpoint(validOwnerReviewInput(generatedState));
  if (successfulReview.status !== 'INSERTED') throw new Error('valid Owner Review checkpoint unexpectedly conflicted');
  equal(successfulReview.currentState.revision, 2, 'successful Owner Review appends next immutable revision');
  equal(successfulReview.currentState.preparationSnapshot, generatedState.preparationSnapshot, 'successful Owner Review carries same preparation snapshot');
  equal(successfulReview.currentState.generatedDraftBinding?.generatedDraft, generatedState.generatedDraftBinding?.generatedDraft, 'successful Owner Review carries exact current generated draft');
  equal([...(successfulReview.currentState.generatedDraftBytes as Uint8Array)], [...(generatedState.generatedDraftBytes as Uint8Array)], 'successful Owner Review carries exact current generated bytes');
  equal(successfulReview.currentState.ownerReviewBinding?.revision, 2, 'successful Owner Review binds evidence to new current revision');
  ok(successfulReview.currentState.ownerReviewBinding?.ownerReviewEvidence.ownerConfirmedExactRenderedDocument === true, 'successful Owner Review preserves literal affirmative confirmation');
  assertHeld(successfulReview.currentState);

  const storeSource = readFileSync(new URL('./filingPreparationCurrentStateSupabaseStore.ts', import.meta.url), 'utf8');
  const checkpointSource = readFileSync(new URL('./filingPreparationCurrentStateCheckpoint.ts', import.meta.url), 'utf8');
  ok(!storeSource.includes('.upsert(') && !storeSource.includes('.update(') && !storeSource.includes('.delete('), 'store retains append-only no-overwrite boundary');
  ok(!storeSource.includes('createClient(') && !storeSource.includes('process.env') && !/service[_-]?role/i.test(storeSource), 'store has no client/env/privileged-role path');
  ok(!checkpointSource.includes('.appendNext('), 'D0B3 checkpoint library uses only expected-current guarded append primitive');
  ok(!checkpointSource.includes('createClient(') && !checkpointSource.includes('process.env') && !/service[_-]?role/i.test(checkpointSource), 'checkpoint has no client/env/privileged-role path');
  ok(!checkpointSource.includes("from 'next/") && !checkpointSource.includes('NextResponse') && !checkpointSource.includes('route.ts'), 'checkpoint registers no route or framework action call site');
  for (const forbidden of ['page-load', 'background', 'autosave', 'D0B4', 'current-evidence resolver', 'PR #398', 'E2.3D1', 'live persistence']) {
    ok(!checkpointSource.includes(forbidden), `checkpoint source contains no ${forbidden} behavior`);
  }

  console.log(`${passed} E2.3D0B3 checkpoint/CAS assertions passed`);
}

void main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
