import {
  evaluateFilingPreparationRecordAdmission,
  validateFilingPreparationRecord,
  type FilingPreparationRecord,
} from './filingPreparationRecord';
import type {
  GeneratedDraftCurrentness,
  GeneratedDraftEvidence,
} from './officialFormGeneratedDraft';

export interface FilingPreparationPersistenceRow {
  filingPreparationRecordId: string;
  userId: string;
  riskpathRecordId: string;
  recordPayload: unknown;
}

export type FilingPreparationInsertResult =
  | { status: 'INSERTED' }
  | { status: 'CONFLICT' };

export interface FilingPreparationPersistenceStore {
  getAuthenticatedUserId(): Promise<string | null>;
  insert(row: Readonly<FilingPreparationPersistenceRow>): Promise<FilingPreparationInsertResult>;
  readByRecordId(filingPreparationRecordId: string): Promise<unknown>;
}

export type FilingPreparationPersistenceBlockReason =
  | 'INVALID_USER_ID'
  | 'INVALID_RISKPATH_RECORD_ID'
  | 'AUTHENTICATED_USER_MISMATCH'
  | 'E2_3_ADMISSION_BLOCKED'
  | 'STORE_ERROR'
  | 'ROUND_TRIP_ROW_MISSING'
  | 'ROUND_TRIP_ROW_INVALID'
  | 'ROUND_TRIP_IDENTITY_MISMATCH'
  | 'ROUND_TRIP_PAYLOAD_MISMATCH'
  | 'DUPLICATE_RECORD_CONFLICT';

export type FilingPreparationPersistenceResult =
  | {
      status: 'BLOCKED';
      blockReason: FilingPreparationPersistenceBlockReason;
      detail: string;
      durability: 'NOT_VERIFIED';
      stageF: 'HELD';
    }
  | {
      status: 'PERSISTED';
      disposition: 'INSERTED' | 'IDEMPOTENT_DUPLICATE';
      filingPreparationRecordId: string;
      userId: string;
      riskpathRecordId: string;
      durability: 'ROUND_TRIP_VERIFIED';
      stageF: 'HELD';
    };

export interface PersistFilingPreparationRecordInput {
  record: unknown;
  currentGeneratedDraft: unknown;
  generatedDraftCurrentness: unknown;
  userId: string;
  riskpathRecordId: string;
  store: FilingPreparationPersistenceStore;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ROW_KEYS = [
  'filingPreparationRecordId',
  'userId',
  'riskpathRecordId',
  'recordPayload',
] as const;

function blocked(
  blockReason: FilingPreparationPersistenceBlockReason,
  detail: string,
): FilingPreparationPersistenceResult {
  return {
    status: 'BLOCKED',
    blockReason,
    detail,
    durability: 'NOT_VERIFIED',
    stageF: 'HELD',
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function canonicalJsonValue(value: unknown): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Non-finite number is not canonical JSON.');
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalJsonValue);
  if (isPlainObject(value)) {
    const output: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) output[key] = canonicalJsonValue(value[key]);
    return output;
  }
  throw new Error('Unsupported canonical JSON value.');
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalJsonValue(value));
}

function validateRoundTripRow(
  value: unknown,
  expectedRecord: FilingPreparationRecord,
  expectedUserId: string,
  expectedRiskpathRecordId: string,
): { status: 'VALID' } | { status: 'BLOCKED'; blockReason: FilingPreparationPersistenceBlockReason; detail: string } {
  if (!isPlainObject(value) || !hasExactKeys(value, ROW_KEYS)) {
    return {
      status: 'BLOCKED',
      blockReason: 'ROUND_TRIP_ROW_INVALID',
      detail: 'Stored filing-preparation row has an invalid serialized shape.',
    };
  }
  if (value.filingPreparationRecordId !== expectedRecord.filingPreparationRecordId
    || value.userId !== expectedUserId
    || value.riskpathRecordId !== expectedRiskpathRecordId) {
    return {
      status: 'BLOCKED',
      blockReason: 'ROUND_TRIP_IDENTITY_MISMATCH',
      detail: 'Stored filing-preparation row does not bind the exact owner, RiskPath, and record identity.',
    };
  }

  const storedRecord = validateFilingPreparationRecord(value.recordPayload);
  if (storedRecord.status === 'BLOCKED') {
    return {
      status: 'BLOCKED',
      blockReason: 'ROUND_TRIP_ROW_INVALID',
      detail: `Stored filing-preparation payload fails canonical validation: ${storedRecord.blockReason}.`,
    };
  }
  if (storedRecord.record.filingPreparationRecordId !== expectedRecord.filingPreparationRecordId) {
    return {
      status: 'BLOCKED',
      blockReason: 'ROUND_TRIP_IDENTITY_MISMATCH',
      detail: 'Stored payload record identity does not match the submitted canonical record.',
    };
  }

  try {
    if (canonicalJson(storedRecord.record) !== canonicalJson(expectedRecord)) {
      return {
        status: 'BLOCKED',
        blockReason: 'ROUND_TRIP_PAYLOAD_MISMATCH',
        detail: 'Stored payload is not semantically identical to the submitted canonical record.',
      };
    }
  } catch {
    return {
      status: 'BLOCKED',
      blockReason: 'ROUND_TRIP_ROW_INVALID',
      detail: 'Stored filing-preparation payload cannot be canonically compared.',
    };
  }
  return { status: 'VALID' };
}

