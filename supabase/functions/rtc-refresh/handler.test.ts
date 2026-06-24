/**
 * rtc-refresh handler tests — auth + leg + Monday-LA gate + hoisted production gate.
 * Plain tsx suite (check() helper); Deno-free because handler.ts injects all runtime.
 *
 * The locked negative test (Step-2 determination): valid auth + valid leg + forced
 * Monday + gate OPEN reaches runRefresh and throws the Step-3 store stub — proving the
 * production gate is the ONLY thing protecting the stubs pre-go-live. Moving high-water
 * mark: Step 3 updates this to reach further.
 */
import { handleRequest, isMondayInLosAngeles, type HandlerEnv } from './handler.ts';
import type { LanguageFetcher } from './_core/rtcRefreshJob.ts';
import type { RefreshStateStore, AlertSink } from './_core/rtcRefreshTypes.ts';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  \u2713 ' + name); } else { failed++; console.log('  \u2717 ' + name); }
}

const SECRET = 'test-secret-value';
// 2026-06-22 is a Monday; 17:00Z is 10:00 PDT (still Monday in LA). 2026-06-23 is Tuesday.
const MONDAY = new Date('2026-06-22T17:00:00Z');
const TUESDAY = new Date('2026-06-23T17:00:00Z');

const throwFetcher: LanguageFetcher = async () => { throw new Error('stub fetcher: Step 4'); };
const throwStore: RefreshStateStore = {
  getLanguageState: async () => { throw new Error('stub store getLanguageState: Step 3'); },
  setLanguageState: async () => { throw new Error('stub store: Step 3'); },
  getPin: async () => { throw new Error('stub store: Step 3'); },
  setPin: async () => { throw new Error('stub store: Step 3'); },
  recordRunResult: async () => { throw new Error('stub store: Step 3'); },
};
const throwAlerts: AlertSink = { emit: async () => { throw new Error('stub alerts: Step 5'); } };

function env(over: Partial<HandlerEnv> = {}): HandlerEnv {
  return {
    secret: SECRET,
    now: () => MONDAY,
    gateIsOpen: () => false,
    deps: { fetcher: throwFetcher, store: throwStore, alerts: throwAlerts },
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

  // --- LOCKED NEGATIVE TEST: gate OPEN reaches runRefresh -> throws Step-3 store stub -> 500 ---
  r = await handleRequest(req(SECRET, { leg: 'cron' }), env({ gateIsOpen: () => true }));
  check('gate OPEN reaches runRefresh and 500s on the Step-3 store stub', r.status === 500);
  // This proves the production gate is the ONLY thing protecting the stubs pre-go-live.
}

main().then(() => {
  console.log(`\n  ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}).catch((e) => { console.error('  unexpected', e); process.exit(1); });
