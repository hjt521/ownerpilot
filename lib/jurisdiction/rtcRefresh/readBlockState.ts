/**
 * RTC block-state core — per-language read of rtc_refresh_state with fail-closed semantics,
 * behind a caller-auth shared-secret gate.
 *
 * Real path: lib/jurisdiction/rtcRefresh/readBlockState.ts
 *
 * Authorized by:
 *   - la_rtc_block_state_reader_auth_mechanism_broker_ruling_response_2026-06-23.md
 *       (M-1(ii) pre-signed reader JWT; JWT in Authorization: Bearer; §3.1 no-auto-refresh)
 *   - rtc_block_state read-route interface inline ruling 2026-06-25 (per-language; required
 *       language param; validate against the known set BEFORE any PostgREST call; state-only;
 *       fail-closed on every error path)
 *   - rtc_block_state read-route caller-auth inline ruling 2026-06-25 §3 (shared-secret gate:
 *       env RTC_BLOCK_STATE_ROUTE_SECRET, header x-rtc-block-state-secret; missing env -> 500,
 *       missing/wrong header -> 401; check order secret -> param presence -> param validation ->
 *       reader env -> PostgREST. "Two locks, two keys": the reader JWT gates Supabase; this
 *       shared secret gates the route. The /api/internal/ path name carries a wall promise.)
 *   - rtc_block_state_reader_rls_policy_broker_determination_2026-06-25.md
 *       (migration 016 — the scoped SELECT policy these reads depend on)
 *
 * §3.1 NO-AUTO-REFRESH, BY CONSTRUCTION. This core takes an injected `fetchImpl` and imports NO
 * Supabase client. The reader JWT is passed as a static `Authorization: Bearer` header; no client
 * machinery exists that could refresh it on 401. Enforced at the module boundary.
 *
 * FAIL-CLOSED. Every error path returns a non-200 and invents no state:
 *   route secret unconfigured (env)     -> 500
 *   missing / wrong caller secret header -> 401
 *   missing language param              -> 400  (no network)
 *   invalid language param              -> 400  (validated against RTC_PUBLISHED_LANGUAGES; no network)
 *   missing reader env (URL/anon/JWT)    -> 503
 *   fetch throw                         -> 503
 *   PostgREST non-200                   -> 503
 *   PostgREST 200 + malformed/non-array -> 503
 *   PostgREST 200 + empty array         -> 404  (no state row for this language -> block)
 *   PostgREST 200 + bad row shape       -> 503
 * The serve path treats ANY non-200 as "block this language."
 *
 * SECRETS NEVER RETURNED OR LOGGED. The configured route secret and the presented header are used
 * only for the equality check; neither is placed in the result. The raw invalid language value is
 * likewise never returned (language is null on the gate/missing/invalid paths), so nothing
 * sensitive can reach the route's log line. The secret comparison is a direct equality check,
 * matching the Edge Function's x-rtc-refresh-secret pattern (low-sensitivity gate; constant-time
 * comparison not warranted for non-PII block-state).
 */
import { RTC_PUBLISHED_LANGUAGES, type RtcLanguage } from '../laRtcRules';

/** Request inputs extracted by the route: the language query param and the presented gate secret. */
export interface ReadBlockStateRequest {
  language: string | null;
  presentedSecret: string | null;
}

/** Env values the core needs, injected by the route (kept out of the core for testability). */
export interface ReadBlockStateEnv {
  routeSecret: string | undefined;
  baseUrl: string | undefined;
  anonKey: string | undefined;
  readerJwt: string | undefined;
}

