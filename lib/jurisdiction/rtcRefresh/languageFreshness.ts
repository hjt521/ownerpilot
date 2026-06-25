/**
 * Per-language 14-day freshness-fail-closed guard (predicate 6).
 *
 * Real path: lib/jurisdiction/rtcRefresh/languageFreshness.ts
 *
 * OPERATIVE AUTHORITY (boundary / timezone / failure-mode uniformity / scope):
 *   predicate_6_freshness_guard_broker_determination_2026-06-25.md
 *     - B: age >= 14d -> block (block at exactly 14 days and beyond).
 *     - C: UTC now; age = utc_now - last_successful_refresh_at; window = 14*24*60*60*1000 ms.
 *     - D: uniform fail-closed-block across all failure modes; guard LOGS, runner ALERTS.
 *     - E: guard exists + tested; no produce-path wiring (deferred until LA unblocks).
 * ORIGINATING PROVENANCE (prose unrecoverable from workspace; operative prose lives in the
 *   determination above):
 *   la_rtc_refresh_runner_architecture_broker_ruling_response_2026-06-23.md §2.5
 * READ PATH this guard consumes (companions):
 *   - la_rtc_block_state_reader_auth_mechanism_broker_ruling_response_2026-06-23.md (M-1(ii) reader JWT)
 *   - rtc_block_state_reader_rls_policy_broker_determination_2026-06-25.md (migration 016 SELECT policy)
 *   - rtc_block_state read-route interface + caller-auth inline ruling 2026-06-25 (the route shape)
 *
 * TRANSPORT (determination §2.5 E "exercise the actual lib-core path that the real route consumes"):
 * this guard calls readBlockState IN-PROCESS — the same lib core the HTTP route consumes — not an
 * HTTP self-call. It SELF-PRESENTS the route secret (env.routeSecret as the presented secret) to
 * satisfy readBlockState's caller-auth gate; if the secret env is absent, readBlockState returns 500
 * and the guard blocks (missing_env) — the determination's "missing caller-side env -> block" by
 * construction.
 *
 * FAIL-CLOSED, UNIFORM (determination D): every non-fresh outcome blocks. The failure_class field is
 * log-only taxonomy for post-hoc operator diagnostics; the behavior (block) is identical across all
 * of them. The guard never alerts (runner's job) and never returns/logs the JWT, the secret, or raw
 * response bodies.
 *
 * SCOPE (determination E + §9): freshness only. This guard reads ONLY last_successful_refresh_at; it
 * does NOT consult current_status (status-based blocking stays the still-stubbed job of
 * lastRefreshFailedFor / isLanguageUnderRevisionReview).
 */
import {
  readBlockState,
  type ReadBlockStateEnv,
  type FetchLike,
  type ReadBlockStateResult,
} from './readBlockState';
import type { RtcLanguage } from '../laRtcRules';

/** 14 days as an absolute UTC span (determination B/C). No DST/zone math. */
export const FRESHNESS_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

/** Log-only failure taxonomy (determination D). Behavior is uniform block across all of them. */
export type FreshnessFailureClass =
  | 'route_unreachable'
  | 'route_non_200'
  | 'route_returned_no_row'
  | 'route_returned_stale_row'
  | 'missing_env';

/** Result of the freshness check. fresh === true only when a row exists with age < 14d. */
export interface FreshnessResult {
  fresh: boolean;
  failureClass: FreshnessFailureClass | null; // null iff fresh === true
  ageMs: number | null; // computed age when a usable timestamp was read; else null
}

/**
 * Map a readBlockState result + the current instant to a freshness verdict.
 * 200 ok -> compute age; >= 14d or null/unparseable timestamp -> stale-block; else fresh.
 * Every non-200 -> block, classified for logs by readBlockState's event.
 */
function classify(res: ReadBlockStateResult, now: Date): FreshnessResult {
  if (res.status === 200 && 'lastSuccessfulRefreshAt' in res.body) {
    const last = res.body.lastSuccessfulRefreshAt;
    if (last === null) {
      // Row present, never successfully refreshed -> infinitely stale (CONFIRM #2).
      return { fresh: false, failureClass: 'route_returned_stale_row', ageMs: null };
    }
    const ageMs = now.getTime() - Date.parse(last);
    if (Number.isNaN(ageMs)) {
      // Defensive: unparseable timestamp -> cannot prove freshness -> block (fail-closed).
      return { fresh: false, failureClass: 'route_returned_stale_row', ageMs: null };
    }
    if (ageMs >= FRESHNESS_WINDOW_MS) {
      return { fresh: false, failureClass: 'route_returned_stale_row', ageMs };
    }
    return { fresh: true, failureClass: null, ageMs };
  }
  switch (res.event) {
    case 'route_secret_unconfigured': // self-presented secret env absent -> caller-side config gap
    case 'reader_env_missing': // route-side Supabase env absent -> caller-side config gap (CONFIRM #3)
      return { fresh: false, failureClass: 'missing_env', ageMs: null };
    case 'reader_fetch_threw':
      return { fresh: false, failureClass: 'route_unreachable', ageMs: null };
    case 'no_state_row':
      return { fresh: false, failureClass: 'route_returned_no_row', ageMs: null };
    default:
      // reader_postgrest_non_200, reader_body_malformed, reader_body_not_array, row_shape_invalid,
      // and any defensive gate/param event that cannot occur in-process with a valid typed language.
      return { fresh: false, failureClass: 'route_non_200', ageMs: null };
  }
}

/**
 * The testable core. Calls readBlockState in-process (self-presenting the route secret), then applies
 * the 14-day freshness rule. env/fetch/now are injected so tests exercise the REAL readBlockState path
 * with only the PostgREST fetch boundary faked (determination §2.5 E).
 */
export async function checkLanguageFreshness(
  input: { language: RtcLanguage; now: Date },
  env: ReadBlockStateEnv,
  fetchImpl: FetchLike,
): Promise<FreshnessResult> {
  const res = await readBlockState(
    { language: input.language, presentedSecret: env.routeSecret ?? null },
    env,
    fetchImpl,
  );
  return classify(res, input.now);
}
