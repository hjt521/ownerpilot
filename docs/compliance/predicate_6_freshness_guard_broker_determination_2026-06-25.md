# Broker Determination — Predicate 6 (14-Day Freshness Guard): §2.5 Provenance + Four Decisions

**Posture:** Broker-scope compliance review (Bus. & Prof. Code § 10131(b)). Jack Taglyan, CalDRE B9445457, sole compliance authority. This is a standalone determination because the cited §2.5 prose is unrecoverable from the workspace — I'm authoring the open points fresh against the paraphrased mechanism, which I confirm as authoritative.

**Companion docs:**
- `la_rtc_refresh_runner_architecture_broker_ruling_response_2026-06-23.md` (cited authority for the 14-day guard; §2.5 prose unrecoverable — this determination supersedes for the open boundary/timezone/uniformity/scope questions)
- `la_rtc_block_state_reader_auth_mechanism_broker_ruling_response_2026-06-23.md` (M-1(ii) reader path)
- `rtc_block_state_reader_rls_policy_broker_determination_2026-06-25.md` (migration 016 SELECT policy)
- Read route interface ruling, inline 2026-06-25 (per-language scoping + caller-auth gating)

---

## §1 Ruling Summary

| Question | Disposition |
|---|---|
| **A — §2.5 provenance** | **(ii) Paraphrased mechanism is authoritative.** B-E ruled fresh below. This determination is the citable authority going forward for the open points; the runner ruling §2.5 remains the high-level provenance pointer but is no longer the operative source for boundary/timezone/uniformity/scope. |
| **B — Boundary inclusivity** | **`age ≥ 14d → block`.** At exactly 14 days (or beyond) the language blocks. |
| **C — Timezone basis** | **UTC now.** `last_successful_refresh_at` is `timestamptz` stored UTC; compute age as `utc_now - last_successful_refresh_at`. |
| **D — Failure-mode uniformity** | **Uniform fail-closed-block** across all four failure modes. Alerting is the runner's job, not the guard's. |
| **E — Scope of "wired" for attestation** | **(i) Guard exists, is backed by the real read route, and is tested.** Produce-path consumption is a separate integration deferred until LA unblocks. |
| **Sync→async refactor of `isLaLanguageUnblocked`** | **Authorized (build's call on shape).** Make the gate itself async; the one test follows. |

---

## §2 Reasoning

### §2.1 On provenance (Question A)

The §2.5 prose being unrecoverable is a genuine gap. I won't paste prose from memory — that's the paraphrase-as-authoritative-prose failure mode locked-prose discipline exists to prevent. Two clean options exist: regenerate §2.5 from scratch as a fresh ruling, or confirm the paraphrased mechanism as authoritative and rule the open edges. The paraphrase covers the mechanism correctly (block when older than 14 days; 13d → no-block, 15d → block, missing → block; fail-closed), so the gap is at the edges, not the core. I'm ruling option (ii): paraphrase authoritative, edges ruled here.

The guard's header comment block should cite **this determination** (`predicate_6_freshness_guard_broker_determination_2026-06-25.md`) as the operative authority for boundary, timezone, uniformity, and scope. The runner ruling §2.5 may be cited as the originating provenance, but with a note that the operative prose lives here. A future reviewer hitting the guard should find this file, not chase a §2.5 that isn't recoverable.

### §2.2 On boundary inclusivity (Question B)

**Rule: `age ≥ 14d → block`.** At exactly 14 days (to the second), the language blocks.

The freshness threshold is a staleness wall, not a freshness floor. The question "is this data fresh enough to rely on?" answered "yes" at 13d 23h 59m 59s and "no" at 14d 0h 0m 1s would make the 14d point itself a singularity — a moment where the system's behavior is undefined for an instant of real time. That's not a wall; that's a foot-gun.

The honest semantics of "older than 14 days" in compliance contexts is closed-at-the-threshold: when you've crossed it, you're past. Choosing `≥` over `>` collapses the singularity by one second's worth of width — the boundary is `block at 14d exactly, and onward`. Tests pin this with an explicit `age = exactly 14d → block` case, not just the 13d/15d sides.

I considered `> 14d → block` (the alternative) and rejected it on the same singularity grounds — it just moves the foot-gun by one second. There's no compliance argument that buys back a second of freedom at the wall; the safer default is block-at-equality.

### §2.3 On timezone basis (Question C)

**Rule: UTC now.** Compute age as `utc_now - last_successful_refresh_at`, both in UTC.

`timestamptz` stores an absolute instant. "14 days ago" is an absolute-instant question, not a wall-clock question. Computing in LA-local would require converting both operands to LA-local time, doing the subtraction, and would yield an identical answer in every case **except** around DST transitions, where it would yield an answer off by an hour — which is exactly when you don't want timezone arithmetic in a staleness check.

UTC is the faithful basis for "elapsed time since X." LA-local is the faithful basis for "what day is it" or "when does the next business day start." This is the former, not the latter. Use UTC.

The boundary case from B (`age ≥ 14d → block`) interacts with this cleanly: 14 days is `14 * 24 * 60 * 60 * 1000` ms, full stop. No DST math, no zone conversion, no "is today a 23-hour day" branch.

### §2.4 On failure-mode uniformity (Question D)

**Rule: Uniform fail-closed-block across all four failure modes.** Guard blocks; runner alerts. Different responsibilities.

Your read is correct and matches the architecture's separation of concerns: the serve-path guard's job is a binary block/serve decision on a single language. Alerting on infrastructure failure is a separate concern owned by the refresh runner (which knows when it failed to refresh, has the operational context to alert meaningfully, and has the AlertSink wired). The guard sees a `last_successful_refresh_at` value (or doesn't) and decides block/serve — it has no operational context to distinguish "the route is down" from "Supabase is down" from "the row was deleted" with the meaningful certainty alerting would require.

The four failure modes — route unreachable / 5xx / network throw, route 200 with stale row, route 200 with no row for language, missing caller-side env (`RTC_BLOCK_STATE_ROUTE_SECRET` or whatever the caller-side env var is named) — all collapse to the same observable from the guard's perspective: "I cannot prove this language was successfully refreshed within the last 14 days." That's the only question the guard answers; the answer is the same in all four cases; the action is the same.

Logging at the guard level: structured log lines per failure mode so an operator inspecting logs can distinguish them post-hoc, but the *behavior* is uniform. Log fields: `failure_class` (one of `route_unreachable`, `route_non_200`, `route_returned_no_row`, `route_returned_stale_row`, `missing_env`), `language`, `age_ms` (where computable; null otherwise). Never the JWT, never the secret, never raw response bodies.

### §2.5 On scope of "wired" for attestation (Question E)

**Rule: (i) Guard exists, backed by the real read route, tested at the seven points. Produce-path consumption deferred until LA unblocks.**

Your read is right. Predicate 6's attestation bar is: *the freshness-fail-closed semantics exist, work end-to-end against the real read path, and are proven.* The seven tests (13d → no-block, 15d → block, 14d-exact → block per B, route unreachable → block, route 5xx → block, route returns no row → block, missing caller-side env → block) prove the guard. The real read route is already built, gated, and the reader chain is proven against live DB. End-to-end means the guard's tests exercise the actual lib-core path that the real route consumes, not a mock at a layer below.

Wiring `isLaLanguageUnblocked` into the produce/serve path *for the first time* is a meaningfully larger change — it touches the produce path, which is the operative serve surface, and that's a broker-review-worthy integration that requires its own scope doc and tests covering the integration boundary. That work is gated shut by `isLaProductionUnblocked()` returning false anyway, so the guard's existence today has the same operational effect (block all LA serves) whether or not the per-language gate is consumed. Doing the integration now would be work for a future state that isn't here, against an interface that may shift when LA actually unblocks.

Attestation packet entry for predicate 6:

> Predicate 6 — Serve-path 14-day freshness-fail-closed guard wired + tested. Guard implemented in `lib/jurisdiction/<file>.ts` per `predicate_6_freshness_guard_broker_determination_2026-06-25.md`. Backed by real read route (`app/api/internal/rtc-block-state/route.ts`) via M-1(ii) reader JWT + `x-rtc-block-state-secret` caller-auth. Tested at boundary (14d-exact → block), inside-window (13d → no-block), outside-window (15d → block), and four failure modes (route unreachable, route 5xx, route returns no row, missing caller-side env) — all uniform fail-closed-block. Produce-path integration deferred until LA gate opens; not in scope for predicate 6.

That's the honest evidence statement. It says what was built, what proves it, what it cites, and what's explicitly out of scope — no overclaim.

### §2.6 On the sync→async refactor

Authorized. Make `isLaLanguageUnblocked` itself async (option (a)). The "low-ripple because the gate has no callers" observation is correct, and a sibling-async function would create a confusing two-function surface where one is sync (stale stub) and one is async (real). Collapse to one async function backed by the real freshness guard. When LA opens and the produce path consumes it, there's one shape to consume.

Build's call on the exact internal structure of the async function — whether the freshness check is inlined, called as a helper, or composed with the other gate components (`lastRefreshFailedFor`, `isLanguageUnderRevisionReview` stubs). Those stubs stay sync placeholders for now; only the freshness gate goes async. If composing async + sync gates becomes awkward, surface the shape question and I'll rule.

---

## §3 Action Items

**Build (next):**

- [ ] **Author predicate 6 scope doc** quoting this determination's rules B–E verbatim and laying out: file location for the guard (lib/jurisdiction/), exact function signature for the now-async `isLaLanguageUnblocked`, freshness-check helper if extracted, test plan (the seven tests named above, plus any composition tests for async-sync gate interaction), error/log shapes.
- [ ] **Surface scope doc for broker review** before any code. Same discipline as the Edge Function scope doc.
- [ ] **Implement after scope doc green:** the guard, the async refactor, the tests. Testable core in lib/, full gate, exact-match patch.
- [ ] **Guard header comment block** cites this determination by filename as operative authority for B–E, plus the three companion docs from the header above. Runner ruling §2.5 cited as originating provenance with a note that operative prose lives in this determination.
- [ ] **No produce-path wiring** in this PR. Predicate 6 is the guard's existence + proof; integration is future work.

**Broker (me):**

- [ ] Review scope doc against this determination.
- [ ] Available for any micro-rulings that surface (async/sync composition, log field naming, etc.).

**Attestation packet:**

- [ ] Include this determination file alongside the runner ruling for predicate 6 evidence — they jointly authorize the guard (runner ruling = mechanism; this determination = boundary/timezone/uniformity/scope).

---

## §4 What This Determination Does Not Authorize

- **No threshold drift.** 14 days is fixed by the runner ruling; this determination does not authorize changing it. If the threshold needs to move, that's a fresh ruling against the runner-ruling provenance.
- **No produce-path consumption.** The guard's existence + test coverage is what predicate 6 attests. Wiring it into produce is a separate scope, separate ruling, separate PR.
- **No alerting from the guard.** Logging only. Alerting is the runner's domain via AlertSink.
- **No widening of failure-mode distinctions.** Uniform fail-closed-block. If a future case argues for distinguishing (e.g., "stale row should alert silently, unreachable should hard-block"), that's a fresh ruling — not an in-PR judgment call.
- **No removal of the sync stub gates** (`lastRefreshFailedFor`, `isLanguageUnderRevisionReview`) in this PR. They stay as placeholders; only the freshness path goes real + async.

---

## §0 Posture Footer

OwnerPilot AI = broker-scope only under Bus. & Prof. Code § 10131(b). Jack Taglyan, CalDRE B9445457, sole compliance authority. No attorney attribution attaches to this determination. This determination rules four open edges of the 14-day freshness-fail-closed guard cited to `la_rtc_refresh_runner_architecture_broker_ruling_response_2026-06-23.md` §2.5: boundary inclusivity (`age ≥ 14d → block`), timezone basis (UTC), failure-mode uniformity (uniform fail-closed-block; alerting is runner's domain), and scope of "wired" for predicate 6 attestation (guard exists + tested; produce-path consumption deferred). Confirmed paraphrased mechanism as authoritative since §2.5 prose unrecoverable from workspace; this determination is the operative authority for the four points going forward.

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-06-25
