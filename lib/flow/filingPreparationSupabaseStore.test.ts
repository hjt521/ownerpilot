import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import {
  createFilingPreparationSupabaseStore,
  type FilingPreparationSupabaseClient,
} from './filingPreparationSupabaseStore';
import type { FilingPreparationPersistenceRow } from './filingPreparationPersistence';

const USER_A = '11111111-1111-4111-8111-111111111111';
const RISKPATH_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const RECORD_ID = `filing-preparation-record:sha256:${'a'.repeat(64)}`;
const PAYLOAD = {
  schemaVersion: 1,
  recordClass: 'FILING_PREPARATION_RECORD',
  filingPreparationRecordId: RECORD_ID,
  nested: { beta: 2, alpha: 1 },
};

class FakeClient implements FilingPreparationSupabaseClient {
  authResponse: any = { data: { user: { id: USER_A } }, error: null };
  authThrows: unknown = null;
  insertResponse: any = { data: null, error: null };
  insertThrows: unknown = null;
  readResponse: any = { data: null, error: null };
  readThrows: unknown = null;
  operationCount = 0;
  fromCalls: string[] = [];
  selectCalls: string[] = [];
  eqCalls: Array<{ column: string; value: string }> = [];
  inserted: Record<string, unknown>[] = [];

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
      insert: async (values: Record<string, unknown>) => {
        this.operationCount += 1;
        this.inserted.push(structuredClone(values));
        if (this.insertThrows) throw this.insertThrows;
        return this.insertResponse;
      },
      select: (columns: string) => {
        this.operationCount += 1;
        this.selectCalls.push(columns);
        return {
          eq: (column: string, value: string) => {
            this.operationCount += 1;
            this.eqCalls.push({ column, value });
            return {
              maybeSingle: async () => {
                this.operationCount += 1;
                if (this.readThrows) throw this.readThrows;
                return this.readResponse;
              },
            };
          },
        };
      },
    };
  }
}

const ROW: FilingPreparationPersistenceRow = {
  filingPreparationRecordId: RECORD_ID,
  userId: USER_A,
  riskpathRecordId: RISKPATH_A,
  recordPayload: PAYLOAD,
};

