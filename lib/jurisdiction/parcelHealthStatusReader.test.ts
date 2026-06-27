/**
 * parcel_health_status reader tests — narrow-read, fail-closed, role-boundary.
 * (predicate-6 ruling 2026-06-27, Slice 1; determination §6/sub-fork-2; migration 019.)
 */
import {
  readParcelHealthStatus,
  createParcelHealthStatusReader,
  type FetchLike,
  type ParcelHealthReaderEnv,
} from './parcelHealthStatusReader';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  ✓ ' + name); }
  else { failed++; console.log('  ✗ ' + name); }
}

const ENV: ParcelHealthReaderEnv = {
  baseUrl: 'https://proj.supabase.co',
  anonKey: 'anon-key',
  readerJwt: 'reader-jwt-token',
};

function okFetch(body: unknown, capture?: { url?: string; init?: any }): FetchLike {
  return async (url, init) => {
    if (capture) { capture.url = url; capture.init = init; }
    return { ok: true, status: 200, json: async () => body };
  };
}
async function expectThrow(name: string, fn: () => Promise<unknown>) {
  try { await fn(); check(name, false); }
  catch { check(name, true); }
}

async function main() {
  console.log('\n=== round-trip read ===');
  {
    const rows = await readParcelHealthStatus(ENV, okFetch([
      { endpoint: 'county', current_status: 'live', last_probe_at: '2026-06-27T20:30:00Z' },
      { endpoint: 'zimas', current_status: 'not_live', last_probe_at: null },
    ]));
    check('maps 2 rows', rows.length === 2);
    check('county mapped live + lastProbeAt',
      rows[0].endpoint === 'county' && rows[0].currentStatus === 'live' && rows[0].lastProbeAt === '2026-06-27T20:30:00Z');
    check('zimas mapped not_live + null lastProbeAt',
      rows[1].currentStatus === 'not_live' && rows[1].lastProbeAt === null);
    check('unknown status coerced to not_live (fail-safe)',
      (await readParcelHealthStatus(ENV, okFetch([{ endpoint: 'county', current_status: 'weird', last_probe_at: null }])))[0].currentStatus === 'not_live');
  }

  console.log('\n=== role boundary (reader JWT; narrow table+columns; no service_role) ===');
  {
    const cap: { url?: string; init?: any } = {};
    await readParcelHealthStatus(ENV, okFetch([], cap));
    check('Authorization is the reader JWT Bearer', cap.init.headers.Authorization === 'Bearer reader-jwt-token');
    check('apikey is the anon key', cap.init.headers.apikey === 'anon-key');
    check('queries ONLY parcel_health_status', (cap.url ?? '').includes('/rest/v1/parcel_health_status'));
    check('narrow column projection only', (cap.url ?? '').includes('select=endpoint,current_status,last_probe_at'));
    check('no other table in the URL',
      !/\/rest\/v1\/(?!parcel_health_status)/.test(cap.url ?? ''));
    check('no-store (live read, never cached)', cap.init.cache === 'no-store');
  }

  console.log('\n=== fail-closed (every error path THROWS) ===');
  await expectThrow('missing readerJwt → throw', () =>
    readParcelHealthStatus({ ...ENV, readerJwt: undefined }, okFetch([])));
  await expectThrow('missing baseUrl → throw', () =>
    readParcelHealthStatus({ ...ENV, baseUrl: undefined }, okFetch([])));
  await expectThrow('fetch throws → throw', () =>
    readParcelHealthStatus(ENV, async () => { throw new Error('network'); }));
  await expectThrow('401 (RLS denial) → throw', () =>
    readParcelHealthStatus(ENV, async () => ({ ok: false, status: 401, json: async () => ({}) })));
  await expectThrow('503 → throw', () =>
    readParcelHealthStatus(ENV, async () => ({ ok: false, status: 503, json: async () => ({}) })));
  await expectThrow('malformed body → throw', () =>
    readParcelHealthStatus(ENV, async () => ({ ok: true, status: 200, json: async () => { throw new Error('bad json'); } })));
  await expectThrow('non-array body → throw', () =>
    readParcelHealthStatus(ENV, okFetch({ not: 'an array' })));

  console.log('\n=== createParcelHealthStatusReader wraps read() ===');
  {
    const reader = createParcelHealthStatusReader(ENV, okFetch([
      { endpoint: 'county', current_status: 'live', last_probe_at: '2026-06-27T20:30:00Z' },
    ]));
    const rows = await reader.read();
    check('reader.read() returns mapped rows', rows.length === 1 && rows[0].endpoint === 'county');
  }

  console.log('\n----------------------------------------');
  console.log(`  ${passed} passed, ${failed} failed`);
  console.log('----------------------------------------');
  if (failed > 0) process.exit(1);
}
main();
