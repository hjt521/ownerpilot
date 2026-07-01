# FORK REQUEST MEMO (engineering → broker) — PR-B Serve-Time Stale-Facial-Dates Guard (chat path)

**Re:** PR-B (serve-time stale-facial-dates guard) scope, on the §5.2-merged base (`main` at `5cab32f`).
**Parent rulings / precedent:** `pr_a3_produce_handoff_fork_ruling_2026-07-01.md`; `pr_a3_5_2_core_countersign_and_open_items_broker_ruling_2026-07-01.md` §2 (produce-audit persistence — same class of compliance-artifact-shape question); `broker_status_and_decision_request_omnibus_broker_ruling_2026-07-01.md` (D1 client-render); `lane2e_persona_prose_broker_ruling_2026-07-01.md` (locked-prose authorship pattern).
**Posture:** This is a **fork request**, not a determination. Nothing is implemented. Requesting one omnibus ruling on the four forks (+ one §1.6 sub-fork) below so PR-B is unblocked in a single round-trip. — Engineering, 2026-07-01.

---

## §1 — The wizard staleness mechanism (reference; evidence)

Staleness is fully built as **pure functions** in `lib/flow/escalation.ts`:
- `captureProductionSnapshot(data)` — records the face-determining fields at produce time (amount, rent-period structure, tenants, payee name/phone/address, paymentBranch + that branch's fields, EFT election, signer name/capacity, property address/county). **Excludes** `serviceDate` / `serviceMethod` by design (re-serving by a new method/date is the normal path, not "stale").
- `evaluateStaleness(data, snapshot)` — returns `{ stale, amountChanged, changedFields[], reason: 'AMOUNT_CHANGED' | 'FACE_FIELD_CHANGED' | null }`.

Where the wizard uses it (`components/notice-flow.tsx`):
- `onProduced` (L2999) writes `productionSnapshot` into flow state on produce/print.
- `ReServePanel` (L3243) computes `evaluateStaleness(data)` (L3256) **on the fly** and, when `staleness.reason` is set (L3419), renders an amber **warning** — verbatim: *"This notice is now out of date. Since you produced it, [the amount demanded changed | something on the notice changed] (changedFields). Because the notice changed after it was produced, this one can't be re-served — you'll need a new notice with the updated details…"*. It **warns** (strong "can't be re-served" language); it does not hard-disable the attempt form.

**Two load-bearing facts for the forks:**
1. The wizard's `productionSnapshot` lives **only in the localStorage draft** (`lib/flow/persistence.ts`, `DRAFT_KEY = 'op.noticeDraft.v1'`). It **never hits the server.** `serve-track.tsx` reads the same localStorage envelope.
2. The wizard comment at L3253–3255 states staleness is *"Computed on the fly (not persisted — persisting stalenessReason + the re-generation audit event is the deferred **D2 slice**)."* So even the wizard has an explicitly-deferred persistence slice.

## §2 — The chat-path reality (evidence)

- `riskpath_records` is **insert-only**: `POST from-chat` (L81) and `POST sm` (L65) insert; `app/api/riskpath/route.ts` reads; the only update in the codebase is the new §5.2 produce-audit endpoint, which writes `produce_audit` (never `captured_payload`). → **`captured_payload` is frozen at generation.**
- `captured_payload` = the `intake_state` snapshot at notice generation (per migration 028 + `buildRiskPathInsert`).
- Each chat **produce inserts a NEW riskpath row** (from-chat inserts unconditionally). The mutable `chat_sessions.intake_state` (editable via `/chat/review` PATCH) is separate from the frozen per-row `captured_payload`.
- The chat path has **no serve surface** — no chat analog of `serve-track.tsx`; after `LaProducePanel` produces the PDF, there is no chat "record service attempts / re-serve" screen.
- `evaluateStaleness` + `captureProductionSnapshot` operate on `NoticeFlowData`, which the chat path already assembles via `toNoticeFlowData` — so the **engine is reusable as-is** (wizard parity). Only the plumbing (what to compare against, where, when) is missing.

## §S1.6 — SUB-FORK surfaced (compliance-behavior divergence; not reconciled here)

The wizard's staleness model is **single mutable draft + `productionSnapshot` inside that draft**: "same draft, edited after produce → can't re-serve." The chat model is **immutable per-produce rows + a separate mutable session intake**: on chat, re-producing already creates a *new notice by construction* (new row), so the wizard's "same notice, drifted face" scenario does not map 1:1. The chat staleness risk is instead one (or more) of:
- **(a)** produce (row 1) → owner edits `/chat/review` intake → re-produce (row 2): the produced face changed between two PDFs; and/or
- **(b)** produce (row 1) → owner serves that PDF → later edits intake: the served PDF no longer matches current intake (no re-produce involved).

**These are not the same guard.** (a) is catchable at re-produce (compare current intake vs the last produced row's frozen snapshot). (b) has no natural chat surface today (there's no serve-time screen), so it's only catchable if PR-B introduces one. **This divergence is a compliance-behavior question, not a shape reconciliation** — surfacing per the §1.6 posture, not reconciling inside the memo. It directly conditions Fork 2 and Fork 3.

## §3 — Fork 1: snapshot persistence

The compliance-artifact-shape decision — where the chat produce-time face lives for the reconciliation trail.

- **Option 1A — new `produce_snapshot jsonb` on the riskpath row** (parallels §5.2's `produce_audit`): explicit durable snapshot in the wizard's `ProductionSnapshot` shape, written at chat produce. *Cost:* one migration + one write at produce.
- **Option 1B — derive on the fly from `captured_payload`**: at re-produce, reconstruct the prior produced row's `NoticeFlowData` (via `toNoticeFlowData(captured_payload)`) → `captureProductionSnapshot()` → compare against current. *Cost:* a DB read of the prior row + two pure calls; **no new column, no new write.** **Viable because `captured_payload` is frozen** (§2 evidence).
  - *Caveat:* `captured_payload` is `intake_state` shape, not `ProductionSnapshot` shape — 1B derives the snapshot each time; a `toNoticeFlowData` behavior change would move the derived snapshot (a parity risk a CI guard can cover).
- **Parity note (both options):** the **wizard snapshot is ephemeral localStorage** — it is *not* durably recorded server-side at all (§1 fact 1). So chat-vs-wizard "record the same shape" is asymmetric today: the chat path would record *more* than the wizard (durable vs ephemeral). Flagging so the ruling can state whether chat should durably persist (1A), derive (1B), or match the wizard's ephemerality.
- **CI-enforceable either way:** `verify_review_produce_parity.mjs` (or a sibling) can assert the chat staleness path reuses `evaluateStaleness` + `captureProductionSnapshot` and doesn't fork the comparison, regardless of 1A/1B.

## §4 — Fork 2: when the guard fires

- **Option 2A — re-produce only.** The guard fires when the chat Review Generate is clicked and a prior produced row exists for this session with a drifted face. Surface = the existing §5.2 `from-chat` POST + Review produce mode. Sub-decision: **block**, **warn-then-allow**, or **force a new riskpath row with an explicit "this is a new notice" acknowledgment.** (The wizard *warns*; §S1.6(a) is fully covered here; §S1.6(b) is **not**.)
- **Option 2B — re-produce + a chat Serve & Track surface.** Adds a chat analog of `serve-track.tsx` (new route or a section of the `/riskpath` dashboard) where the guard also fires at serve-time, covering §S1.6(b). *Cost:* a new surface that does not exist today (the wizard's is localStorage-draft-based and not reusable for the server-backed chat path). This is the larger, full-parity option.
- **Wizard behavior to match (evidence):** `ReServePanel` **warns** (does not hard-block) and computes on the fly. Chat parity at "whatever the equivalent surface is" means matching *warn* semantics unless the broker wants chat to *block*.

## §5 — Fork 3: scope (engineer-authored options)

- **Option A — guard-only at re-produce.** `evaluateStaleness` reuse + Fork-1 snapshot + fire at Review Generate (warn/block per Fork 2A). Covers §S1.6(a). Unit tests (pure reuse) + integration (guard fires at re-produce). Defers a chat serve surface + §S1.6(b) to PR-C or later.
- **Option B — guard at re-produce + minimal warning UI + broker copy.** Option A plus the ratified warning surface in the Review produce mode (locked-prose copy). Still no chat Serve & Track. Covers §S1.6(a) fully with owner-facing copy.
- **Option C — guard + chat Serve & Track surface (full parity).** Option B plus a chat serve surface so the guard also fires at serve-time (§S1.6(b)). Largest; introduces a new route/section + its own tests.
- **Knock-on to PR-C:** PR-C (LAHD checklist + cron) is independent of the serve surface; but if Option C builds a chat Serve & Track, the LAHD filing checklist may naturally belong on that surface — so C could absorb part of PR-C's home. A/B leave PR-C untouched.

## §6 — Fork 4: stale-warning copy (broker authorship needed)

Not proposing copy verbatim — flagging what the ruling must author (same posture as the Lane 2E persona prose; it lands in the locked-prose manifest with a hash):
- **Two branches** from `evaluateStaleness.reason`: `AMOUNT_CHANGED` vs `FACE_FIELD_CHANGED`. **Decision:** same copy for both, or distinct copy (the wizard uses one block with an inline "the amount demanded changed" vs "something on the notice changed" swap + a `changedFields` list).
- **Slots:** the copy may interpolate the drifted field label(s) (`staleness.changedFields`), and optionally previous vs new value — or use a general "the notice's face has changed" framing with no per-value interpolation. **Decision:** which slots (if any).
- **Render location** depends on Fork 2: before Generate confirms, after Generate on the produce screen, or on a serve-surface (Option C).
- **Reference (wizard's existing copy, for a chat-register equivalent):** *"This notice is now out of date. Since you produced it, [the amount demanded changed | something on the notice changed] (…changed fields). Because the notice changed after it was produced, this one can't be re-served — you'll need a new notice with the updated details."*

## §7 — Engineering recommendation (rule "adopt" / "adopt with modifications")

Reuse `evaluateStaleness` + `captureProductionSnapshot` unchanged (wizard parity). **Fork 1 → 1B (derive on the fly from the frozen `captured_payload`)** — no new column, and the freeze guarantee holds (§2); a CI guard enforces the reuse. **Fork 2 → 2A, warn-then-require-new-row** (produce a new riskpath row with an explicit "this is a new notice" acknowledgment; matches the wizard's *warn* semantics and the chat's insert-only reality). **Fork 3 → Option B** (guard at re-produce + minimal warning UI + broker copy); **defer the chat Serve & Track surface (Option C / §S1.6(b)) to a later slice**, explicitly acknowledging that between produce and serve the chat path has no guard (same gap the wizard's deferred "D2 slice" leaves). **Fork 4** — broker authors the copy; single block with the amount-vs-other swap + `changedFields` slot, rendered in the Review produce mode.

**Open honesty:** my recommendation leaves §S1.6(b) (serve-after-edit-without-re-produce) unguarded in PR-B. That may be acceptable given the chat UX, but it is a compliance-behavior call that is yours, not mine — hence this memo rather than a default.

## §8 — What I need back (omnibus ruling)

One determination covering: Fork 1 (1A/1B), the §S1.6 sub-fork (which scenarios PR-B must guard), Fork 2 (firing point + block/warn/new-row), Fork 3 (scope A/B/C + PR-B vs PR-C split), Fork 4 (authored copy + branches + slots + render location), and whether to adopt §7 as recommended or with modifications. On receipt I build to the ruling and file the PR-B attestation.

— Engineering · fork request · 2026-07-01