async function rejects(action: () => Promise<unknown>, message: string): Promise<void> {
  let threw = false;
  try {
    await action();
  } catch {
    threw = true;
  }
  assert.equal(threw, true, message);
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
  equal(inertClient.operationCount, 0, 'fake client begins with no operations');
  const inertStore = createFilingPreparationSupabaseStore(inertClient);
  equal(inertClient.operationCount, 0, 'constructing adapter performs no auth or database operation');
  ok(typeof inertStore.getAuthenticatedUserId === 'function', 'adapter exposes canonical auth method');
  ok(typeof inertStore.insert === 'function' && typeof inertStore.readByRecordId === 'function', 'adapter exposes canonical store methods only');

  const authClient = new FakeClient();
  const authStore = createFilingPreparationSupabaseStore(authClient);
  equal(await authStore.getAuthenticatedUserId(), USER_A, 'authenticated injected client identity returns exact user UUID');

  const noUserClient = new FakeClient();
  noUserClient.authResponse = { data: { user: null }, error: null };
  equal(await createFilingPreparationSupabaseStore(noUserClient).getAuthenticatedUserId(), null, 'genuine no-user response returns null');

  const authErrorClient = new FakeClient();
  authErrorClient.authResponse = { data: { user: null }, error: { message: 'auth unavailable' } };
  await mustReject(() => createFilingPreparationSupabaseStore(authErrorClient).getAuthenticatedUserId(), 'auth error fails closed');

  const authThrowClient = new FakeClient();
  authThrowClient.authThrows = new Error('network');
  await mustReject(() => createFilingPreparationSupabaseStore(authThrowClient).getAuthenticatedUserId(), 'auth client/network exception fails closed');

  const malformedAuthClient = new FakeClient();
  malformedAuthClient.authResponse = { data: null, error: null };
  await mustReject(() => createFilingPreparationSupabaseStore(malformedAuthClient).getAuthenticatedUserId(), 'malformed auth response fails closed instead of becoming anonymous');

  const malformedIdentityClient = new FakeClient();
  malformedIdentityClient.authResponse = { data: { user: { id: 'not-a-uuid' } }, error: null };
  await mustReject(() => createFilingPreparationSupabaseStore(malformedIdentityClient).getAuthenticatedUserId(), 'malformed authenticated identity fails closed');

  const insertClient = new FakeClient();
  const insertStore = createFilingPreparationSupabaseStore(insertClient);
  const inserted = await insertStore.insert(ROW);
  equal(inserted, { status: 'INSERTED' }, 'successful insert returns INSERTED');
  equal(insertClient.fromCalls, ['filing_preparation_records'], 'insert targets only filing_preparation_records');
  equal(insertClient.inserted.length, 1, 'insert issues exactly one table write');
  equal(insertClient.inserted[0], {
    filing_preparation_record_id: RECORD_ID,
    user_id: USER_A,
    riskpath_record_id: RISKPATH_A,
    record_payload: PAYLOAD,
  }, 'insert translates exactly the four canonical row fields');
  equal(insertClient.inserted[0]?.record_payload, PAYLOAD, 'payload is preserved semantically unchanged');
  equal(Object.keys(inserted).sort(), ['status'], 'insert success represents only store disposition, not execution authority');

  const conflictClient = new FakeClient();
  conflictClient.insertResponse = { data: null, error: { code: '23505', message: 'duplicate' } };
  equal(await createFilingPreparationSupabaseStore(conflictClient).insert(ROW), { status: 'CONFLICT' }, 'exact PostgreSQL 23505 maps to CONFLICT');

  const rlsClient = new FakeClient();
  rlsClient.insertResponse = { data: null, error: { code: '42501', message: 'denied' } };
  await mustReject(() => createFilingPreparationSupabaseStore(rlsClient).insert(ROW), 'RLS 42501 fails closed and is not softened to conflict');

  const dbErrorClient = new FakeClient();
  dbErrorClient.insertResponse = { data: null, error: { code: 'XX000', message: 'database failure' } };
  await mustReject(() => createFilingPreparationSupabaseStore(dbErrorClient).insert(ROW), 'other database errors fail closed');

  const networkInsertClient = new FakeClient();
  networkInsertClient.insertThrows = new Error('network');
  await mustReject(() => createFilingPreparationSupabaseStore(networkInsertClient).insert(ROW), 'insert client/network exception fails closed');

  const malformedInsertClient = new FakeClient();
  malformedInsertClient.insertResponse = { data: null };
  await mustReject(() => createFilingPreparationSupabaseStore(malformedInsertClient).insert(ROW), 'malformed insert response fails closed');

  const readClient = new FakeClient();
  readClient.readResponse = {
    data: {
      filing_preparation_record_id: RECORD_ID,
      user_id: USER_A,
      riskpath_record_id: RISKPATH_A,
      record_payload: structuredClone(PAYLOAD),
    },
    error: null,
  };
  const read = await createFilingPreparationSupabaseStore(readClient).readByRecordId(RECORD_ID);
  equal(readClient.fromCalls, ['filing_preparation_records'], 'read targets only filing_preparation_records');
  equal(readClient.selectCalls, ['filing_preparation_record_id,user_id,riskpath_record_id,record_payload'], 'read selects only canonical round-trip fields');
  equal(readClient.eqCalls, [{ column: 'filing_preparation_record_id', value: RECORD_ID }], 'read filters by exact primary record identity');
  equal(read, ROW, 'valid database row maps to exact canonical camelCase persistence row');

  const missingClient = new FakeClient();
  missingClient.readResponse = { data: null, error: null };
  equal(await createFilingPreparationSupabaseStore(missingClient).readByRecordId(RECORD_ID), null, 'no-row or RLS-invisible row returns null');

  const malformedReadClient = new FakeClient();
  malformedReadClient.readResponse = {
    data: {
      filing_preparation_record_id: RECORD_ID,
      user_id: USER_A,
      riskpath_record_id: RISKPATH_A,
      record_payload: PAYLOAD,
      created_at: 'forbidden-extra-field',
    },
    error: null,
  };
  await mustReject(() => createFilingPreparationSupabaseStore(malformedReadClient).readByRecordId(RECORD_ID), 'malformed read-back row with extra field fails closed');

  const malformedPayloadClient = new FakeClient();
  malformedPayloadClient.readResponse = {
    data: {
      filing_preparation_record_id: RECORD_ID,
      user_id: USER_A,
      riskpath_record_id: RISKPATH_A,
      record_payload: null,
    },
    error: null,
  };
  await mustReject(() => createFilingPreparationSupabaseStore(malformedPayloadClient).readByRecordId(RECORD_ID), 'malformed canonical payload fails closed');

  const readErrorClient = new FakeClient();
  readErrorClient.readResponse = { data: null, error: { code: '42501', message: 'denied' } };
  await mustReject(() => createFilingPreparationSupabaseStore(readErrorClient).readByRecordId(RECORD_ID), 'read/query RLS error fails closed');

  const readNetworkClient = new FakeClient();
  readNetworkClient.readThrows = new Error('network');
  await mustReject(() => createFilingPreparationSupabaseStore(readNetworkClient).readByRecordId(RECORD_ID), 'read client/network exception fails closed');

  await mustReject(() => createFilingPreparationSupabaseStore(new FakeClient()).readByRecordId('bad-id'), 'invalid read identity fails closed before query');

  const source = readFileSync(new URL('./filingPreparationSupabaseStore.ts', import.meta.url), 'utf8');
  ok(!source.includes('.upsert(') && !source.includes('.update(') && !source.includes('.delete('), 'adapter exposes no upsert/update/delete/overwrite path');
  ok(!source.includes('createClient(') && !source.includes('process.env') && !/service[_-]?role/i.test(source), 'adapter contains no client creation, environment-key, service-role, or admin path');
  ok(!source.includes('persistFilingPreparationRecord('), 'adapter never invokes canonical persistence automatically');
  ok(!source.includes("from 'next/") && !source.includes('NextResponse') && !source.includes('route.ts'), 'adapter registers no route/action runtime call site');
  equal((source.match(/client\s*\.from\(TABLE\)/g) ?? []).length, 2, 'source contains only the intended insert and read table access seams');

  const successRepresentation = JSON.stringify(await createFilingPreparationSupabaseStore(new FakeClient()).insert(ROW));
  for (const forbidden of ['stageF', 'packetReady', 'signed', 'filed', 'courtAccepted', 'serviceAuthorized', 'legalSufficiency', 'autonomousAuthority', 'tenantQr', 'packetAuthenticityQr']) {
    ok(!successRepresentation.includes(forbidden), `store success represents no ${forbidden} authority`);
  }

  console.log(`${passed} E2.3C authenticated Supabase store assertions passed`);
}

void main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
