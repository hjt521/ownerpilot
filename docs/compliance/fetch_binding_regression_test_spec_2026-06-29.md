# Engineering spec — fetch-binding regression guard (for broker ratification)

**Date:** 2026-06-29
**Author:** Engineering (Claude)
**Status:** SPEC — ready for broker ratification; implement + squash in the Phase 2D PR after Tests B/C/D pass
**§0 fork check:** None surfaced. This is test/CI tooling only — no statutory or compliance prose, no disposition logic, no verdict or fail-closed change. Flagging for visibility, not as a fork.

---

## §0 — What we're guarding against (post-mortem)

The browser's `fetch` is a method of `window` and enforces its receiver: calling it with `this !== window` throws `TypeError: Failed to execute 'fetch' on 'Window': Illegal invocation`.

Two call sites passed the bare reference `fetchImpl: fetch` into a deps object, and the consuming code called it as `deps.fetchImpl(...)` — which sets `this = deps`, not `window`. Result: the call threw **synchronously, before any network request left the browser**:

1. `components/notice-flow.tsx` — the jurisdiction-resolution bridge (`runJurisdictionResolution`). Broke **all** client-side jurisdiction detection → every LA address fell to `resolution_failed` ("couldn't verify jurisdiction").
2. `components/la-produce-panel.tsx` — the Phase 2D produce sequence (`runLaProduceSequence`). Broke the produce path → `ATTACHMENT_FAILED`.

**Why CI was green the whole time:** every unit test injects a *stub* `fetchImpl`, which is a plain function with no receiver requirement. The stub never exercises the browser's real binding contract, so the bug was invisible to the suite. That CI gap — not the binding bug — is the durable lesson; this guard closes it.

**The fix shipped:** both call sites now pass `(...args) => fetch(...args)` (an arrow that ignores `this` and calls `fetch` with default/global binding). This spec hardens that so it can never silently regress.

---

## §1 — Recommended refactor (precondition for a clean guard)

Extract one shared, tested wrapper and use it at every call site. This makes Layer A trivially enforceable ("never pass bare `fetch`; use `boundFetch`") and gives Layer B a single unit to prove.

**New file:** `lib/http/boundFetch.ts`

```ts
/**
 * Global-bound fetch. The browser's window.fetch throws
 * "TypeError: Illegal invocation" if called with this !== window. Passing bare
 * `fetch` into a deps object and calling it as `deps.fetchImpl(...)` rebinds
 * `this` to the deps object and throws. This wrapper ignores `this` and always
 * calls fetch with default (global) binding. ALWAYS use this for injected fetch;
 * never pass bare `fetch`. Guarded by scripts/ci/check_fetch_binding.mjs.
 */
export const boundFetch: typeof fetch = (...args) => fetch(...args);
```

**Edit both call sites** to import and pass `boundFetch`:
- `components/notice-flow.tsx`: `fetchImpl: boundFetch,`
- `components/la-produce-panel.tsx`: `fetchImpl: boundFetch,`

(Functionally identical to the inline arrows already shipped; this just centralizes it so the guard has one allowed form.)

---

## §2 — Layer A: static call-site guard (CI, author-time)

**New file:** `scripts/ci/check_fetch_binding.mjs`

**What it does:** scans `lib/`, `components/`, `app/` (`.ts`/`.tsx`, excluding `*.test.*`) and **fails (exit 1)** if it finds a bare `fetch` reference passed as a value into an injected-fetch slot.

**Match (fail) patterns:**
- `fetchImpl:\s*fetch\b` (object-literal slot — the exact bug)
- `fetchImpl:\s*window\.fetch\b` and `fetchImpl:\s*globalThis\.fetch\b` (still binding-fragile when later destructured/aliased)

**Allowed forms (pass):** `fetchImpl: boundFetch`, `fetchImpl: (...args) => fetch(...args)`, `fetchImpl: fetch.bind(...)`, and any stub in test files (excluded by glob).

**Exit codes:** `0` clean; `1` violation (prints file:line + the offending text + a one-line remediation pointing to `boundFetch`).

**package.json:** add `"ci:verify-fetch-binding": "node scripts/ci/check_fetch_binding.mjs"` and add it to the CI workflow's check set (same gate group as `ci:verify-locked-prose`).

---

## §3 — Layer B: runtime binding-contract test (catches the class)

A test double that **emulates the browser's receiver enforcement**: it throws `TypeError: Illegal invocation` when invoked with `this` that is not the expected global. Run the real bridge + produce sequences against it.

**New file:** `lib/http/boundFetch.test.ts`

Assertion shapes:

```
// A fetch double that throws like window.fetch does on a bad receiver.
function bindingSensitiveFetch(this: unknown, ..._args) {
  if (this !== undefined && this !== globalThis) {
    throw new TypeError("Failed to execute 'fetch' on 'Window': Illegal invocation");
  }
  return Promise.resolve(new Response('{}', { status: 200 }));
}

// 1. POSITIVE CONTROL — bare fetch in a deps slot MUST trip the contract,
//    proving the test actually catches the bug:
const bad = { fetchImpl: bindingSensitiveFetch };
expect(() => bad.fetchImpl()).toThrow(/Illegal invocation/);   // called as method -> this=bad

// 2. boundFetch wrapping a binding-sensitive global MUST be safe:
const realFetch = globalThis.fetch;
globalThis.fetch = bindingSensitiveFetch as typeof fetch;
try {
  const good = { fetchImpl: boundFetch };
  await expect(good.fetchImpl('https://x.test')).resolves.toBeDefined(); // no throw
} finally { globalThis.fetch = realFetch; }
```

**New file:** `lib/flow/jurisdictionBridge.binding.test.ts` — call `runJurisdictionResolution('123 Main St', { isGateOpen: () => true, fetchImpl: boundFetch, signal: undefined })` with `globalThis.fetch` swapped to `bindingSensitiveFetch` (returning a 200 `{disposition:'confirmed_la'}`); assert the result is `kind:'verdict'` with a real disposition and **NOT** `resolution_failed` from a binding throw. Add the negative: same call with `fetchImpl: bindingSensitiveFetch` (bare) → asserts it returns `resolution_failed` (documents the failure mode the guard prevents).

**New file:** `lib/produce/laProduceClient.binding.test.ts` — same shape against `runLaProduceSequence` (verify-la + la-packet path), asserting the binding-safe path reaches `ready`/`blocked` on the gate rather than failing on the fetch receiver.

Run them via the existing `node scripts/run_tests.mjs` (tsx) runner so they join the suite + the pretest typecheck.

---

## §4 — Engineering master-prompt (drop-in for implementation)

```
Implement the fetch-binding regression guard per
docs/compliance/fetch_binding_regression_test_spec_2026-06-29.md:

1. Create lib/http/boundFetch.ts exporting `boundFetch: typeof fetch = (...args) => fetch(...args)`
   with the doc comment from §1.
2. Replace the inline fetch arrows in components/notice-flow.tsx and
   components/la-produce-panel.tsx with `fetchImpl: boundFetch` (import boundFetch).
3. Create scripts/ci/check_fetch_binding.mjs per §2 (fail on bare fetch in fetchImpl
   slots; allow boundFetch / arrow / .bind; exclude *.test.*). Add npm script
   "ci:verify-fetch-binding" and wire it into the CI workflow check group.
4. Add the three tests in §3 (boundFetch.test.ts, jurisdictionBridge.binding.test.ts,
   laProduceClient.binding.test.ts) using the bindingSensitiveFetch double, including
   the positive control (bare fetch trips) and the binding-safe assertions.
5. Run: npm run ci:verify-fetch-binding && npx tsc --noEmit && node scripts/run_tests.mjs
   — all must pass. Confirm check_fetch_binding.mjs would FAIL if a bare `fetchImpl: fetch`
   were reintroduced (temporarily add one, see it fail, remove it).
```

---

## §5 — Squash + commit hygiene (host-side, JT runs git)

The branch carries the instrumentation commits used to find the bug (`debug(...): temp log...`, `debug(...): log fetch lifecycle...`) plus the staged fixes. The final code is already clean (logs removed); squash so the PR history reads as the shipped change, not the hunt.

```
git rebase -i origin/main        # or use GitHub "Squash and merge" at merge time
```

Squash the jurisdiction/produce-fix + debug commits into one. **Keep the body verbose** — it's the post-mortem record:

```
fix(la): bind injected fetch to global; add regression guard

Two call sites passed bare `fetch` into a deps object and called it as
deps.fetchImpl(...), rebinding `this` to the deps object. The browser's
window.fetch enforces its receiver and throws "TypeError: Illegal invocation",
synchronously, before any request leaves the browser:

  - notice-flow.tsx (jurisdiction bridge) -> all LA detection fell to
    resolution_failed ("couldn't verify jurisdiction")
  - la-produce-panel.tsx (Phase 2D produce) -> ATTACHMENT_FAILED

The server was healthy throughout; geocode_dispositions showed correct
confirmed_la/not_la verdicts. The fault was purely the client's fetch binding.

CI was green because every test injects a stub fetchImpl with no receiver
requirement, so the real window-binding contract was never exercised. That gap
is the real lesson.

Fix: route injected fetch through lib/http/boundFetch.ts (arrow ignores `this`,
calls fetch with global binding). Regression guard: scripts/ci/check_fetch_binding.mjs
(static, fails on bare `fetchImpl: fetch`) + binding-sensitive-fetch runtime tests
that exercise the browser's receiver contract against the bridge and produce
sequences. Also: re-resolve on a cached transient resolution_failed so a blip
can't stick across persisted drafts.
```

---

— Engineering spec for broker ratification · 2026-06-29
