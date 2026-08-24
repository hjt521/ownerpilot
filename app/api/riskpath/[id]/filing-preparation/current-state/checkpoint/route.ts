import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import {
  createFilingPreparationCurrentStateCheckpoint,
  type FilingPreparationCurrentStateCheckpoint,
  type GeneratedDraftCheckpointInput,
  type OwnerReviewCheckpointInput,
  type PreparationCheckpointInput,
} from '@/lib/flow/filingPreparationCurrentStateCheckpoint';
import {
  createFilingPreparationCurrentStateSupabaseStore,
  type FilingPreparationCurrentStateSupabaseClient,
} from '@/lib/flow/filingPreparationCurrentStateSupabaseStore';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RISKPATH_COLUMNS = 'id,user_id,synthetic_source,e2e_run_id,soft_deleted_at';
const PREPARATION_BODY_KEYS = ['ownerAction', 'expectedCurrent', 'preparationSnapshot'] as const;
const GENERATED_BODY_KEYS = [
  'ownerAction',
  'expectedCurrent',
  'generatedDraft',
  'generatedDraftBytes',
  'currentnessMaterialBinding',
] as const;
const OWNER_REVIEW_BODY_KEYS = [
  'ownerAction',
  'expectedCurrent',
  'renderedAcknowledgment',
  'ownerConfirmedExactRenderedDocument',
  'reviewStatement',
] as const;

type RouteContext = { params: Promise<{ id: string }> };
type CheckpointAction =
  | 'PREPARATION_CHECKPOINT'
  | 'GENERATED_DRAFT_CHECKPOINT'
  | 'OWNER_REVIEW_CHECKPOINT';

export interface SyntheticCheckpointRouteDependencies {
  createUserScopedClient(accessToken: string): FilingPreparationCurrentStateSupabaseClient;
  createCheckpoint(client: FilingPreparationCurrentStateSupabaseClient): FilingPreparationCurrentStateCheckpoint;
  nowISO(): string;
}

const defaultDependencies: SyntheticCheckpointRouteDependencies = {
  createUserScopedClient(accessToken: string): FilingPreparationCurrentStateSupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) throw new Error('User-scoped Supabase configuration is unavailable.');

    const supabase = createSupabaseClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    return {
      auth: { getUser: () => supabase.auth.getUser(accessToken) },
      from: (table: string) => supabase.from(table),
    } as unknown as FilingPreparationCurrentStateSupabaseClient;
  },
  createCheckpoint(client: FilingPreparationCurrentStateSupabaseClient): FilingPreparationCurrentStateCheckpoint {
    return createFilingPreparationCurrentStateCheckpoint(
      createFilingPreparationCurrentStateSupabaseStore(client),
    );
  },
  nowISO(): string {
    return new Date().toISOString();
  },
};

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

