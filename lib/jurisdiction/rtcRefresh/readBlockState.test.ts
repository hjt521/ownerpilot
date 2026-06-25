/**
 * readBlockState core tests — tsx suite (check() helper; process.exit(1) on failure), matching the
 * repo runner (scripts/run_tests.mjs globs lib/ + supabase/functions/). No live network, no Supabase
 * client: the FetchLike injection point is filled with in-process fakes.
 *
 * Real path: lib/jurisdiction/rtcRefresh/readBlockState.test.ts
 *
 * Covers the interface ruling's seven mandated cases (happy path; missing param 400; invalid param
 * 400; missing reader JWT fail-closed; PostgREST non-200 fail-closed; empty array fail-closed; fetch
 * throw fail-closed), the caller-auth ruling's five additive cases (route secret unconfigured -> 500;
 * missing header -> 401; wrong header -> 401; correct+valid -> happy path; correct+invalid -> 400),
 * plus malformed/non-array/bad-shape and the language guard.
 */
import {
  readBlockState,
  isRtcLanguage,
  type ReadBlockStateEnv,
  type ReadBlockStateRequest,
  type FetchLike,
  type BlockStateResponse,
} from './readBlockState';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = ''): void {
  if (cond) { passed++; console.log(`  \u2713 ${name}`); }
  else { failed++; console.log(`  \u2717 ${name}${detail ? ` \u2014 ${detail}` : ''}`); }
}

const SECRET = 'route-secret-value';
const ENV: ReadBlockStateEnv = {
  routeSecret: SECRET, baseUrl: 'https://x.supabase.co', anonKey: 'anon', readerJwt: 'jwt',
};
// Request builder — correct secret by default; override presentedSecret/language per case.
const reqFor = (language: string | null, presentedSecret: string | null = SECRET): ReadBlockStateRequest =>
  ({ language, presentedSecret });

// FetchLike fakes (the injection point — no network, no Supabase client).
const okFetch = (rows: unknown): FetchLike => async () => ({ ok: true, status: 200, json: async () => rows });
const httpErrFetch = (status: number): FetchLike => async () => ({ ok: false, status, json: async () => ({}) });
const malformedFetch = (): FetchLike => async () => ({ ok: true, status: 200, json: async () => { throw new Error('not json'); } });
const throwFetch = (): FetchLike => async () => { throw new Error('network'); };
// Must never be called — asserts the gate / validation short-circuits before any network hit.
const neverFetch = (): FetchLike => async () => { throw new Error('FETCH_CALLED_UNEXPECTEDLY'); };

const ROW = {
  language: 'english',
  current_status: 'unblocked',
  last_successful_refresh_at: '2026-06-25T07:12:28Z',
  block_reason: null,
  block_since: null,
};

async function run(): Promise<void> {
  // --- Caller-auth gate (additive) ---
  {
    // Route secret unconfigured -> 500, no network.
    const r = await readBlockState(reqFor('english'), { ...ENV, routeSecret: undefined }, neverFetch());
    check('route secret unconfigured -> 500', r.status === 500, `got ${r.status}`);
    check('unconfigured -> misconfigured', (r.body as { error: string }).error === 'misconfigured');
    check('unconfigured -> language null', r.language === null);
  }
  {
    // Missing header (null) -> 401, no network.
    const r = await readBlockState(reqFor('english', null), ENV, neverFetch());
    check('missing caller secret -> 401', r.status === 401, `got ${r.status}`);
    check('missing caller secret -> unauthorized', (r.body as { error: string }).error === 'unauthorized');
  }
  {
    // Wrong header -> 401, no network.
    const r = await readBlockState(reqFor('english', 'wrong-secret'), ENV, neverFetch());
    check('wrong caller secret -> 401', r.status === 401, `got ${r.status}`);
    check('wrong caller secret -> language null', r.language === null);
  }

  // --- Happy path (correct secret + valid language) ---
  {
    const r = await readBlockState(reqFor('english'), ENV, okFetch([ROW]));
    check('correct+valid -> 200', r.status === 200, `got ${r.status}`);
    check('happy path event ok', r.event === 'ok');
    const b = r.body as BlockStateResponse;
    check('body.currentStatus mapped', b.currentStatus === 'unblocked');
    check('body.lastSuccessfulRefreshAt mapped', b.lastSuccessfulRefreshAt === '2026-06-25T07:12:28Z');
    check('body.blockReason null', b.blockReason === null);
  }

  // --- Param presence / validation (correct secret) ---
  {
    const r = await readBlockState(reqFor(null), ENV, neverFetch());
    check('missing language -> 400', r.status === 400, `got ${r.status}`);
    check('missing language -> language_required', (r.body as { error: string }).error === 'language_required');
    const r2 = await readBlockState(reqFor(''), ENV, neverFetch());
    check('empty language -> 400', r2.status === 400);
  }
  {
    const r = await readBlockState(reqFor('klingon'), ENV, neverFetch());
    check('correct+invalid -> 400', r.status === 400, `got ${r.status}`);
    check('invalid language -> invalid_language', (r.body as { error: string }).error === 'invalid_language');
    check('invalid language -> language null (raw not surfaced)', r.language === null);
  }

  // --- Reader env (correct secret + valid language) ---
  {
    const r = await readBlockState(reqFor('english'), { ...ENV, readerJwt: undefined }, neverFetch());
    check('missing reader JWT -> 503', r.status === 503, `got ${r.status}`);
    check('missing reader JWT -> block_state_unavailable', (r.body as { error: string }).error === 'block_state_unavailable');
    const r2 = await readBlockState(reqFor('english'), { ...ENV, baseUrl: undefined }, neverFetch());
    check('missing base URL -> 503', r2.status === 503);
    const r3 = await readBlockState(reqFor('english'), { ...ENV, anonKey: undefined }, neverFetch());
    check('missing anon key -> 503', r3.status === 503);
  }

  // --- PostgREST outcomes (correct secret + valid language) ---
  {
    const r = await readBlockState(reqFor('english'), ENV, httpErrFetch(401));
    check('postgrest 401 -> 503', r.status === 503, `got ${r.status}`);
    const r2 = await readBlockState(reqFor('english'), ENV, httpErrFetch(500));
    check('postgrest 500 -> 503', r2.status === 503);
  }
  {
    const r = await readBlockState(reqFor('english'), ENV, okFetch([]));
    check('empty array -> 404', r.status === 404, `got ${r.status}`);
    check('empty array -> no_block_state', (r.body as { error: string }).error === 'no_block_state');
  }
  {
    const r = await readBlockState(reqFor('english'), ENV, throwFetch());
    check('fetch throw -> 503', r.status === 503, `got ${r.status}`);
  }
  {
    const r = await readBlockState(reqFor('english'), ENV, malformedFetch());
    check('malformed body -> 503', r.status === 503);
    const r2 = await readBlockState(reqFor('english'), ENV, okFetch({ not: 'array' }));
    check('non-array body -> 503', r2.status === 503);
    const r3 = await readBlockState(reqFor('english'), ENV, okFetch([{ foo: 'bar' }]));
    check('bad row shape -> 503', r3.status === 503);
  }

  // --- Language guard ---
  {
    check('isRtcLanguage english', isRtcLanguage('english') === true);
    check('isRtcLanguage klingon false', isRtcLanguage('klingon') === false);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void run();
