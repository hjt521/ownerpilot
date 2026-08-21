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
} from './officialFormOwnerReview';
import {
  createFilingPreparationRecord,
  type FilingPreparationRecord,
} from './filingPreparationRecord';
import {
  invokeFilingPreparationRuntimePersistence,
  type FilingPreparationRuntimeSupabaseClient,
} from './filingPreparationRuntimePersistenceAction';

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';
const RISKPATH_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const RISKPATH_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const CURRENT: GeneratedDraftCurrentness = { status: 'CURRENT', reasons: [] };
const generatedIdentity: GeneratedDraftIdentity = {
  schemaVersion: 1,
  artifactClass: 'GENERATED_DRAFT',
  artifactRole: 'OWNER_GENERATED_PREPARATION',
  officialSourceArtifactId: `synthetic-authority:E23D1:sha256:${'a'.repeat(64)}`,
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
  generatorContractVersion: 'e23d1-test-generator-contract-v1',
  generatorImplementationId: 'e23d1-test-generated-draft',
  generatorImplementationVersion: '1.0.0',
  fieldWritePlanDigest: `write-plan:sha256:${'d'.repeat(64)}`,
  preparedAtISO: '2026-08-21T20:00:00.000Z',
  generatedPdfSha256: 'e'.repeat(64),
  generatedByteLength: 24567,
};

function generated(overrides: Partial<GeneratedDraftIdentity> = {}): GeneratedDraftEvidence {
  const identity = { ...generatedIdentity, ...overrides } as GeneratedDraftIdentity;
  return { ...identity, generatedDocumentId: computeGeneratedDocumentId(identity) };
}

function canonicalRecord(draft: GeneratedDraftEvidence): FilingPreparationRecord {
  const ownerReview = createOfficialFormOwnerReview({
    generatedDraft: draft,
    renderedAcknowledgment: {
      renderedGeneratedDocumentId: draft.generatedDocumentId,
      renderedPdfSha256: draft.generatedPdfSha256,
      renderedByteLength: draft.generatedByteLength,
      renderedAtISO: '2026-08-21T20:01:00.000Z',
    },
    ownerConfirmedExactRenderedDocument: true,
    reviewedAtISO: '2026-08-21T20:02:00.000Z',
    reviewStatement: {
      statementId: OWNER_REVIEW_STATEMENT_ID,
      statementVersion: OWNER_REVIEW_STATEMENT_VERSION,
    },
  });
  assert.equal(ownerReview.status, 'OWNER_REVIEWED_DOCUMENT');
  if (ownerReview.status !== 'OWNER_REVIEWED_DOCUMENT') throw new Error('owner-review fixture must be admissible');

  const result = createFilingPreparationRecord({
    ownerReviewEvidence: ownerReview.evidence,
    currentGeneratedDraft: draft,
    generatedDraftCurrentness: CURRENT,
  });
  assert.equal(result.status, 'FILING_PREPARATION_RECORD');
  if (result.status !== 'FILING_PREPARATION_RECORD') throw new Error('filing-preparation fixture must be admissible');
  return result.record;
}

type DbRow = {
  filing_preparation_record_id: string;
  user_id: string;
  riskpath_record_id: string;
  record_payload: unknown;
};

class FakeClient implements FilingPreparationRuntimeSupabaseClient {
  authUserId: string | null = USER_A;
  authError: unknown | null = null;
  authMalformed = false;
  riskpathVisible = true;
  riskpathError: unknown | null = null;
  riskpathReturnedUserId: string = USER_A;
  riskpathReturnedId: string = RISKPATH_A;
  insertCalls = 0;
  riskpathReads = 0;
  rows = new Map<string, DbRow>();
  readTransform: ((row: DbRow) => unknown) | null = null;

  readonly auth = {
    getUser: async (): Promise<any> => {
      if (this.authMalformed) return { nope: true };
      return {
        data: { user: this.authUserId === null ? null : { id: this.authUserId } },
        error: this.authError,
      };
    },
  };

