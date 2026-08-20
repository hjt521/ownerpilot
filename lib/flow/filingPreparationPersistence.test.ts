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
  type FilingPreparationRecord,
} from './filingPreparationRecord';
import {
  persistFilingPreparationRecord,
  type FilingPreparationPersistenceRow,
  type FilingPreparationPersistenceStore,
} from './filingPreparationPersistence';

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';
const RISKPATH_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const RISKPATH_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const generatedIdentity: GeneratedDraftIdentity = {
  schemaVersion: 1,
  artifactClass: 'GENERATED_DRAFT',
  artifactRole: 'OWNER_GENERATED_PREPARATION',
  officialSourceArtifactId: `synthetic-authority:E23B:sha256:${'a'.repeat(64)}`,
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
  generatorContractVersion: 'e23b-test-generator-contract-v1',
  generatorImplementationId: 'e23b-test-generated-draft',
  generatorImplementationVersion: '1.0.0',
  fieldWritePlanDigest: `write-plan:sha256:${'d'.repeat(64)}`,
  preparedAtISO: '2026-08-20T20:00:00.000Z',
  generatedPdfSha256: 'e'.repeat(64),
  generatedByteLength: 24567,
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
      renderedAtISO: '2026-08-20T20:01:00.000Z',
    },
    ownerConfirmedExactRenderedDocument: true,
    reviewedAtISO: '2026-08-20T20:02:00.000Z',
    reviewStatement: {
      statementId: OWNER_REVIEW_STATEMENT_ID,
      statementVersion: OWNER_REVIEW_STATEMENT_VERSION,
    },
  });
  assert.equal(result.status, 'OWNER_REVIEWED_DOCUMENT');
  if (result.status !== 'OWNER_REVIEWED_DOCUMENT') throw new Error('owner-review fixture must be admissible');
  return result.evidence;
}

function canonicalRecord(draft: GeneratedDraftEvidence): FilingPreparationRecord {
  const result = createFilingPreparationRecord({
    ownerReviewEvidence: reviewed(draft),
    currentGeneratedDraft: draft,
    generatedDraftCurrentness: CURRENT,
  });
  assert.equal(result.status, 'FILING_PREPARATION_RECORD');
  if (result.status !== 'FILING_PREPARATION_RECORD') throw new Error('filing-preparation fixture must be admissible');
  return result.record;
}

class MemoryStore implements FilingPreparationPersistenceStore {
  readonly rows = new Map<string, FilingPreparationPersistenceRow>();
  insertCalls = 0;
  readTransform: ((row: FilingPreparationPersistenceRow) => unknown) | null = null;

  constructor(private readonly authenticatedUserId: string | null) {}

  async getAuthenticatedUserId(): Promise<string | null> {
    return this.authenticatedUserId;
  }

  async insert(row: Readonly<FilingPreparationPersistenceRow>): Promise<{ status: 'INSERTED' } | { status: 'CONFLICT' }> {
    this.insertCalls += 1;
    if (this.rows.has(row.filingPreparationRecordId)) return { status: 'CONFLICT' };
    this.rows.set(row.filingPreparationRecordId, structuredClone(row));
    return { status: 'INSERTED' };
  }

  async readByRecordId(filingPreparationRecordId: string): Promise<unknown> {
    const row = this.rows.get(filingPreparationRecordId);
    if (!row) return null;
    const clone = structuredClone(row);
    return this.readTransform ? this.readTransform(clone) : clone;
  }

  seed(row: FilingPreparationPersistenceRow): void {
    this.rows.set(row.filingPreparationRecordId, structuredClone(row));
  }
}

const CURRENT: GeneratedDraftCurrentness = { status: 'CURRENT', reasons: [] };
const draft = generated();
const record = canonicalRecord(draft);

function input(store: FilingPreparationPersistenceStore, overrides: Record<string, unknown> = {}): any {
  return {
    record,
    currentGeneratedDraft: draft,
    generatedDraftCurrentness: CURRENT,
    userId: USER_A,
    riskpathRecordId: RISKPATH_A,
    store,
    ...overrides,
  };
}

