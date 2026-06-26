// Boundary tests for the parcel-health Edge handler (Deno-free, injected deps).
// Covers: auth (401 on missing/wrong secret), happy path (both recorded, no transition,
// no alert), transition (status change fires alerts.send), read-null skip (getStatus
// returns null → endpoint skipped), and error isolation (one endpoint throws, the other
// still records). No network, no Deno: all deps are fakes.

import assert from 'node:assert';
import {
  handleRequest,
  type HandlerEnv,
  type EndpointCycleResult,
} from './handler.ts';
import type { Endpoint, ProbeResult, AlertEvent } from './_core/parcelHealthCore.ts';
import type { ParcelHealthStore, StoredStatus } from './store.ts';

const SECRET = 'test-secret-value';
const FIXED = new Date('2026-06-26T00:00:00.000Z');
const HEALTHY: ProbeResult = { outcome: 'healthy', reason: null };

function makeReq(secret?: string): Request {
  const headers: Record<string, string> = {};
  if (secret !== undefined) headers['x-parcel-health-secret'] = secret;
  return new Request('http://localhost/parcel-health', { method: 'POST', headers });
}

interface Recorder {
  probes: Array<{ endpoint: Endpoint; result: ProbeResult }>;
  statuses: Array<{ endpoint: Endpoint; status: string; lastSuccessAt: string | null }>;
}

// Fake store: configurable prior status per endpoint (undefined → default not_live/0),
// optional throwOn to simulate an unexpected getStatus throw, and a `nullOn` set to
// simulate the store's read-failure → null contract.
function makeStore(
  priors: Partial<Record<Endpoint, StoredStatus>>,
  rec: Recorder,
  opts: { throwOn?: Endpoint; nullOn?: Endpoint } = {},
): ParcelHealthStore {
  const DEFAULT: StoredStatus = { status: 'not_live', consecutiveFailures: 0, lastSuccessAt: null, lastProbeAt: null };
  return {
    async getStatus(endpoint) {
      if (opts.throwOn === endpoint) throw new Error('boom-getStatus');
      if (opts.nullOn === endpoint) return null;
      return priors[endpoint] ?? DEFAULT;
    },
    async recordProbe(endpoint, result) { rec.probes.push({ endpoint, result }); },
    async setStatus(endpoint, rolled, _probedAt, lastSuccessAt) {
      rec.statuses.push({ endpoint, status: rolled.status, lastSuccessAt });
    },
  };
}

function makeProbes(
  results: Record<Endpoint, ProbeResult>,
): Record<Endpoint, () => Promise<ProbeResult>> {
  return {
    county: async () => results.county,
    zimas: async () => results.zimas,
  };
}

function makeEnv(
  store: ParcelHealthStore,
  probes: Record<Endpoint, () => Promise<ProbeResult>>,
  sent: AlertEvent[],
  secret: string | undefined = SECRET,
): HandlerEnv {
  return {
    secret,
    now: () => FIXED,
    deps: {
      probes,
      store,
      alerts: {
        kind: 'email',
        async send(e) { sent.push(e); return { ok: true }; },
      },
    },
  };
}

let passed = 0;
async function check(name: string, fn: () => Promise<void>): Promise<void> {
  await fn();
  passed++;
  console.log(`  \u2713 ${name}`);
}