export async function persistFilingPreparationRecord(
  input: PersistFilingPreparationRecordInput,
): Promise<FilingPreparationPersistenceResult> {
  if (!UUID_RE.test(input.userId)) {
    return blocked('INVALID_USER_ID', 'Authenticated user identity must be an exact UUID.');
  }
  if (!UUID_RE.test(input.riskpathRecordId)) {
    return blocked('INVALID_RISKPATH_RECORD_ID', 'RiskPath record identity must be an exact UUID.');
  }

  let authenticatedUserId: string | null;
  try {
    authenticatedUserId = await input.store.getAuthenticatedUserId();
  } catch {
    return blocked('STORE_ERROR', 'User-scoped persistence store could not establish authenticated identity.');
  }
  if (authenticatedUserId !== input.userId) {
    return blocked('AUTHENTICATED_USER_MISMATCH', 'Injected user-scoped persistence identity does not match the bound owner.');
  }

  const admission = evaluateFilingPreparationRecordAdmission({
    record: input.record,
    currentGeneratedDraft: input.currentGeneratedDraft,
    generatedDraftCurrentness: input.generatedDraftCurrentness,
  });
  if (admission.status === 'BLOCKED') {
    return blocked('E2_3_ADMISSION_BLOCKED', `Canonical E2.3 admission blocked persistence: ${admission.blockReason}.`);
  }

  const record = admission.record;
  const row: FilingPreparationPersistenceRow = {
    filingPreparationRecordId: record.filingPreparationRecordId,
    userId: input.userId,
    riskpathRecordId: input.riskpathRecordId,
    recordPayload: structuredClone(record),
  };

  let insertResult: FilingPreparationInsertResult;
  try {
    insertResult = await input.store.insert(row);
  } catch {
    return blocked('STORE_ERROR', 'User-scoped persistence insert failed closed.');
  }
  if (insertResult.status !== 'INSERTED' && insertResult.status !== 'CONFLICT') {
    return blocked('STORE_ERROR', 'User-scoped persistence store returned an invalid insert disposition.');
  }

  let readBack: unknown;
  try {
    readBack = await input.store.readByRecordId(record.filingPreparationRecordId);
  } catch {
    return blocked('STORE_ERROR', 'User-scoped persistence read-back failed closed.');
  }
  if (readBack === null || readBack === undefined) {
    return blocked(
      insertResult.status === 'CONFLICT' ? 'DUPLICATE_RECORD_CONFLICT' : 'ROUND_TRIP_ROW_MISSING',
      'Persisted filing-preparation record was not available for exact user-scoped round-trip validation.',
    );
  }

  const roundTrip = validateRoundTripRow(
    readBack,
    record,
    input.userId,
    input.riskpathRecordId,
  );
  if (roundTrip.status === 'BLOCKED') {
    if (insertResult.status === 'CONFLICT') {
      return blocked('DUPLICATE_RECORD_CONFLICT', `Duplicate record identity conflicts with stored evidence: ${roundTrip.blockReason}.`);
    }
    return blocked(roundTrip.blockReason, roundTrip.detail);
  }

  return {
    status: 'PERSISTED',
    disposition: insertResult.status === 'INSERTED' ? 'INSERTED' : 'IDEMPOTENT_DUPLICATE',
    filingPreparationRecordId: record.filingPreparationRecordId,
    userId: input.userId,
    riskpathRecordId: input.riskpathRecordId,
    durability: 'ROUND_TRIP_VERIFIED',
    stageF: 'HELD',
  };
}
