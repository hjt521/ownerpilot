# Queue-Drainer — Four Small Items Pre-042

**Date:** 2026-07-05
**From:** Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review
**To:** Claude Code (engineering) — pre-042 queue drain
**Re:** Four decision-ready items you flagged for ruling before the 042 window opens
**Companion rulings:**
- [`p1_email_pause_and_followups_deferral_broker_ruling_2026-07-05.md`](p1_email_pause_and_followups_deferral_broker_ruling_2026-07-05.md) — P1 pause point (governing)
- [`p1_email_trigger_dependencies_broker_ruling_2026-07-05.md`](p1_email_trigger_dependencies_broker_ruling_2026-07-05.md) — P1 email trigger dependencies
- [`codebase_provenance_attorney_review_signoff_rename_2026-07-05.md`](codebase_provenance_attorney_review_signoff_rename_2026-07-05.md) — fourth-surface ruling ("flag separately" finding referenced in Item 2)
- [`omnibus_broker_ruling_2026-07-04.md`](omnibus_broker_ruling_2026-07-04.md) — governing attribution + branch discipline

**Priority:** LOW-MEDIUM — none are blockers. Consolidating into one ruling so the record is clean and none fall off the map. Individual rulings would be overkill for items this size.

**Honesty acknowledgment:** You (Claude) flagged that there was no pre-built "four items" queue — you inferred one from the shape of remaining work. That's the correct posture; I asked and you told me the truth rather than manufacturing four items to match my framing. Do that going forward.

---

## Item 1 — P2 verify page commit disposition

**Ask:** Commit `app/verify/[token]/page.tsx` now shipping dark, or park until P2 lands as one bundle?

**Your recommendation:** Park.

**Ruling: PARK.** Adopted with your reasoning.

**Reasoning on the record:**

Shipping the verify page dark (rendering a "can't verify yet" state until env + produce-path sign/embed land) creates two problems that outweigh the one benefit:

