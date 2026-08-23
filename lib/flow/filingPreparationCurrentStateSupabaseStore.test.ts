import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { computeGeneratedDocumentId, sha256Bytes, type GeneratedDraftEvidence, type GeneratedDraftIdentity } from './officialFormGeneratedDraft';
import { createOfficialFormOwnerReview, OWNER_REVIEW_STATEMENT_ID, OWNER_REVIEW_STATEMENT_VERSION, type OwnerReviewedDocumentEvidence } from './officialFormOwnerReview';
import { createFilingPreparationCurrentState, type CreateFilingPreparationCurrentStateInput, type FilingPreparationCanonicalSnapshot, type FilingPreparationCurrentState } from './filingPreparationCurrentState';
import {
  createFilingPreparationCurrentStateSupabaseStore,
  type AppendFilingPreparationCurrentStateInput,
  type FilingPreparationCurrentStateSupabaseClient,
} from './filingPreparationCurrentStateSupabaseStore';

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';
const RISKPATH_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TABLE = 'filing_preparation_current_state_revisions';
const READ_COLUMNS = 'filing_preparation_current_state_id,user_id,riskpath_record_id,revision,state_payload,generated_draft_bytes';

type DbRow = Record<string, unknown>;

function draftFixture(bytes = Uint8Array.from([10, 20, 30, 40, 50])): GeneratedDraftEvidence {
  const identity: GeneratedDraftIdentity = {
    schemaVersion: 1, artifactClass: 'GENERATED_DRAFT', artifactRole: 'OWNER_GENERATED_PREPARATION',
    officialSourceArtifactId: 'synthetic-authority:TEST-1:2026-01-01:sha256:source', officialSourceSnapshotId: 'sha256:source', officialSourceSha256: '1'.repeat(64),
    sourceAdmissionPolicyId: 'qpdf-dual-pass-linearization-isolation-v2', sourceAdmissionStatus: 'SOURCE_ADMITTED_CLEAN', qpdfAssetIdentityDigest: 'qpdf-asset:sha256:fixture',
    sourcePassACommandDigest: 'qpdf-command:sha256:pass-a', sourcePassAWarningInventoryDigest: 'source-warning-inventory:sha256:pass-a', sourcePassBCommandDigest: 'qpdf-command:sha256:pass-b', sourcePassBWarningInventoryDigest: 'source-warning-inventory:sha256:pass-b', sourceWarningInventoryDigest: 'source-warning-inventory:sha256:all',
    qpdfIntermediateSha256: '2'.repeat(64), xfaPolicyId: 'acroform-fallback-xfa-disconnection-v1', xfaDigest: 'xfa:sha256:fixture', preparationManifestId: 'preparation-runtime-manifest:sha256:fixture', preparationSourceId: 'preparation-source:sha256:fixture', preparationDerivativeSha256: '3'.repeat(64), preparationFieldEquivalenceDigest: 'field-equivalence:sha256:fixture', preparationSemanticDeltaDigest: 'semantic-delta:sha256:fixture', preparationAuthorizationSnapshotId: 'preparation-authorization:sha256:fixture', mapSnapshotId: 'field-map:sha256:fixture', referencedFactSnapshotId: 'referenced-facts:sha256:fixture', generationInputId: 'generation-input:sha256:fixture', generatorContractVersion: 'e2.3-current-state-fixture-v1', generatorImplementationId: 'synthetic-current-state-generator', generatorImplementationVersion: '1.0.0', fieldWritePlanDigest: 'field-write-plan:sha256:fixture', preparedAtISO: '2026-08-22T02:10:00.000Z', generatedPdfSha256: sha256Bytes(bytes), generatedByteLength: bytes.byteLength,
  };
  return { ...identity, generatedDocumentId: computeGeneratedDocumentId(identity) };
}

