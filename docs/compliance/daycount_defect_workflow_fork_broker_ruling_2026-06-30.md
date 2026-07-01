# Broker ruling — Day-count defect workflow fork (service-date provenance)

**Date:** 2026-06-30
**Ruling by:** Jack Taglyan, CalDRE B9445457 — sole compliance authority
**Re:** Engineering filing `daycount_defect_engineering_diagnosis_2026-06-30.md` responding to `lahd_eviction_filing_cover_sheet_and_3day_count_defect_broker_ruling_2026-06-30` §3 (CRITICAL) + §6 checklist
**Repo state:** main HEAD `742181c`. Tests added on branch `fix/daycount-regression-tests` (not yet pushed by operator at filing time).
**Posture:** Broker-scope only under Bus. & Prof. Code § 10131(b). No attorney engagement attaches.

---

## HEADLINE

**Engineering's diagnosis is accepted in full.** The §3.5 hypothesis list in the original ruling was incomplete — all three named causes are disproved by the reproduction evidence. The defect is **service-date provenance** at the produce-path input, not engine logic, not holiday data, not data-staleness.

**Disposition on the workflow fork: Option 3 — adopt both.** Option 1 (explicit intake-captured intended service date) plus Option 2 (serve-time stale-facial-dates guard) together close the defect class. Either alone leaves a gap; both together make it impossible to serve a facially-wrong notice without the system surfacing the violation.

**Operator action on the live Clifton Alexander notice (5537 La Mirada Ave Unit 202) remains unchanged from the prior ruling §3.6: DO NOT SERVE the existing notice.** Regenerate with the correct service date (= the actual day of service); the engine prints Jul 6, 2026 correctly when fed serviceDate = Jun 30, 2026, as engineering's reproduction confirms.

**Original ruling §3.5 root-cause hypotheses are formally retracted** and superseded by engineering's reproduction-backed diagnosis (§1 of this ruling). The §3 [MUST FIX] regression-test asks are **closed** — engineering shipped them, in the correct test suites, with the §4 "A14 harness" placement-error correctly flagged and corrected.

---

## §1    Diagnosis acceptance

### §1.1    The §3.5 hypothesis list was wrong; engineering's diagnosis is right

Engineering reproduced the defect against the production engine and the verified holiday set:

| serviceDate fed to engine | expiration produced | correct for that input? |
|---|---|---|
| `2026-06-29` (notice's "Dated" line) | `2026-07-02` | Yes — what the notice shows |
| `2026-06-30` (actual service date) | `2026-07-06` | Yes — what the notice should have shown |

`2026-07-03` is present and attorney-verified in `getVerifiedHolidaySet(2026)`. Crucially, the July 2 outcome from a June 29 service is produced **regardless of whether the holiday table contains July 3**, because the count terminates on Jul 2 before the holiday is ever consulted.

**The §3.5 hypotheses are each individually disproved by this evidence:**

- **(a) Engine logic defect** — Disproved. The engine correctly returns Jul 2 for Jun 29 input and correctly returns Jul 6 for Jun 30 input. Both directions verified.
- **(b) Holiday-data defect** — Disproved. The verified holiday set contains `2026-07-03`. The function injects it. The engine consumes it.
- **(c) Data-staleness at production time** — Disproved. A stale table missing `2026-07-03` would have produced Jul 3 for a Jun 30 service (count: Wed 1, Thu 2, Fri 3 — no holiday to skip). The notice shows Jul 2, not Jul 3. Stale-table-with-Jun-30-input ≠ what the notice shows.

**The actual defect** is what engineering identified: the produce path computed facial dates against the notice's "Dated" line (Jun 29) rather than the actual intended day of service (Jun 30). CCP § 12 counts from the day of service, not the day the notice was drafted. A notice computed for one service date and served on another is facially wrong on its day-count math.

### §1.2    Why I missed it in the original ruling

I should not have framed §3.5 as a closed three-option enumeration. The empirical-symptom step (notice shows Jul 2; correct answer is Jul 6) does not imply the engine miscounted — it implies *something* between intake and rendering produced Jul 2 when Jul 6 was correct. The space of "somethings" includes upstream input drift (which is what this turned out to be), and I narrowed prematurely to downstream computation paths. Engineering correctly widened the search space and ran the controlled reproduction that pinned it.

This is the §0 recalibration discipline working as intended: build surfaces a genuine compliance fork (the input-date semantics is a product/compliance decision, not an engineering implementation choice), I rule on the compliance question, and the engine itself stays untouched. **No engine change is authorized or appropriate; the engine is correct.**

### §1.3    The §3 [MUST FIX] regression-test asks are closed

Engineering shipped:

1. **`lib/dates/computeCompliancePeriod.test.ts` §9 (NEW)** — the mandated regression `2026-06-30 → 2026-07-06` against the real verified calendar, asserting the Jul 3 skip, plus the `2026-06-29 → 2026-07-02` control that proves the engine is correct for its input and isolates the defect to the serviceDate value. Suite: 24 passed, 0 failed.
2. **`lib/dates/holidays.test.ts` (NEW block)** — deploy-time shift-date invariants asserting `2026-07-03`, `2027-07-05`, `2027-12-24`, `2027-12-31` are present. A from-memory or stale table now fails CI. Suite: 22 passed, 0 failed.
3. `tsc --noEmit` clean.
4. Both suites run under `ci / test-and-typecheck` on every commit.

The §4 [MUST FIX] in the prior ruling said "add to the A14 synthetic harness." Engineering correctly flagged that A14 is the automation **mirror-queue** harness — a different surface entirely — and landed the regression in the correct home (the date test suite under the standing CI rail). I accept the correction. **The §4 placement guidance in the prior ruling was wrong; the as-built placement is correct.** The compliance intent of §4 ("a day-count regression must run on every commit touching the engine, holidays, or renderer") is satisfied by the as-built placement: the date test suites run under `ci / test-and-typecheck` on every commit, which catches every touch to the relevant files.

**`SC-DAYCOUNT-JUL2026` is therefore closed** as a synthetic-catalog item with its compliance purpose satisfied by the as-built test placement. The Gate-3 fold-in §6 CONSIDER in the prior ruling is addressed in §4 of this ruling.

---

## §2    Disposition on the workflow fork

### §2.1    Option 3 — adopt both, with a defined sequencing

Engineering's Option 3 lean is the right call. Reasoning on each leg:

**Option 1 (intake-captured intended service date)** is necessary because the current intake schema captures zero service-date information. Without it, the produce path has no choice but to default to a generation-date proxy, and the defect class is structurally guaranteed to recur. This is the **causal** fix: it removes the source of the wrong input.

**Option 2 (serve-time stale-facial-dates guard)** is necessary because Option 1 alone trusts the user to enter an accurate intended service date — and the actual service date often shifts (process server delays, weekend bumps, address-not-found re-attempts). Even with Option 1 in place, a notice generated for "intended service Tuesday" but actually served Wednesday is facially wrong unless the system catches the drift at serve time. Option 2 is the **defensive** fix: it catches the case where Option 1's captured date diverges from what actually happens.

**Either alone leaves a gap:**
- Option 1 alone: catches the current chat-intake-defaulting class but not the service-date-drift class.
- Option 2 alone: requires the user to do something (regenerate) at serve time, with no upstream prompt to enter a planned service date — friction-high and depends on the user noticing the drift.

**Option 3 (both):** Option 1 is the happy-path mechanism (intake captures an explicit intended service date; produce path computes against it; the existing `gates.ts` successful-attempt logic already recomputes from actual service date once service is logged). Option 2 is the safety net (if the actual service date diverges from the captured intended service date at the moment the user attempts to mark service, the system blocks-and-requires-regenerate before allowing the service log entry to attest a facially-wrong notice).

### §2.2    Sequencing

**Option 1 first, Option 2 next.** Option 2's guard logic depends on having a captured `intendedServiceDate` field to compare actual against — so Option 1 must land first to give Option 2 something to compare. Engineering should ship them as two PRs in sequence:

1. **PR-A: Option 1 intake-and-produce wiring.** Adds the field, the Review-step input, the produce-path consumption. Behavior change: the notice's day-count input is now an explicit user-entered date instead of a default. Default-on-empty is **not** permitted (no silent fallback to generation date — see §2.3).
2. **PR-B: Option 2 serve-time guard.** Adds the comparison at the moment the user marks service in the gates.ts successful-attempt flow. When `actualServiceDate !== intendedServiceDate`, blocks the service-log entry and surfaces a regenerate-required state. The existing recompute-on-successful-attempt logic in gates.ts already does the right thing once the user regenerates; the new guard is the catch-the-drift-before-attestation step.

This sequencing keeps each PR small and individually attestable. PR-A is a producer-side change with intake-schema impact; PR-B is a consumer-side change on the serve flow. They do not need to ship simultaneously, but PR-A must land before PR-B is reviewable.

### §2.3    Specific requirements (binding)

**For PR-A (Option 1 — intake + produce wiring):**

1. **[MUST FIX]** Add `intendedServiceDate` to the 14-field intake schema in `lib/chat/intakeSchema.ts`. Field is required (not nullable, not optional). Compliance reasoning: the entire 3-day-notice produce rail depends on a specific service date; allowing it to be optional re-introduces the defect class.

2. **[MUST FIX]** Add a Review-step input that surfaces the captured `intendedServiceDate` to the user as the date the notice will be computed against, with a one-line plain-English explanation: *"The 3-day expiration on this notice is calculated from this date. Change it here if you intend to serve on a different day. If your actual service day changes later, you will need to regenerate the notice with the correct date."*

3. **[MUST FIX]** Update the produce-path to feed `intendedServiceDate` into `computeCompliancePeriod()` instead of any generation-date proxy. The `serviceDate` parameter to the engine, the `serviceDate` field on the rendered notice's facial dates, and the `Dated:` line all derive from the same source — the captured `intendedServiceDate`. **No divergence permitted between the three.** A notice whose facial expiration date was computed against date X must have `Dated: X` (CCP § 12 + facial-coherence principle).

4. **[MUST FIX]** Earliest permitted value: the day of generation (i.e. today at the moment the notice is being produced). The user cannot back-date a notice. Latest permitted value: 30 days forward of generation. A notice produced more than 30 days in advance of its intended service date is producing stale facial dates by a different mechanism (the holiday table or statutory text may change between produce and serve); the 30-day cap is the broker-acceptable maximum lead time.

5. **[MUST FIX]** When the user changes `intendedServiceDate` in the Review step, the facial-dates re-compute is immediate (not on submit). The user sees the expiration date update in real time as they edit the intended service date — this gives them direct visibility into the engine's day-count behavior and prevents "I didn't realize changing the date would change the expiration" confusion.

6. **[MUST FIX]** A unit test pins the intake-to-produce flow: given `intendedServiceDate = 2026-06-30`, the produced notice has `Dated: 2026-06-30`, `serviceDate: 2026-06-30` on the data object, expiration computed against Jun 30, expiration = `2026-07-06`.

7. **[SHOULD FIX]** A unit test pins the 30-day-cap upper bound rejection.

**For PR-B (Option 2 — serve-time stale-facial-dates guard):**

1. **[MUST FIX]** At the moment the user attempts to mark service in the gates.ts successful-attempt flow, compare `actualServiceDate` (the date the user is attesting service occurred) against the `intendedServiceDate` field on the notice record (which is the date the facial dates were computed against, per PR-A requirement 3).

2. **[MUST FIX]** When `actualServiceDate !== intendedServiceDate`, BLOCK the service-log entry. Surface a state to the user with copy along the lines of: *"This notice's expiration date was computed for service on {intendedServiceDate}. Actual service occurred on {actualServiceDate}. The expiration date on the notice is facially wrong for this service date. You must regenerate the notice with the correct service date before logging service."*

3. **[MUST FIX]** The block is hard. There is no override path, no "I acknowledge this is wrong, log it anyway" button, no "for advanced users" escape. The compliance harm of attesting service on a facially-wrong notice is the entire defect this guard exists to prevent; an override path defeats it.

4. **[MUST FIX]** Once the user regenerates with the corrected `intendedServiceDate`, the new notice is treated as a new record (new id, new produced timestamp, new facial dates). The old notice is **not** edited in place — it remains in the user's history as the (now-superseded) produced artifact. Compliance reasoning: tampering with a previously-rendered notice's facial dates after the fact creates an evidentiary problem if there is any later dispute about what was actually produced and when. Regenerate creates a new artifact; the old one is preserved as-rendered.

5. **[MUST FIX]** A unit test pins the guard: given a notice with `intendedServiceDate = 2026-06-29` and an attempted service log with `actualServiceDate = 2026-06-30`, the guard blocks and surfaces the regenerate-required state. Given the same notice with `actualServiceDate = 2026-06-29`, the guard does not block.

6. **[SHOULD FIX]** A second unit test pins the new-record-on-regenerate behavior: after the block fires, regenerating produces a new notice id; the prior notice remains accessible via the user's history with its original (now-superseded) facial dates intact.

### §2.4    Compliance copy (broker-authored, locked)

The Review-step copy (PR-A requirement 2) and the serve-time block copy (PR-B requirement 2) both go through the locked-prose system per the standing locked-prose discipline. I will author the locked-prose entries when engineering surfaces the PR-A / PR-B draft copy for sign-off. Until then, the wording in §2.3 is **directional placeholder** — engineering should use it as the intent and not ship it verbatim as final user-facing copy.

Namespace assignment for the locked-prose entries (matching the city-namespace plan):
- `intake_review_intended_service_date_explainer` (no city scope — applies system-wide)
- `serve_time_stale_facial_dates_guard_block` (no city scope — applies system-wide)

These two entries enter the locked-prose manifest at the moment the PRs are drafted.

---

## §3    Operator action on the live Clifton Alexander notice

**Operator: DO NOT SERVE the existing Jul-2-2026 notice.** This was the §3.6 ask in the prior ruling and remains unchanged.

**Regeneration procedure (works today, without waiting for PR-A/PR-B):**

1. Re-enter the same intake data for the Clifton Alexander notice via the chat flow on the day of intended service.
2. The produce path will default `serviceDate` to the generation date (because Option 1 has not landed yet). **Generate the new notice on Jun 30, 2026** (today), and the produce path will use Jun 30 as the service date.
3. Verify the regenerated notice's facial expiration shows **Mon Jul 6, 2026**.
4. Verify the regenerated notice's `Dated:` line shows **Tue Jun 30, 2026**.
5. Serve the regenerated notice on Jun 30, 2026 (today).

If service cannot occur today (Jun 30) for any reason — process-server unavailability, tenant absence at the address, etc. — then re-generate again on the actual day of service. **Until Option 1 lands, the only mechanism that produces a facially-correct notice is to generate it on the day of service.** This is a known workaround, not a defect remediation; the remediation is PR-A.

If the operator has already produced a notice and service is now occurring on a different day than the produce date, the notice is facially wrong on its day-count math and must not be served. Regenerate first.

---

## §4    Gate-3 fold-in (closing prior ruling §6 CONSIDER)

The prior ruling's §6 CONSIDER said: "fold the SC-DAYCOUNT synthetic catalog into Gate-3 §2.4 monitoring requirements." With the §1.3 closure of `SC-DAYCOUNT-JUL2026` as a CI-enforced regression in the date test suites (not the A14 harness), the Gate-3 fold-in is **narrowed**:

- Gate-3 §2.4 monitoring requirements should reference `ci / test-and-typecheck` as the enforcement rail for day-count and holiday-table regressions, not the A14 synthetic harness.
- Gate-3 §2.5 (audit-tables framing introduced in the prior session via engineer's QA finding) does not need a day-count audit table — the CI test suites are the audit surface, and they fail-loud on regression.
- The Gate-3 doc PREDRAFT is updated to reflect: day-count and holiday-table regressions live in the date test suites under `ci / test-and-typecheck`; the A14 synthetic harness is reserved for automation mirror-queue regressions (its actual purpose).

Engineering does not need to edit `gate3_scoping_PREDRAFT_2026-06-30.md` for this fold-in in this PR cycle. I will update it as a §2-level edit when the Gate-2 closure work moves into Gate-3 scoping; for now, this ruling records the intent so the update is unambiguous when the time comes.

---

## §5    Remaining ruling items (carry forward, not engine-critical)

**§2.4 / §6 SHOULD-FIX (LAHD post-service checklist + optional pre-filled cover sheet):** Scheduled as a separate workstream. Engineering pause on this until PR-A and PR-B land — the post-service checklist will naturally surface in the same serve-time flow that PR-B touches, and bundling the two reduces churn. **Target sequencing: PR-A → PR-B → LAHD post-service checklist as PR-C on the same serve-flow surface.**

**§2.5 / §6 SHOULD-FIX (cover sheet pinned in LAHD cron):** Operator-only / cron-config action. Operator updates cron `0abb46c4`'s pinned list to add:
- `form_slug: eviction_filing_cover_sheet`
- URL: per the LAHD cover sheet's authoritative source (the URL the operator pulled the Rev 2.6.2026 baseline from; if the operator pulled it as an upload without a public URL, baseline this run captures the SHA only and the URL field stays blank until the operator surfaces the source)
- basis: LAMC § 151.09.C.9 + § 165.05.B.5 paper-filing wrapper for LAHD eviction filings

Operator: edit the cron `0abb46c4` task description to add the new pinned form. This is one of the parallel non-flag items the operator can handle while engineering ships PR-A.

**§6 CONSIDER (Gate-3 fold-in):** Resolved in §4 of this ruling.

---

## §6    Checklist for engineer and operator (in priority order)

### Engineer

☐ **[MUST FIX — this week]** Push branch `fix/daycount-regression-tests` per the git hand-off block in the diagnosis filing. The §3 regression tests close on push.

☐ **[MUST FIX — next PR cycle]** Draft PR-A (Option 1 intake-and-produce wiring) per §2.3 requirements. Surface PR-A's user-facing copy to broker for locked-prose entry per §2.4 before merge.

☐ **[MUST FIX — after PR-A merges]** Draft PR-B (Option 2 serve-time guard) per §2.3 requirements. Surface PR-B's user-facing copy to broker for locked-prose entry per §2.4 before merge.

☐ **[SHOULD FIX — after PR-B merges]** Draft PR-C (LAHD post-service checklist + optional pre-filled cover sheet) per §5. Bundles naturally with the serve-flow work in PR-B.

### Operator

☐ **[MUST FIX — today, Jun 30 2026]** Regenerate the Clifton Alexander notice on Jun 30 (today) per §3 procedure. Serve the regenerated notice on Jun 30. DO NOT SERVE the existing Jul-2 notice under any circumstances.

☐ **[MUST FIX — this week]** Edit cron `0abb46c4` task description to add `eviction_filing_cover_sheet` to the pinned-forms list per §5.

### Standing-rule preservation

☐ The §0 recalibration discipline worked correctly here. Engineering surfaced a fork that turned out to disprove the broker's hypothesis list; broker accepted the diagnosis, retracted the hypotheses, and ruled on the actual compliance question (input-date semantics). Both sides operated as intended. Carry this case forward as a worked example of the discipline.

---

## §7    What this ruling does NOT do

- Does NOT authorize any engine change. The engine is correct.
- Does NOT authorize any holiday-table change. The holiday table is correct.
- Does NOT permit the prior ruling's §3.5 hypotheses to be cited going forward as the day-count defect's root cause. They are formally retracted; engineering's diagnosis supersedes.
- Does NOT permit shipping PR-A without the Review-step UI per §2.3 PR-A requirement 2 — a silent intake-only capture without surfacing the date to the user defeats the compliance purpose.
- Does NOT permit shipping PR-B with an override path per §2.3 PR-B requirement 3 — the hard block is the entire mechanism.
- Does NOT permit editing previously-rendered notices in place per §2.3 PR-B requirement 4 — regenerate creates new artifacts; old artifacts are preserved as-rendered.
- Does NOT alter the standing rules §4.1–§4.12. All carry forward unchanged.
- Does NOT introduce attorney attribution. Broker-scope only under Bus. & Prof. Code § 10131(b).

---

## §8    Verbatim sign-off lines

**PR-A sign-off line:**

```
Add intendedServiceDate to intake + produce wiring per
  daycount_defect_workflow_fork_broker_ruling_2026-06-30.md §2.3 PR-A.
Required field on intake schema; Review-step input surfaces to user
  with broker-authored locked-prose explainer.
Produce path computes facial dates against intendedServiceDate;
  Dated line and serviceDate field derive from the same source.
30-day forward cap on intendedServiceDate; today (generation) is earliest.
Unit tests pin: intake-to-produce flow Jun30 → Jul6; 30-day-cap rejection.
```

**PR-B sign-off line:**

```
Add serve-time stale-facial-dates guard per
  daycount_defect_workflow_fork_broker_ruling_2026-06-30.md §2.3 PR-B.
At successful-attempt service log: compare actualServiceDate to
  notice.intendedServiceDate; hard-block + require-regenerate on mismatch.
No override path. Regenerate creates new notice record; prior preserved.
User-facing block copy via broker-authored locked-prose entry.
Unit tests pin: mismatch block; match no-block; new-record-on-regenerate.
```

---

— Jack Taglyan
California Licensed Real Estate Broker · CalDRE B9445457
Broker Compliance Review · 2026-06-30

*Posture footer.* OwnerPilot AI operates as broker-scope only under Bus. & Prof. Code § 10131(b). Jack Taglyan (CalDRE B9445457) is the sole compliance authority on this project. This ruling is a broker product-and-compliance determination over OwnerPilot's own systems; it does not constitute legal advice and does not invoke attorney authority. The engine and the holiday data are correct as deployed and require no change. The defect resides in the input-date semantics of the produce path; the remediation is Option 3 (PR-A intake capture + PR-B serve-time guard) per §2. The §3 operator action on the live Clifton Alexander notice is binding and time-sensitive: regenerate on Jun 30, serve on Jun 30, DO NOT SERVE the existing Jul-2 notice.
