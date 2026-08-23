import {
  createFilingPreparationCurrentState,
  validateFilingPreparationCurrentState,
  type FilingPreparationCanonicalSnapshot,
  type FilingPreparationCurrentState,
} from './filingPreparationCurrentState';
import type { GeneratedDraftEvidence } from './officialFormGeneratedDraft';
import type { OwnerReviewedDocumentEvidence } from './officialFormOwnerReview';

const TABLE = 'filing_preparation_current_state_revisions';
const READ_COLUMNS = 'filing_preparation_current_state_id,user_id,riskpath_record_id,revision,state_payload,generated_draft_bytes';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CURRENT_STATE_ID_RE = /^filing-preparation-current-state:sha256:[0-9a-f]{64}$/;
const APPEND_INPUT_KEYS = [
  'riskpathRecordId',
  'preparationSnapshot',
  'generatedDraft',
  'generatedDraftBytes',
  'ownerReviewEvidence',
] as const;
const EXPECTED_CURRENT_KEYS = ['status', 'filingPreparationCurrentStateId', 'revision'] as const;
const DB_ROW_KEYS = [
  'filing_preparation_current_state_id',
  'user_id',
  'riskpath_record_id',
  'revision',
  'state_payload',
  'generated_draft_bytes',
] as const;

interface AuthResponse {
  data: { user: { id: string } | null } | null;
  error: unknown | null;
}

interface QueryResponse {
  data?: unknown;
  error: unknown | null;
}

interface FilingPreparationCurrentStateReadQuery {
  eq(column: string, value: string | number): FilingPreparationCurrentStateReadQuery;
  order(column: string, options: { ascending: boolean }): FilingPreparationCurrentStateReadQuery;
  limit(count: number): FilingPreparationCurrentStateReadQuery;
  maybeSingle(): PromiseLike<QueryResponse>;
}

interface FilingPreparationCurrentStateTableQuery {
  insert(values: Record<string, unknown>): PromiseLike<QueryResponse>;
  select(columns: string): FilingPreparationCurrentStateReadQuery;
}

export interface FilingPreparationCurrentStateSupabaseClient {
  auth: {
    getUser(): PromiseLike<AuthResponse>;
  };
  from(table: string): FilingPreparationCurrentStateTableQuery;
}

export interface AppendFilingPreparationCurrentStateInput {
  riskpathRecordId: string;
  preparationSnapshot: Readonly<FilingPreparationCanonicalSnapshot>;
  generatedDraft: Readonly<GeneratedDraftEvidence> | null;
  generatedDraftBytes: Uint8Array | null;
  ownerReviewEvidence: Readonly<OwnerReviewedDocumentEvidence> | null;
}

export type ExpectedFilingPreparationCurrentState =
  | { status: 'NONE' }
  | {
      status: 'CURRENT';
      filingPreparationCurrentStateId: string;
      revision: number;
    };

export type AppendFilingPreparationCurrentStateResult =
  | {
      status: 'INSERTED';
      currentState: FilingPreparationCurrentState;
    }
  | {
      status: 'CONFLICT';
      reloadRequired: true;
      currentState: null;
    };

export interface FilingPreparationCurrentStateSupabaseStore {
  readLatest(riskpathRecordId: string): Promise<FilingPreparationCurrentState | null>;
  appendNext(input: AppendFilingPreparationCurrentStateInput): Promise<AppendFilingPreparationCurrentStateResult>;
  appendNextIfCurrent(
    expectedCurrent: Readonly<ExpectedFilingPreparationCurrentState>,
    input: AppendFilingPreparationCurrentStateInput,
  ): Promise<AppendFilingPreparationCurrentStateResult>;
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

function requireRiskPathId(value: unknown): string {
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    throw new Error('RiskPath identity must be an exact UUID.');
  }
  return value;
}

async function requireAuthenticatedUserId(client: FilingPreparationCurrentStateSupabaseClient): Promise<string> {
  const raw = await client.auth.getUser();
  const response = requireQueryResponse(raw, 'authentication');
  if (response.error !== null) throw new Error('Supabase authentication failed closed.');
  if (!hasOwn(response, 'data') || !isPlainObject(response.data) || !hasOwn(response.data, 'user')) {
    throw new Error('Supabase authentication returned a malformed response.');
  }
  if (response.data.user === null) throw new Error('Authenticated owner session is required.');
  if (!isPlainObject(response.data.user)
    || typeof response.data.user.id !== 'string'
    || !UUID_RE.test(response.data.user.id)) {
    throw new Error('Supabase authentication returned an invalid user identity.');
  }
  return response.data.user.id;
}

function encodeBytea(value: Uint8Array | null): string | null {
  if (value === null) return null;
  return `\\x${Buffer.from(value).toString('hex')}`;
}

function decodeBytea(value: unknown): Uint8Array | null {
  if (value === null) return null;
  if (typeof value !== 'string' || !/^\\x(?:[0-9a-f]{2})*$/i.test(value)) {
    throw new Error('Supabase read returned malformed generated-draft byte encoding.');
  }
  return new Uint8Array(Buffer.from(value.slice(2), 'hex'));
}

