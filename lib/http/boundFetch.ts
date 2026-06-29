/**
 * Global-bound fetch.
 *
 * The browser's `window.fetch` enforces its receiver: calling it with
 * `this !== window` throws `TypeError: Failed to execute 'fetch' on 'Window':
 * Illegal invocation`. Passing the bare reference `fetch` into a deps object and
 * calling it as `deps.fetchImpl(...)` rebinds `this` to the deps object and
 * throws — synchronously, before any request leaves the browser. That bug broke
 * all client-side jurisdiction resolution and the Phase 2D produce path (both
 * passed CI because tests inject a stub fetch that has no receiver requirement).
 *
 * This wrapper is an arrow, so it ignores `this` entirely and always calls
 * `fetch` with default (global) binding. ALWAYS use this for an injected fetch;
 * never pass bare `fetch` / `window.fetch` / `globalThis.fetch`.
 *
 * Enforced by scripts/ci/check_fetch_binding.mjs (static) and
 * lib/http/boundFetch.test.ts + the *.binding.test.ts suites (runtime contract).
 */
export const boundFetch: typeof fetch = (...args) => fetch(...args);
