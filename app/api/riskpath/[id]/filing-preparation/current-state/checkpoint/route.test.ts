import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  handleSyntheticCheckpointRequest,
  type SyntheticCheckpointRouteDependencies,
} from './route';
import type {
  FilingPreparationCurrentStateCheckpoint,
  FilingPreparationCurrentStateCheckpointResult,
} from '@/lib/flow/filingPreparationCurrentStateCheckpoint';
import type { FilingPreparationCurrentStateSupabaseClient } from '@/lib/flow/filingPreparationCurrentStateSupabaseStore';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222';
const RISKPATH_ID = '33333333-3333-4333-8333-333333333333';
const OTHER_RISKPATH_ID = '44444444-4444-4444-8444-444444444444';
const E2E_RUN_ID = '55555555-5555-4555-8555-555555555555';
const CURRENT_STATE_ID = `filing-preparation-current-state:sha256:${'a'.repeat(64)}`;
const SERVER_NOW = '2026-08-24T06:30:00.000Z';

type SyntheticRow = {
  id?: unknown;
  user_id?: unknown;
  synthetic_source?: unknown;
  e2e_run_id?: unknown;
  soft_deleted_at?: unknown;
};

type RecordedCall = { method: string; input: unknown };

type HarnessOptions = {
  authUserId?: string | null;
  authError?: unknown | null;
  authThrows?: boolean;
  eligibilityRow?: SyntheticRow | null;
  eligibilityError?: unknown | null;
  checkpointResult?: FilingPreparationCurrentStateCheckpointResult;
};

function insertedResult(revision = 1): FilingPreparationCurrentStateCheckpointResult {
  return {
    status: 'INSERTED',
    currentState: {
      schemaVersion: 2,
      filingPreparationCurrentStateId: CURRENT_STATE_ID,
      revision,
    },
  } as unknown as FilingPreparationCurrentStateCheckpointResult;
}

function eligibleRow(overrides: SyntheticRow = {}): SyntheticRow {
  return {
    id: RISKPATH_ID,
    user_id: USER_ID,
    synthetic_source: 'e2e',
    e2e_run_id: E2E_RUN_ID,
    soft_deleted_at: null,
    ...overrides,
  };
}

function harness(options: HarnessOptions = {}) {
  const calls: RecordedCall[] = [];
  const filters: Array<[string, string | number]> = [];
  const selected: string[] = [];
  const tokens: string[] = [];
  let checkpointClient: FilingPreparationCurrentStateSupabaseClient | null = null;

  const query = {
    select(columns: string) {
      selected.push(columns);
      return query;
    },
    eq(column: string, value: string | number) {
      filters.push([column, value]);
      return query;
    },
    order() {
      return query;
    },
    limit() {
      return query;
    },
    async maybeSingle() {
      return {
        data: options.eligibilityRow === undefined ? eligibleRow() : options.eligibilityRow,
        error: options.eligibilityError ?? null,
      };
    },
    async insert() {
      return { data: null, error: null };
    },
  };

  const client = {
    auth: {
      async getUser() {
        if (options.authThrows) throw new Error('auth failure');
        return {
          data: { user: options.authUserId === null ? null : { id: options.authUserId ?? USER_ID } },
          error: options.authError ?? null,
        };
      },
    },
    from() {
      return query;
    },
  } as unknown as FilingPreparationCurrentStateSupabaseClient;

  const checkpoint = {
    async preparationCheckpoint(input: unknown) {
      calls.push({ method: 'preparationCheckpoint', input });
      return options.checkpointResult ?? insertedResult();
    },
    async generatedDraftCheckpoint(input: unknown) {
      calls.push({ method: 'generatedDraftCheckpoint', input });
      return options.checkpointResult ?? insertedResult(2);
    },
    async ownerReviewCheckpoint(input: unknown) {
      calls.push({ method: 'ownerReviewCheckpoint', input });
      return options.checkpointResult ?? insertedResult(3);
    },
  } as unknown as FilingPreparationCurrentStateCheckpoint;

  const dependencies: SyntheticCheckpointRouteDependencies = {
    createUserScopedClient(token: string) {
      tokens.push(token);
      return client;
    },
    createCheckpoint(receivedClient: FilingPreparationCurrentStateSupabaseClient) {
      checkpointClient = receivedClient;
      return checkpoint;
    },
    nowISO() {
      return SERVER_NOW;
    },
  };

  return { dependencies, calls, filters, selected, tokens, client, getCheckpointClient: () => checkpointClient };
}

