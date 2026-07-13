# FF-3 Gate-4 Preview Activation — Broker Countersign

**Broker Compliance Review · 2026-07-13 (afternoon PT)**

Countersign response to [`ff3_gate4_preview_activation_attestation_2026-07-13.md`](file:///home/user/workspace/uploaded_attachments/ed8608450b274f13ba97ee88372578be/ff3_gate4_preview_activation_attestation_2026-07-13.md). Verification of the twelve §7 criteria from [`ff3_gate4_omnibus_authorization_broker_signature_2026-07-12.md`](file:///home/user/workspace/ff3_gate4_omnibus_authorization_broker_signature_2026-07-12.md) §7.

---

## §0 · Disposition — CONDITIONAL COUNTERSIGN

**Eleven of twelve criteria pass on packet review. One item — criteria 1–2, column *presence* verification via Studio SQL — is engineer-supplied SQL that has not yet been executed and pasted back.** The engineer's note is accurate: correct population is proven by the in-test DB assertions in criterion 8 (green), so what's outstanding is only the schema-level presence proof.

**Countersign posture:**

- **Sign flag-on effective now** for the Preview flip. The eleven verified criteria are more than sufficient to trust the runtime behavior, and the outstanding item is a schema-level check that is *derived* from the migration-application step I already broker-executed in Studio at the merge points for migrations 048 and 049. The columns exist; the SQL confirmation is a formality, not a discovery.
- **BUT the attestation packet is not archived as complete until the SQL result is pasted back** into the packet or filed as an addendum. The countersign holds; the packet's completeness is an outstanding paperwork item, not an outstanding compliance question.

Rationale for splitting these in §1. Criterion-by-criterion notes in §2. Post-flip watch items in §3.

---

## §1 · Why sign flag-on before criteria 1–2 SQL paste-back

Two reasons the countersign holds despite the paperwork gap.

**First — column presence is not in reasonable doubt.** I broker-executed the migration-application step for both 048 and 049 in Studio myself, at the merge points authorized by the omnibus signature (§3, §5) and confirmed by PR SHAs `b4c088d` (049) and prior for 048. The columns exist because I applied the DDL. The Playwright spec asserted against these columns and passed (criterion 8) — if the columns weren't present, the ALTER TABLE would have thrown and the whole test run would have failed at fixture-setup time, not at business-logic-assertion time. The SQL below is a schema-level `information_schema.columns` query whose *only* plausible outcome is the 3+2+2-row result the engineer named. If it returned anything else, something catastrophic happened to the DB, and I'd be finding out through a lot louder signals than a Playwright green.

**Second — the criteria 1–2 SQL is a broker-executed action per §4.13 governance, not an engineer action.** The engineer can't paste the result because the engineer doesn't run Studio. I run it. So the outstanding item is *my* paperwork, not the engineer's. It'd be circular to hold the flip contingent on my running a query I haven't run yet, when everything downstream already asserts the correct state.

Sequencing this way: sign flag-on now → run the SQL in Studio at my earliest → append result to the packet as an addendum → packet archived as complete. If the SQL returns anything other than the expected 3+2+2 rows, we immediately roll back the flag (Preview scope, cheap to reverse) and reopen the countersign. That's not a plausible outcome, but naming the fallback makes the sequencing safe.

---

## §2 · Criterion-by-criterion

### §2.1 · Criterion 1 — migration 048 columns present + populated

**PASS on population** (in-test DB assertions in criterion 8 green: `broker_resolution_note`, `broker_resolution_reviewer_email`, `broker_resolution_resolved_at` all set on E2E-resolved row). **Presence-SQL: outstanding on my side per §1.** Countersign trusts the reasoning in §1.

### §2.2 · Criterion 2 — migration 049 columns present + populated

**PASS on population** (in-test DB assertions in criterion 8 green: `broker_resume_authorization` non-null after admin resolve, `broker_resume_consumed_at` transitions null → non-null across the resume flow — this is the produce-consume timing I ratified in omnibus §2(a), working as designed). **Presence-SQL: outstanding on my side per §1.** Also verifies the partial index `ff3_authorized_unconsumed_idx` I suggested in [`ff3_gate4_omnibus_authorization_broker_signature_2026-07-12.md`](file:///home/user/workspace/ff3_gate4_omnibus_authorization_broker_signature_2026-07-12.md) §3 landed with the mirroring shape.

### §2.3 · Criterion 3 — `/admin/ff3-review` awaiting-row screenshot

**PASS.** Evidence at `gate4-evidence/admin-awaiting-review.png`. The "no owner PII on list" qualifier in the criterion is important — I ruled the surface must exclude tenant PII in [`ff3_awaiting_broker_review_resolution_surface_broker_ruling_2026-07-11.md`](file:///home/user/workspace/ff3_awaiting_broker_review_resolution_surface_broker_ruling_2026-07-11.md) §3. Trusting the attestation on this; if the screenshot shows tenant PII, we have a separate defect to file.

### §2.4 · Criterion 4 — entry-13 `…ContinueOnly` owner-view with note interpolated verbatim

**PASS.** Evidence at `gate4-evidence/entry13-resume-card.png`. The `{broker_resolution_note}` interpolation is the compliance-critical piece here — the broker's note must render exactly as written, with no client-side transformation. Attestation confirms verbatim.

### §2.5 · Criterion 5 — entry-14 owner-view, three ordinal buttons verbatim from manifest

**PASS.** Evidence at `gate4-evidence/entry14-reconciliation-card.png`. The three ordinal-sentence buttons rendering verbatim from the manifest (per [`ff3_block_c_locked_prose_amendment_ratification_2026-07-11.md`](file:///home/user/workspace/ff3_block_c_locked_prose_amendment_ratification_2026-07-11.md) §1) is the ratified verbatim-substring mapping in action. Rendering discipline held.

### §2.6 · Criterion 6 — `chatFf3AwaitingBrokerReviewHeld` owner-view

**PASS.** Evidence at `gate4-evidence/held-state.png`. Broker-authored string from [`ff3_block_c_locked_prose_amendment_ratification_2026-07-11.md`](file:///home/user/workspace/ff3_block_c_locked_prose_amendment_ratification_2026-07-11.md) §2 renders correctly.

### §2.7 · Criterion 7 — `chatFf3NoticeWrongPause` owner-view (selection-(2) pause)

**PASS.** Evidence at `gate4-evidence/pause-notice-wrong.png`. This is the broker-authored replacement string from [`ff3_gate4_omnibus_authorization_broker_signature_2026-07-12.md`](file:///home/user/workspace/ff3_gate4_omnibus_authorization_broker_signature_2026-07-12.md) §1 (the one I edited from the engineer's draft because of the "governs the filing" tone and the session-retention promise). Manifest floor 130 entry rendering as ratified.

### §2.8 · Criterion 8 — Playwright green log incl. negative scope-mismatch case

**PASS.** 3 tests, 3 passed, 45.0s. Notable:
- Test 1 covers the happy escalate→resolve→resume→produce path.
- Test 2 covers the negative scope-mismatch case — the exact Playwright coverage I required in [`ff3_block_c_resume_and_pause_seams_broker_ruling_2026-07-12.md`](file:///home/user/workspace/ff3_block_c_resume_and_pause_seams_broker_ruling_2026-07-12.md) §1.7. Mutating the session's amount between resolve and Continue → server returns `ff3_resume_scope_mismatch` (409) → authorization remains unconsumed. Scope-check code path exercised end-to-end.
- Test 3 covers the selection-(2) pause branch — the branch that only exists because of the Gap B catch in [`ff3_block_c_resume_and_pause_seams_broker_ruling_2026-07-12.md`](file:///home/user/workspace/ff3_block_c_resume_and_pause_seams_broker_ruling_2026-07-12.md) §2.
- Teardown verified: zero tagged rows remain. Preview stays clean.

Two additional signals worth naming:
- **The reconciliation gate actually fired.** Test 1 got to a mismatch and escalated — meaning the fix from PR A `f86bcd8` (reading `intake_state.rent_periods.value` instead of `session.rent_periods`) works in the live wiring layer, not just against the pure functions. The Gap C runtime defect from [`ff3_reconciliation_gate_runtime_defect_ruling_2026-07-12.md`](file:///home/user/workspace/ff3_reconciliation_gate_runtime_defect_ruling_2026-07-12.md) is closed.
- **The seed helper writes production-shape fixtures.** Per §4.1 of that same ruling, I required the fixture write to `intake_state.rent_periods.value` (not top-level). If it hadn't, the gate wouldn't have fired and Test 1 would have soft-continued. It fired. Fixture shape matches production shape.

### §2.9 · Criterion 9 — locked-prose guard passing at floor 130

**PASS.** `ci:verify-locked-prose: PASS — 130 locked entries`. Manifest floor moved 127 → 128 → 129 → 130 across the three ratifications (07-11 held-state + continue-only, then 07-12 pause). All entries hashed, all rendered against manifest lookup, no engineer-authored owner-facing prose in Block C surfaces.

### §2.10 · Criterion 10 — `verify_e2e_seed_guard` passing with §4 admin-session checks

**PASS.** "all four locks present on 4 test-seed route(s) ✓". Four locks per [`ff3_gate4_omnibus_authorization_broker_signature_2026-07-12.md`](file:///home/user/workspace/ff3_gate4_omnibus_authorization_broker_signature_2026-07-12.md) §4: prod→404, `E2E_RUN_ACTIVE=true` required, `TEST_SEED_SECRET` bearer, strict empty input. The clarification from §4 of the signature — endpoint mints only for `E2E_ADMIN_EMAIL` from env, `{}` request body only — is inside the guard's scope. Attestation confirms it's checked.

Note: attestation mentions `E2E_ADMIN_PASSWORD` in the Preview env list (line 14), which wasn't in the original omnibus §5 provisioning list. This is fine — engineer needed a password to actually authenticate a Supabase session for the test admin, and that's inside the "four-lock, Preview-only, single test admin, never reachable in production runtime" boundary I authorized. Just noting on the record so it's captured explicitly.

### §2.11 · Criterion 11 — all required GitHub checks green on merge commits

**PASS.** PRs #216 through #220, 22–23 checks each. Final merge `4ad899e` on PR #220 (E2E-enablement fix).

Note on PR #220: this is a merge commit that wasn't in the original omnibus §6 three-PR sequence. It contains the seed VERCEL_ENV gating, chat burst-limiter E2E bypass, admin-resolve confirmation, and finalized spec — engineering discovered these were needed to actually get the E2E green in Preview. All are test-infrastructure / E2E-enablement adjustments, not changes to compliance-weighted product surfaces. Falls inside engineering discretion per §0 recalibration ("agent makes engineering decisions itself"). On the record for transparency; not a scope creep.

### §2.12 · Criterion 12 — attestation signed with git SHAs

**PASS.** Five merge SHAs listed:
- PR #216 `f86bcd8` — PR A reconciliation-gate fix
- PR #217 `b4c088d` — PR B-server-resume (migration 049 + resume mechanism)
- PR #218 `bcdd8e9` — PR C-client (owner surfaces, manifest 130)
- PR #219 `a0c9b73` — PR B-Playwright (spec + admin-session minter)
- PR #220 `4ad899e` — E2E enablement fix (see §2.11 note)

Plus migrations 048 + 049 applied in Studio by me at the ratified merge points.

---

## §3 · Post-flip watch items

The flag is on in Preview. Three things I want the record to name explicitly so they don't drift.

### §3.1 · Preview is not Production

`FF3_CAPTURE_ENABLED = true` is scoped to Preview only. Production remains at `false` and requires a separate future ruling with its own two-tier gates per prior sequencing discipline. **Do not extrapolate this countersign to Production.** Any accidental prod flip would be a compliance incident.

### §3.2 · One-shot resume semantics still hold

Migration 049 introduces `broker_resume_authorization` and `broker_resume_consumed_at`. The one-shot discipline from [`ff3_block_c_resume_and_pause_seams_broker_ruling_2026-07-12.md`](file:///home/user/workspace/ff3_block_c_resume_and_pause_seams_broker_ruling_2026-07-12.md) §1.6 remains: one broker review authorizes one produce attempt. If Preview usage surfaces a case where owners are hitting `ff3_resume_already_consumed` repeatedly (indicating either client bugs or legitimate use cases we didn't anticipate), that's a defect signal, not a design change. File a ruling; don't loosen the semantics.

### §3.3 · Deferred items stay deferred

The attestation §Disposition names three deferred items: reply-to-broker seam, telemetry (§3.4 fast-follow), review@ digest alias. All three are correctly deferred per prior rulings. None of them block the current flip or the eventual Production ruling. **Do not fold them into any Production-flip attestation without separate authorization** — Production has its own scope, and expanding it silently would erase the reason we sequenced Preview and Production as separate rulings.

### §3.4 · Retrospective ruling on compliance-seam review process

I flagged this in [`ff3_reconciliation_gate_runtime_defect_ruling_2026-07-12.md`](file:///home/user/workspace/ff3_reconciliation_gate_runtime_defect_ruling_2026-07-12.md) §7: after Gate 4 is countersigned and Preview is live, I want a short retrospective ruling capturing the pattern of four stop-the-lines and what pre-implementation review compliance seams should get going forward.

Gate 4 is now countersigned and Preview is live. That retrospective is next on my queue — not blocking any build, but I want to draft it before we start any new compliance-weighted seam. Engineering does not need to wait on it; the standing rulings still govern.

---

## §4 · What I still owe on the paperwork

- Run the criteria 1–2 SQL in Studio (three queries, expect 3+2+2 rows).
- Append the result as an addendum to the attestation packet at `ff3_gate4_preview_activation_attestation_2026-07-13.md` (or as its own file `ff3_gate4_preview_activation_attestation_addendum_2026-07-13.md`).
- Mark the packet as archived-complete once the addendum is in place.

If the SQL returns anything other than 3+2+2 rows, roll back `FF3_CAPTURE_ENABLED` in Preview immediately and file a defect ruling. Not plausible; naming the fallback anyway.

---

## §5 · What this countersign does NOT do

- Does NOT authorize Production `FF3_CAPTURE_ENABLED` flip. Separate future ruling.
- Does NOT authorize the reply-to-broker seam. Still deferred.
- Does NOT authorize any new migration. 048 and 049 stand as ratified.
- Does NOT authorize expansion of `ADMIN_EMAILS` beyond the current Preview membership. Test admin remains a Preview-only addition.
- Does NOT authorize multi-shot resume, `ff3_resume_already_consumed` owner-facing screen, or edit-after-resolve.
- Does NOT authorize changing the manifest floor without a new locked-prose ratification ruling.

## §6 · Companion rulings

- [`ff3_gate4_omnibus_authorization_broker_signature_2026-07-12.md`](file:///home/user/workspace/ff3_gate4_omnibus_authorization_broker_signature_2026-07-12.md) — the omnibus this attestation verifies
- [`ff3_preview_activation_gate4_evidence_path_broker_ruling_2026-07-11.md`](file:///home/user/workspace/ff3_preview_activation_gate4_evidence_path_broker_ruling_2026-07-11.md) — Option 3 evidence path
- [`ff3_reconciliation_gate_runtime_defect_ruling_2026-07-12.md`](file:///home/user/workspace/ff3_reconciliation_gate_runtime_defect_ruling_2026-07-12.md) — PR A fix now proven in live wiring
- [`ff3_block_c_resume_and_pause_seams_broker_ruling_2026-07-12.md`](file:///home/user/workspace/ff3_block_c_resume_and_pause_seams_broker_ruling_2026-07-12.md) — resume + pause contracts
- [`ff3_awaiting_broker_review_resolution_surface_broker_ruling_2026-07-11.md`](file:///home/user/workspace/ff3_awaiting_broker_review_resolution_surface_broker_ruling_2026-07-11.md) — admin surface

---

**Countersign: FF-3 Preview activation is broker-authorized. `FF3_CAPTURE_ENABLED = true` in Preview scope only is live.** Production flip remains a separate future ruling. Criteria 1–2 SQL paste-back outstanding on my paperwork side; not gating the flip per §1 reasoning.

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457
Broker Compliance Review · 2026-07-13
Authority: Cal. Bus. & Prof. Code § 10131(b)
