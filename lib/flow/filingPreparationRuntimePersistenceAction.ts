import {
  createFilingPreparationSupabaseStore,
  type FilingPreparationSupabaseClient,
} from './filingPreparationSupabaseStore';
import {
  persistFilingPreparationRecord,
  type FilingPreparationPersistenceResult,
  type FilingPreparationPersistenceStore,
} from './filingPreparationPersistence';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REQUEST_KEYS = ['record', 'currentGeneratedDraft', 'generatedDraftCurrentness'] as const;
const RISKPATH_ROW_KEYS = ['id', 'user_id'] as const;

export interface FilingPreparationRuntimeSupabaseClient extends FilingPreparationSupabaseClient {
  from(table: string): any;
}

export type FilingPreparationRuntimeBlockReason =
  | 'INVALID_REQUEST_BODY'
  | 'INVALID_RISKPATH_RECORD_ID'
  | 'UNAUTHENTICATED'
  | 'AUTHENTICATION_FAILED'
  | 'RISKPATH_UNAVAILABLE'
  | 'RISKPATH_LOOKUP_FAILED';

export type FilingPreparationRuntimePersistenceResult =
  | FilingPreparationPersistenceResult
  | {
      status: 'BLOCKED';
      blockReason: FilingPreparationRuntimeBlockReason;
      detail: string;
      durability: 'NOT_VERIFIED';
      stageF: 'HELD';
    };

export interface InvokeFilingPreparationRuntimePersistenceInput {
  client: FilingPreparationRuntimeSupabaseClient;
  riskpathRecordId: unknown;
  requestBody: unknown;
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

function runtimeBlocked(
  blockReason: FilingPreparationRuntimeBlockReason,
  detail: string,
): FilingPreparationRuntimePersistenceResult {
  return {
    status: 'BLOCKED',
    blockReason,
    detail,
    durability: 'NOT_VERIFIED',
    stageF: 'HELD',
  };
}

export async function invokeFilingPreparationRuntimePersistence(
  input: InvokeFilingPreparationRuntimePersistenceInput,
): Promise<FilingPreparationRuntimePersistenceResult> {
  if (typeof input.riskpathRecordId !== 'string' || !UUID_RE.test(input.riskpathRecordId)) {
    return runtimeBlocked('INVALID_RISKPATH_RECORD_ID', 'RiskPath record identity must be an exact UUID.');
  }
  if (!isPlainObject(input.requestBody) || !hasExactKeys(input.requestBody, REQUEST_KEYS)) {
    return runtimeBlocked(
      'INVALID_REQUEST_BODY',
      'Persistence action accepts only the canonical record, current generated draft, and currentness evidence.',
    );
  }

  const store = createFilingPreparationSupabaseStore(input.client);
  let authenticatedUserId: string | null;
  try {
    authenticatedUserId = await store.getAuthenticatedUserId();
  } catch {
    return runtimeBlocked('AUTHENTICATION_FAILED', 'Authenticated user identity could not be established.');
  }
  if (authenticatedUserId === null) {
    return runtimeBlocked('UNAUTHENTICATED', 'Authenticated owner session is required.');
  }

  let ownershipResponse: unknown;
  try {
    ownershipResponse = await input.client
      .from('riskpath_records')
      .select('id,user_id')
      .eq('id', input.riskpathRecordId)
      .eq('user_id', authenticatedUserId)
      .maybeSingle();
  } catch {
    return runtimeBlocked('RISKPATH_LOOKUP_FAILED', 'Owned RiskPath lookup failed closed.');
  }

  if (!isPlainObject(ownershipResponse)
    || !hasOwn(ownershipResponse, 'data')
    || !hasOwn(ownershipResponse, 'error')) {
    return runtimeBlocked('RISKPATH_LOOKUP_FAILED', 'Owned RiskPath lookup returned a malformed response.');
  }
  if (ownershipResponse.error !== null) {
    return runtimeBlocked('RISKPATH_LOOKUP_FAILED', 'Owned RiskPath lookup failed closed.');
  }
  if (ownershipResponse.data === null) {
    return runtimeBlocked('RISKPATH_UNAVAILABLE', 'RiskPath is unavailable to the authenticated owner.');
  }
  if (!isPlainObject(ownershipResponse.data)
    || !hasExactKeys(ownershipResponse.data, RISKPATH_ROW_KEYS)
    || ownershipResponse.data.id !== input.riskpathRecordId
    || ownershipResponse.data.user_id !== authenticatedUserId) {
    return runtimeBlocked('RISKPATH_LOOKUP_FAILED', 'Owned RiskPath lookup did not return the exact authenticated binding.');
  }

  const authenticatedStore: FilingPreparationPersistenceStore = {
    getAuthenticatedUserId: async () => authenticatedUserId,
    insert: row => store.insert(row),
    readByRecordId: filingPreparationRecordId => store.readByRecordId(filingPreparationRecordId),
  };

  return persistFilingPreparationRecord({
    record: input.requestBody.record,
    currentGeneratedDraft: input.requestBody.currentGeneratedDraft,
    generatedDraftCurrentness: input.requestBody.generatedDraftCurrentness,
    userId: authenticatedUserId,
    riskpathRecordId: input.riskpathRecordId,
    store: authenticatedStore,
  });
}
