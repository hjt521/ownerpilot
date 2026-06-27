/**
 * city-zip-refresh handler tests — no live calls (fetch/store/alerts injected).
 * Covers evaluateRefresh decision branches, the §3.1-b dormancy clock, and the
 * handleRequest auth + record/alert wiring.
 */
import {
  evaluateRefresh,
  handleRequest,
  toUtcDate,
  isDormant,
  type RefreshState,
  type C8FetchResult,
  type RefreshStore,
  type AlertDestination,
  type HandlerEnv,
} from './handler.ts';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  ✓ ' + name); }
  else { failed++; console.log('  ✗ ' + name); }
}

const baseState: RefreshState = {
  snapshotSha256: 'e40e3ab2c47bdb9429f19c1d97d69f0ca5bd20aa6ecbd2e15b203e5f47b18452',
  baselineDataLastEdit: '2026-05-19',
  brokerAttestedAt: '2026-06-27',
  consecutiveFetchFailures: 0,
};
// 2026-05-19 18:57 UTC (the recorded baseline) and 2026-06-10 (a later geometry edit)
const MS_2026_05_19 = Date.parse('2026-05-19T18:57:07Z');
const MS_2026_06_10 = Date.parse('2026-06-10T00:00:00Z');
const NOW = new Date('2026-06-28T11:00:00Z');

function fakeStore(state: RefreshState | null): RefreshStore & { runs: unknown[]; updates: unknown[] } {
  const runs: unknown[] = [];
  const updates: unknown[] = [];
  return {
    runs, updates,
    loadState: async () => state,
    recordRun: async (r) => { runs.push(r); },
    updateState: async (u) => { updates.push(u); },
  };
}
function fakeAlerts(): AlertDestination & { sent: unknown[] } {
  const sent: unknown[] = [];
  return { sent, send: async (a) => { sent.push(a); } };
}

async function main() {
  console.log('\n=== helpers ===');
  check('toUtcDate epoch → YYYY-MM-DD UTC', toUtcDate(MS_2026_05_19) === '2026-05-19');
  check('isDormant: 19mo back → true', isDormant('2024-11-01', NOW) === true);
  check('isDormant: 1mo back → false', isDormant('2026-06-01', NOW) === false);

  console.log('\n=== evaluateRefresh branches ===');
  {
    const d = evaluateRefresh(baseState, { ok: true, dataLastEditDateMs: MS_2026_05_19 }, NOW);
    check('observed == baseline → no_diff', d.outcome === 'no_diff' && d.alert === null);
    check('no_diff resets fetch-fail streak', d.nextConsecutiveFetchFailures === 0);
  }
  {
    const d = evaluateRefresh(baseState, { ok: true, dataLastEditDateMs: MS_2026_06_10 }, NOW);
    check('observed > baseline → change_detected + alert', d.outcome === 'change_detected' && d.alert !== null);
    check('change_detected observed date is 2026-06-10', d.observedDataLastEdit === '2026-06-10');
  }
  {
    // observed earlier than baseline
    const d = evaluateRefresh(baseState, { ok: true, dataLastEditDateMs: Date.parse('2026-05-01T00:00:00Z') }, NOW);
    check('observed < baseline → anomaly + alert', d.outcome === 'anomaly' && d.alert !== null);
  }
  {
    const d = evaluateRefresh(baseState, { ok: false, error: 'timeout' }, NOW);
    check('1st fetch fail → fetch_fail, NO alert (streak 1)', d.outcome === 'fetch_fail' && d.alert === null);
    check('streak incremented to 1', d.nextConsecutiveFetchFailures === 1);
  }
  {
    const d = evaluateRefresh({ ...baseState, consecutiveFetchFailures: 1 }, { ok: false, error: 'timeout' }, NOW);
    check('2nd consecutive fetch fail → persistent alert (§3.2-c)', d.outcome === 'fetch_fail' && d.alert !== null);
    check('streak incremented to 2', d.nextConsecutiveFetchFailures === 2);
  }
  {
    // dormancy: anchor max(baseline, attested) >18mo before now
    const old: RefreshState = { ...baseState, baselineDataLastEdit: '2024-01-01', brokerAttestedAt: '2024-06-01' };
    const d = evaluateRefresh(old, { ok: true, dataLastEditDateMs: Date.parse('2024-01-01T00:00:00Z') }, NOW);
    check('no change + >18mo dormant → dormancy_alert', d.outcome === 'dormancy_alert' && d.dormancy === true && d.alert !== null);
  }
  {
    // anchor uses the MORE RECENT of baseline/attested: attested 2026-06-27 keeps it fresh
    const d = evaluateRefresh(baseState, { ok: true, dataLastEditDateMs: MS_2026_05_19 }, NOW);
    check('recent attestation suppresses dormancy (anchor = attested)', d.dormancy === false);
  }

  console.log('\n=== handleRequest wiring ===');
  const env = (over: Partial<HandlerEnv['deps']> = {}, state: RefreshState | null = baseState): HandlerEnv & { store: ReturnType<typeof fakeStore>; alerts: ReturnType<typeof fakeAlerts> } => {
    const store = fakeStore(state);
    const alerts = fakeAlerts();
    return {
      secret: 's3cret', now: () => NOW,
      deps: { fetchC8: async () => ({ ok: true, dataLastEditDateMs: MS_2026_05_19 }), store, alerts, ...over },
      store, alerts,
    } as HandlerEnv & { store: ReturnType<typeof fakeStore>; alerts: ReturnType<typeof fakeAlerts> };
  };
  function post(secret: string): Request {
    return new Request('https://x/functions/v1/city-zip-refresh', {
      method: 'POST', headers: { 'x-city-zip-refresh-secret': secret },
    });
  }

  {
    const e = env();
    const r = await handleRequest(post('wrong'), e);
    check('bad secret → 401', r.status === 401);
    check('bad secret → no store write', e.store.runs.length === 0);
  }
  {
    const e = env();
    const r = await handleRequest(post('s3cret'), e);
    const body = await r.json();
    check('valid + no_diff → 200', r.status === 200 && body.outcome === 'no_diff');
    check('no_diff records a run', e.store.runs.length === 1);
    check('no_diff updates state', e.store.updates.length === 1);
    check('no_diff sends no alert', e.alerts.sent.length === 0);
  }
  {
    const e = env({ fetchC8: async () => ({ ok: true, dataLastEditDateMs: MS_2026_06_10 }) });
    const r = await handleRequest(post('s3cret'), e);
    const body = await r.json();
    check('change_detected → 200 + alert sent', r.status === 200 && body.outcome === 'change_detected' && e.alerts.sent.length === 1);
    check('change_detected run row marked alert_sent', (e.store.runs[0] as { alertSent: boolean }).alertSent === true);
  }
  {
    const e = env({}, null);
    const r = await handleRequest(post('s3cret'), e);
    check('missing state row → 500', r.status === 500);
  }

  console.log('\n----------------------------------------');
  console.log(`  ${passed} passed, ${failed} failed`);
  console.log('----------------------------------------');
  if (failed > 0) process.exit(1);
}
main();