  from(table: string): any {
    if (table === 'riskpath_records') {
      return {
        select: (_columns: string) => {
          const filters = new Map<string, string>();
          const query: any = {
            eq: (column: string, value: string) => {
              filters.set(column, value);
              return query;
            },
            maybeSingle: async () => {
              this.riskpathReads += 1;
              if (this.riskpathError !== null) return { data: null, error: this.riskpathError };
              if (!this.riskpathVisible
                || filters.get('id') !== RISKPATH_A
                || filters.get('user_id') !== USER_A) {
                return { data: null, error: null };
              }
              return {
                data: { id: this.riskpathReturnedId, user_id: this.riskpathReturnedUserId },
                error: null,
              };
            },
          };
          return query;
        },
      };
    }

    if (table !== 'filing_preparation_records') throw new Error(`unexpected table: ${table}`);
    return {
      insert: async (values: DbRow) => {
        this.insertCalls += 1;
        if (this.rows.has(values.filing_preparation_record_id)) {
          return { data: null, error: { code: '23505', message: 'duplicate' } };
        }
        this.rows.set(values.filing_preparation_record_id, structuredClone(values));
        return { data: null, error: null };
      },
      select: (_columns: string) => {
        let recordId = '';
        return {
          eq: (_column: string, value: string) => {
            recordId = value;
            return {
              maybeSingle: async () => {
                const row = this.rows.get(recordId);
                if (!row) return { data: null, error: null };
                const clone = structuredClone(row);
                return { data: this.readTransform ? this.readTransform(clone) : clone, error: null };
              },
            };
          },
        };
      },
    };
  }

  seed(row: DbRow): void {
    this.rows.set(row.filing_preparation_record_id, structuredClone(row));
  }
}

const draft = generated();
const record = canonicalRecord(draft);

function requestBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    record,
    currentGeneratedDraft: draft,
    generatedDraftCurrentness: CURRENT,
    ...overrides,
  };
}

