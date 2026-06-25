/**
 * Tests for the predicate-6 14-day freshness guard.
 *
 * Each test calls the REAL checkLanguageFreshness, faking only the PostgREST fetch boundary, so the
 * real readBlockState path runs end-to-end (determination §2.5 E: "not a mock at a layer below").
 * Covers the determination's seven (13d, 15d, 14d-exact, route-unreachable, route-5xx, no-row,
 * missing-env) plus the broker-added discrete 14d-1ms edge, the null-timestamp edge (CONFIRM #2),
 * and the route-side-env-missing case (CONFIRM #3).
 */
import {
  checkLanguageFreshness,
  FRESHNESS_WINDOW_MS,
  type FreshnessResult,
} from './languageFreshness';
import type { ReadBlockStateEnv, FetchLike, FetchResponseLike } from './readBlockState';
import type { RtcLanguage } from '../laRtcRules';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = ''): void {
  if (cond) {
    passed++;
    console.log('  \u2713 ' + name);
  } else {
    failed++;
    console.log('  \u2717 ' + name + (detail ? '  -> ' + detail : ''));
  }
}

const ENV: ReadBlockStateEnv = {
  routeSecret: 'test-route-secret',
  baseUrl: 'https://stub.supabase.co',
  anonKey: 'anon-key',
  readerJwt: 'reader-jwt',
};

const LANG: RtcLanguage = 'english';
const NOW = new Date('2026-06-25T00:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

function isoNowMinusMs(ms: number): string {
  return new Date(NOW.getTime() - ms).toISOString();
}

/** 200 single-row PostgREST response with the given last_successful_refresh_at. */
function fetchRow(lastSuccessfulRefreshAt: string | null): FetchLike {
  return async (): Promise<FetchResponseLike> => ({
    ok: true,
    status: 200,
    json: async () => [
      {
        language: LANG,
        current_status: 'unblocked',
        last_successful_refresh_at: lastSuccessfulRefreshAt,
        block_reason: null,
        block_since: null,
      },
    ],
  });
}

/** 200 empty array -> readBlockState 404 no_state_row. */
const fetchNoRow: FetchLike = async (): Promise<FetchResponseLike> => ({
  ok: true,
  status: 200,
  json: async () => [],
});

/** PostgREST non-200 -> readBlockState 503 reader_postgrest_non_200. */
const fetch5xx: FetchLike = async (): Promise<FetchResponseLike> => ({
  ok: false,
  status: 500,
  json: async () => ({}),
});

/** fetch throws -> readBlockState 503 reader_fetch_threw. */
const fetchThrows: FetchLike = async (): Promise<FetchResponseLike> => {
  throw new Error('network down');
};

/** A fetch that records if it was called (to assert no network on the missing-env path). */
let fetchCalled = false;
const fetchForbidden: FetchLike = async (): Promise<FetchResponseLike> => {
  fetchCalled = true;
  throw new Error('fetch should not have been called');
};

async function main(): Promise<void> {
  // 1. 13d -> fresh (no block)
  let r: FreshnessResult = await checkLanguageFreshness(
    { language: LANG, now: NOW },
    ENV,
    fetchRow(isoNowMinusMs(13 * DAY_MS)),
  );
  check('13d -> fresh (no block)', r.fresh === true && r.failureClass === null, JSON.stringify(r));
  check('13d -> ageMs === 13d', r.ageMs === 13 * DAY_MS, String(r.ageMs));

  // 2. 15d -> block (stale)
  r = await checkLanguageFreshness({ language: LANG, now: NOW }, ENV, fetchRow(isoNowMinusMs(15 * DAY_MS)));
  check('15d -> block (stale)', r.fresh === false && r.failureClass === 'route_returned_stale_row', JSON.stringify(r));
  check('15d -> ageMs === 15d', r.ageMs === 15 * DAY_MS, String(r.ageMs));

  // 3. exactly 14d -> block (boundary, determination B: age >= 14d -> block)
  r = await checkLanguageFreshness({ language: LANG, now: NOW }, ENV, fetchRow(isoNowMinusMs(FRESHNESS_WINDOW_MS)));
  check('14d exact -> block (>= boundary)', r.fresh === false && r.failureClass === 'route_returned_stale_row', JSON.stringify(r));
  check('14d exact -> ageMs === window', r.ageMs === FRESHNESS_WINDOW_MS, String(r.ageMs));

  // 3b. 14d - 1ms -> fresh (discrete edge from the other side, per broker §3)
  r = await checkLanguageFreshness({ language: LANG, now: NOW }, ENV, fetchRow(isoNowMinusMs(FRESHNESS_WINDOW_MS - 1)));
  check('14d - 1ms -> fresh', r.fresh === true && r.failureClass === null, JSON.stringify(r));

  // 4. route unreachable -> block (route_unreachable)
  r = await checkLanguageFreshness({ language: LANG, now: NOW }, ENV, fetchThrows);
  check('fetch throws -> block route_unreachable', r.fresh === false && r.failureClass === 'route_unreachable', JSON.stringify(r));

  // 5. route 5xx -> block (route_non_200)
  r = await checkLanguageFreshness({ language: LANG, now: NOW }, ENV, fetch5xx);
  check('5xx -> block route_non_200', r.fresh === false && r.failureClass === 'route_non_200', JSON.stringify(r));

  // 6. no row -> block (route_returned_no_row)
  r = await checkLanguageFreshness({ language: LANG, now: NOW }, ENV, fetchNoRow);
  check('no row -> block route_returned_no_row', r.fresh === false && r.failureClass === 'route_returned_no_row', JSON.stringify(r));

  // 7. missing caller-side env (route secret) -> block (missing_env), no fetch
  fetchCalled = false;
  r = await checkLanguageFreshness({ language: LANG, now: NOW }, { ...ENV, routeSecret: undefined }, fetchForbidden);
  check('missing route secret -> block missing_env', r.fresh === false && r.failureClass === 'missing_env', JSON.stringify(r));
  check('missing route secret -> fetch NOT called', fetchCalled === false);

  // 7b. missing route-side Supabase env (reader JWT) -> block (missing_env) [CONFIRM #3]
  r = await checkLanguageFreshness({ language: LANG, now: NOW }, { ...ENV, readerJwt: undefined }, fetchForbidden);
  check('missing reader JWT -> block missing_env', r.fresh === false && r.failureClass === 'missing_env', JSON.stringify(r));

  // 8. null timestamp -> block (route_returned_stale_row, ageMs null) [CONFIRM #2]
  r = await checkLanguageFreshness({ language: LANG, now: NOW }, ENV, fetchRow(null));
  check('null timestamp -> block route_returned_stale_row', r.fresh === false && r.failureClass === 'route_returned_stale_row', JSON.stringify(r));
  check('null timestamp -> ageMs null', r.ageMs === null, String(r.ageMs));

  console.log(`\n  ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
