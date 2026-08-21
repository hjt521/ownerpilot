import type {
  FilingPreparationPersistenceRow,
  FilingPreparationPersistenceStore,
} from './filingPreparationPersistence';

const TABLE = 'filing_preparation_records';
const READ_COLUMNS = 'filing_preparation_record_id,user_id,riskpath_record_id,record_payload';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RECORD_ID_RE = /^filing-preparation-record:sha256:[0-9a-f]{64}$/;
const DB_ROW_KEYS = [
  'filing_preparation_record_id',
  'user_id',
  'riskpath_record_id',
  'record_payload',
] as const;

interface AuthResponse {
  data: { user: { id: string } | null } | null;
  error: unknown | null;
}

interface QueryResponse {
  data?: unknown;
  error: unknown | null;
}

interface FilingPreparationReadQuery {
  maybeSingle(): PromiseLike<QueryResponse>;
}

interface FilingPreparationSelectQuery {
  eq(column: string, value: string): FilingPreparationReadQuery;
}

interface FilingPreparationTableQuery {
  insert(values: Record<string, unknown>): PromiseLike<QueryResponse>;
  select(columns: string): FilingPreparationSelectQuery;
}

export interface FilingPreparationSupabaseClient {
  auth: {
    getUser(): PromiseLike<AuthResponse>;
  };
  from(table: string): FilingPreparationTableQuery;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function requireQueryResponse(value: unknown, operation: string): Record<string, unknown> {
  if (!isPlainObject(value) || !hasOwn(value, 'error')) {
    throw new Error(`Supabase ${operation} returned a malformed response.`);
  }
  return value;
}

function postgresErrorCode(error: unknown): string | null {
  if (!isPlainObject(error) || typeof error.code !== 'string') return null;
  return error.code;
}

function requireAuthenticatedUserId(value: unknown): string {
  if (!isPlainObject(value) || typeof value.id !== 'string' || !UUID_RE.test(value.id)) {
    throw new Error('Supabase authentication returned an invalid user identity.');
  }
  return value.id;
}

function mapDatabaseRow(value: unknown): FilingPreparationPersistenceRow {
  if (!isPlainObject(value) || !hasExactKeys(value, DB_ROW_KEYS)) {
    throw new Error('Supabase read returned a malformed filing-preparation row.');
  }
  const filingPreparationRecordId = value.filing_preparation_record_id;
  const userId = value.user_id;
  const riskpathRecordId = value.riskpath_record_id;
  const recordPayload = value.record_payload;
  if (typeof filingPreparationRecordId !== 'string' || !RECORD_ID_RE.test(filingPreparationRecordId)) {
    throw new Error('Supabase read returned an invalid filing-preparation record identity.');
  }
  if (typeof userId !== 'string' || !UUID_RE.test(userId)) {
    throw new Error('Supabase read returned an invalid owner identity.');
  }
  if (typeof riskpathRecordId !== 'string' || !UUID_RE.test(riskpathRecordId)) {
    throw new Error('Supabase read returned an invalid RiskPath identity.');
  }
  if (!isPlainObject(recordPayload)) {
    throw new Error('Supabase read returned an invalid canonical record payload.');
  }
  return {
    filingPreparationRecordId,
    userId,
    riskpathRecordId,
    recordPayload,
  };
}

export function createFilingPreparationSupabaseStore(
  client: FilingPreparationSupabaseClient,
): FilingPreparationPersistenceStore {
  return {
    async getAuthenticatedUserId(): Promise<string | null> {
      const raw = await client.auth.getUser();
      const response = requireQueryResponse(raw, 'authentication');
      if (response.error !== null) throw new Error('Supabase authentication failed closed.');
      if (!hasOwn(response, 'data') || !isPlainObject(response.data) || !hasOwn(response.data, 'user')) {
        throw new Error('Supabase authentication returned a malformed response.');
      }
      if (response.data.user === null) return null;
      return requireAuthenticatedUserId(response.data.user);
    },

    async insert(row: Readonly<FilingPreparationPersistenceRow>) {
      const databaseRow = {
        filing_preparation_record_id: row.filingPreparationRecordId,
        user_id: row.userId,
        riskpath_record_id: row.riskpathRecordId,
        record_payload: row.recordPayload,
      };
      const raw = await client.from(TABLE).insert(databaseRow);
      const response = requireQueryResponse(raw, 'insert');
      if (response.error === null) return { status: 'INSERTED' } as const;
      if (postgresErrorCode(response.error) === '23505') return { status: 'CONFLICT' } as const;
      throw new Error('Supabase filing-preparation insert failed closed.');
    },

    async readByRecordId(filingPreparationRecordId: string): Promise<unknown> {
      if (!RECORD_ID_RE.test(filingPreparationRecordId)) {
        throw new Error('Filing-preparation read identity is invalid.');
      }
      const raw = await client
        .from(TABLE)
        .select(READ_COLUMNS)
        .eq('filing_preparation_record_id', filingPreparationRecordId)
        .maybeSingle();
      const response = requireQueryResponse(raw, 'read');
      if (response.error !== null) throw new Error('Supabase filing-preparation read failed closed.');
      if (!hasOwn(response, 'data')) throw new Error('Supabase read returned a malformed response.');
      if (response.data === null) return null;
      return mapDatabaseRow(response.data);
    },
  };
}
