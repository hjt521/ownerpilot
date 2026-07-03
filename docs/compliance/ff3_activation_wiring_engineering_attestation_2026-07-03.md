# FF-3 Activation Wiring — Engineering Attestation (Preview-only, flag-gated)

**Date:** 2026-07-03
**Lane:** FF-3 (structured intake) — part 3 of 3 (data core → capture logic/prompts → **activation wiring**)
**Governing ruling:** `gate3_wave3_wiring_and_ff3_omnibus_broker_ruling_2026-07-03.md` §8
**Branch/PR:** `gate3/FF3-activation-wiring`
**Status:** built + verified; **DARK** (flag off everywhere). Requires broker countersign + the gates in §4 before flag-on.

---

## 1. What this PR wires

The FF-3 capture state machine (`stepFf3`, shipped part 2) is now reachable from the live `/api/chat` flow as a
fifth scripted category, `ff3_intake`, appended **after** the four base categories (signer → rent_periods →
personal_delivery → preflight_dispute → **ff3_intake**). It consumes the locked persona prompts and the
`ff3Capture` matchers; on completion it persists the five typed columns + `ff3_capture_status` to `chat_sessions`.

Files: `lib/chat/ff3Flag.ts` (new), `lib/chat/scriptedCapture.ts`, `lib/chat/scriptedOrchestrate.ts`,
`lib/chat/orchestrate.ts` (TurnResult.ff3Persist), `app/api/chat/route.ts`, `lib/chat/__tests__/ff3Wiring.test.ts` (new).

## 2. The dark-by-default guarantee (§8 "Preview-only until countersign")

Activation is gated by `ff3CaptureEnabled()` = `FF3_CAPTURE_ENABLED ∈ {1,true}`, **off by default in every
environment including prod**. With the flag off:

- `scriptedCategories()` returns exactly the base four (byte-identical to `SCRIPTED_CATEGORIES`).
- `nextScriptedCategory` / `scriptedBeginCategory` never return `ff3_intake`.
- No `ff3Persist` is ever attached, so the route's `chat_sessions` update is unchanged.

Proven by `ff3Wiring.test.ts` (23 assertions, flag-off section) **and** by the pre-existing
`scriptedOrchestrate.test.ts` continuing to pass unmodified (full base chain → review, no FF-3). Flag-off is a
strict no-op.

## 3. Design decisions taken (defaults — flag for countersign)

These are inert until flag-on, so they were defaulted to keep the build moving; each is reversible and open to a
different ruling before Preview activation:

1. **Ordering — FF-3 runs LAST.** Appended after the base block rather than first. Rationale: preserves the
   existing contiguous capture block and its tests; minimal behavior delta. *Alternative:* run FF-3 first
   (notice_type/just_cause are foundational and gate downstream). **Broker to confirm ordering.**
2. **`awaiting_broker_review` parks the session.** On rule-of-three escalation the session is held OUT of review
   routing (`routeToReview=false`, `status='active'`) and FF-3 is never re-asked — matching the migration-043
   comment ("gates the case out of downstream checks until a broker clears it"). No auto-resume path is wired.
   **Broker to confirm the parked-session handling / who clears it.**
3. **Flag name `FF3_CAPTURE_ENABLED`.** Vercel Preview env would set it; prod stays unset until countersign.

## 4. Gates still blocking flag-on (NOT satisfied by this PR)

- [ ] **Migration 042 VALIDATE** — §8 requires the FF-3 constraints *validated*, not just landed. 041/043 are
      landed; 042 runs post-soak (~2026-07-10, reminder set). **Do not flip the flag before 042 runs.**
- [ ] **Playwright spec** — must cover all 5 scripted categories + the escalation off-ramps (next build).
- [ ] **Preview E2E** — happy path + ≥1 escalation, on a Preview deploy with the flag on.
- [ ] **Broker countersign** — of the §3 decisions above, then set `FF3_CAPTURE_ENABLED` in Preview only.

## 5. Semantic question surfaced for the countersign

FF-3's `amount_of_rent_owed` (the notice's stated total) conceptually overlaps with the base `rent_periods`
capture (per-period amounts). Today they are captured independently and stored in different places (typed column
vs `intake_state`). Before flag-on, the broker should rule whether these must be reconciled/derived from one
another or remain independent captures. **No code assumes a relationship; this is a data-model question only.**

## 6. Verification

`tsc --noEmit` clean · 19 test suites pass (incl. unmodified `scriptedOrchestrate.test.ts` regression) ·
`ff3Wiring.test.ts` 23/23 · locked-prose 124/124 · banned-terms OK · route body-parsing guard 33 routes clean.
No migration in this PR. No locked-prose/manifest change.