function request(body: unknown, authorization = 'Bearer synthetic-token'): Request {
  return new Request(`https://ownerpilot.test/api/riskpath/${RISKPATH_ID}/filing-preparation/current-state/checkpoint`, {
    method: 'POST',
    headers: {
      authorization,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

async function responseBody(response: Response): Promise<Record<string, unknown>> {
  return await response.json() as Record<string, unknown>;
}

async function testAuthenticationFailsClosed() {
  const missing = harness();
  const missingRequest = new Request('https://ownerpilot.test/checkpoint', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ownerAction: 'PREPARATION_CHECKPOINT' }),
  });
  const missingResponse = await handleSyntheticCheckpointRequest(missingRequest, RISKPATH_ID, missing.dependencies);
  assert.equal(missingResponse.status, 401);
  assert.deepEqual(await responseBody(missingResponse), { error: 'UNAUTHENTICATED' });
  assert.equal(missing.calls.length, 0);

  for (const malformed of ['Basic abc', 'Bearer', 'Bearer ', 'Bearer two tokens']) {
    const current = harness();
    const response = await handleSyntheticCheckpointRequest(
      request({ ownerAction: 'PREPARATION_CHECKPOINT' }, malformed),
      RISKPATH_ID,
      current.dependencies,
    );
    assert.equal(response.status, 401, malformed);
    assert.equal(current.calls.length, 0, malformed);
  }
}

async function testFailedGetUserFailsClosed() {
  for (const current of [
    harness({ authUserId: null }),
    harness({ authError: { message: 'bad token' } }),
    harness({ authThrows: true }),
    harness({ authUserId: 'not-a-uuid' }),
  ]) {
    const response = await handleSyntheticCheckpointRequest(
      request({ ownerAction: 'PREPARATION_CHECKPOINT' }),
      RISKPATH_ID,
      current.dependencies,
    );
    assert.equal(response.status, 401);
    assert.equal(current.calls.length, 0);
  }
}

async function testCallerCannotOverrideAuthorityBindings() {
  const ownerSpoof = harness();
  const ownerResponse = await handleSyntheticCheckpointRequest(
    request({
      ownerAction: 'PREPARATION_CHECKPOINT',
      expectedCurrent: { status: 'NONE' },
      preparationSnapshot: {},
      authenticatedUserId: OTHER_USER_ID,
    }),
    RISKPATH_ID,
    ownerSpoof.dependencies,
  );
  assert.equal(ownerResponse.status, 400);
  assert.equal(ownerSpoof.calls.length, 0);

  const riskpathSpoof = harness();
  const riskpathResponse = await handleSyntheticCheckpointRequest(
    request({
      ownerAction: 'PREPARATION_CHECKPOINT',
      expectedCurrent: { status: 'NONE' },
      preparationSnapshot: {},
      riskpathRecordId: OTHER_RISKPATH_ID,
    }),
    RISKPATH_ID,
    riskpathSpoof.dependencies,
  );
  assert.equal(riskpathResponse.status, 400);
  assert.equal(riskpathSpoof.calls.length, 0);
}

async function testCallerAssertionsCannotCreateSyntheticEligibility() {
  const current = harness({ eligibilityRow: eligibleRow({ synthetic_source: null, e2e_run_id: null }) });
  const response = await handleSyntheticCheckpointRequest(
    request({
      ownerAction: 'PREPARATION_CHECKPOINT',
      expectedCurrent: { status: 'NONE' },
      preparationSnapshot: {},
      synthetic: true,
      e2e: true,
      current: true,
      trustedEvidence: true,
    }),
    RISKPATH_ID,
    current.dependencies,
  );
  assert.equal(response.status, 404);
  assert.deepEqual(await responseBody(response), { error: 'SYNTHETIC_RISKPATH_NOT_ELIGIBLE' });
  assert.equal(current.calls.length, 0);
}

async function testIneligibleTargetsCollapseToSame404() {
  const cases: Array<[string, SyntheticRow | null]> = [
    ['absent', null],
    ['other owner', eligibleRow({ user_id: OTHER_USER_ID })],
    ['soft deleted', eligibleRow({ soft_deleted_at: '2026-08-24T01:00:00Z' })],
    ['untagged', eligibleRow({ synthetic_source: null, e2e_run_id: null })],
    ['non-e2e', eligibleRow({ synthetic_source: 'customer' })],
    ['empty run', eligibleRow({ e2e_run_id: '' })],
    ['missing run', { id: RISKPATH_ID, user_id: USER_ID, synthetic_source: 'e2e', soft_deleted_at: null }],
  ];

  for (const [name, row] of cases) {
    const current = harness({ eligibilityRow: row });
    const response = await handleSyntheticCheckpointRequest(
      request({ ownerAction: 'PREPARATION_CHECKPOINT', expectedCurrent: { status: 'NONE' }, preparationSnapshot: {} }),
      RISKPATH_ID,
      current.dependencies,
    );
    assert.equal(response.status, 404, name);
    assert.deepEqual(await responseBody(response), { error: 'SYNTHETIC_RISKPATH_NOT_ELIGIBLE' }, name);
    assert.equal(current.calls.length, 0, name);
  }
}

async function testEligibilityInfrastructureFailsClosed() {
  const current = harness({ eligibilityError: { message: 'database unavailable' } });
  const response = await handleSyntheticCheckpointRequest(
    request({ ownerAction: 'PREPARATION_CHECKPOINT', expectedCurrent: { status: 'NONE' }, preparationSnapshot: {} }),
    RISKPATH_ID,
    current.dependencies,
  );
  assert.equal(response.status, 503);
  assert.deepEqual(await responseBody(response), { error: 'CHECKPOINT_INGRESS_UNAVAILABLE' });
  assert.equal(current.calls.length, 0);
}

async function testExactOwnedTaggedE2EReachesOneD0B3Transition() {
  const current = harness();
  const response = await handleSyntheticCheckpointRequest(
    request({ ownerAction: 'PREPARATION_CHECKPOINT', expectedCurrent: { status: 'NONE' }, preparationSnapshot: { value: 'canonical' } }),
    RISKPATH_ID,
    current.dependencies,
  );
  assert.equal(response.status, 200);
  assert.equal(current.calls.length, 1);
  assert.equal(current.calls[0].method, 'preparationCheckpoint');
  const input = current.calls[0].input as Record<string, unknown>;
  assert.equal(input.riskpathRecordId, RISKPATH_ID);
  assert.equal(input.ownerAction, 'PREPARATION_CHECKPOINT');
  assert.deepEqual(Object.keys(input).sort(), ['expectedCurrent', 'ownerAction', 'preparationSnapshot', 'riskpathRecordId'].sort());
  assert.deepEqual(current.filters, [['id', RISKPATH_ID], ['user_id', USER_ID]]);
  assert.equal(current.selected[0], 'id,user_id,synthetic_source,e2e_run_id,soft_deleted_at');
  assert.deepEqual(current.tokens, ['synthetic-token']);
  assert.equal(current.getCheckpointClient(), current.client);
}

async function testUnsupportedOrMultiActionPayloadFailsClosed() {
  const unsupported = harness();
  const unsupportedResponse = await handleSyntheticCheckpointRequest(
    request({ ownerAction: 'DO_EVERYTHING' }),
    RISKPATH_ID,
    unsupported.dependencies,
  );
  assert.equal(unsupportedResponse.status, 400);
  assert.deepEqual(await responseBody(unsupportedResponse), { error: 'UNSUPPORTED_CHECKPOINT_ACTION' });
  assert.equal(unsupported.calls.length, 0);

  const multi = harness();
  const multiResponse = await handleSyntheticCheckpointRequest(
    request({
      ownerAction: 'PREPARATION_CHECKPOINT',
      expectedCurrent: { status: 'NONE' },
      preparationSnapshot: {},
      generatedDraft: {},
      generatedDraftBytes: [1],
      currentnessMaterialBinding: {},
    }),
    RISKPATH_ID,
    multi.dependencies,
  );
  assert.equal(multiResponse.status, 400);
  assert.equal(multi.calls.length, 0);
}

async function testGeneratedDraftBytesAreDefensivelyDecoded() {
  const current = harness();
  const response = await handleSyntheticCheckpointRequest(
    request({
      ownerAction: 'GENERATED_DRAFT_CHECKPOINT',
      expectedCurrent: { status: 'CURRENT', filingPreparationCurrentStateId: CURRENT_STATE_ID, revision: 1 },
      generatedDraft: { evidence: 'draft' },
      generatedDraftBytes: [0, 1, 127, 255],
      currentnessMaterialBinding: { material: 'canonical' },
    }),
    RISKPATH_ID,
    current.dependencies,
  );
  assert.equal(response.status, 200);
  assert.equal(current.calls.length, 1);
  assert.equal(current.calls[0].method, 'generatedDraftCheckpoint');
  const input = current.calls[0].input as Record<string, unknown>;
  assert.ok(input.generatedDraftBytes instanceof Uint8Array);
  assert.deepEqual(Array.from(input.generatedDraftBytes as Uint8Array), [0, 1, 127, 255]);

  const malformed = harness();
  const malformedResponse = await handleSyntheticCheckpointRequest(
    request({
      ownerAction: 'GENERATED_DRAFT_CHECKPOINT',
      expectedCurrent: { status: 'CURRENT', filingPreparationCurrentStateId: CURRENT_STATE_ID, revision: 1 },
      generatedDraft: {},
      generatedDraftBytes: [0, 256],
      currentnessMaterialBinding: {},
    }),
    RISKPATH_ID,
    malformed.dependencies,
  );
  assert.equal(malformedResponse.status, 400);
  assert.equal(malformed.calls.length, 0);
}

async function testStaleExpectedCurrentConflictsWithoutRetry() {
  const current = harness({ checkpointResult: { status: 'CONFLICT', reloadRequired: true, currentState: null } });
  const response = await handleSyntheticCheckpointRequest(
    request({ ownerAction: 'PREPARATION_CHECKPOINT', expectedCurrent: { status: 'NONE' }, preparationSnapshot: {} }),
    RISKPATH_ID,
    current.dependencies,
  );
  assert.equal(response.status, 409);
  assert.deepEqual(await responseBody(response), { status: 'CONFLICT', reloadRequired: true });
  assert.equal(current.calls.length, 1);
}

async function testOwnerReviewRequiresLiteralConfirmationAndServerTime() {
  const rejected = harness();
  const rejectedResponse = await handleSyntheticCheckpointRequest(
    request({
      ownerAction: 'OWNER_REVIEW_CHECKPOINT',
      expectedCurrent: { status: 'CURRENT', filingPreparationCurrentStateId: CURRENT_STATE_ID, revision: 2 },
      renderedAcknowledgment: {},
      ownerConfirmedExactRenderedDocument: false,
      reviewStatement: {},
    }),
    RISKPATH_ID,
    rejected.dependencies,
  );
  assert.equal(rejectedResponse.status, 400);
  assert.equal(rejected.calls.length, 0);

  const callerTime = harness();
  const callerTimeResponse = await handleSyntheticCheckpointRequest(
    request({
      ownerAction: 'OWNER_REVIEW_CHECKPOINT',
      expectedCurrent: { status: 'CURRENT', filingPreparationCurrentStateId: CURRENT_STATE_ID, revision: 2 },
      renderedAcknowledgment: {},
      ownerConfirmedExactRenderedDocument: true,
      reviewedAtISO: '1999-01-01T00:00:00Z',
      reviewStatement: {},
    }),
    RISKPATH_ID,
    callerTime.dependencies,
  );
  assert.equal(callerTimeResponse.status, 400);
  assert.equal(callerTime.calls.length, 0);

  const accepted = harness();
  const acceptedResponse = await handleSyntheticCheckpointRequest(
    request({
      ownerAction: 'OWNER_REVIEW_CHECKPOINT',
      expectedCurrent: { status: 'CURRENT', filingPreparationCurrentStateId: CURRENT_STATE_ID, revision: 2 },
      renderedAcknowledgment: { acknowledgment: 'exact render' },
      ownerConfirmedExactRenderedDocument: true,
      reviewStatement: { statement: 'reviewed' },
    }),
    RISKPATH_ID,
    accepted.dependencies,
  );
  assert.equal(acceptedResponse.status, 200);
  assert.equal(accepted.calls.length, 1);
  const input = accepted.calls[0].input as Record<string, unknown>;
  assert.equal(input.reviewedAtISO, SERVER_NOW);
  assert.equal(input.ownerConfirmedExactRenderedDocument, true);
  assert.equal(input.riskpathRecordId, RISKPATH_ID);
}

function testSourceHasNoForbiddenAuthorityOrMutationPath() {
  const source = readFileSync(new URL('./route.ts', import.meta.url), 'utf8');
  for (const forbidden of [
    'SUPABASE_SERVICE_ROLE_KEY',
    'service_role',
    '.update(',
    '.delete(',
    '.upsert(',
    'setTimeout(',
    'setInterval(',
  ]) {
    assert.equal(source.includes(forbidden), false, `forbidden route capability: ${forbidden}`);
  }
  assert.equal(source.includes("from('riskpath_records').select"), false, 'riskpath eligibility must remain an explicit read chain, not a mutation shortcut');
  assert.equal(source.includes("client.from('riskpath_records')"), true);
  assert.equal(source.includes("synthetic_source !== 'e2e'"), true);
  assert.equal(source.includes('soft_deleted_at !== null'), true);
  assert.equal(source.includes('createFilingPreparationCurrentStateSupabaseStore'), true);
  assert.equal(source.includes('createFilingPreparationCurrentStateCheckpoint'), true);
}

async function main() {
  await testAuthenticationFailsClosed();
  await testFailedGetUserFailsClosed();
  await testCallerCannotOverrideAuthorityBindings();
  await testCallerAssertionsCannotCreateSyntheticEligibility();
  await testIneligibleTargetsCollapseToSame404();
  await testEligibilityInfrastructureFailsClosed();
  await testExactOwnedTaggedE2EReachesOneD0B3Transition();
  await testUnsupportedOrMultiActionPayloadFailsClosed();
  await testGeneratedDraftBytesAreDefensivelyDecoded();
  await testStaleExpectedCurrentConflictsWithoutRetry();
  await testOwnerReviewRequiresLiteralConfirmationAndServerTime();
  testSourceHasNoForbiddenAuthorityOrMutationPath();
  console.log('synthetic checkpoint ingress tests: PASS');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
