# Broker determination — PR-A field-placement + B1 supersession + branch-split

**Date:** 2026-06-30
**Ruling by:** Jack Taglyan, CalDRE B9445457 — sole compliance authority
**Re:** Engineering filing `pr_a_service_date_capture_status_2026-06-30.md` — three open items
**Repo state:** main HEAD `742181c`. Branch `fix/daycount-and-flag-scoping` ready for push (engineering's git hand-off block).
**Posture:** Broker-scope only under Bus. & Prof. Code § 10131(b). No attorney engagement attaches.

---

## HEADLINE

Three determinations this pass, all decided:

| Item | Determination |
| --- | --- |
| Field placement (a vs b) | **(a) UI-captured Review-step input.** Engineering lean accepted; reasoning ratified. |
| B1 supersession | **CONFIRMED.** The 2026-06-30 day-count ruling §2.3 req 3 facial-coherence principle overrides the embedded B1 rule. `Dated:` = `serviceDate` = `intendedServiceDate`. The `gates.ts` g2 "signing ≤ service" check collapses to identity. Engineering implements the override with an inline citation comment. |
| Branch split | **SPLIT into two PRs.** Day-count work (regression + validator) in one branch; flag-state §3 scoping in a separate branch. Clean audit trail per ruling provenance — the two changes resolve different rulings and should land independently. |

Done-this-turn work (flag-state §3 scoping + PR-A enforcement core) is accepted as filed. Engineering proceeds with the field-placement-confirmed slices 1–4 after splitting branches per §3 below.

---

## §1    Field placement — (a) UI-captured Review-step input

### §1.1    Determination

**Option (a) UI-captured Review-step input is the ruling.** Engineering's lean is correct. Three compliance reasons rather than just engineering reasons:

1. **Deterministic input vs probabilistic input.** The day-count engine produces facially-correct math only when fed a correct date. A date picker is deterministic — the value the user selects is the value the engine receives. Model extraction is probabilistic — the model may parse "next Tuesday" as the wrong Tuesday, may invent a date when the user says "soon," or may mis-attribute a date the user mentioned in passing ("the lease started July 1") as the intended service date. The compliance harm of a wrong intended service date is exactly the defect class this PR exists to close; reintroducing it via the model would defeat the remediation.

2. **The Review step is where the user attests the date.** PR-A req 2's explainer copy explicitly tells the user *"Change it here if you intend to serve on a different day."* That language presupposes a UI control the user can interact with — not a chat-flow extraction the user has to re-correct via conversation. A model-extracted date that surfaces to the Review step still needs UI confirmation per the explainer's own contract, so option (b) reduces to option (a) plus an unnecessary extraction step that introduces an error class with no offsetting benefit.

3. **Real-time recompute (req 5) is a UI affordance, not a chat affordance.** Req 5 binds: *"the facial-dates re-compute is immediate (not on submit)"* and *"the user sees the expiration date update in real time as they edit the intended service date."* Real-time means the React state updates as the date picker changes. A chat-extracted date would arrive once, after the model produces it; subsequent edits would re-traverse the model, which is neither real-time nor coherent with the req 5 mechanism. The req-5 mechanism is structurally UI-native.

### §1.2    Specific requirements (refining §2.3 req 1 of the prior ruling)

☐ **[MUST FIX]** `intendedServiceDate` is a required field on the **produce payload** validated by `validateIntendedServiceDate()` at the produce gate. Not on the chat model's `response_format`; not in the `INTAKE_FIELD` enum. The model's 14-field intake response stays at 14.

☐ **[MUST FIX]** The Review-step UI surfaces a date picker initialized to "today" (the generation day) and bounds the selectable range to `[today, today + MAX_LEAD_DAYS]` (matching the validator's enforcement window). UI-level constraint is belt-and-suspenders for the validator; both must reject out-of-window values, and they must agree on the window.

☐ **[MUST FIX]** The Review-step date picker is **required-to-touch UX is NOT required** — defaulting to today is acceptable, because today is a valid value and "generate-and-serve-same-day" is the canonical workaround until PR-B lands. What is **not** acceptable is allowing the produce payload to leave the Review step with `intendedServiceDate` unset; the produce gate must reject that, and the UI must not present a "skip" path.

☐ **[MUST FIX]** Real-time recompute per prior-ruling §2.3 req 5 is bound to the date picker's `onChange` (or equivalent), recomputes `computeCompliancePeriod(intendedServiceDate, holidays)` synchronously in the React tree, and updates the displayed `expiration date` element. No server round-trip per keystroke; the holiday set is loaded once when the Review step mounts.

☐ **[MUST FIX]** A Playwright (or equivalent E2E) test pins the real-time-recompute behavior: opening the Review step, changing the date picker from "today" to "today + 5", and observing the displayed expiration date update in the same render cycle. Test lives under the same `ci / test-and-typecheck` rail as the unit tests.

### §1.3    What this section does NOT do

- Does NOT add `intendedServiceDate` to the chat model's `INTAKE_FIELD` enum.
- Does NOT permit a chat-extracted date to bypass UI confirmation. The Review-step picker is the authoritative capture site.
- Does NOT permit the UI's selectable range and the validator's enforcement window to drift. Both enforce `[today, today + MAX_LEAD_DAYS]`; both must reject the same set of inputs.

---

## §2    B1 supersession — confirmed; engineering implements with citation

### §2.1    Determination

**The supersession is already ruled.** The prior 2026-06-30 day-count ruling §2.3 req 3 is the binding text: *"The `serviceDate` parameter to the engine, the `serviceDate` field on the rendered notice's facial dates, and the `Dated:` line all derive from the same source — the captured `intendedServiceDate`. No divergence permitted between the three."* That language is unambiguous and was authored with the embedded B1 rule's existence in mind (the supersession is intentional, not accidental).

The B1 attorney rule (`Dated:` = signing/execution date, never service date) was correct under the prior fact pattern where signing date and service date were independently meaningful and could legitimately differ. The new fact pattern — driven by the live defect on the Clifton Alexander notice — establishes that the divergence is exactly what produces facially-wrong notices. The facial-coherence principle resolves the divergence by collapsing the three values to one.

### §2.2    Specific requirements

☐ **[MUST FIX]** `lib/produce/renderNotice.ts`: the line that prints the face `Dated:` value is changed to print `intendedServiceDate` instead of any signing/execution date. The comment that previously cited B1 is updated to:

```ts
// The face "Dated:" line prints intendedServiceDate.
// This supersedes the prior B1 rule (Dated = signing date, never service date)
// per daycount_defect_workflow_fork_broker_ruling_2026-06-30.md §2.3 req 3
// (facial-coherence principle) and pr_a_field_placement_b1_supersession_branch_split_broker_ruling_2026-06-30.md §2.
// Rationale: a notice computed for service-date X and dated Y (where X ≠ Y)
// produces facially-incorrect day-count math when served on day X. The
// three values (engine-input serviceDate, rendered facial serviceDate field,
// printed "Dated:" line) must derive from a single captured intendedServiceDate.
```

☐ **[MUST FIX]** `lib/produce/gates.ts`: the g2 "signing ≤ service" gate collapses to an identity check (`intendedServiceDate === intendedServiceDate`), which is trivially true. Engineering deletes the comparison logic and replaces the gate comment with:

```ts
// Gate g2 previously enforced "signing date ≤ service date" under the B1 rule.
// Under the facial-coherence principle (daycount_defect_workflow_fork_broker_ruling_2026-06-30.md §2.3 req 3),
// signing date and service date are the same value (intendedServiceDate).
// The gate is retained as a no-op anchor for the production rail's gate
// chain; its compliance work has migrated into the validator and the
// "no divergence" assertion in renderNotice.
```

The g2 gate is retained as a no-op (rather than deleted) because the gate chain is referenced by gate-numbering in multiple test files and runbook docs; renumbering propagates churn that the supersession does not require.

☐ **[MUST FIX]** A unit test in `lib/produce/renderNotice.test.ts` pins the new behavior: given `intendedServiceDate = '2026-06-30'`, the rendered notice's `Dated:` line reads `Tuesday, June 30, 2026` (or the project's standard format), the `serviceDate` field on the data object is `'2026-06-30'`, and the `expiration` field is `'2026-07-06'`. This is prior-ruling §2.3 req 6 ("intake-to-produce flow Jun30 → Jul6"), now landable because the wiring exists.

☐ **[MUST FIX]** A unit test pins the "no divergence" invariant: it is structurally impossible to produce a notice where `Dated:` and `serviceDate` field on the data object differ. The test attempts to construct a notice with divergent values (or verifies via code-path inspection that no such construction is possible) and asserts the invariant.

☐ **[MUST FIX]** Engineering greps the workspace and the codebase for any other reference to B1 ("B1 attorney rule," "B1 signing," "execution date ≠ service date," and adjacent phrasings) and either updates the reference to cite the supersession or leaves a tombstone comment pointing to this ruling. The goal is no orphaned references to the superseded rule.

### §2.3    What this section does NOT do

- Does NOT alter any prior ruling other than B1. The facial-coherence principle's scope is limited to the three values enumerated in §2.3 req 3 of the prior ruling (engine-input serviceDate, rendered facial serviceDate field, printed `Dated:` line). Other date semantics elsewhere in the system (lease start date, payment due date, judgment date, etc.) are not touched.
- Does NOT permit retroactive editing of historical notices that were rendered under the B1 rule. Those notices retain their as-rendered facial dates per PR-B req 4's "regenerate creates a new artifact" principle (applied here by analogy — the B1 supersession is a forward-looking rule, not a retroactive correction).
- Does NOT introduce attorney attribution. The B1 rule was originally a broker determination citing attorney precedent; the supersession is also a broker determination, made on the broker's own authority under Bus. & Prof. Code § 10131(b).

---

## §3    Branch split — two PRs, clean provenance

### §3.1    Determination

**Split into two branches.** The day-count regression-and-validator work resolves `daycount_defect_workflow_fork_broker_ruling_2026-06-30`; the flag-state scoping resolves `gate2_flag_state_deviation_broker_ruling_2026-06-30`. Different rulings, different review surfaces, different rollback semantics. Bundling them into a single PR muddles the audit trail for both. The slight extra Git overhead is the right price for the cleaner provenance.

### §3.2    Branch layout

**Branch 1: `fix/daycount-regression-and-validator`**

Files:
- `lib/dates/computeCompliancePeriod.test.ts` (new §9 block — Jun 30 → Jul 6 regression + Jun 29 → Jul 2 control)
- `lib/dates/holidays.test.ts` (new shift-date invariants block — 2026-07-03, 2027-07-05, 2027-12-24, 2027-12-31)
- `lib/dates/intendedServiceDate.ts` (new validator)
- `lib/dates/intendedServiceDate.test.ts` (new validator tests)

Commit message:
```
test+lib(daycount): regression + intendedServiceDate validator

Closes daycount_defect_workflow_fork_broker_ruling_2026-06-30 §1.3
(regression-test asks) and §2.3 PR-A req 4 + req 7 (validator window
enforcement, no silent fallback).

- computeCompliancePeriod.test.ts §9: locks service Jun 30 2026 -> Jul 6
  expiration against the real verified calendar; pairs with Jun 29 ->
  Jul 2 control proving the engine is correct for its input and the
  defect is service-date provenance.
- holidays.test.ts: deploy-time shift-date invariants for 2026-07-03,
  2027-07-05, 2027-12-24, 2027-12-31; stale or from-memory tables
  fail CI.
- intendedServiceDate.ts: validateIntendedServiceDate() enforces
  required + ISO + earliest=generation (no back-date) + latest=+30
  (MAX_LEAD_DAYS) + no silent fallback.
- intendedServiceDate.test.ts: 12/0 (same-day OK, +30 boundary OK,
  +31 rejected, back-date rejected, missing/null/bad-format/impossible
  rejected, intent->expiration coherence pinned).

tsc --noEmit clean. Original §3.5 hypothesis list formally retracted
per the workflow-fork ruling §1.
```

**Branch 2: `gate2-preflight-flag-scoping`**

Files:
- `lib/automation/syntheticHarness.ts` (SYNTHETIC_BLOCKING_FLAGS narrowed + assertFlagsOff reworded)
- `gate2_entry_runbook_2026-06-30.md` (P4 reworded — if the runbook lives in the repo; if it's a workspace doc, omit and note in PR description)

Commit message:
```
chore(gate2): scope preflight flag check to walk-surface flags

Closes gate2_flag_state_deviation_broker_ruling_2026-06-30 §3.

- SYNTHETIC_BLOCKING_FLAGS narrowed to ['E2E_RUN_ACTIVE',
  'SYNTHETIC_RUN_ACTIVE']; classifier flags (CLASSIFIER_LIVE,
  CLASSIFIER_AUDIT_LIVE, CLASSIFIER_FAIL_CLOSED) explicitly excluded
  with documented rationale in source comment.
- assertFlagsOff() iterates the constant; classifier flags no longer
  trip preflight aborts.
- Runbook P4 reworded to compliance-purpose-aligned phrasing;
  classifier flags explicitly noted as out of scope.

Verified: CLASSIFIER_LIVE=true passes preflight (excluded per ruling);
SYNTHETIC_RUN_ACTIVE=true aborts (in-scope, correctly blocking).
F2 discipline preserved: no flag flipped; over-broad assertion narrowed.

Phase 3c CLASSIFIER_AUDIT_LIVE provenance reconciliation tracked
separately under flag-state ruling §4.
```

### §3.3    Sequencing

Both branches can be opened simultaneously; neither blocks the other. Land in either order. Engineering's stated preference can govern; both close their respective rulings cleanly.

The remaining PR-A slices (schema field placement + produce-wiring with B1 supersession + Review-step UI) ship as **PR-A2** on a separate branch (`feat/intended-service-date-wiring-and-ui` or engineering's preferred name) after Branch 1 lands. That keeps the wiring/UI change reviewable on its own merits without entangling it with the validator and regression-test core (which is mechanically independent and lower-risk).

### §3.4    Temp-file cleanup

Engineering noted three temp verify files the sandbox could not delete:
- `lib/dates/_tmp_repro.ts`
- `lib/automation/_tmp_flagcheck.ts`
- (a third — engineering enumerated three; the status doc names two. Engineering identifies and removes the third in the same `rm` invocation.)

The git hand-off block in the status doc includes the `rm` commands. Operator runs them as part of the push procedure. No broker action required; this is housekeeping.

### §3.5    What this section does NOT do

- Does NOT delay either branch. Engineering does not need a separate broker sign-off to push these PRs; the underlying rulings are already in place and the work is in-scope of them.
- Does NOT alter the §3.5 of either underlying ruling (operator action on the live Clifton Alexander notice, parallel non-flag §3.2 provisioning). Those proceed as previously ruled.

---

## §4    Locked-prose copy authoring

### §4.1    `intake_review_intended_service_date_explainer`

The proposed copy in the status doc is engineering's verbatim transcription of the prior ruling's §2.3 req 2 directional placeholder. I'll author the final locked-prose version now so engineering does not need to surface it again at PR-A2 review time.

**Final locked-prose entry (ready for `locked_prose_manifest.json` insertion):**

> The 3-day expiration date below is calculated from the service date you select here. Pick the day you actually intend to serve this notice. If your service day changes before you serve, you will need to come back and regenerate this notice with the corrected service date — the expiration math only works for the date the notice was generated against.

Differences from the directional placeholder:
- Replaces "calculated from this date" with "calculated from the service date you select here" — the antecedent of "this date" was the picker value, but the picker label itself is "intended service date," so the explainer reads more clearly when it names the field rather than referring back to it.
- Replaces "Change it here if you intend to serve on a different day" with "Pick the day you actually intend to serve this notice" — removes the implied default-and-change framing; the picker should feel like an active choice, not a default to override.
- Replaces "you will need to regenerate the notice with the correct date" with "you will need to come back and regenerate this notice with the corrected service date — the expiration math only works for the date the notice was generated against" — closes the explanation loop by telling the user *why* regeneration is needed, not just that it is. The "expiration math only works for the date the notice was generated against" sentence is the compliance content the user needs to internalize.

**Namespace:** `intake_review_intended_service_date_explainer`
**Scope:** system-wide (no city prefix)
**Locking authority:** this ruling
**Source citation:** `pr_a_field_placement_b1_supersession_branch_split_broker_ruling_2026-06-30.md §4.1`

### §4.2    `serve_time_stale_facial_dates_guard_block`

This is PR-B copy, but I'm locking it now so PR-B does not stall on copy review when it lands. The directional placeholder in the status doc is close; tightening for the locked version:

**Final locked-prose entry:**

> This notice's expiration date was calculated for service on {intendedServiceDate}. You're attempting to log service on {actualServiceDate}. Because the day-count math is calculated from the service date, the expiration date printed on this notice is wrong for the day you're actually serving. You must regenerate the notice with the correct service date before you can log this service.

Differences from the directional placeholder:
- Replaces "Actual service occurred on" with "You're attempting to log service on" — the user is in the act of logging; "occurred" treats it as fait accompli when the guard's whole purpose is to block before the log entry is created.
- Replaces "The expiration date on the notice is facially wrong for this service date" with "Because the day-count math is calculated from the service date, the expiration date printed on this notice is wrong for the day you're actually serving" — gives the user the *reason* (day-count math is calculated from service date) so the block does not feel arbitrary.
- Replaces "before logging service" with "before you can log this service" — direct address ("you") + concrete object ("this service") is clearer than the gerund-phrasing original.

**Namespace:** `serve_time_stale_facial_dates_guard_block`
**Scope:** system-wide (no city prefix)
**Locking authority:** this ruling
**Source citation:** `pr_a_field_placement_b1_supersession_branch_split_broker_ruling_2026-06-30.md §4.2`

### §4.3    Implementation note

Engineering inserts both entries into `locked_prose_manifest.json` per the standing locked-prose discipline. The `verify_locked_prose.ts` CI guard will assert the strings render as locked at the call sites. Engineering does not paraphrase or alter either entry; the locked text is the only legal user-facing wording.

If engineering identifies a rendering problem with either string (e.g., interpolation token doesn't match the rendering library's syntax, line length breaks layout, character that won't survive PDF generation), engineering surfaces the specific defect and proposes a tightened alternative — broker re-rules. **No silent edits.**

---

## §5    Checklist for engineer (in priority order)

### Branch split + push (today)

☐ **[MUST FIX]** Open Branch 1 (`fix/daycount-regression-and-validator`) per §3.2. Push, open PR. CI green expected (already verified).

☐ **[MUST FIX]** Open Branch 2 (`gate2-preflight-flag-scoping`) per §3.2. Push, open PR. CI green expected.

☐ **[MUST FIX]** Run the temp-file `rm` block per §3.4. Identify the third file engineering enumerated and clean all three.

### PR-A2 wiring + UI (next PR cycle)

☐ **[MUST FIX]** Branch `feat/intended-service-date-wiring-and-ui` (or engineering's preferred name).

☐ **[MUST FIX]** Schema field placement per §1.2: produce-payload required field, validator-gated, NOT on `INTAKE_FIELD` enum.

☐ **[MUST FIX]** Produce wiring + B1 supersession per §2.2: `renderNotice.ts` Dated-line change with cited comment; `gates.ts` g2 collapse to no-op with cited comment; `renderNotice.test.ts` Dated/serviceDate/expiration triple-pin; "no divergence" invariant test; codebase grep for B1 references with updates or tombstones.

☐ **[MUST FIX]** Review-step UI per §1.2: date picker initialized to today, range bounded to `[today, today + MAX_LEAD_DAYS]`, locked-prose explainer from §4.1, real-time recompute via `onChange`.

☐ **[MUST FIX]** Playwright (or equivalent E2E) test pinning real-time recompute per §1.2.

☐ **[MUST FIX]** `locked_prose_manifest.json` insertion of `intake_review_intended_service_date_explainer` per §4.1. CI guard updated to assert the call site.

### PR-B (after PR-A2 merges)

☐ **[MUST FIX]** Engineering drafts PR-B per the prior ruling §2.3 PR-B requirements. Locked-prose copy from §4.2 is already authoritative; engineering uses it verbatim.

### Standing-rule preservation

☐ The §0 recalibration discipline continues to operate as intended. Engineering surfaced the field-placement design choice, the B1 supersession risk, and the branch-split preference — all three are exactly the kind of fork the recalibration discipline exists to elicit. Carrying the pattern forward.

---

## §6    What this ruling does NOT do

- Does NOT alter the prior 2026-06-30 day-count ruling. §1, §2, §3 of this ruling are clarifications and implementation specifics, not amendments.
- Does NOT alter the 2026-06-30 flag-state ruling. §3 of this ruling is implementation guidance on branch layout, not a substantive change to the §3 scoping or §4 reconciliation cadence.
- Does NOT permit the chat model to extract `intendedServiceDate`. UI-only capture per §1.
- Does NOT permit silent paraphrasing of either locked-prose entry. Verbatim or re-rule per §4.3.
- Does NOT permit the g2 gate to be deleted. No-op retention per §2.2.
- Does NOT alter any standing rule §4.1–§4.12. All carry forward unchanged.
- Does NOT introduce attorney attribution. Broker-scope only under Bus. & Prof. Code § 10131(b).

---

## §7    Verbatim sign-off lines

**PR-A2 sign-off line (when wiring + UI ships):**

```
PR-A2 — intendedServiceDate wiring + UI per
  daycount_defect_workflow_fork_broker_ruling_2026-06-30.md §2.3 PR-A
  + pr_a_field_placement_b1_supersession_branch_split_broker_ruling_2026-06-30.md §1, §2.
Field placement: Review-step UI date picker; NOT on chat INTAKE_FIELD enum.
Produce wiring: intendedServiceDate feeds engine + facial serviceDate + Dated line
  (single source of truth, no divergence). B1 rule formally superseded per §2.
g2 gate collapsed to no-op (retained for gate-chain numbering stability).
Real-time recompute via Review-step date-picker onChange.
Locked-prose: intake_review_intended_service_date_explainer inserted per §4.1
  with verify_locked_prose CI guard asserting the call site.
Unit tests pin: Dated=serviceDate=intendedServiceDate triple, no-divergence
  invariant, Playwright real-time recompute.
```

---

— Jack Taglyan
California Licensed Real Estate Broker · CalDRE B9445457
Broker Compliance Review · 2026-06-30

*Posture footer.* OwnerPilot AI operates as broker-scope only under Bus. & Prof. Code § 10131(b). Jack Taglyan (CalDRE B9445457) is the sole compliance authority on this project. This determination resolves three implementation forks (field placement, B1 supersession, branch split) under the prior 2026-06-30 day-count and flag-state rulings. The B1 supersession is a broker rule change on the broker's own authority; no attorney engagement attaches. Locked-prose entries in §4 are authoritative; engineering inserts verbatim and the verify guard enforces. Operator action on the live Clifton Alexander notice remains as previously ruled: DO NOT SERVE the existing Jul-2 notice; regenerate on the day of service.
