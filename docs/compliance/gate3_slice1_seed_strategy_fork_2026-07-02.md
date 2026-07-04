# Gate-3 Slice 1 (PR-B Seams 1–3) — Seed-Strategy Fork (engineering → broker)

**Re:** `gate3_fork_a_jurisdictional_breadth_broker_ruling_2026-07-02.md` (A1 LA-only; seam-build open) + `gate3_six_seam_scope_broker_acknowledgment_2026-07-02.md` §3 (Preview-only under E4 locks).
**By:** engineering, 2026-07-02. Blocks all of Slice 1 — needs a broker ruling before spec work.

---

## §1 — The gap (code-grounded)

All three PR-B seams assert behavior on a **prior produced, then drifted** notice. Reaching that state in an E2E requires a session that is **(i) claimed (has `user_id`), (ii) intake-complete, (iii) NOT counsel-triggered, (iv) already has one produced `riskpath_records` row carrying a `produce_snapshot`.** The current Preview test infrastructure cannot construct it:

- **`from-chat` produce requires a claimed session.** `app/api/notice/produce/from-chat/route.ts:55` — `if (!session.user_id) return 401 'claim your session before producing'`. An anonymous walk session (no `user_id`) 401s before any snapshot is written.
- **The existing seed forces a counsel trigger.** `app/api/test/seed-session/route.ts` requires `counselTrigger` (S7) and sets `counsel_route_trigger` → produce always returns `409 routed_to_counsel` (the G4 hard-stop precedes the staleness gate). It also creates only a `chat_sessions` row — **no `riskpath_records`, no `produce_snapshot`.**
- **The chat-to-produce walk is anonymous.** It never claims the session, so it can't drive `from-chat`.

Net: neither path yields a claimed, non-counsel, produced-with-snapshot session. This gates **Seam 1, Seam 2, and Seam 3** (not just the dashboard seam).

## §2 — The two strategies

### Option A — extend the Preview-only seed surface (recommended)
Add a strict, E4-locked seed that creates a **claimed (`E2E_TEST_USER_ID`), intake-complete, non-counsel** session **plus** a prior `riskpath_records` row with a `produce_snapshot` (built from `completeIntakeState()` via the same `captureProductionSnapshot` path). Either a sibling route `app/api/test/seed-produced-session/route.ts` or a second strict shape on the existing route.
- **Locks (mandatory, mirror E4):** S2 prod-404, S3 `E2E_RUN_ACTIVE`, S4 `TEST_SEED_SECRET`, S5 `e2e_run_id` tag (+ tag the riskpath row so teardown's FK sweep covers it), strict schema.
- **Guard change (required):** `scripts/ci/verify_e2e_seed_guard.mjs` currently hard-codes `ROUTE = 'app/api/test/seed-session/route.ts'`. It must be **generalized to iterate every `app/api/test/*/route.ts`** and assert the four locks on each — so any seed surface stays guarded. This is a change to a Required check (`verify-e2e-seed-guard`), and it *strengthens* the posture (no seed route can exist unguarded).
- **Pro:** deterministic (E2E flake matters), matches the E4 pattern, no auth/magic-link in the spec. **Con:** broadens the test-seed surface + touches a Required guard — compliance-sensitive, hence this fork.

### Option B — E2E claim/auth walk (no new seed surface)
Spec walks intake (anon) → **claims** the session via the magic-link redeem flow to a Preview test user → produces via `from-chat` → PATCH-drifts a field (`/api/chat/review`) → re-produces → 409 → ack → re-produce.
- **Pro:** zero new seed surface; highest fidelity (exercises claim + produce + staleness end-to-end). **Con:** driving magic-link redemption headlessly is heavier/flakier and may *itself* need a small Preview-only test hook to mint/redeem a link without email — which re-introduces a (different) seed-surface question.

## §3 — Recommendation

**Option A, with `verify_e2e_seed_guard` generalized to guard all `app/api/test/*` seed routes.** Rationale: it's the exact discipline E4 already ratified (strict + four locks + Preview-only), it's deterministic, and generalizing the guard is a net compliance *strengthening*, not a weakening — it closes the "someone adds an unguarded seed route" hole rather than opening one. Option B keeps the surface minimal but trades that for magic-link flakiness and likely a test hook anyway.

**If the broker prefers a hard "no new seed surface" rule**, fall back to Option B and I'll scope the magic-link driving (and flag any Preview-only hook it needs as a sub-fork).

## §4 — What unblocks on the ruling

Once ruled, I build Slice 1 in one pass: the chosen seed path (Option A: route + locks + generalized guard + unit test) → the three specs (Seam 1: produce → drift → 409 `stale_notice` → ack → re-produce 200; Seam 2: dashboard row banner on the drifted claimed row; Seam 3: `staleness-ack` persists owner-scoped) → `tsc` + guard verify → attestation. All Preview-side under E4 locks, never prod (per acknowledgment §3).

---

— Engineering (Claude Code) · Slice-1 seed-strategy fork · 2026-07-02