function validateDurableRow(
  value: unknown,
  expectedUserId: string,
  expectedRiskPathId: string,
): FilingPreparationCurrentState {
  if (!isPlainObject(value) || !hasExactKeys(value, DB_ROW_KEYS)) {
    throw new Error('Supabase read returned a malformed current-state durable row.');
  }
  const stateId = value.filing_preparation_current_state_id;
  const userId = value.user_id;
  const riskpathRecordId = value.riskpath_record_id;
  const revision = value.revision;
  const statePayload = value.state_payload;
  if (typeof stateId !== 'string' || !CURRENT_STATE_ID_RE.test(stateId)) {
    throw new Error('Supabase read returned an invalid current-state identity.');
  }
  if (typeof userId !== 'string' || !UUID_RE.test(userId) || userId !== expectedUserId) {
    throw new Error('Supabase read returned a mismatched authenticated owner identity.');
  }
  if (typeof riskpathRecordId !== 'string'
    || !UUID_RE.test(riskpathRecordId)
    || riskpathRecordId !== expectedRiskPathId) {
    throw new Error('Supabase read returned a mismatched RiskPath identity.');
  }
  if (!Number.isSafeInteger(revision) || Number(revision) < 1) {
    throw new Error('Supabase read returned an invalid current-state revision.');
  }
  if (!isPlainObject(statePayload) || hasOwn(statePayload, 'generatedDraftBytes')) {
    throw new Error('Supabase read returned a malformed current-state payload.');
  }

  const generatedDraftBytes = decodeBytea(value.generated_draft_bytes);
  const reconstructed = {
    ...statePayload,
    generatedDraftBytes,
  };
  const validated = validateFilingPreparationCurrentState(reconstructed);
  if (validated.status !== 'VALID') {
    throw new Error(`Supabase read returned a noncanonical current-state payload: ${validated.blockReason}.`);
  }
  const currentState = validated.currentState;
  if (currentState.filingPreparationCurrentStateId !== stateId
    || currentState.authenticatedUserId !== userId
    || currentState.riskpathRecordId !== riskpathRecordId
    || currentState.revision !== revision) {
    throw new Error('Supabase durable row does not exactly bind its canonical current-state payload.');
  }
  return currentState;
}

async function readOne(
  query: FilingPreparationCurrentStateReadQuery,
  operation: string,
  expectedUserId: string,
  expectedRiskPathId: string,
): Promise<FilingPreparationCurrentState | null> {
  const raw = await query.maybeSingle();
  const response = requireQueryResponse(raw, operation);
  if (response.error !== null) throw new Error(`Supabase current-state ${operation} failed closed.`);
  if (!hasOwn(response, 'data')) throw new Error(`Supabase current-state ${operation} returned a malformed response.`);
  if (response.data === null) return null;
  return validateDurableRow(response.data, expectedUserId, expectedRiskPathId);
}

async function readLatestForUser(
  client: FilingPreparationCurrentStateSupabaseClient,
  userId: string,
  riskpathRecordId: string,
): Promise<FilingPreparationCurrentState | null> {
  const query = client
    .from(TABLE)
    .select(READ_COLUMNS)
    .eq('user_id', userId)
    .eq('riskpath_record_id', riskpathRecordId)
    .order('revision', { ascending: false })
    .limit(1);
  return readOne(query, 'latest read', userId, riskpathRecordId);
}

async function readExactForUser(
  client: FilingPreparationCurrentStateSupabaseClient,
  userId: string,
  riskpathRecordId: string,
  revision: number,
  currentStateId: string,
): Promise<FilingPreparationCurrentState> {
  const query = client
    .from(TABLE)
    .select(READ_COLUMNS)
    .eq('user_id', userId)
    .eq('riskpath_record_id', riskpathRecordId)
    .eq('revision', revision)
    .eq('filing_preparation_current_state_id', currentStateId)
    .limit(1);
  const currentState = await readOne(query, 'exact read-back', userId, riskpathRecordId);
  if (currentState === null) throw new Error('Supabase exact current-state read-back returned no row.');
  if (currentState.revision !== revision || currentState.filingPreparationCurrentStateId !== currentStateId) {
    throw new Error('Supabase exact current-state read-back identity mismatch.');
  }
  return currentState;
}

function nextRevision(latest: FilingPreparationCurrentState | null): number {
  if (latest === null) return 1;
  if (latest.revision === Number.MAX_SAFE_INTEGER) {
    throw new Error('Current-state revision cannot advance beyond the maximum safe integer.');
  }
  return latest.revision + 1;
}

function exactAppendInput(value: unknown): value is AppendFilingPreparationCurrentStateInput {
  return isPlainObject(value) && hasExactKeys(value, APPEND_INPUT_KEYS);
}

