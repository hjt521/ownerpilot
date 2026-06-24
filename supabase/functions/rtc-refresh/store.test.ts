/**
 * Step 3 — SupabaseRefreshStore tests. No live calls (client injected).
 * Covers the 013/012 row mappings (decisions 2(i) + 3 + §2.5 omissions) and the
 * swallow+count failure posture (a store hiccup resolves without throwing).
 */
import {
  toStateRow,
  createSupabaseRefreshStore,
  rtcRefreshStoreWriteFailureCount,
  type SupabaseRefreshClient,
} from './store.ts';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  \u2713 ' + name); } else { failed++; console.log('  \u2717 ' + name); }
}

const okClient = (cap?: (table: string, op: string, row: unknown) => void): SupabaseRefreshClient => ({
  from: (table: string) => ({
    insert: async (row: unknown) => { cap?.(table, 'insert', row); return { error: null }; },
    upsert: async (row: unknown) => { cap?.(table, 'upsert', row); return { error: null }; },
  }),
});
const errClient = (msg: string): SupabaseRefreshClient => ({
  from: () => ({ insert: async () => ({ error: { message: msg } }), upsert: async () => ({ error: { message: msg } }) }),
});
const throwClient = (): SupabaseRefreshClient => ({
  from: () => ({ insert: async () => { throw new Error('network down'); }, upsert: async () => { throw new Error('network down'); } }),
});

async function main() {
  // --- row mapping: unblocked (decision 2(i): current_hash OMITTED; both timestamps set) ---
  const u = toStateRow('english', { status: 'unblocked' });
  check('unblocked: current_status', u.current_status === 'unblocked');
  check('unblocked: OMITS current_hash', !('current_hash' in u));
  check('unblocked: sets last_successful_refresh_at', typeof u.last_successful_refresh_at === 'string');
  check('unblocked: sets last_attempted_refresh_at', typeof u.last_attempted_refresh_at === 'string');
  check('unblocked: block_reason null', u.block_reason === null);
  check('unblocked: block_since null', u.block_since === null);

  // --- row mapping: refresh_failure (category block_reason; OMITS last_successful) ---
  const fr = toStateRow('spanish', { status: 'refresh_failure', reason: 'HTTP 503 empty body', since: '2026-06-24T03:14:22Z' });
  check('failure: current_status', fr.current_status === 'refresh_failure');
  check('failure: block_reason is CATEGORY not free text', fr.block_reason === 'refresh_failure');
  check('failure: free-text reason NOT in state row', !JSON.stringify(fr).includes('HTTP 503'));
  check('failure: OMITS last_successful_refresh_at (ages to fail-closed)', !('last_successful_refresh_at' in fr));
  check('failure: last_attempted = since', fr.last_attempted_refresh_at === '2026-06-24T03:14:22Z');
  check('failure: block_since = since', fr.block_since === '2026-06-24T03:14:22Z');

  // --- row mapping: staged_revision (current_hash = detectedHash; category block_reason) ---
  const sr = toStateRow('korean', { status: 'staged_revision', detectedHash: 'abc123', since: '2026-06-24T04:00:00Z' });
  check('revision: current_status', sr.current_status === 'staged_revision');
  check('revision: current_hash = detectedHash', sr.current_hash === 'abc123');
  check('revision: block_reason category', sr.block_reason === 'revision_detected');
  check('revision: OMITS last_successful_refresh_at', !('last_successful_refresh_at' in sr));

  // --- write path: setLanguageState upserts rtc_refresh_state on language conflict ---
  let cap: { table?: string; op?: string; row?: any } = {};
  const store = createSupabaseRefreshStore({ getClient: async () => okClient((t, o, r) => { cap = { table: t, op: o, row: r }; }) });
  await store.setLanguageState('english', { status: 'unblocked' });
  check('setLanguageState targets rtc_refresh_state', cap.table === 'rtc_refresh_state');
  check('setLanguageState uses upsert', cap.op === 'upsert');
  check('setLanguageState row carries language', cap.row?.language === 'english');

  // --- write path: recordRunResult inserts rtc_refresh_run_results ---
  let cap2: { table?: string; op?: string; row?: any } = {};
  const store2 = createSupabaseRefreshStore({ getClient: async () => okClient((t, o, r) => { cap2 = { table: t, op: o, row: r }; }) });
  await store2.recordRunResult({ runAt: '2026-06-24T05:00:00Z', outcomes: [{ language: 'english', kind: 'match' }] as any, allFailed: false });
  check('recordRunResult targets rtc_refresh_run_results', cap2.table === 'rtc_refresh_run_results');
  check('recordRunResult uses insert', cap2.op === 'insert');
  check('recordRunResult maps run_at + all_failed + outcomes', cap2.row?.run_at === '2026-06-24T05:00:00Z' && cap2.row?.all_failed === false && Array.isArray(cap2.row?.outcomes));
  check('recordRunResult omits id (db default)', !('id' in (cap2.row ?? {})));

  // --- failure posture: error returned => swallowed + counted, never throws ---
  const c0 = rtcRefreshStoreWriteFailureCount();
  const storeErr = createSupabaseRefreshStore({ getClient: async () => errClient('insert denied') });
  let threw = false;
  try { await storeErr.recordRunResult({ runAt: 'x', outcomes: [], allFailed: true }); } catch { threw = true; }
  check('error result: does NOT throw', threw === false);
  check('error result: counter incremented', rtcRefreshStoreWriteFailureCount() === c0 + 1);

  // --- failure posture: client throws => also swallowed ---
  const c1 = rtcRefreshStoreWriteFailureCount();
  const storeThrow = createSupabaseRefreshStore({ getClient: async () => throwClient() });
  let threw2 = false;
  try { await storeThrow.setLanguageState('farsi', { status: 'unblocked' }); } catch { threw2 = true; }
  check('thrown client: does NOT throw', threw2 === false);
  check('thrown client: counter incremented', rtcRefreshStoreWriteFailureCount() === c1 + 1);

  // --- serve-path methods are honest throws, not silent no-ops ---
  const store3 = createSupabaseRefreshStore({ getClient: async () => okClient() });
  let getThrew = false;
  try { await store3.getLanguageState('english'); } catch { getThrew = true; }
  check('getLanguageState throws (not runner scope)', getThrew === true);
}

main().then(() => {
  console.log(`\n  ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}).catch((e) => { console.error('  unexpected', e); process.exit(1); });