1. **Discoverability defect.** A dark verify route at `app/verify/[token]/page.tsx` is a live URL in production. Anyone who guesses the route pattern (or finds a leaked token in a log grep) will hit a "can't verify yet" state page. That's a bad first impression of the verification feature. It also invites confused inbound to `review@ownerpilot.ai` from anyone who happens to test the route pre-P2-lands.
2. **Testing surface expansion.** A dark route needs its own tests (renders correctly in "dark" state, transitions correctly when env flips, doesn't leak internal state through error boundaries). Those tests get written now, then rewritten when the produce-path sign/embed lands. Net churn > net gain.

The one benefit — reducing the P2 slice size when it does land — is real but small. A single-file commit inside a P2 bundle PR is not meaningfully different in reviewability from that file having its own prior commit. Bundle it.

**Directive:**
- Keep `app/verify/[token]/page.tsx` untracked / excluded from every PR until P2 lands as a bundle
- P2 bundle PR includes: the verify page, `PACKET_VERIFY_SECRET` env registry entry, produce-path sign/embed logic, and all tests together
- If the untracked file starts creating friction (accidental commits, merge-conflict noise on local rebases), move it out of the repo working tree entirely — stash it in a broker-owned gist or a `docs/pending/` folder that is `.gitignore`d. Do not commit-then-revert as a workaround.

---

## Item 2 — Typed sign-off gate state (fourth-surface follow-up)

**Ask:** Promote the v4 wording sign-off gate from boolean flag + string message to a proper typed discriminated-union state so it's snapshot/type-testable, or leave as-is with the CI lint guarding the attribution?

**Your recommendation:** Leave as-is.

**Ruling: LEAVE AS-IS.** Adopted with your reasoning, with one narrow addition.

**Reasoning on the record:**

The fourth-surface ruling ([`codebase_provenance_attorney_review_signoff_rename_2026-07-05.md`](codebase_provenance_attorney_review_signoff_rename_2026-07-05.md)) flagged that if `gates.ts` doesn't type-check the rename, that means the state discriminator isn't strongly typed and should be a follow-up. You've confirmed that's the case — the v4 wording sign-off gate is a boolean + string, not a discriminated union.

Promoting it to a typed state has real testability value (snapshot tests on the render path, exhaustiveness checks on switch statements consuming the state). But:

1. **The attribution defect is already caught at a different layer.** The CI lint from the codebase provenance ruling greps the assembled build output for the banned attribution phrases; whether the state that produced them is a boolean or a discriminated union doesn't affect whether the phrases leak. Belt already exists; the suspenders (typed state) would be additive, not remedial.
2. **The gate is stable.** v4 wording lock has been in production since 2026-06-07 and hasn't had a wording change since. Refactor pressure is low.
3. **042 window is close.** Every hour spent on a typed-state refactor is an hour not spent on the H1-H7 co-batch. That's the wrong trade at this phase.

**Directive:**
- Leave the v4 wording sign-off gate as boolean + string
- CI lint from the codebase provenance ruling is the guard
- **Narrow addition:** add a code comment at the gate site (`gates.ts` at the v4 wording gate location, wherever it lives) explicitly noting that this gate is intentionally not a discriminated union, and that the attribution guard is the CI lint layer. This prevents a future engineer from "fixing" it in a way that would be wasted work and would require reasoning through this ruling again. Two-line comment, no more.

**Reconsider trigger:** if the v4 wording gate acquires a third state (beyond "signed" / "not signed"), promote to typed discriminated union at that time. Two states is a boolean; three states starts to justify the type machinery.

---

## Item 3 — `wip/broker-confirm-flow-rewrite` final disposition

**Ask:** Confirm nothing to cherry-pick from the discarded branch — delete outright — or is there a discrete improvement worth extracting?

**Your recommendation:** Delete outright.

**Ruling: DELETE OUTRIGHT.** Adopted.

**Reasoning on the record:**

The branch was ruled discard in `broker_ratification_2026-07-04.md` because it touched `addressNormalize` in a way that conflicted with the Lane-2e address normalizer reconstitution ruling. The `addressNormalize` change *was* the point of that branch — everything else on the branch was scaffolding around that behavioral change. Cherry-picking the scaffolding without the behavioral change would extract dead code that no longer has a call site.

There's no discrete improvement worth extracting. Delete.

**Directive:**
- Delete `wip/broker-confirm-flow-rewrite` from the remote
- Delete any local tracking branches
- If you (Claude) have any local uncommitted work on that branch that isn't the `addressNormalize` change, stash it in a workspace note before deleting so it isn't lost — but do not port it into a new branch without a separate ruling authorizing that work

**Post-delete verification:** confirm the branch no longer appears in `git branch -a` output and confirm no PR remains open referencing it. Attest in the next status roll-up.

---

## Item 4 — Two pending attestations awaiting countersign

**Ask:** Countersign both (broker-intake-digest cron attestation + P1 B-2 attestation), or return comments?

**Your recommendation:** Not stated — surfaced as an ask.

**Ruling: COUNTERSIGN BOTH.** With the specific reservations below carried forward as follow-ups, not blockers.

**Reasoning on the record:**

Both attestations describe work that landed with the correct posture:

- **Broker-intake-digest cron attestation** — the digest job you built lands per `p1_email_trigger_dependencies_broker_ruling_2026-07-05`, dark-until-FF-3, four-gate inertness in place, `BROKER_REVIEW_EMAIL` = `review@ownerpilot.ai` alias monitored. All governing conditions from the trigger-dependencies ruling are met.
- **P1 B-2 attestation (#203, deployed, migration 045 clean)** — the four-gate inertness posture ratified in `p1_email_pause_and_followups_deferral_broker_ruling_2026-07-05` is in the doc, both deferrals (bounce webhook, one-click unsubscribe) are noted with their triggers, and migration 045 applied cleanly.

Both meet the countersign standard.

**Directive:**
- Countersign both attestations
- Countersign attribution: standing broker block, dated 2026-07-05
- **Reservations carried forward** (not blockers to the countersign — these are 042-window follow-ups):
  1. **Broker-intake-digest cron:** first live fire after FF-3-on should be treated as a smoke test — broker reviews the delivered email for formatting, evidence-linking correctness, and BROKER-INPUT flag rendering before the second fire is authorized. If the first fire is malformed, freeze the cron and open a defect ruling.
  2. **P1 B-2:** the four-gate inertness is provable in the current state, but each gate should have a **negative test** ensuring the gate fails-safe when the guard is absent. If those negative tests aren't already in the P1 B-2 attestation, add them as a follow-up test PR before FF-3 flips. Do not gate FF-3 on those tests landing, but land them before FF-3-on if the calendar allows.

Both attestations are countersigned by this ruling. Add the countersign line to each attestation doc and re-share for version history.

---

## Countersign queue additions

Update `07-10_countersign_queue_broker_pending_questions_2026-07-03.md` (or the successor 042-window countersign queue file) with:

- **[NEW] Item — Broker-intake-digest cron first-fire smoke test.** Post-FF-3-on, first delivered email is broker-reviewed before second fire is authorized. Owner: broker + Claude.
- **[NEW] Item — P1 B-2 negative tests.** Each of the four inertness gates gets a negative test (guard absent → send blocked). Land before FF-3-on if calendar allows; don't gate FF-3-on on this. Owner: Claude.
- **[NEW] Item — P2 verify page bundle drop.** `app/verify/[token]/page.tsx` remains untracked until the P2 slice bundle PR. Owner: Claude.
- **[NEW] Item — v4 wording sign-off gate typed-state reconsideration.** Trigger: if the gate acquires a third state. Owner: whoever adds the third state.
- **[NEW] Item — Branch delete confirmation.** `wip/broker-confirm-flow-rewrite` deleted; attest in next status roll-up. Owner: Claude.
- **[NEW] Item — Resend bounce/complaint webhook.** Per `p1_email_pause_and_followups_deferral_broker_ruling_2026-07-05`. Owner: Claude.
- **[NEW] Item — One-click token unsubscribe.** Per `p1_email_pause_and_followups_deferral_broker_ruling_2026-07-05`. Owner: Claude.

Seven items total on the queue post-this-ruling. All have defined triggers or ownership. None block the 042 window.

---

## Post-ruling state

After this ruling executes, remaining work falls into two buckets:

1. **Env-gated** (P2, P6, RESEND_API_KEY-dependent items): waiting on broker env-provisioning window
2. **042-gated** (H1-H7 co-batch, FF-3 flag-on): waiting on the 042 window itself (~2026-07-10)

There is nothing buildable in the middle. This is the correct pre-window state — clean pipe, no orphaned work, no accidental commits, no unresolved rulings.

---

## Guardrails — reaffirmed

Same six from `omnibus_broker_ruling_2026-07-04`, unchanged. Broker-only attribution on all countersigns. No SBN.

---

## Ratification & signature

These four dispositions are authorized under broker scope (Cal. Bus. & Prof. Code § 10131(b) — landlord-tenant compliance advisory) and adopted for OwnerPilot production.

Ruling reference for Claude Code: **queue_drainer_four_items_broker_ruling_2026-07-05**

Signed for the record:

— **Jack Taglyan** / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-05