function exactExpectedCurrent(value: unknown): value is ExpectedFilingPreparationCurrentState {
  if (!isPlainObject(value)) return false;
  if (value.status === 'NONE') return hasExactKeys(value, ['status']);
  if (value.status !== 'CURRENT' || !hasExactKeys(value, EXPECTED_CURRENT_KEYS)) return false;
  return typeof value.filingPreparationCurrentStateId === 'string'
    && CURRENT_STATE_ID_RE.test(value.filingPreparationCurrentStateId)
    && Number.isSafeInteger(value.revision)
    && Number(value.revision) > 0;
}

function expectedCurrentMatches(
  expectedCurrent: ExpectedFilingPreparationCurrentState,
  latest: FilingPreparationCurrentState | null,
): boolean {
  if (expectedCurrent.status === 'NONE') return latest === null;
  return latest !== null
    && latest.filingPreparationCurrentStateId === expectedCurrent.filingPreparationCurrentStateId
    && latest.revision === expectedCurrent.revision;
}

async function appendFromLatest(
  client: FilingPreparationCurrentStateSupabaseClient,
  userId: string,
  latest: FilingPreparationCurrentState | null,
  input: AppendFilingPreparationCurrentStateInput,
): Promise<AppendFilingPreparationCurrentStateResult> {
  const revision = nextRevision(latest);
  const built = createFilingPreparationCurrentState({
    authenticatedUserId: userId,
    riskpathRecordId: input.riskpathRecordId,
    revision,
    preparationSnapshot: input.preparationSnapshot,
    generatedDraftBinding: input.generatedDraft === null
      ? null
      : { revision, generatedDraft: input.generatedDraft },
    generatedDraftBytes: input.generatedDraftBytes,
    ownerReviewBinding: input.ownerReviewEvidence === null
      ? null
      : { revision, ownerReviewEvidence: input.ownerReviewEvidence },
  });
  if (built.status !== 'CURRENT_STATE_REVISION') {
    throw new Error(`Canonical current-state creation blocked: ${built.blockReason}.`);
  }
  const currentState = built.currentState;
  const { generatedDraftBytes, ...statePayload } = currentState;
  const databaseRow = {
    filing_preparation_current_state_id: currentState.filingPreparationCurrentStateId,
    user_id: currentState.authenticatedUserId,
    riskpath_record_id: currentState.riskpathRecordId,
    revision: currentState.revision,
    state_payload: statePayload,
    generated_draft_bytes: encodeBytea(generatedDraftBytes),
  };

  const raw = await client.from(TABLE).insert(databaseRow);
  const response = requireQueryResponse(raw, 'insert');
  if (response.error !== null) {
    if (postgresErrorCode(response.error) === '23505') {
      return { status: 'CONFLICT', reloadRequired: true, currentState: null };
    }
    throw new Error('Supabase current-state append failed closed.');
  }

  const readBack = await readExactForUser(
    client,
    userId,
    input.riskpathRecordId,
    revision,
    currentState.filingPreparationCurrentStateId,
  );
  return { status: 'INSERTED', currentState: readBack };
}

export function createFilingPreparationCurrentStateSupabaseStore(
  client: FilingPreparationCurrentStateSupabaseClient,
): FilingPreparationCurrentStateSupabaseStore {
  return {
    async readLatest(riskpathRecordId: string): Promise<FilingPreparationCurrentState | null> {
      const exactRiskPathId = requireRiskPathId(riskpathRecordId);
      const userId = await requireAuthenticatedUserId(client);
      return readLatestForUser(client, userId, exactRiskPathId);
    },

    async appendNext(input: AppendFilingPreparationCurrentStateInput): Promise<AppendFilingPreparationCurrentStateResult> {
      if (!exactAppendInput(input)) {
        throw new Error('Current-state append input has an invalid shape or contains caller-authored authority fields.');
      }
      const riskpathRecordId = requireRiskPathId(input.riskpathRecordId);
      const userId = await requireAuthenticatedUserId(client);
      const latest = await readLatestForUser(client, userId, riskpathRecordId);
      return appendFromLatest(client, userId, latest, input);
    },

    async appendNextIfCurrent(
      expectedCurrent: Readonly<ExpectedFilingPreparationCurrentState>,
      input: AppendFilingPreparationCurrentStateInput,
    ): Promise<AppendFilingPreparationCurrentStateResult> {
      if (!exactExpectedCurrent(expectedCurrent)) {
        throw new Error('Expected current-state identity must be explicit NONE or an exact current-state ID and revision.');
      }
      if (!exactAppendInput(input)) {
        throw new Error('Current-state append input has an invalid shape or contains caller-authored authority fields.');
      }
      const riskpathRecordId = requireRiskPathId(input.riskpathRecordId);
      const userId = await requireAuthenticatedUserId(client);
      const latest = await readLatestForUser(client, userId, riskpathRecordId);
      if (!expectedCurrentMatches(expectedCurrent, latest)) {
        return { status: 'CONFLICT', reloadRequired: true, currentState: null };
      }
      return appendFromLatest(client, userId, latest, input);
    },
  };
}