function snapshotFromDraft(d: GeneratedDraftEvidence): FilingPreparationCanonicalSnapshot {
  return { officialSourceArtifactId:d.officialSourceArtifactId, officialSourceSnapshotId:d.officialSourceSnapshotId, officialSourceSha256:d.officialSourceSha256, sourceAdmissionPolicyId:d.sourceAdmissionPolicyId, sourceAdmissionStatus:d.sourceAdmissionStatus, qpdfAssetIdentityDigest:d.qpdfAssetIdentityDigest, sourcePassACommandDigest:d.sourcePassACommandDigest, sourcePassAWarningInventoryDigest:d.sourcePassAWarningInventoryDigest, sourcePassBCommandDigest:d.sourcePassBCommandDigest, sourcePassBWarningInventoryDigest:d.sourcePassBWarningInventoryDigest, sourceWarningInventoryDigest:d.sourceWarningInventoryDigest, qpdfIntermediateSha256:d.qpdfIntermediateSha256, xfaPolicyId:d.xfaPolicyId, xfaDigest:d.xfaDigest, preparationManifestId:d.preparationManifestId, preparationSourceId:d.preparationSourceId, preparationDerivativeSha256:d.preparationDerivativeSha256, preparationFieldEquivalenceDigest:d.preparationFieldEquivalenceDigest, preparationSemanticDeltaDigest:d.preparationSemanticDeltaDigest, preparationAuthorizationSnapshotId:d.preparationAuthorizationSnapshotId, mapSnapshotId:d.mapSnapshotId, referencedFactSnapshotId:d.referencedFactSnapshotId, generationInputId:d.generationInputId, generatorContractVersion:d.generatorContractVersion, generatorImplementationId:d.generatorImplementationId, generatorImplementationVersion:d.generatorImplementationVersion, fieldWritePlanDigest:d.fieldWritePlanDigest };
}

function reviewFixture(d: GeneratedDraftEvidence): OwnerReviewedDocumentEvidence {
  const r = createOfficialFormOwnerReview({ generatedDraft:d, renderedAcknowledgment:{ renderedGeneratedDocumentId:d.generatedDocumentId, renderedPdfSha256:d.generatedPdfSha256, renderedByteLength:d.generatedByteLength, renderedAtISO:'2026-08-22T02:11:00.000Z' }, ownerConfirmedExactRenderedDocument:true, reviewedAtISO:'2026-08-22T02:12:00.000Z', reviewStatement:{ statementId:OWNER_REVIEW_STATEMENT_ID, statementVersion:OWNER_REVIEW_STATEMENT_VERSION } });
  if (r.status !== 'OWNER_REVIEWED_DOCUMENT') throw new Error('synthetic owner review blocked');
  return r.evidence;
}

function appendInput(): AppendFilingPreparationCurrentStateInput {
  const d = draftFixture();
  return { riskpathRecordId:RISKPATH_A, preparationSnapshot:snapshotFromDraft(d), generatedDraft:null, generatedDraftBytes:null, ownerReviewEvidence:null };
}

function generatedAppendInput(): AppendFilingPreparationCurrentStateInput {
  const bytes = Uint8Array.from([10,20,30,40,50]);
  const d = draftFixture(bytes);
  return { riskpathRecordId:RISKPATH_A, preparationSnapshot:snapshotFromDraft(d), generatedDraft:d, generatedDraftBytes:bytes, ownerReviewEvidence:null };
}

function reviewedAppendInput(): AppendFilingPreparationCurrentStateInput {
  const input = generatedAppendInput();
  return { ...input, ownerReviewEvidence:reviewFixture(input.generatedDraft as GeneratedDraftEvidence) };
}

function builtState(revision: number, mode: 'BASE'|'GENERATED'|'REVIEWED' = 'BASE', userId = USER_A): FilingPreparationCurrentState {
  const append = mode === 'BASE' ? appendInput() : mode === 'GENERATED' ? generatedAppendInput() : reviewedAppendInput();
  const input: CreateFilingPreparationCurrentStateInput = {
    authenticatedUserId:userId,
    riskpathRecordId:append.riskpathRecordId,
    revision,
    preparationSnapshot:append.preparationSnapshot,
    generatedDraftBinding:append.generatedDraft === null ? null : {revision,generatedDraft:append.generatedDraft},
    generatedDraftBytes:append.generatedDraftBytes,
    ownerReviewBinding:append.ownerReviewEvidence === null ? null : {revision,ownerReviewEvidence:append.ownerReviewEvidence},
  };
  const result = createFilingPreparationCurrentState(input);
  if (result.status !== 'CURRENT_STATE_REVISION') throw new Error(`state fixture blocked: ${result.blockReason}`);
  return result.currentState;
}

function bytea(bytes: Uint8Array | null): string | null {
  return bytes === null ? null : `\\x${Buffer.from(bytes).toString('hex')}`;
}

