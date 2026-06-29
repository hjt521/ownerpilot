import { boundFetch } from './boundFetch';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  ✓ ' + name); }
  else { failed++; console.log('  ✗ ' + name); }
}

// A fetch double that emulates the browser's window.fetch receiver enforcement.
// TWO receivers are accepted as valid: `undefined` (strict-mode / spread calls
// where the engine binds no receiver) and `globalThis` (a normal global call).
// Any OTHER receiver — e.g. a deps object from `obj.fetchImpl(...)` — is the bug,
// so we throw exactly as the browser does. Do NOT simplify to `this !== globalThis`:
// that would wrongly reject legitimate strict-mode call sites.
function bindingSensitiveFetch(this: unknown, ..._args: unknown[]): Promise<Response> {
  if (this !== undefined && this !== globalThis) {
    throw new TypeError("Failed to execute 'fetch' on 'Window': Illegal invocation");
  }
  return Promise.resolve(new Response('{}', { status: 200 }));
}

async function main() {
  // 1. POSITIVE CONTROL: a bare fetch in a deps slot, called as `obj.fetchImpl(...)`,
  //    MUST trip the receiver contract — this proves the test catches the real bug.
  const bad = { fetchImpl: bindingSensitiveFetch };
  let threw = false;
  try { bad.fetchImpl(); } catch (e) {
    threw = e instanceof TypeError && /Illegal invocation/.test((e as Error).message);
  }
  check('positive control: bare fetch as deps method throws Illegal invocation', threw);

  // 2. boundFetch wrapping a binding-sensitive global is SAFE even when called as a
  //    deps method (the arrow ignores `this`, calls fetch with global binding).
  const realFetch = globalThis.fetch;
  (globalThis as { fetch: typeof fetch }).fetch = bindingSensitiveFetch as unknown as typeof fetch;
  try {
    const good: { fetchImpl: typeof fetch } = { fetchImpl: boundFetch };
    let ok = false;
    try { const r = await good.fetchImpl('https://x.test'); ok = r.status === 200; } catch { ok = false; }
    check('boundFetch via deps method does NOT throw (binding-safe)', ok);
  } finally {
    (globalThis as { fetch: typeof fetch }).fetch = realFetch;
  }
}

main().then(() => {
  console.log('\n  ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
});