async function main(): Promise<void> {
  let passed = 0;
  const equal = <T>(actual: T, expected: T, message: string): void => {
    assert.equal(actual, expected, message);
    passed += 1;
  };
  const ok = (condition: unknown, message: string): void => {
    assert.ok(condition, message);
    passed += 1;
  };

  const firstStore = new MemoryStore(USER_A);
  const first = await persistFilingPreparationRecord(input(firstStore));
  equal(first.status, 'PERSISTED', 'valid/current canonical record persists through user-scoped adapter');
  if (first.status !== 'PERSISTED') throw new Error('expected persistence success');
  equal(first.disposition, 'INSERTED', 'first persistence is a new insert');
  equal(first.filingPreparationRecordId, record.filingPreparationRecordId, 'adapter derives final record identity from canonical record');
  equal(first.stageF, 'HELD', 'persistence success preserves Stage F hold');
  equal(first.durability, 'ROUND_TRIP_VERIFIED', 'persistence success requires read-back verification');
  equal(firstStore.rows.get(record.filingPreparationRecordId)?.recordPayload && JSON.stringify(firstStore.rows.get(record.filingPreparationRecordId)?.recordPayload), JSON.stringify(record), 'store receives exact unchanged canonical record payload');

  const duplicate = await persistFilingPreparationRecord(input(firstStore));
  equal(duplicate.status, 'PERSISTED', 'exact duplicate can succeed idempotently');
  if (duplicate.status !== 'PERSISTED') throw new Error('expected idempotent duplicate success');
  equal(duplicate.disposition, 'IDEMPOTENT_DUPLICATE', 'exact duplicate is explicitly idempotent');
  equal(firstStore.rows.size, 1, 'idempotent duplicate does not create a second row');

  const malformedStore = new MemoryStore(USER_A);
  const malformed = structuredClone(record) as unknown as Record<string, unknown>;
  malformed.packetReady = true;
  const malformedResult = await persistFilingPreparationRecord(input(malformedStore, { record: malformed }));
  equal(malformedResult.status, 'BLOCKED', 'malformed pre-write record fails closed');
  equal(malformedStore.insertCalls, 0, 'malformed record never reaches persistence write');

  const idMismatchStore = new MemoryStore(USER_A);
  const idMismatch = structuredClone(record);
  idMismatch.filingPreparationRecordId = `filing-preparation-record:sha256:${'0'.repeat(64)}`;
  const idMismatchResult = await persistFilingPreparationRecord(input(idMismatchStore, { record: idMismatch }));
  equal(idMismatchResult.status, 'BLOCKED', 'record ID recomputation mismatch fails closed');
  equal(idMismatchStore.insertCalls, 0, 'record ID mismatch never reaches persistence write');

  const staleStore = new MemoryStore(USER_A);
  const staleResult = await persistFilingPreparationRecord(input(staleStore, {
    generatedDraftCurrentness: { status: 'OUT_OF_DATE', reasons: ['REFERENCED_FACT_SNAPSHOT_CHANGED'] },
  }));
  equal(staleResult.status, 'BLOCKED', 'generated-draft OUT_OF_DATE blocks persistence');
  equal(staleStore.insertCalls, 0, 'stale generated draft never reaches persistence write');

  const regenerated = generated({ generatedPdfSha256: '0'.repeat(64) });
  const ownerMismatchStore = new MemoryStore(USER_A);
  const ownerMismatch = await persistFilingPreparationRecord(input(ownerMismatchStore, {
    currentGeneratedDraft: regenerated,
  }));
  equal(ownerMismatch.status, 'BLOCKED', 'owner review/current generated mismatch blocks persistence');
  equal(ownerMismatchStore.insertCalls, 0, 'owner-review/current mismatch never reaches persistence write');

  const callerIdentityStore = new MemoryStore(USER_A);
  const callerIdentity = await persistFilingPreparationRecord(input(callerIdentityStore, {
    filingPreparationRecordId: `filing-preparation-record:sha256:${'f'.repeat(64)}`,
  }));
  equal(callerIdentity.status, 'PERSISTED', 'extraneous caller identity cannot substitute final canonical record identity');
  if (callerIdentity.status !== 'PERSISTED') throw new Error('expected canonical caller-identity resistance success');
  equal(callerIdentity.filingPreparationRecordId, record.filingPreparationRecordId, 'returned identity remains canonical despite caller-supplied extra identity');
  ok(!callerIdentityStore.rows.has(`filing-preparation-record:sha256:${'f'.repeat(64)}`), 'caller-selected identity is never persisted');

  const authMismatchStore = new MemoryStore(USER_B);
  const authMismatch = await persistFilingPreparationRecord(input(authMismatchStore));
  equal(authMismatch.status, 'BLOCKED', 'user-scoped authenticated identity mismatch fails closed');
  equal(authMismatchStore.insertCalls, 0, 'auth identity mismatch never reaches persistence write');

  const changedPayloadStore = new MemoryStore(USER_A);
  const changedPayload = structuredClone(record) as unknown as Record<string, unknown>;
  changedPayload.packetReady = true;
  changedPayloadStore.seed({
    filingPreparationRecordId: record.filingPreparationRecordId,
    userId: USER_A,
    riskpathRecordId: RISKPATH_A,
    recordPayload: changedPayload,
  });
  const changedPayloadDuplicate = await persistFilingPreparationRecord(input(changedPayloadStore));
  equal(changedPayloadDuplicate.status, 'BLOCKED', 'duplicate ID with changed payload is a hard conflict');
  if (changedPayloadDuplicate.status !== 'BLOCKED') throw new Error('expected changed-payload conflict');
  equal(changedPayloadDuplicate.blockReason, 'DUPLICATE_RECORD_CONFLICT', 'changed-payload duplicate cannot overwrite stored evidence');
  equal(changedPayloadStore.rows.size, 1, 'changed-payload conflict does not mutate row count');

  const differentRiskpathStore = new MemoryStore(USER_A);
  differentRiskpathStore.seed({
    filingPreparationRecordId: record.filingPreparationRecordId,
    userId: USER_A,
    riskpathRecordId: RISKPATH_B,
    recordPayload: record,
  });
  const differentRiskpath = await persistFilingPreparationRecord(input(differentRiskpathStore));
  equal(differentRiskpath.status, 'BLOCKED', 'duplicate ID bound to different RiskPath is a hard conflict');
  if (differentRiskpath.status !== 'BLOCKED') throw new Error('expected RiskPath conflict');
  equal(differentRiskpath.blockReason, 'DUPLICATE_RECORD_CONFLICT', 'different RiskPath cannot be rebound');

  const differentUserStore = new MemoryStore(USER_A);
  differentUserStore.seed({
    filingPreparationRecordId: record.filingPreparationRecordId,
    userId: USER_B,
    riskpathRecordId: RISKPATH_A,
    recordPayload: record,
  });
  const differentUser = await persistFilingPreparationRecord(input(differentUserStore));
  equal(differentUser.status, 'BLOCKED', 'duplicate ID bound to different user is a hard conflict');
  if (differentUser.status !== 'BLOCKED') throw new Error('expected user conflict');
  equal(differentUser.blockReason, 'DUPLICATE_RECORD_CONFLICT', 'different user cannot be rebound');

  const tamperedReadStore = new MemoryStore(USER_A);
  tamperedReadStore.readTransform = row => {
    const payload = structuredClone(row.recordPayload) as Record<string, unknown>;
    payload.packetReady = true;
    return { ...row, recordPayload: payload };
  };
  const tamperedRead = await persistFilingPreparationRecord(input(tamperedReadStore));
  equal(tamperedRead.status, 'BLOCKED', 'read-back malformed/tampered payload fails closed');
  if (tamperedRead.status !== 'BLOCKED') throw new Error('expected tampered read-back failure');
  equal(tamperedRead.blockReason, 'ROUND_TRIP_ROW_INVALID', 'tampered read-back reports deterministic validation failure');

  const readIdStore = new MemoryStore(USER_A);
  readIdStore.readTransform = row => ({
    ...row,
    filingPreparationRecordId: `filing-preparation-record:sha256:${'9'.repeat(64)}`,
  });
  const readIdMismatch = await persistFilingPreparationRecord(input(readIdStore));
  equal(readIdMismatch.status, 'BLOCKED', 'read-back ID mismatch fails closed');
  if (readIdMismatch.status !== 'BLOCKED') throw new Error('expected read-back identity failure');
  equal(readIdMismatch.blockReason, 'ROUND_TRIP_IDENTITY_MISMATCH', 'read-back ID mismatch reports identity failure');

  const reorderedStore = new MemoryStore(USER_A);
  reorderedStore.readTransform = row => {
    const payload = row.recordPayload as Record<string, unknown>;
    const reversed = Object.fromEntries(Object.entries(payload).reverse());
    return { ...row, recordPayload: reversed };
  };
  const reordered = await persistFilingPreparationRecord(input(reorderedStore));
  equal(reordered.status, 'PERSISTED', 'JSONB-style object key reordering preserves exact semantic round-trip');
  if (reordered.status !== 'PERSISTED') throw new Error('expected canonical JSON-order independence');
  equal(reordered.durability, 'ROUND_TRIP_VERIFIED', 'canonical comparison verifies reordered JSON object');

  const source = readFileSync(new URL('./filingPreparationPersistence.ts', import.meta.url), 'utf8');
  ok(!source.includes('.update(') && !source.includes('.delete('), 'persistence adapter exposes no update/delete code path');
  ok(!/service[_-]?role/i.test(source) && !source.includes('SUPABASE_SERVICE_ROLE_KEY'), 'persistence adapter contains no service-role/privileged bypass path');
  ok(!source.includes('createClient('), 'persistence adapter does not create a privileged database client');
  ok(!source.includes('fetch(') && !source.includes("from 'next/") && !source.includes('NextResponse'), 'persistence adapter creates no API/UI/network endpoint');

  const successKeys = Object.keys(first).sort();
  for (const forbidden of ['packet', 'packetReady', 'signing', 'filing', 'courtSubmission', 'courtAcceptance', 'service', 'legalSufficiency', 'autonomousExecution', 'stageFAuthority']) {
    ok(!successKeys.includes(forbidden), `persistence success exposes no ${forbidden} execution state`);
  }

  const sql = readFileSync(new URL('../../supabase/staged-migrations/058_e2_3b_filing_preparation_records.sql', import.meta.url), 'utf8');
  equal((sql.match(/create table public\.filing_preparation_records/gi) ?? []).length, 1, 'staged SQL creates exactly one E2.3B table');
  ok(/alter table public\.filing_preparation_records enable row level security;/i.test(sql), 'staged SQL enables RLS');
  ok(/alter table public\.filing_preparation_records force row level security;/i.test(sql), 'staged SQL forces RLS');
  ok(/grant select, insert on public\.filing_preparation_records to authenticated;/i.test(sql), 'authenticated customer role receives only SELECT/INSERT grant');
  ok(/revoke all on public\.filing_preparation_records from anon, authenticated;/i.test(sql), 'staged SQL starts from fail-closed grants');
  ok(/riskpath_records[\s\S]*riskpath_record_id[\s\S]*auth\.uid\(\)/i.test(sql), 'RLS binds persistence ownership to exact owned RiskPath');
  ok(!/grant[^;]*\b(update|delete)\b[^;]*;/i.test(sql), 'staged SQL grants no UPDATE/DELETE customer authority');
  ok(!/create policy[^;]*(for update|for delete|for all)[^;]*;/i.test(sql), 'staged SQL creates no UPDATE/DELETE/all customer policy');
  ok(!/service[_-]?role/i.test(sql), 'staged SQL creates no service-role bypass path');

  console.log(`${passed} E2.3B filing-preparation persistence assertions passed`);
}

void main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