/** Minimal response surface the core consumes (the global fetch's Response satisfies it). */
export interface FetchResponseLike {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

/** Minimal request init the core sends. Assignable to the global RequestInit. */
export interface FetchInit {
  method: string;
  headers: Record<string, string>;
  cache: 'no-store';
}

/** Injected fetch. The route passes an adapter over the global fetch; tests pass a fake. */
export type FetchLike = (url: string, init: FetchInit) => Promise<FetchResponseLike>;

/** Success shape returned to the serve path (typed, camelCase). */
export interface BlockStateResponse {
  language: RtcLanguage;
  currentStatus: string;
  lastSuccessfulRefreshAt: string | null;
  blockReason: string | null;
  blockSince: string | null;
}

/** Uniform core result: HTTP status, a privacy-safe event tag, the validated language (or null on
 *  the gate / missing / invalid-param paths), and the JSON body the route will return. */
export interface ReadBlockStateResult {
  status: number;
  event: string;
  language: RtcLanguage | null;
  body: BlockStateResponse | { error: string };
}

/** PostgREST row shape (snake_case) for the selected columns. */
interface RtcRefreshStateRow {
  language: string;
  current_status: string;
  last_successful_refresh_at: string | null;
  block_reason: string | null;
  block_since: string | null;
}

const SELECT_COLUMNS =
  'language,current_status,last_successful_refresh_at,block_reason,block_since';

/** Type guard against the canonical published-language set (single source of truth). */
export function isRtcLanguage(value: string): value is RtcLanguage {
  return (RTC_PUBLISHED_LANGUAGES as readonly string[]).includes(value);
}

export async function readBlockState(
  req: ReadBlockStateRequest,
  env: ReadBlockStateEnv,
  fetchImpl: FetchLike,
): Promise<ReadBlockStateResult> {
  // 0. Caller-auth gate (caller-auth ruling §3) — checked FIRST, before any param handling or
  //    network. The configured secret and the presented header are never returned.
  if (!env.routeSecret) {
    // Misconfiguration (route secret not set in this env) -> fail closed, distinct from 401.
    return { status: 500, event: 'route_secret_unconfigured', language: null, body: { error: 'misconfigured' } };
  }
  if (req.presentedSecret !== env.routeSecret) {
    // Covers both missing header (null) and wrong header.
    return { status: 401, event: 'route_secret_invalid', language: null, body: { error: 'unauthorized' } };
  }

  // 1. Required language param.
  const rawLanguage = req.language;
  if (rawLanguage === null || rawLanguage === '') {
    return { status: 400, event: 'missing_language_param', language: null, body: { error: 'language_required' } };
  }

  // 2. Validate against the canonical set BEFORE any PostgREST call. Invalid -> 400; the raw value
  //    is not returned (language stays null), so it can never reach a log line.
  if (!isRtcLanguage(rawLanguage)) {
    return { status: 400, event: 'invalid_language_param', language: null, body: { error: 'invalid_language' } };
  }
  const language: RtcLanguage = rawLanguage;

  // 3. Resolve reader env. Missing any -> fail closed (503).
  const { baseUrl, anonKey, readerJwt } = env;
  if (!baseUrl || !anonKey || !readerJwt) {
    return { status: 503, event: 'reader_env_missing', language, body: { error: 'block_state_unavailable' } };
  }

  // 4. PostgREST read; reader JWT in Authorization. Raw injected fetch — no client, no refresh.
  const url =
    `${baseUrl}/rest/v1/rtc_refresh_state` +
    `?language=eq.${encodeURIComponent(language)}` +
    `&select=${SELECT_COLUMNS}`;

  let resp: FetchResponseLike;
  try {
    resp = await fetchImpl(url, {
      method: 'GET',
      headers: { apikey: anonKey, Authorization: `Bearer ${readerJwt}`, Accept: 'application/json' },
      cache: 'no-store',
    });
  } catch {
    return { status: 503, event: 'reader_fetch_threw', language, body: { error: 'block_state_unavailable' } };
  }

  if (!resp.ok) {
    return { status: 503, event: 'reader_postgrest_non_200', language, body: { error: 'block_state_unavailable' } };
  }

  // 5. Parse. Malformed / non-array -> fail closed.
  let parsed: unknown;
  try {
    parsed = await resp.json();
  } catch {
    return { status: 503, event: 'reader_body_malformed', language, body: { error: 'block_state_unavailable' } };
  }
  if (!Array.isArray(parsed)) {
    return { status: 503, event: 'reader_body_not_array', language, body: { error: 'block_state_unavailable' } };
  }

  // 6. Empty -> no state row for this language -> fail closed (block).
  if (parsed.length === 0) {
    return { status: 404, event: 'no_state_row', language, body: { error: 'no_block_state' } };
  }

  // 7. Defensive row-shape check.
  const row = parsed[0] as RtcRefreshStateRow;
  if (typeof row?.language !== 'string' || typeof row?.current_status !== 'string') {
    return { status: 503, event: 'row_shape_invalid', language, body: { error: 'block_state_unavailable' } };
  }

  // 8. Success.
  const body: BlockStateResponse = {
    language,
    currentStatus: row.current_status,
    lastSuccessfulRefreshAt: row.last_successful_refresh_at ?? null,
    blockReason: row.block_reason ?? null,
    blockSince: row.block_since ?? null,
  };
  return { status: 200, event: 'ok', language, body };
}