(async () => {
  // 1. Auth — missing header → 401, no work done.
  await check('401 when no secret header, no probes run', async () => {
    const rec: Recorder = { probes: [], statuses: [] };
    const sent: AlertEvent[] = [];
    const env = makeEnv(makeStore({}, rec), makeProbes({ county: HEALTHY, zimas: HEALTHY }), sent);
    const res = await handleRequest(makeReq(undefined), env);
    assert.strictEqual(res.status, 401);
    assert.strictEqual(rec.probes.length, 0);
  });

  // 1b. Auth — wrong secret → 401.
  await check('401 when secret mismatches', async () => {
    const rec: Recorder = { probes: [], statuses: [] };
    const sent: AlertEvent[] = [];
    const env = makeEnv(makeStore({}, rec), makeProbes({ county: HEALTHY, zimas: HEALTHY }), sent);
    const res = await handleRequest(makeReq('not-the-secret'), env);
    assert.strictEqual(res.status, 401);
    assert.strictEqual(rec.probes.length, 0);
  });

  // 2. Happy path — both already live, both healthy → recorded, no transition, no alert.
  await check('happy path records both, no transition, no alert', async () => {
    const rec: Recorder = { probes: [], statuses: [] };
    const sent: AlertEvent[] = [];
    const live: StoredStatus = { status: 'live', consecutiveFailures: 0, lastSuccessAt: '2026-06-25T00:00:00.000Z', lastProbeAt: '2026-06-25T00:00:00.000Z' };
    const env = makeEnv(
      makeStore({ county: live, zimas: live }, rec),
      makeProbes({ county: HEALTHY, zimas: HEALTHY }),
      sent,
    );
    const res = await handleRequest(makeReq(SECRET), env);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(rec.probes.length, 2);
    assert.strictEqual(rec.statuses.length, 2);
    assert.strictEqual(sent.length, 0);
    const body = await res.json();
    assert.strictEqual(body.endpoints.length, 2);
    assert.strictEqual(body.probedAt, FIXED.toISOString());
  });

  // 3. Transition — county was not_live, healthy probe → to_live → alert.send fired once.
  await check('transition to_live fires one alert with this-probe lastSuccessAt', async () => {
    const rec: Recorder = { probes: [], statuses: [] };
    const sent: AlertEvent[] = [];
    const env = makeEnv(
      makeStore({
        county: { status: 'not_live', consecutiveFailures: 1, lastSuccessAt: null, lastProbeAt: '2026-06-25T00:00:00.000Z' },
        zimas: { status: 'live', consecutiveFailures: 0, lastSuccessAt: '2026-06-25T00:00:00.000Z', lastProbeAt: '2026-06-25T00:00:00.000Z' },
      }, rec),
      makeProbes({ county: HEALTHY, zimas: HEALTHY }),
      sent,
    );
    const res = await handleRequest(makeReq(SECRET), env);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(sent.length, 1);
    assert.strictEqual(sent[0].endpoint, 'county');
    assert.strictEqual(sent[0].transition, 'to_live');
    // healthy probe → lastSuccessAt is this probe (FIXED), not the prior null.
    assert.strictEqual(sent[0].context.lastSuccessAt, FIXED.toISOString());
    // to_live has no reason.
    assert.strictEqual(sent[0].reason, undefined);
  });

  // 3b. Transition — county was live, two-consecutive failure flips to_not_live with reason.
  await check('transition to_not_live carries the failing reason', async () => {
    const rec: Recorder = { probes: [], statuses: [] };
    const sent: AlertEvent[] = [];
    const env = makeEnv(
      makeStore({
        // consecutiveFailures already 1 and live → this 2nd failure flips to not_live.
        county: { status: 'live', consecutiveFailures: 1, lastSuccessAt: '2026-06-24T00:00:00.000Z', lastProbeAt: '2026-06-25T00:00:00.000Z' },
        zimas: { status: 'live', consecutiveFailures: 0, lastSuccessAt: '2026-06-25T00:00:00.000Z', lastProbeAt: '2026-06-25T00:00:00.000Z' },
      }, rec),
      makeProbes({ county: { outcome: 'unhealthy', reason: 'response_shape' }, zimas: HEALTHY }),
      sent,
    );
    const res = await handleRequest(makeReq(SECRET), env);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(sent.length, 1);
    assert.strictEqual(sent[0].endpoint, 'county');
    assert.strictEqual(sent[0].transition, 'to_not_live');
    assert.strictEqual(sent[0].reason, 'response_shape');
    // unhealthy probe → lastSuccessAt preserves prior (ages toward freshness window).
    assert.strictEqual(sent[0].context.lastSuccessAt, '2026-06-24T00:00:00.000Z');
  });

  // 4. Read-null skip — getStatus null → FOUR-PROPERTY LOCK (sub-flag A, broker-ruled):
  //    (a) recordProbe NOT called for the skipped endpoint, (b) setStatus NOT called,
  //    (c) alert.send NOT called at all, (d) a parcel_health_skip log line fired naming
  //    the endpoint and the read-failure reason. The other endpoint still records.
  //    If any future refactor lets a skip leak into a partial write or spurious alert,
  //    one of these four assertions goes red.
  await check('read-null skip: four-property lock (no probe write, no status, no alert, skip logged)', async () => {
    const rec: Recorder = { probes: [], statuses: [] };
    const sent: AlertEvent[] = [];
    const live: StoredStatus = { status: 'live', consecutiveFailures: 0, lastSuccessAt: '2026-06-25T00:00:00.000Z', lastProbeAt: '2026-06-25T00:00:00.000Z' };
    const env = makeEnv(
      makeStore({ zimas: live }, rec, { nullOn: 'county' }),
      makeProbes({ county: HEALTHY, zimas: HEALTHY }),
      sent,
    );

    // Capture structured log lines to assert the skip event.
    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => { logs.push(String(args[0])); };
    let res!: Response;
    try {
      res = await handleRequest(makeReq(SECRET), env);
    } finally {
      console.log = origLog;
    }

    assert.strictEqual(res.status, 200);
    // (a) county recordProbe NOT called; only zimas recorded.
    assert.ok(!rec.probes.some((p) => p.endpoint === 'county'), 'recordProbe must not fire for skipped county');
    assert.strictEqual(rec.probes.length, 1);
    assert.strictEqual(rec.probes[0].endpoint, 'zimas');
    // (b) county setStatus NOT called.
    assert.ok(!rec.statuses.some((s) => s.endpoint === 'county'), 'setStatus must not fire for skipped county');
    // (c) no alert at all (county skipped; zimas healthy + already live → no transition).
    assert.strictEqual(sent.length, 0);
    // (d) parcel_health_skip log line fired naming the endpoint + the read-failure reason.
    const skip = logs
      .map((l) => { try { return JSON.parse(l) as Record<string, unknown>; } catch { return null; } })
      .find((o) => o !== null && o.event === 'parcel_health_skip' && o.endpoint === 'county');
    assert.ok(skip, 'a parcel_health_skip line must fire naming county');
    assert.strictEqual(skip!.reason, 'status-read-failed');
    // county surfaced as skipped in the response body.
    const body = await res.json();
    const county = body.endpoints.find((e: EndpointCycleResult) => e.endpoint === 'county');
    assert.strictEqual(county.outcome, 'skipped');
  });

  // 5. Error isolation — county getStatus throws → county skipped, zimas still records.
  await check('one endpoint throw does not abort the other', async () => {
    const rec: Recorder = { probes: [], statuses: [] };
    const sent: AlertEvent[] = [];
    const live: StoredStatus = { status: 'live', consecutiveFailures: 0, lastSuccessAt: '2026-06-25T00:00:00.000Z', lastProbeAt: '2026-06-25T00:00:00.000Z' };
    const env = makeEnv(
      makeStore({ zimas: live }, rec, { throwOn: 'county' }),
      makeProbes({ county: HEALTHY, zimas: HEALTHY }),
      sent,
    );
    const res = await handleRequest(makeReq(SECRET), env);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(rec.probes.length, 1);
    assert.strictEqual(rec.probes[0].endpoint, 'zimas');
    const body = await res.json();
    const county = body.endpoints.find((e: EndpointCycleResult) => e.endpoint === 'county');
    assert.strictEqual(county.outcome, 'skipped');
  });

  console.log(`\n${passed} passed`);
})();
