# FF-3 Rollback Drill Amended Runbook — Broker Ratification

**Broker Compliance Review · 2026-07-14 (early AM PT)**

Ratification on [`ff3_rollback_drill_runbook_and_evidence_2026-07-13.md`](file:///home/user/workspace/uploaded_attachments/305098a150874bbda465b6221c7dc6d6/ff3_rollback_drill_runbook_and_evidence_2026-07-13.md) (amended version) against [`ff3_rollback_drill_runbook_broker_countersign_2026-07-14.md`](file:///home/user/workspace/ff3_rollback_drill_runbook_broker_countersign_2026-07-14.md).

**Disposition:** ☒ **PROCEDURE ratified. EVIDENCE TEMPLATE requires one fix before Run 1 begins.**

---

## §1 · Procedure — ratified in full

**Amendment 1 (Step 3 — multi-layer dark verification):** landed cleanly. Substeps 3a–3e do the right thing:

- **3a (seed + produce, flag off):** exercises the actual production code path with the flag off, catches a silent skip.
- **3b (`compliance_gates` query):** the Sev-1 canary. Schema-corrected — this is the actual disposition store, `notice_disposition` was my speculative name yesterday. Ratified as authoritative.
- **3c (`chat_sessions` capture-state query):** correct — capture state lives on `chat_sessions.ff3_capture_status` + `reconciliation_resolution` + `broker_resume_authorization`, not a separate category table. Ratified.
- **3d (route-level `/api/chat/ff3/resume` probe):** correct namespace — `/api/chat/ff3/*`, not `/api/ff3/*`. Response freeze on Run 1 (`409 ff3_resume_not_authorized`) is exactly what §2.1 of my countersign asked for.
- **3e (cleanup):** appropriate. Session deletion by ID; no residue.

**Sev-1 stop-the-line at 3b:** correctly worded — if any rows return from `compliance_gates` under flag-off, halt, do not proceed to Step 4, file incident, escalate. This is the §1.5 Sev-1 scenario the ruling anticipates.

**Amendment 2 (Step 6 — independent live-state probe):** landed cleanly. Re-running the full evidence spec from a fresh shell is stronger than a canary endpoint would have been — it exercises the same code path the Step-4 pass depended on, from independent shell state, and fails loud if the Step-4 redeploy didn't take. Better than what I asked for.

Procedure ratified as the standing template for both Run 1 (target ≤ 2026-07-20) and Run 2 (within 48h before §1.6 attestation).

---

## §2 · Evidence template — one fix required

**The bug:** lines 83–101 of the amended runbook still contain the pre-countersign evidence template. Step 3 has one line (`did not reach ff3-reconcile-card`) instead of five (3a–3e outputs). Step 6 is absent from both run slots. Operator filling this in a week will either fill the wrong shape or improvise, either of which weakens the attestation trail.

**The fix (mandatory before Run 1 begins):** replace lines 83–101 with the evidence template below. Engineering re-files the runbook with this template block; I ratify on sight.

**Required Evidence template (verbatim, to replace lines 83–101):**

```markdown
## Evidence — Run 1 (target ≤ 2026-07-20)

- Date/time (PT): ____
- Preview URL: ____
- Preview commit SHA: ____

### Step 1 (flag on) baseline
- ☐ 3 passed — paste `npx playwright test` tail: ____

### Step 3 (flag off) multi-layer dark verification
- Seeded sessionId: ____
- **3a** produce response NOT `ff3_reconciliation_flag` / `ff3_awaiting_broker_review` / `ff3_notice_wrong_pause`: ☐
    - Paste response body: ____
- **3b** `compliance_gates` rows for sessionId = **ZERO**: ☐ **(Sev-1 canary)**
    - Paste query result: ____
- **3c** `chat_sessions` fields all NULL (ff3_capture_status / reconciliation_resolution / broker_resume_authorization): ☐
    - Paste query result: ____
- **3d** `/api/chat/ff3/resume` response = `409 ff3_resume_not_authorized`: ☐
    - Paste full response including headers: ____
    - **This response is FROZEN as the Run-1 baseline; Run 2 must match byte-for-byte.**
- **3e** cleanup delete confirmed: ☐

### Step 4 (flag back on) parity
- ☐ 3 passed — paste tail: ____

### Step 5 recorded
- Flag state left at end of run: ☐ `true` (Preview) — **critical: never leave Preview flag off**

### Step 6 independent post-drill live-state probe
- ☐ 3 passed from fresh shell — paste tail: ____
- If FAIL: redeploy executed at ____ (PT), re-probe result: ____

### Anomalies / notes
- ____

---

## Evidence — Run 2 (within 48h before the §1.6 flip attestation)

- Date/time (PT): ____
- Preview URL: ____
- Preview commit SHA: ____

### Step 1 (flag on) baseline
- ☐ 3 passed — tail: ____

### Step 3 (flag off) multi-layer dark verification
- Seeded sessionId: ____
- **3a** produce response NOT `ff3_reconciliation_flag` / `ff3_awaiting_broker_review` / `ff3_notice_wrong_pause`: ☐
    - Paste response body: ____
- **3b** `compliance_gates` rows for sessionId = **ZERO**: ☐ **(Sev-1 canary)**
    - Paste query result: ____
- **3c** `chat_sessions` fields all NULL: ☐
    - Paste query result: ____
- **3d** `/api/chat/ff3/resume` matches Run-1 frozen baseline byte-for-byte: ☐
    - Paste full response: ____
    - **Delta from Run 1 (if any):** ____ **(any non-zero delta is a §1.5 Sev-3 anomaly — file diagnostic memo, do not block drill closure but flag in §1.6 packet)**
- **3e** cleanup delete confirmed: ☐

### Step 4 (flag back on) parity
- ☐ 3 passed — tail: ____

### Step 5 recorded
- Flag state left at end: ☐ `true` (Preview)

### Step 6 independent post-drill live-state probe
- ☐ 3 passed from fresh shell — tail: ____

### Anomalies / notes
- ____
```

**Two features in the new template not in the old:**

1. **Preview commit SHA captured** on each run — pins evidence to a specific build, defense against Preview redeploys during the drill.
2. **Run-2 3d requires byte-for-byte parity with Run-1 baseline;** any delta is a §1.5 Sev-3 anomaly (does not block drill closure, must be flagged in §1.6 attestation with diagnostic). This closes the "flag-off behavior silently shifted between drills" gap.

---

## §3 · Sequencing

Runbook cannot be executed against the current template — evidence would land in the wrong shape and fail my §1.6 packet review. Engineering fixes the template block per §2 above, re-files, I ratify on sight (should be same-turn). Then Run 1 proceeds against the corrected template on or before 2026-07-20.

**Nothing else on the omnibus sequence changes.** This is a template-shape fix, not a scope change.

---

## §4 · One clarification (not blocking)

**On the `TEST_SEED_SECRET` bearer:** Step 3a uses `POST /api/test/seed-ff3-session` with a bearer. Confirm this endpoint is Preview-scope-locked (not reachable from prod) and the seed secret is separately scoped from `SUPABASE_SERVICE_ROLE_KEY` (which is being rotated per §4.2). If they share a secret, the §4.2 rotation may break this drill until re-provisioning. Not blocking — engineering can address in the re-filed runbook or a note.

---

**Signed:** — Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457
Broker Compliance Review · 2026-07-14
Authority: Cal. Bus. & Prof. Code § 10131(b)