async function invoke(client: FakeClient, body: unknown = requestBody(), riskpathRecordId: unknown = RISKPATH_A) {
  return invokeFilingPreparationRuntimePersistence({ client, riskpathRecordId, requestBody: body });
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

  const validClient = new FakeClient();
  const valid = await invoke(validClient);
  equal(valid.status, 'PERSISTED', 'authenticated owner action persists an admissible current record');
  if (valid.status !== 'PERSISTED') throw new Error('expected runtime persistence success');
  equal(valid.disposition, 'INSERTED', 'first authenticated action is an insert');
  equal(valid.stageF, 'HELD', 'runtime persistence receipt preserves Stage F hold');
  equal(valid.durability, 'ROUND_TRIP_VERIFIED', 'runtime success requires exact readback');
  equal(valid.userId, USER_A, 'persistence receipt binds the server-resolved authenticated owner');
  equal(valid.riskpathRecordId, RISKPATH_A, 'persistence receipt binds the exact owned RiskPath');
  equal(validClient.insertCalls, 1, 'valid action performs exactly one insert attempt');

  const unauthenticatedClient = new FakeClient();
  unauthenticatedClient.authUserId = null;
  const unauthenticated = await invoke(unauthenticatedClient);
  equal(unauthenticated.status, 'BLOCKED', 'unauthenticated invocation fails closed');
  if (unauthenticated.status !== 'BLOCKED') throw new Error('expected unauthenticated block');
  equal(unauthenticated.blockReason, 'UNAUTHENTICATED', 'unauthenticated invocation has a deterministic block reason');
  equal(unauthenticatedClient.riskpathReads, 0, 'unauthenticated invocation never reaches RiskPath lookup');
  equal(unauthenticatedClient.insertCalls, 0, 'unauthenticated invocation never reaches insert');

  const callerIdentityClient = new FakeClient();
  const callerIdentity = await invoke(callerIdentityClient, requestBody({ userId: USER_B }));
  equal(callerIdentity.status, 'BLOCKED', 'caller-supplied user identity is rejected as an extra request field');
  if (callerIdentity.status !== 'BLOCKED') throw new Error('expected caller identity block');
  equal(callerIdentity.blockReason, 'INVALID_REQUEST_BODY', 'caller cannot select authenticated identity through serialized input');
  equal(callerIdentityClient.insertCalls, 0, 'caller-selected identity never reaches insert');

  const badRiskpathClient = new FakeClient();
  const badRiskpath = await invoke(badRiskpathClient, requestBody(), 'not-a-uuid');
  equal(badRiskpath.status, 'BLOCKED', 'malformed RiskPath identity fails closed');
  if (badRiskpath.status !== 'BLOCKED') throw new Error('expected malformed RiskPath block');
  equal(badRiskpath.blockReason, 'INVALID_RISKPATH_RECORD_ID', 'malformed RiskPath receives deterministic block reason');
  equal(badRiskpathClient.insertCalls, 0, 'malformed RiskPath never reaches insert');

  const unavailableClient = new FakeClient();
  unavailableClient.riskpathVisible = false;
  const unavailable = await invoke(unavailableClient);
  equal(unavailable.status, 'BLOCKED', 'owner/RiskPath mismatch stays unavailable through the user-scoped RLS seam');
  if (unavailable.status !== 'BLOCKED') throw new Error('expected unavailable RiskPath block');
  equal(unavailable.blockReason, 'RISKPATH_UNAVAILABLE', 'RLS-invisible RiskPath fails closed without ownership widening');
  equal(unavailableClient.insertCalls, 0, 'unavailable RiskPath never reaches insert');

  const malformedOwnershipClient = new FakeClient();
  malformedOwnershipClient.riskpathReturnedUserId = USER_B;
  const malformedOwnership = await invoke(malformedOwnershipClient);
  equal(malformedOwnership.status, 'BLOCKED', 'mismatched ownership response fails closed');
  if (malformedOwnership.status !== 'BLOCKED') throw new Error('expected ownership response block');
  equal(malformedOwnership.blockReason, 'RISKPATH_LOOKUP_FAILED', 'ownership response must bind the exact server-resolved owner');
  equal(malformedOwnershipClient.insertCalls, 0, 'mismatched ownership response never reaches insert');

  const malformedRecordClient = new FakeClient();
  const malformedRecord = structuredClone(record) as unknown as Record<string, unknown>;
  malformedRecord.packetReady = true;
  const malformedRecordResult = await invoke(malformedRecordClient, requestBody({ record: malformedRecord }));
  equal(malformedRecordResult.status, 'BLOCKED', 'malformed serialized canonical record fails closed');
  if (malformedRecordResult.status !== 'BLOCKED') throw new Error('expected malformed record block');
  equal(malformedRecordResult.blockReason, 'E2_3_ADMISSION_BLOCKED', 'malformed record is rejected by the existing E2.3 admission chain');
  equal(malformedRecordClient.insertCalls, 0, 'malformed record never reaches insert');

  const staleClient = new FakeClient();
  const stale = await invoke(staleClient, requestBody({
    generatedDraftCurrentness: { status: 'OUT_OF_DATE', reasons: ['REFERENCED_FACT_SNAPSHOT_CHANGED'] },
  }));
  equal(stale.status, 'BLOCKED', 'stale generated-draft currentness fails closed');
  if (stale.status !== 'BLOCKED') throw new Error('expected stale block');
  equal(stale.blockReason, 'E2_3_ADMISSION_BLOCKED', 'stale record is rejected by canonical E2.3 admission');
  equal(staleClient.insertCalls, 0, 'stale record never reaches insert');

  const reviewMismatchClient = new FakeClient();
  const regenerated = generated({ generatedPdfSha256: '0'.repeat(64) });
  const reviewMismatch = await invoke(reviewMismatchClient, requestBody({ currentGeneratedDraft: regenerated }));
  equal(reviewMismatch.status, 'BLOCKED', 'Owner Review/current generated identity mismatch fails closed');
  if (reviewMismatch.status !== 'BLOCKED') throw new Error('expected Owner Review mismatch block');
  equal(reviewMismatch.blockReason, 'E2_3_ADMISSION_BLOCKED', 'Owner Review mismatch is enforced by canonical admission');
  equal(reviewMismatchClient.insertCalls, 0, 'Owner Review mismatch never reaches insert');

  const duplicateClient = new FakeClient();
  duplicateClient.seed({
    filing_preparation_record_id: record.filingPreparationRecordId,
    user_id: USER_A,
    riskpath_record_id: RISKPATH_A,
    record_payload: record,
  });
  const duplicate = await invoke(duplicateClient);
  equal(duplicate.status, 'PERSISTED', 'exact existing content remains idempotent');
  if (duplicate.status !== 'PERSISTED') throw new Error('expected idempotent duplicate success');
  equal(duplicate.disposition, 'IDEMPOTENT_DUPLICATE', 'exact duplicate does not overwrite');
  equal(duplicateClient.rows.size, 1, 'idempotent duplicate preserves one immutable row');

  const conflictClient = new FakeClient();
  const conflictingPayload = structuredClone(record) as unknown as Record<string, unknown>;
  conflictingPayload.packetReady = true;
  conflictClient.seed({
    filing_preparation_record_id: record.filingPreparationRecordId,
    user_id: USER_A,
    riskpath_record_id: RISKPATH_A,
    record_payload: conflictingPayload,
  });
  const beforeConflict = structuredClone(conflictClient.rows.get(record.filingPreparationRecordId));
  const conflict = await invoke(conflictClient);
  equal(conflict.status, 'BLOCKED', 'same deterministic record ID with conflicting stored content fails closed');
  if (conflict.status !== 'BLOCKED') throw new Error('expected duplicate conflict block');
  equal(conflict.blockReason, 'DUPLICATE_RECORD_CONFLICT', 'conflicting existing content cannot be overwritten');
  equal(conflictClient.rows.get(record.filingPreparationRecordId), beforeConflict, 'conflicting row remains byte-for-byte unmodified in the fake store');

  const readbackClient = new FakeClient();
  readbackClient.readTransform = row => ({ ...row, riskpath_record_id: RISKPATH_B });
  const readback = await invoke(readbackClient);
  equal(readback.status, 'BLOCKED', 'non-exact readback fails closed');
  if (readback.status !== 'BLOCKED') throw new Error('expected readback block');
  equal(readback.blockReason, 'ROUND_TRIP_IDENTITY_MISMATCH', 'readback identity mismatch is deterministic');

  const authFailureClient = new FakeClient();
  authFailureClient.authMalformed = true;
  const authFailure = await invoke(authFailureClient);
  equal(authFailure.status, 'BLOCKED', 'malformed authentication response fails closed');
  if (authFailure.status !== 'BLOCKED') throw new Error('expected authentication failure block');
  equal(authFailure.blockReason, 'AUTHENTICATION_FAILED', 'malformed authentication cannot become anonymous or authorized');
  equal(authFailureClient.insertCalls, 0, 'authentication failure never reaches insert');

  const riskpathFailureClient = new FakeClient();
  riskpathFailureClient.riskpathError = { code: 'XX000' };
  const riskpathFailure = await invoke(riskpathFailureClient);
  equal(riskpathFailure.status, 'BLOCKED', 'RiskPath query error fails closed');
  if (riskpathFailure.status !== 'BLOCKED') throw new Error('expected RiskPath query block');
  equal(riskpathFailure.blockReason, 'RISKPATH_LOOKUP_FAILED', 'RiskPath query errors are never softened into authorization');
  equal(riskpathFailureClient.insertCalls, 0, 'RiskPath query failure never reaches insert');

  const actionSource = readFileSync(new URL('./filingPreparationRuntimePersistenceAction.ts', import.meta.url), 'utf8');
  ok(actionSource.includes('createFilingPreparationSupabaseStore') && actionSource.includes('persistFilingPreparationRecord'), 'runtime seam composes the existing E2.3C store and canonical persistence contract');
  ok(actionSource.includes(".from('riskpath_records')") && actionSource.includes(".eq('user_id', authenticatedUserId)"), 'runtime seam checks exact owned RiskPath through the authenticated user-scoped client');
  ok(!/service[_-]?role/i.test(actionSource) && !actionSource.includes('SUPABASE_SERVICE_ROLE_KEY'), 'runtime seam contains no service-role/admin bypass');
  ok(!actionSource.includes('.upsert(') && !actionSource.includes('.update(') && !actionSource.includes('.delete('), 'runtime seam creates no overwrite/update/delete authority');
  ok(!actionSource.includes('localStorage') && !actionSource.includes('setInterval(') && !actionSource.includes('setTimeout('), 'runtime seam has no browser storage, background timer, or render-loop activation');

  const routeSource = readFileSync(new URL('../../app/api/riskpath/[id]/filing-preparation/persist/route.ts', import.meta.url), 'utf8');
  ok(routeSource.includes("from '@/lib/supabase/server'") && routeSource.includes('await createClient()'), 'route obtains a server cookie-scoped Supabase client');
  ok(routeSource.includes('invokeFilingPreparationRuntimePersistence') && routeSource.includes('export async function POST'), 'runtime invocation is an explicit POST-only server route');
  ok(!routeSource.includes('export async function GET') && !routeSource.includes('localStorage'), 'route is not page-load/read/render/localStorage wiring');
  ok(!/service[_-]?role/i.test(routeSource) && !routeSource.includes('SUPABASE_SERVICE_ROLE_KEY'), 'route creates no privileged Supabase path');
  ok(!routeSource.includes('app/api/notice/filing-preparation') && !routeSource.includes('ud100FilingPreparation'), 'route does not recreate obsolete PR #389 seams');

  console.log(`${passed} E2.3D1 authenticated runtime persistence action assertions passed`);
}

void main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
