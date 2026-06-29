import { runLaProduceSequence } from './laProduceClient';
import { boundFetch } from '../http/boundFetch';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  ✓ ' + name); }
  else { failed++; console.log('  ✗ ' + name); }
}

// Binding-sensitive global fetch (see lib/http/boundFetch.test.ts for the receiver
// rationale). Returns 409 for verify-la so a binding-SAFE call reaches the gate
// logic and yields 'blocked' — distinct from the 'error' a thrown fetch produces.
function biFetch(this: unknown): Promise<Response> {
  if (this !== undefined && this !== globalThis) {
    throw new TypeError("Failed to execute 'fetch' on 'Window': Illegal invocation");
  }
  return Promise.resolve(
    new Response(JSON.stringify({ code: 'JURISDICTION_LA_OVERLAY_NOT_YET_AVAILABLE' }), { status: 409 }),
  );
}

async function main() {
  const realFetch = globalThis.fetch;
  (globalThis as { fetch: typeof fetch }).fetch = biFetch as unknown as typeof fetch;
  try {
    // SAFE: boundFetch -> sequence reaches the server gate (blocked), NOT a fetch error.
    const ok = await runLaProduceSequence({
      verdict: 'confirmed_la',
      lahdCopyVersion: 'v1',
      baseName: 'test',
      fetchImpl: boundFetch,
    });
    check('produce + boundFetch reaches server gate (blocked, not a fetch error)',
      ok.kind === 'blocked');

    // NEGATIVE: bare binding-sensitive fetch -> deps.fetchImpl(...) throws ->
    // sequence returns { kind: 'error' } from the verify-la fetch catch.
    const bad = await runLaProduceSequence({
      verdict: 'confirmed_la',
      lahdCopyVersion: 'v1',
      baseName: 'test',
      fetchImpl: biFetch as unknown as typeof fetch,
    });
    check('produce + bare binding-sensitive fetch -> error (the bug)',
      bad.kind === 'error' && /fetch/.test(bad.detail));
  } finally {
    (globalThis as { fetch: typeof fetch }).fetch = realFetch;
  }
}

main().then(() => {
  console.log('\n  ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
});