function json(status: number, body: Record<string, unknown>): Response {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function bearerToken(request: Request): string | null {
  const authorization = request.headers.get('authorization');
  if (authorization === null) return null;
  const match = /^Bearer ([^\s]+)$/i.exec(authorization);
  return match === null || match[1].length === 0 ? null : match[1];
}

async function authenticatedUserId(
  client: FilingPreparationCurrentStateSupabaseClient,
): Promise<string | null> {
  try {
    const response = await client.auth.getUser();
    if (response.error !== null || response.data === null || response.data.user === null) return null;
    return UUID_RE.test(response.data.user.id) ? response.data.user.id : null;
  } catch {
    return null;
  }
}

type SyntheticEligibility = 'ELIGIBLE' | 'INELIGIBLE' | 'UNAVAILABLE';

async function syntheticEligibility(
  client: FilingPreparationCurrentStateSupabaseClient,
  userId: string,
  riskpathRecordId: string,
): Promise<SyntheticEligibility> {
  try {
    const response = await client.from('riskpath_records')
      .select(RISKPATH_COLUMNS)
      .eq('id', riskpathRecordId)
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (response.error !== null) return 'UNAVAILABLE';
    if (!isPlainObject(response.data)) return 'INELIGIBLE';

    const row = response.data;
    if (row.id !== riskpathRecordId
      || row.user_id !== userId
      || row.soft_deleted_at !== null
      || row.synthetic_source !== 'e2e'
      || typeof row.e2e_run_id !== 'string'
      || row.e2e_run_id.trim().length === 0) {
      return 'INELIGIBLE';
    }
    return 'ELIGIBLE';
  } catch {
    return 'UNAVAILABLE';
  }
}

function generatedDraftBytes(value: unknown): Uint8Array | null {
  if (!Array.isArray(value)) return null;
  if (!value.every((entry) => Number.isInteger(entry) && entry >= 0 && entry <= 255)) return null;
  return Uint8Array.from(value as number[]);
}

function successfulResult(
  result: Awaited<ReturnType<FilingPreparationCurrentStateCheckpoint['preparationCheckpoint']>>,
): Response {
  if (result.status === 'CONFLICT') {
    return json(409, { status: 'CONFLICT', reloadRequired: true });
  }
  return json(200, {
    status: result.status,
    currentState: {
      schemaVersion: result.currentState.schemaVersion,
      filingPreparationCurrentStateId: result.currentState.filingPreparationCurrentStateId,
      revision: result.currentState.revision,
    },
  });
}

export async function handleSyntheticCheckpointRequest(
  request: Request,
  riskpathRecordId: string,
  dependencies: SyntheticCheckpointRouteDependencies = defaultDependencies,
): Promise<Response> {
  if (!UUID_RE.test(riskpathRecordId)) {
    return json(404, { error: 'SYNTHETIC_RISKPATH_NOT_ELIGIBLE' });
  }

  const accessToken = bearerToken(request);
  if (accessToken === null) return json(401, { error: 'UNAUTHENTICATED' });

  let client: FilingPreparationCurrentStateSupabaseClient;
  try {
    client = dependencies.createUserScopedClient(accessToken);
  } catch {
    return json(503, { error: 'CHECKPOINT_INGRESS_UNAVAILABLE' });
  }

  const userId = await authenticatedUserId(client);
  if (userId === null) return json(401, { error: 'UNAUTHENTICATED' });

  const eligibility = await syntheticEligibility(client, userId, riskpathRecordId);
  if (eligibility === 'UNAVAILABLE') {
    return json(503, { error: 'CHECKPOINT_INGRESS_UNAVAILABLE' });
  }
  if (eligibility !== 'ELIGIBLE') {
    return json(404, { error: 'SYNTHETIC_RISKPATH_NOT_ELIGIBLE' });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'INVALID_CHECKPOINT_REQUEST' });
  }
  if (!isPlainObject(body) || typeof body.ownerAction !== 'string') {
    return json(400, { error: 'INVALID_CHECKPOINT_REQUEST' });
  }

  const action = body.ownerAction as CheckpointAction;
  const checkpoint = dependencies.createCheckpoint(client);

  try {
    if (action === 'PREPARATION_CHECKPOINT') {
      if (!hasExactKeys(body, PREPARATION_BODY_KEYS)) {
        return json(400, { error: 'INVALID_CHECKPOINT_REQUEST' });
      }
      const input = {
        ownerAction: 'PREPARATION_CHECKPOINT',
        riskpathRecordId,
        expectedCurrent: body.expectedCurrent,
        preparationSnapshot: body.preparationSnapshot,
      } as PreparationCheckpointInput;
      return successfulResult(await checkpoint.preparationCheckpoint(input));
    }

    if (action === 'GENERATED_DRAFT_CHECKPOINT') {
      if (!hasExactKeys(body, GENERATED_BODY_KEYS)) {
        return json(400, { error: 'INVALID_CHECKPOINT_REQUEST' });
      }
      const bytes = generatedDraftBytes(body.generatedDraftBytes);
      if (bytes === null) return json(400, { error: 'INVALID_CHECKPOINT_REQUEST' });
      const input = {
        ownerAction: 'GENERATED_DRAFT_CHECKPOINT',
        riskpathRecordId,
        expectedCurrent: body.expectedCurrent,
        generatedDraft: body.generatedDraft,
        generatedDraftBytes: bytes,
        currentnessMaterialBinding: body.currentnessMaterialBinding,
      } as GeneratedDraftCheckpointInput;
      return successfulResult(await checkpoint.generatedDraftCheckpoint(input));
    }

    if (action === 'OWNER_REVIEW_CHECKPOINT') {
      if (!hasExactKeys(body, OWNER_REVIEW_BODY_KEYS)
        || body.ownerConfirmedExactRenderedDocument !== true) {
        return json(400, { error: 'INVALID_CHECKPOINT_REQUEST' });
      }
      const input = {
        ownerAction: 'OWNER_REVIEW_CHECKPOINT',
        riskpathRecordId,
        expectedCurrent: body.expectedCurrent,
        renderedAcknowledgment: body.renderedAcknowledgment,
        ownerConfirmedExactRenderedDocument: true,
        reviewedAtISO: dependencies.nowISO(),
        reviewStatement: body.reviewStatement,
      } as OwnerReviewCheckpointInput;
      return successfulResult(await checkpoint.ownerReviewCheckpoint(input));
    }

    return json(400, { error: 'UNSUPPORTED_CHECKPOINT_ACTION' });
  } catch {
    return json(400, { error: 'CHECKPOINT_REJECTED' });
  }
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params;
  return handleSyntheticCheckpointRequest(request, id);
}