function toDbRow(state: FilingPreparationCurrentState): DbRow {
  const { generatedDraftBytes, ...state_payload } = state;
  return {
    filing_preparation_current_state_id: state.filingPreparationCurrentStateId,
    user_id: state.authenticatedUserId,
    riskpath_record_id: state.riskpathRecordId,
    revision: state.revision,
    state_payload,
    generated_draft_bytes: bytea(generatedDraftBytes),
  };
}

class SharedDb {
  rows: DbRow[] = [];
  barrier: (() => Promise<void>) | null = null;
}

class FakeClient implements FilingPreparationCurrentStateSupabaseClient {
  authResponse: any = { data: { user: { id: USER_A } }, error: null };
  authThrows: unknown = null;
  insertError: unknown = null;
  insertThrows: unknown = null;
  readError: unknown = null;
  readThrows: unknown = null;
  beforeInsert: ((values: DbRow) => void) | null = null;
  afterInsert: ((stored: DbRow) => void) | null = null;
  readTransform: ((row: DbRow | null, filters: Array<{column:string;value:string|number}>) => unknown) | null = null;
  operationCount = 0;
  insertCount = 0;
  fromCalls: string[] = [];
  selectCalls: string[] = [];
  eqCalls: Array<{ column: string; value: string | number }> = [];
  orderCalls: Array<{ column: string; ascending: boolean }> = [];
  limitCalls: number[] = [];
  inserted: DbRow[] = [];

  constructor(readonly db = new SharedDb()) {}

