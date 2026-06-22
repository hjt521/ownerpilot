import { runJurisdictionResolution, type BridgeDeps } from './jurisdictionBridge';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  \u2713 ' + name); }
  else { failed++; console.log('  \u2717 ' + name); }
}

const ADDR = '123 Main St, Los Angeles, CA';

function okResponse(disposition: string): Response {
  return {
    status: 200,
    json: async () => ({ disposition, reviewReason: null }),
  } as unknown as Response;
}
function statusResponse(status: number, body: object): Response {
  return {
    status,
    json: async () => body,
  } as unknown as Response;
}

function deps(over: Partial<BridgeDeps>): BridgeDeps {
  return {
    isGateOpen: () => true,
    fetchImpl: (async () => okResponse('not_la')) as unknown as typeof fetch,
    ...over,
  };
}

async function main() {
  // --- CLOSED GATE: the load-bearing 4d path. No fetch, no verdict. ---
  let fetchCalled = false;
  const r1 = await runJurisdictionResolution(ADDR, deps({
    isGateOpen: () => false,
    fetchImpl: (async () => { fetchCalled = true; return okResponse('not_la'); }) as unknown as typeof fetch,
  }));
  check('closed gate -> skipped_gate_closed', r1.kind === 'skipped_gate_closed');
  check('closed gate -> fetch NOT called (dormant-by-gate)', fetchCalled === false);

  // --- empty address: no fetch ---
  let fetchCalled2 = false;
  const r2 = await runJurisdictionResolution('   ', deps({
    fetchImpl: (async () => { fetchCalled2 = true; return okResponse('not_la'); }) as unknown as typeof fetch,
  }));
  check('empty address -> skipped_no_address', r2.kind === 'skipped_no_address');
  check('empty address -> fetch NOT called', fetchCalled2 === false);

  // --- success dispositions map 1:1 ---
  for (const d of ['confirmed_la', 'not_la', 'manual_review'] as const) {
    const r = await runJurisdictionResolution(ADDR, deps({
      fetchImpl: (async () => okResponse(d)) as unknown as typeof fetch,
    }));
    check(`disposition ${d} -> verdict ${d}`, r.kind === 'verdict' && r.verdict === d);
    check(`disposition ${d} -> addressKey normalized`,
      r.kind === 'verdict' && r.addressKey === '123 main st, los angeles, ca');
  }

  // --- 503 la_production_gate_closed (defensive) -> resolution_failed, NOT a pass ---
  const r3 = await runJurisdictionResolution(ADDR, deps({
    fetchImpl: (async () => statusResponse(503, { error: 'la_production_gate_closed' })) as unknown as typeof fetch,
  }));
  check('503 gate_closed -> resolution_failed (no silent pass)',
    r3.kind === 'verdict' && r3.verdict === 'resolution_failed');

  // --- 503 geocode_unavailable -> resolution_failed ---
  const r4 = await runJurisdictionResolution(ADDR, deps({
    fetchImpl: (async () => statusResponse(503, { error: 'geocode_unavailable' })) as unknown as typeof fetch,
  }));
  check('503 unavailable -> resolution_failed', r4.kind === 'verdict' && r4.verdict === 'resolution_failed');

  // --- 400 -> resolution_failed ---
  const r5 = await runJurisdictionResolution(ADDR, deps({
    fetchImpl: (async () => statusResponse(400, { error: 'address_required' })) as unknown as typeof fetch,
  }));
  check('400 -> resolution_failed', r5.kind === 'verdict' && r5.verdict === 'resolution_failed');

  // --- network throw -> resolution_failed (NOT a silent stub fallback) ---
  const r6 = await runJurisdictionResolution(ADDR, deps({
    fetchImpl: (async () => { throw new Error('network down'); }) as unknown as typeof fetch,
  }));
  check('network error -> resolution_failed (no silent fallback)',
    r6.kind === 'verdict' && r6.verdict === 'resolution_failed');

  // --- abort -> aborted (discarded by caller, not a verdict) ---
  const abortErr = Object.assign(new Error('aborted'), { name: 'AbortError' });
  const r7 = await runJurisdictionResolution(ADDR, deps({
    fetchImpl: (async () => { throw abortErr; }) as unknown as typeof fetch,
  }));
  check('abort error -> aborted (not a verdict)', r7.kind === 'aborted');

  // --- signal already aborted after fetch -> aborted ---
  const ac = new AbortController();
  ac.abort();
  const r8 = await runJurisdictionResolution(ADDR, deps({
    signal: ac.signal,
    fetchImpl: (async () => okResponse('not_la')) as unknown as typeof fetch,
  }));
  check('post-fetch aborted signal -> aborted', r8.kind === 'aborted');

  // --- malformed 200 body (bad json) -> resolution_failed ---
  const r9 = await runJurisdictionResolution(ADDR, deps({
    fetchImpl: (async () => ({ status: 200, json: async () => { throw new Error('bad json'); } })) as unknown as typeof fetch,
  }));
  check('malformed 200 body -> resolution_failed', r9.kind === 'verdict' && r9.verdict === 'resolution_failed');

  // --- unexpected disposition string -> resolution_failed (never a pass) ---
  const r10 = await runJurisdictionResolution(ADDR, deps({
    fetchImpl: (async () => okResponse('something_weird')) as unknown as typeof fetch,
  }));
  check('unexpected disposition -> resolution_failed', r10.kind === 'verdict' && r10.verdict === 'resolution_failed');
}

main().then(() => {
  console.log('\n  ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
}).catch((e) => { console.error(e); process.exit(1); });
