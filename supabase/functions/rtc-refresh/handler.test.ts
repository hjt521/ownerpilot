/**
 * rtc-refresh handler tests — auth + leg + Monday-LA gate + hoisted production gate.
 * Plain tsx suite (check() helper); Deno-free because handler.ts injects all runtime.
 *
 * Step-5: store, fetcher, AND alert sink are all real now — no stub frontier remains. These two
 * orchestration tests use real-shaped injected deps (error-returning fetcher = what the real
 * fetcher does on failure; recording/throwing alert sinks):
 *   (a) with a non-throwing sink, the run completes (200), records a run-result, emits alerts;
 *   (b) with a THROWING sink, the run 500s — documenting that an alert-transport failure surfaces
 *       loudly, not swallowed (the console stub never throws, but the future shared transport could).
 * Baseline-independent: asserts nothing about hash matches (a match would couple to real baselines).
 */
import { handleRequest, isMondayInLosAngeles, type HandlerEnv } from './handler.ts';
import { RTC_PUBLISHED_LANGUAGES } from './_core/laRtcRules.ts';
import type { LanguageFetcher } from './_core/rtcRefreshJob.ts';
import type { RefreshStateStore, AlertSink, RefreshRunResult } from './_core/rtcRefreshTypes.ts';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  \u2713 ' + name); } else { failed++; console.log('  \u2717 ' + name); }
}

const SECRET = 'test-secret-value';
// 2026-06-22 is a Monday; 17:00Z is 10:00 PDT (still Monday in LA). 2026-06-23 is Tuesday.
const MONDAY = new Date('2026-06-22T17:00:00Z');
const TUESDAY = new Date('2026-06-23T17:00:00Z');

const STEP4_FETCH_ERROR = 'STEP4_FETCH_ERROR: injected fetch failure';
// Error-returning fetcher: mirrors the REAL fetcher's failure shape ({ error }), not a throw.
const errorFetcher: LanguageFetcher = async (language) => ({ language, error: STEP4_FETCH_ERROR });
const throwAlerts: AlertSink = { emit: async () => { throw new Error('STEP5_ALERTS: skeleton alert sink; lands in Step 5'); } };

// Recording mock store (real-shaped, non-throwing) — captures what runRefresh records.
function recordingStore(): RefreshStateStore & { runs: RefreshRunResult[] } {
  const runs: RefreshRunResult[] = [];
  return {
    runs,
    setLanguageState: async () => {},
    recordRunResult: async (r: RefreshRunResult) => { runs.push(r); },
    getLanguageState: async () => { throw new Error('not used'); },
    getPin: async () => { throw new Error('not used'); },
    setPin: async () => { throw new Error('not used'); },
  };
}
// Recording alerts (non-throwing) — captures emitted alerts.
function recordingAlerts(): AlertSink & { emitted: unknown[] } {
  const emitted: unknown[] = [];
  return { emitted, emit: async (a) => { emitted.push(a); } };
}

function env(over: Partial<HandlerEnv> = {}): HandlerEnv {
  return {
    secret: SECRET,
    now: () => MONDAY,
    gateIsOpen: () => false,
    deps: { fetcher: errorFetcher, store: recordingStore(), alerts: recordingAlerts() },
    ...over,
  };
}
function req(secret: string | null, body: unknown): Request {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (secret !== null) headers['x-rtc-refresh-secret'] = secret;
  return new Request('https://x/functions/v1/rtc-refresh', {
    method: 'POST', headers, body: JSON.stringify(body),
  });
}

async function main() {
  // --- Monday-LA pure check ---
  check('Monday UTC->LA is Monday', isMondayInLosAngeles(MONDAY) === true);
  check('Tuesday UTC->LA is not Monday', isMondayInLosAngeles(TUESDAY) === false);

  // --- auth ---
  let r = await handleRequest(req(null, { leg: 'cron' }), env());
  check('missing secret => 401', r.status === 401);
  r = await handleRequest(req('wrong', { leg: 'cron' }), env());
  check('wrong secret => 401', r.status === 401);
  r = await handleRequest(req(SECRET, { leg: 'cron' }), env({ secret: undefined }));
  check('unset server secret => 401', r.status === 401);

  // --- leg (fail loud) ---
  r = await handleRequest(req(SECRET, {}), env());
  check('missing leg => 400', r.status === 400);
  check('400 body names leg', JSON.stringify(await r.json()).includes('leg'));
  r = await handleRequest(req(SECRET, { leg: 'wat' }), env());
  check('unknown leg => 400', r.status === 400);

  // --- Monday-LA gate (cron only) ---
  r = await handleRequest(req(SECRET, { leg: 'cron' }), env({ now: () => TUESDAY }));
  check('cron on Tuesday => 200 skipped not-monday-LA', r.status === 200 && (await r.json()).skipped === 'not-monday-LA');
  // deploy leg ignores the Monday gate -> falls through to the production gate (closed) => skipped la-gate-closed
  r = await handleRequest(req(SECRET, { leg: 'deploy' }), env({ now: () => TUESDAY, gateIsOpen: () => false }));
  check('deploy on Tuesday bypasses Monday gate', r.status === 200 && (await r.json()).skipped === 'la-gate-closed');

  // --- hoisted production gate (closed) ---
  r = await handleRequest(req(SECRET, { leg: 'cron' }), env({ gateIsOpen: () => false }));
  check('cron + Monday + gate CLOSED => 200 skipped la-gate-closed', r.status === 200 && (await r.json()).skipped === 'la-gate-closed');

  // --- (a): gate OPEN + real-shaped error-fetcher + recording alerts -> run completes ---
  const store = recordingStore();
  const alerts = recordingAlerts();
  r = await handleRequest(req(SECRET, { leg: 'cron' }),
    env({ gateIsOpen: () => true, deps: { fetcher: errorFetcher, store, alerts } }));
  check('gate OPEN + error-fetcher completes (failure absorbed) => 200', r.status === 200);
  check('store recorded exactly one run-result', store.runs.length === 1);
  const outs = store.runs[0]?.outcomes ?? [];
  check('run-result has one outcome per published language', outs.length === RTC_PUBLISHED_LANGUAGES.length);
  check('every outcome is fetch_error carrying the fetch error',
    outs.length > 0 && outs.every((o: any) => o.kind === 'fetch_error' && String(o.reason).includes('STEP4_FETCH_ERROR')));
  check('all_failed is true (every fetch errored)', store.runs[0]?.allFailed === true);
  check('alerts were emitted and did not throw', alerts.emitted.length > 0);

  // --- (b): a throwing alert sink surfaces as 500 (not swallowed) — defensive, not a frontier ---
  const store2 = recordingStore();
  r = await handleRequest(req(SECRET, { leg: 'cron' }),
    env({ gateIsOpen: () => true, deps: { fetcher: errorFetcher, store: store2, alerts: throwAlerts } }));
  check('gate OPEN + throwing alert sink => 500 (transport failure surfaces, not swallowed)', r.status === 500);
}

main().then(() => {
  console.log(`\n  ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}).catch((e) => { console.error('  unexpected', e); process.exit(1); });
