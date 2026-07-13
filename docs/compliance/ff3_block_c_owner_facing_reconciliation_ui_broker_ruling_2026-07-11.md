# FF-3 Block C — Owner-Facing Reconciliation + Resume UI

**Broker Compliance Review · 2026-07-11 (late PT)**

Ruling on the stop-the-line raised during Gate-4 evidence path prep: the owner-facing rendering of entries 13/14 was never built. Full escalate→resolve→resume E2E can't execute against the real product until it is.

Companions: [`ff3_preview_activation_gate4_evidence_path_broker_ruling_2026-07-11.md`](file:///home/user/workspace/ff3_preview_activation_gate4_evidence_path_broker_ruling_2026-07-11.md), [`ff3_awaiting_broker_review_resolution_surface_broker_ruling_2026-07-11.md`](file:///home/user/workspace/ff3_awaiting_broker_review_resolution_surface_broker_ruling_2026-07-11.md), [`ff3_countersign_ordering_awaiting_review_reconciliation_2026-07-03.md`](file:///home/user/workspace/ff3_countersign_ordering_awaiting_review_reconciliation_2026-07-03.md).

---

## §0 · Ruling — Option 1 (split: Block C PR, then E2E PR)

**Adopt option 1.** Land Block C (owner-facing reconciliation + resume UI) as its own PR. Then, and only then, land the extended Playwright spec as PR B.

Option 2 (combined) rejected. Option 3 (re-scope) rejected. Reasoning in §2. Scope of Block C in §3.

I also want to name what I got wrong in the prior ruling so it's on the record — §1.

---

## §1 · My earlier scope estimate was wrong

The Option-3 ruling I filed a few hours ago said the added cost was "an hour or two of Playwright wiring." That was wrong. It assumed the owner-facing rendering already existed and only the test spec was missing. In fact:

- **Server-side (Block A):** produce seam returns 409 with entry-14 payload + reconciliationSelection contract — built.
- **Admin-side (Block B):** `/admin/ff3-review` surface + resolve endpoint + migration 048 — built.
- **Owner-side (Block C, unnamed until now):** ReviewScreen handling of the `ff3_reconciliation_flag` 409, three-way card rendering (entry-14), (1)/(2)/(3) selection UI, re-POST with the selection, `ff3_awaiting_broker_review` held state, entry-13 resume-card rendering on next `/chat` open with `{broker_resolution_note}` interpolation — **not built**.

My prior ruling missed that Block C existed as a distinct scope. The engineer read the code carefully and caught it. That is exactly the right escalation, and it happens *before* I countersign flag-on rather than after — which is when it would have mattered. Good catch.

## §2 · Why not the other options

### §2.1 · Option 2 (combined PR: Block C + extended E2E in one) — rejected

Combining puts two structurally distinct concerns in one PR:

- **Block C is a compliance-weighted product surface.** It renders locked-prose entries 13 and 14 to owners. Every line, every interpolation, every state transition on that surface has downstream compliance implications (§3 lists them). It needs review as a product surface in its own right.
- **Extended E2E is test infrastructure.** It exercises the surface, doesn't create compliance risk itself.

Bundling them means: review of the surface has to happen simultaneously with review of the test that exercises the surface, and any change I request on Block C invalidates the test paths in the same PR. That's a churn multiplier, not a savings.

More importantly: **Block C is a locked-prose product change and I want it isolated as its own artifact in the commit history.** If we ever need to reason retroactively about "when did entries 13/14 first render to owners in production," I want a single commit hash to point at. Combining muddies that provenance.

### §2.2 · Option 3 (re-scope the evidence path — e.g., SQL-seed after all, or skip the resume half) — rejected

I rejected SQL-seeding as a Gate-4 evidence path six hours ago in the Option-3 ruling. That reasoning holds. What changed since then is scope discovery, not compliance posture. The evidence still has to prove the full escalate→resolve→resume walk works against the real product. Re-scoping to skip Block C would mean either:

- Ship the flag with owner-side rendering unbuilt (breaks owner experience the first time a reconciliation mismatch fires — a real owner sees a "generic error" instead of the ratified card), or
- Never ship the flag (defeats the purpose of the FF-3 program).

Neither is acceptable. Block C has to be built regardless of the evidence path; the only question is when. Building it now is cheaper than building it after flag-on when the missing surface is a live-fire incident.

### §2.3 · Option 1 — adopted

Two PRs, sequential, clean provenance, each reviewed for its own concern:

- **PR C — Block C: owner-facing reconciliation + resume UI.** Ships to `main`, dark behind `FF3_CAPTURE_ENABLED` (still false everywhere).
- **PR B — extended Playwright spec.** Ships to `main`, un-fixmes reconciliation walk, adds admin-context resolve + owner-context resume steps.

Then the flag flip sequence resumes per [`ff3_preview_activation_gate4_evidence_path_broker_ruling_2026-07-11.md`](file:///home/user/workspace/ff3_preview_activation_gate4_evidence_path_broker_ruling_2026-07-11.md) §4.

Cost estimate this time: Block C is meaningfully bigger than "an hour or two." Probably a half-day to a day of engineer time for the client wiring, plus the test spec on top. That's still on the near horizon, not a schedule slip.

## §3 · Block C scope

Everything below is a client-side build against the existing server contracts. No new server endpoints, no new migrations. If any of these steps *requires* a server-side change, that's a signal something in Block A shipped incomplete — flag it and I'll fork.

### §3.1 · Reconciliation-mismatch surface (entry-14 three-way card)

When the produce POST returns 409 with `code = "ff3_reconciliation_flag"`:

1. Do NOT fall into the generic "needs review" error path. Detect the 409 code specifically.
2. Render entry-14 (`chatFf3AmountReconciliationFlag`, hash `20a29e875f2cfc9aef574edd936773e164171ce2d246a36ec0b7da94d9d32009`) verbatim from the locked-prose manifest. Do not synthesize the copy; do not template new copy. Manifest lookup only.
3. Interpolate any `{typed_amount}` / `{ledger_amount}` / `{ledger_period}` variables per the entry's manifest spec.
4. Render three distinct selectable actions matching the ratified `reconciliationSelection` contract from Block A:
   - **(1) "The typed amount is correct — proceed"**
   - **(2) "The ledger amount is correct — update and proceed"**
   - **(3) "Send to broker review"**
5. On selection, re-POST the produce request with `reconciliationSelection = 1 | 2 | 3` in the payload. Await the next response.
6. Selection UI is single-choice, no bulk, no back-nav mid-flow. Selecting one commits — no "confirm your choice" modal. The card itself IS the choice.

**Locked-prose discipline:** the three action labels above are my *proposed* copy for the button labels. If they are not already in the entry-14 manifest text, they need to be. If they are in the manifest, engineer uses manifest strings verbatim. If the manifest defines the card body but not the button labels, engineer flags this to me and I amend entry-14 with the button labels as a manifest addendum before Block C ships. **Do not ship Block C with engineer-authored button label strings — those are compliance-weighted owner-facing prose.**

### §3.2 · Awaiting-broker-review held state

When the second POST (with `reconciliationSelection = 3`) returns 409 with `code = "ff3_awaiting_broker_review"`:

1. Detect this 409 code specifically. Do NOT fall through to generic error.
2. Render a held-state screen in the ReviewScreen surface. Content:
   - A short acknowledgment message. **This copy is not yet locked prose and needs to be.** Proposed engineer-facing draft: `"Your notice is with the broker for review. You'll be able to continue when we've resolved the amount question. There's no action for you right now — you can close this window and return anytime."` Engineer submits this as a new locked-prose entry request; I ratify or amend before Block C ships. Provisional entry name: `chatFf3AwaitingBrokerReviewHeld`. **Do not ship Block C with engineer-authored copy on this screen.**
   - No further action buttons on this screen. Owner cannot advance from here. They close the window; the next `/chat` open either shows entry-13 (if resolved) or the held state again (if still awaiting).
3. Session state on the client: mark session as `held_for_broker_review`, disable produce POST attempts from this session until server tells us otherwise.

### §3.3 · Entry-13 resume-card on next session load

On `/chat` open (any subsequent visit to the same session):

1. Read the session's current state from the server.
2. If `reconciliation_resolution = 'broker_review'` AND `broker_resolution_note IS NOT NULL` (i.e., resolved), fetch the resume-card payload from the server. Server returns the entry-13 text with `{broker_resolution_note}` interpolated.
3. Render entry-13 (`chatFf3ResumeAfterBrokerReviewCard`, hash `11d9d634d319bd9f5047dd2c83504bc18cc2473148364f270537c538ffc0b6f5`) verbatim, with the interpolated note visible to the owner.
4. Two actions on the card:
   - **"Continue"** — advances the flow. Behavior: resume the produce path from where escalation happened, treating the broker's resolution as if the owner had selected option (1) [typed amount correct]. Concretely: re-POST produce with the original payload plus `reconciliationSelection = 1` and `broker_resume = true` (or whatever the server contract expects — engineer confirms from Block A code).
   - **"Reply to broker"** — re-escalates. Sends the session back to `awaiting_broker_review` with a follow-up note from the owner. **This is a separate seam** and may require a small server addition to accept an owner-side reply. If the server doesn't support owner-side replies yet, ship Block C without this button and file a fork; do not fake it client-side.

**On the "Reply to broker" fork:** if it needs server work, don't build it in Block C. Ship Block C with only the "Continue" action, and file a follow-up scope for the reply seam. The compliance-critical path is escalate→resolve→resume; reply-to-broker is a nice-to-have that can ship in a later block.

### §3.4 · Wiring, telemetry, and error handling

- Every 409 with an FF-3 code writes a telemetry event (name to match existing patterns in Block A). If Block A already emits server-side telemetry for these, Block C's client-side events should be `..._ui_rendered` variants so we can trace client-vs-server events distinctly.
- Any 409 with an FF-3 code that the client doesn't recognize (future-code drift) falls through to a soft error: "We hit an issue completing this step. Please refresh and try again." Not a generic error swallow — it must be observable in logs.
- No client-side retries on 409. The 409 is a state signal, not a transient failure.

### §3.5 · What Block C explicitly does NOT include

- No new server endpoints
- No new migrations
- No changes to `/admin/ff3-review` surface (Block B stands)
- No changes to entry-13 or entry-14 hashes (locked-prose manifest floor at 127)
- No auto-notification to owner when broker resolves (Decision 2 stands: owner-driven resume only)
- No "reply to broker" flow *if that requires server work* (see §3.3 tail)

## §4 · Locked-prose entries needed before Block C ships

Summarizing §3.1 and §3.2 into one place because this is the compliance-critical dependency:

1. **Entry-14 button labels** — three strings for the three-way selection card. Engineer confirms whether entry-14's current manifest text includes them or not. If not, I add them as a manifest addendum. Guard floor 127 → 128 (if the whole entry re-hashes because of the addendum) or stays 127 (if labels are separate entries — engineer's structural call).
2. **Awaiting-broker-review held-state copy** — new entry, provisional name `chatFf3AwaitingBrokerReviewHeld`. I need to author this before Block C's held-state screen renders. Draft in §3.2; engineer submits the entry as part of Block C PR prep, I ratify or amend, hash goes into the manifest before Block C's UI renders it. Guard floor 127 → 128.

**Block C does not merge to main until both locked-prose additions are in the manifest.** That's not a preference; it's the manifest discipline. If Block C's UI has engineer-authored strings in it at merge time, the compliance-guard CI check will fail on the banned-attribution / manifest-drift dimension.

## §5 · Sequencing

1. **Engineer submits** the entry-14 button labels question and the entry-`chatFf3AwaitingBrokerReviewHeld` copy request to me as a locked-prose amendment ruling. Should be a one-page ask.
2. **I ratify** the two additions. Manifest floor moves from 127 to 128 or 129 depending on entry-14 structure.
3. **Engineer builds PR C** — Block C client wiring against the ratified manifest.
4. **PR C merges to main.** All guards green including manifest at new floor. `FF3_CAPTURE_ENABLED` still false everywhere.
5. **Engineer builds PR B** — extended Playwright spec per [`ff3_preview_activation_gate4_evidence_path_broker_ruling_2026-07-11.md`](file:///home/user/workspace/ff3_preview_activation_gate4_evidence_path_broker_ruling_2026-07-11.md) §3.
6. **PR B merges to main.**
7. **Preview flag flip** per [`ff3_preview_activation_gate4_evidence_path_broker_ruling_2026-07-11.md`](file:///home/user/workspace/ff3_preview_activation_gate4_evidence_path_broker_ruling_2026-07-11.md) §4. Attestation packet captured. Gate 4 countersign follows.

Rough calendar impact vs. my earlier expectation:
- Prior (Option-3 ruling): "extended spec merges in a day or two, then flag flip."
- Corrected: locked-prose ratification (same-day when engineer asks) → Block C build (½–1 day) → PR C review + merge → PR B build (½–1 day) → PR B merge → flag flip.

Realistic new range: **3–5 working days** to flag flip, not 1–2. That's not a slip against any committed calendar date I have on record; it's a corrected estimate.

## §6 · What this ruling does NOT authorize

- Does NOT authorize engineer-authored owner-facing strings anywhere in Block C. All owner-facing prose is manifest-locked or ratified into the manifest before Block C ships.
- Does NOT authorize combining Block C into the extended Playwright PR.
- Does NOT authorize skipping the escalate→resolve→resume walk in evidence item 5. The evidence path from [`ff3_preview_activation_gate4_evidence_path_broker_ruling_2026-07-11.md`](file:///home/user/workspace/ff3_preview_activation_gate4_evidence_path_broker_ruling_2026-07-11.md) stands unchanged; only the prerequisite chain lengthens.
- Does NOT authorize the "Reply to broker" client button if server-side reply seam doesn't exist yet — that's a follow-up scope.
- Does NOT authorize prod flip. Still separate.

## §7 · Companion rulings

- [`ff3_preview_activation_gate4_evidence_path_broker_ruling_2026-07-11.md`](file:///home/user/workspace/ff3_preview_activation_gate4_evidence_path_broker_ruling_2026-07-11.md) — sequenced after Block C now
- [`ff3_awaiting_broker_review_resolution_surface_broker_ruling_2026-07-11.md`](file:///home/user/workspace/ff3_awaiting_broker_review_resolution_surface_broker_ruling_2026-07-11.md) — Block B, unchanged
- [`ff3_countersign_ordering_awaiting_review_reconciliation_2026-07-03.md`](file:///home/user/workspace/ff3_countersign_ordering_awaiting_review_reconciliation_2026-07-03.md) §2.2, §3.2 — where entries 13 and 14 were authored
- [`ff3_migration_042_cobatch_build_countersign_broker_ruling_2026-07-10.md`](file:///home/user/workspace/ff3_migration_042_cobatch_build_countersign_broker_ruling_2026-07-10.md) — Block A + migration 042 cleared

---

Signed:
— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-11
Authority: Cal. Bus. & Prof. Code § 10131(b)
