import { runJurisdictionResolution } from './jurisdictionBridge';
import { boundFetch } from '../http/boundFetch';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  ✓ ' + name); }
  else { failed++; console.log('  ✗ ' + name); }
}

// Binding-sensitive global fetch (see lib/http/boundFetch.test.ts for why both
// `undefined` and `globalThis` are accepted receivers). Returns a confirmed_la 200.
function biFetch(this: unknown): Promise<Response> {
  if (this !== undefined && this !== globalThis) {
    throw new TypeError("Failed to execute 'fetch' on 'Window': Illegal invocation");
  }
  return Promise.resolve(
    new Response(JSON.stringify({ disposition: 'confirmed_la', reviewReason: null }), { status: 200 }),
  );
}

async function main() {
  const realFetch = globalThis.fetch;
  (globalThis as { fetch: typeof fetch }).fetch = biFetch as unknown as typeof fetch;
  try {
    // SAFE: boundFetch -> the bridge gets a real verdict, NOT a binding failure.
    const ok = await runJurisdictionResolution('123 Main St, Los Angeles, CA', {
      isGateOpen: () => true,
      fetchImpl: boundFetch,
    });
    check('bridge + boundFetch resolves a real verdict (confirmed_la)',
      ok.kind === 'verdict' && ok.verdict === 'confirmed_la');

    // NEGATIVE: bare binding-sensitive fetch as fetchImpl -> bridge calls it as
    // deps.fetchImpl(...) -> this=deps -> throws -> maps to resolution_failed.
    // Documents the exact failure mode the guard prevents.
    const bad = await runJurisdictionResolution('123 Main St, Los Angeles, CA', {
      isGateOpen: () => true,
      fetchImpl: biFetch as unknown as typeof fetch,
    });
    check('bridge + bare binding-sensitive fetch falls to resolution_failed (the bug)',
      bad.kind === 'verdict' && bad.verdict === 'resolution_failed');
  } finally {
    (globalThis as { fetch: typeof fetch }).fetch = realFetch;
  }
}

main().then(() => {
  console.log('\n  ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
});