  readonly auth = {
    getUser: async (): Promise<any> => {
      this.operationCount += 1;
      if (this.authThrows) throw this.authThrows;
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
        if (this.insertThrows) throw this.insertThrows;
        this.beforeInsert?.(values);
        if (this.insertError) return { data:null, error:this.insertError };
        const duplicate = this.db.rows.some(row =>
          row.riskpath_record_id === values.riskpath_record_id && row.revision === values.revision
          || row.filing_preparation_current_state_id === values.filing_preparation_current_state_id);
        if (duplicate) return { data:null, error:{ code:'23505', message:'duplicate' } };
        const stored = structuredClone(values);
        this.db.rows.push(stored);
        this.afterInsert?.(stored);
        return { data:null, error:null };
      },
      select: (columns: string): any => {
        this.operationCount += 1;
        this.selectCalls.push(columns);
        const filters: Array<{column:string;value:string|number}> = [];
        let order: {column:string;ascending:boolean} | null = null;
        let limit: number | null = null;
        const query: any = {
          eq: (column: string, value: string | number): any => {
            this.operationCount += 1;
            this.eqCalls.push({column,value});
            filters.push({column,value});
            return query;
          },
          order: (column: string, options: {ascending:boolean}): any => {
            this.operationCount += 1;
            this.orderCalls.push({column,ascending:options.ascending});
            order = {column,ascending:options.ascending};
            return query;
          },
          limit: (count: number): any => {
            this.operationCount += 1;
            this.limitCalls.push(count);
            limit = count;
            return query;
          },
          maybeSingle: async (): Promise<any> => {
            this.operationCount += 1;
            if (this.readThrows) throw this.readThrows;
            if (this.readError) return {data:null,error:this.readError};
            let rows = this.db.rows.filter(row => filters.every(({column,value}) => row[column] === value));
            if (order !== null) {
              const exactOrder = order as {column:string;ascending:boolean};
              rows = [...rows].sort((a,b) => {
                const av = Number(a[exactOrder.column]);
                const bv = Number(b[exactOrder.column]);
                return exactOrder.ascending ? av-bv : bv-av;
              });
            }
            if (limit !== null) rows = rows.slice(0, limit);
            let row: DbRow | null = rows.length === 0 ? null : structuredClone(rows[0]);
            const isLatest = order !== null && (order as {column:string}).column === 'revision';
            if (isLatest && this.db.barrier !== null) {
              const captured = row;
              await this.db.barrier();
              row = captured;
            }
            const data = this.readTransform ? this.readTransform(row, filters) : row;
            return {data,error:null};
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
  try { await action(); } catch { threw = true; }
  assert.equal(threw, true, message);
}

async function main(): Promise<void> {
  let passed = 0;
  const equal = <T>(actual: T, expected: T, message: string): void => { assert.deepEqual(actual, expected, message); passed += 1; };
  const ok = (condition: unknown, message: string): void => { assert.ok(condition, message); passed += 1; };
  const mustReject = async (action: () => Promise<unknown>, message: string): Promise<void> => { await rejects(action,message); passed += 1; };

  const inertClient = new FakeClient();
  const inertStore = createFilingPreparationCurrentStateSupabaseStore(inertClient);
  equal(inertClient.operationCount,0,'adapter construction is inert');
  ok(typeof inertStore.readLatest === 'function' && typeof inertStore.appendNext === 'function','adapter exposes only bounded current-state operations');

  const invalidRiskClient = new FakeClient();
  await mustReject(() => createFilingPreparationCurrentStateSupabaseStore(invalidRiskClient).readLatest('bad-riskpath'),'invalid RiskPath fails closed');
  equal(invalidRiskClient.operationCount,0,'invalid RiskPath fails before auth/database query');

  const noUserClient = new FakeClient();
  noUserClient.authResponse = {data:{user:null},error:null};
  await mustReject(() => createFilingPreparationCurrentStateSupabaseStore(noUserClient).readLatest(RISKPATH_A),'no authenticated user fails closed');
  equal(noUserClient.fromCalls,[],'no-user path performs no database query');

  const authErrorClient = new FakeClient();
  authErrorClient.authResponse = {data:{user:null},error:{message:'denied'}};
  await mustReject(() => createFilingPreparationCurrentStateSupabaseStore(authErrorClient).readLatest(RISKPATH_A),'auth error fails closed');

  const malformedAuthClient = new FakeClient();
  malformedAuthClient.authResponse = {data:null,error:null};
  await mustReject(() => createFilingPreparationCurrentStateSupabaseStore(malformedAuthClient).readLatest(RISKPATH_A),'malformed auth fails closed');

  const emptyClient = new FakeClient();
  equal(await createFilingPreparationCurrentStateSupabaseStore(emptyClient).readLatest(RISKPATH_A),null,'no durable revision reads as null');
  equal(emptyClient.fromCalls,[TABLE],'latest read targets only current-state revision table');
  equal(emptyClient.selectCalls,[READ_COLUMNS],'latest read selects only exact durable fields');
  equal(emptyClient.eqCalls,[{column:'user_id',value:USER_A},{column:'riskpath_record_id',value:RISKPATH_A}],'latest read scopes exact authenticated user and RiskPath');
  equal(emptyClient.orderCalls,[{column:'revision',ascending:false}],'latest read orders revision descending');
  equal(emptyClient.limitCalls,[1],'latest read requests one authoritative row');

  const latestClient = new FakeClient();
  latestClient.db.rows.push(toDbRow(builtState(1)),toDbRow(builtState(3)),toDbRow(builtState(2)));
  equal((await createFilingPreparationCurrentStateSupabaseStore(latestClient).readLatest(RISKPATH_A))?.revision,3,'highest authoritative revision is selected');

  const malformedRowClient = new FakeClient();
  malformedRowClient.db.rows.push({...toDbRow(builtState(1)),created_at:'forbidden-extra'});
  await mustReject(() => createFilingPreparationCurrentStateSupabaseStore(malformedRowClient).readLatest(RISKPATH_A),'extra durable row field fails closed');

  const mismatchClient = new FakeClient();
  const mismatchRow = toDbRow(builtState(1));
  (mismatchRow.state_payload as any).authenticatedUserId = USER_B;
  mismatchClient.db.rows.push(mismatchRow);
  await mustReject(() => createFilingPreparationCurrentStateSupabaseStore(mismatchClient).readLatest(RISKPATH_A),'row/payload owner mismatch fails closed through canonical validator');

  const badBytesClient = new FakeClient();
  const badBytesRow = toDbRow(builtState(1,'GENERATED'));
  badBytesRow.generated_draft_bytes = '\\x0';
  badBytesClient.db.rows.push(badBytesRow);
  await mustReject(() => createFilingPreparationCurrentStateSupabaseStore(badBytesClient).readLatest(RISKPATH_A),'malformed generated byte encoding fails closed');

  const generatedReadClient = new FakeClient();
  const generatedState = builtState(1,'GENERATED');
  generatedReadClient.db.rows.push(toDbRow(generatedState));
  const generatedRead = await createFilingPreparationCurrentStateSupabaseStore(generatedReadClient).readLatest(RISKPATH_A);
  equal([...((generatedRead as FilingPreparationCurrentState).generatedDraftBytes as Uint8Array)],[10,20,30,40,50],'generated bytes round-trip byte-for-byte');

  const appendClient = new FakeClient();
  const appended = await createFilingPreparationCurrentStateSupabaseStore(appendClient).appendNext(appendInput());
  equal(appended.status,'INSERTED','first append succeeds');
  if (appended.status === 'INSERTED') {
    equal(appended.currentState.revision,1,'no prior row allocates revision 1');
    equal(appended.currentState.generatedDraftBytes,null,'null generated bytes round-trip exactly');
  }
  equal(appendClient.insertCount,1,'successful append performs exactly one insert');
  equal(Object.keys(appendClient.inserted[0]).sort(),['filing_preparation_current_state_id','generated_draft_bytes','revision','riskpath_record_id','state_payload','user_id'],'insert contains only exact D0B1 durable fields');
  equal(appendClient.inserted[0]?.user_id,USER_A,'insert user comes from authenticated client');
  equal(appendClient.inserted[0]?.revision,1,'insert revision is server allocated');
  ok(!Object.prototype.hasOwnProperty.call(appendClient.inserted[0]?.state_payload as Record<string,unknown>,'generatedDraftBytes'),'generated bytes are not serialized inside canonical state payload');

  const nextClient = new FakeClient();
  nextClient.db.rows.push(toDbRow(builtState(4)));
  const next = await createFilingPreparationCurrentStateSupabaseStore(nextClient).appendNext(appendInput());
  if (next.status !== 'INSERTED') throw new Error('next append unexpectedly conflicted');
  equal(next.currentState.revision,5,'revision N allocates N+1');

  const maxClient = new FakeClient();
  maxClient.db.rows.push(toDbRow(builtState(Number.MAX_SAFE_INTEGER)));
  await mustReject(() => createFilingPreparationCurrentStateSupabaseStore(maxClient).appendNext(appendInput()),'max-safe revision blocks instead of overflowing');
  equal(maxClient.insertCount,0,'revision overflow blocker performs no insert');

  const callerAuthorityClient = new FakeClient();
  const callerAuthorityInput = {...appendInput(),authenticatedUserId:USER_B,revision:99} as unknown as AppendFilingPreparationCurrentStateInput;
  await mustReject(() => createFilingPreparationCurrentStateSupabaseStore(callerAuthorityClient).appendNext(callerAuthorityInput),'caller-authored user/revision fields are rejected');
  equal(callerAuthorityClient.operationCount,0,'caller authority injection is rejected before auth/database operations');

  const generatedAppendClient = new FakeClient();
  const generatedAppend = await createFilingPreparationCurrentStateSupabaseStore(generatedAppendClient).appendNext(generatedAppendInput());
  if (generatedAppend.status !== 'INSERTED') throw new Error('generated append unexpectedly conflicted');
  equal([...((generatedAppend.currentState.generatedDraftBytes) as Uint8Array)],[10,20,30,40,50],'successful generated append exact-read-backs bytes');
  equal(generatedAppendClient.inserted[0]?.generated_draft_bytes,'\\x0a141e2832','insert encodes exact generated bytes deterministically');

  const reviewedAppendClient = new FakeClient();
  const reviewedAppend = await createFilingPreparationCurrentStateSupabaseStore(reviewedAppendClient).appendNext(reviewedAppendInput());
  if (reviewedAppend.status !== 'INSERTED') throw new Error('reviewed append unexpectedly conflicted');
  equal(reviewedAppend.currentState.ownerReviewBinding?.revision,1,'server revision binds Owner Review evidence exactly');

  const conflictClient = new FakeClient();
  conflictClient.db.rows.push(toDbRow(builtState(1)));
  conflictClient.beforeInsert = values => {
    if (values.revision === 2 && !conflictClient.db.rows.some(row => row.revision === 2)) {
      conflictClient.db.rows.push(toDbRow(builtState(2)));
    }
  };
  equal(await createFilingPreparationCurrentStateSupabaseStore(conflictClient).appendNext(appendInput()),{status:'CONFLICT',reloadRequired:true,currentState:null},'23505 revision race returns conflict/reload-required');
  equal(conflictClient.insertCount,1,'conflict performs no automatic retry or second insert');

  const rlsClient = new FakeClient();
  rlsClient.insertError = {code:'42501',message:'denied'};
  await mustReject(() => createFilingPreparationCurrentStateSupabaseStore(rlsClient).appendNext(appendInput()),'RLS/permission failure fails closed and is not conflict');

  const dbErrorClient = new FakeClient();
  dbErrorClient.insertError = {code:'XX000',message:'failure'};
  await mustReject(() => createFilingPreparationCurrentStateSupabaseStore(dbErrorClient).appendNext(appendInput()),'other database error fails closed');

  const networkClient = new FakeClient();
  networkClient.insertThrows = new Error('network');
  await mustReject(() => createFilingPreparationCurrentStateSupabaseStore(networkClient).appendNext(appendInput()),'network/client insert failure fails closed');

  const readBackMismatchClient = new FakeClient();
  readBackMismatchClient.afterInsert = stored => { (stored.state_payload as any).stageF = 'RELEASED'; };
  await mustReject(() => createFilingPreparationCurrentStateSupabaseStore(readBackMismatchClient).appendNext(appendInput()),'noncanonical exact read-back blocks success');
  equal(readBackMismatchClient.insertCount,1,'read-back mismatch does not trigger another write');

  const missingReadBackClient = new FakeClient();
  missingReadBackClient.readTransform = (row,filters) => filters.some(filter => filter.column === 'filing_preparation_current_state_id') ? null : row;
  await mustReject(() => createFilingPreparationCurrentStateSupabaseStore(missingReadBackClient).appendNext(appendInput()),'missing exact read-back blocks success');

  const shared = new SharedDb();
  shared.rows.push(toDbRow(builtState(1)));
  shared.barrier = barrier(2);
  const writerA = new FakeClient(shared);
  const writerB = new FakeClient(shared);
  const race = await Promise.all([
    createFilingPreparationCurrentStateSupabaseStore(writerA).appendNext(appendInput()),
    createFilingPreparationCurrentStateSupabaseStore(writerB).appendNext(appendInput()),
  ]);
  equal(race.map(result => result.status).sort(),['CONFLICT','INSERTED'],'two writers allocating same revision yield one insert and one conflict');
  equal(writerA.insertCount + writerB.insertCount,2,'two writers each attempt only their single allocated insert');
  equal(shared.rows.filter(row => row.revision === 2).length,1,'race creates only one immutable revision 2');

  const readErrorClient = new FakeClient();
  readErrorClient.readError = {code:'42501',message:'denied'};
  await mustReject(() => createFilingPreparationCurrentStateSupabaseStore(readErrorClient).readLatest(RISKPATH_A),'latest read RLS error fails closed');

  const readNetworkClient = new FakeClient();
  readNetworkClient.readThrows = new Error('network');
  await mustReject(() => createFilingPreparationCurrentStateSupabaseStore(readNetworkClient).readLatest(RISKPATH_A),'latest read network error fails closed');

  const source = readFileSync(new URL('./filingPreparationCurrentStateSupabaseStore.ts',import.meta.url),'utf8');
  ok(!source.includes('.upsert(') && !source.includes('.update(') && !source.includes('.delete('),'adapter exposes no upsert/update/delete/overwrite path');
  ok(!source.includes('createClient(') && !source.includes('process.env') && !/service[_-]?role/i.test(source),'adapter contains no client construction, environment-key, or privileged-role path');
  ok(!source.includes("from 'next/") && !source.includes('NextResponse') && !source.includes('route.ts'),'adapter registers no route/action call site');
  ok(!source.includes('D0B3') && !source.includes('checkpoint') && !source.includes('page-load') && !source.includes('background'),'adapter does not self-start checkpoint/background semantics');

  const successResult = await createFilingPreparationCurrentStateSupabaseStore(new FakeClient()).appendNext(appendInput());
  if (successResult.status !== 'INSERTED') throw new Error('successful authority-boundary append unexpectedly conflicted');
  equal(successResult.currentState.legalSufficiency,'NOT_EVALUATED','store success preserves exact held legal sufficiency boundary');
  const successRepresentation = JSON.stringify(successResult);
  for (const forbidden of ['packetReady','signed','filed','courtAccepted','serviceAuthorized','autonomousAuthority']) {
    ok(!successRepresentation.includes(forbidden),`store success represents no ${forbidden} downstream authority`);
  }

  console.log(`${passed} E2.3D0B2 current-state Supabase store assertions passed`);
}

void main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});