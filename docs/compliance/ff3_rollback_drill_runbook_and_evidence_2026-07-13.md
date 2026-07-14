# FF-3 Rollback Drill — Runbook + Evidence — 2026-07-13

Deliverable for `ff3_prod_flip_and_scope_a_closure_omnibus_broker_ruling_2026-07-13.md` §1.3. Proves that
`FF3_CAPTURE_ENABLED=false` cleanly reverts the FF-3 surface to pre-FF-3 behavior and that flipping back restores
it. **Run twice** (ruling amendment): first by **2026-07-20**, second **within 48h before the §1.6 flip
attestation**. Broker-executed (flag flips + Preview runs, §4.13); engineering supplied this runbook + template.

All steps run against the Preview deployment. The flag is currently **on** in Preview (Gate-4 activation).

---

## Procedure (each run)

**Step 1 — Flag-ON baseline.** With `FF3_CAPTURE_ENABLED=true` (current state), run the evidence spec:
```bash
cd ~/ownerpilot && E2E_BASE_URL="<preview-url>" E2E_RUN_ID="$(uuidgen)" TEST_SEED_SECRET="<secret>" \
  SUPABASE_URL="https://txpetdrfsmqnyooydmas.supabase.co" SUPABASE_SERVICE_ROLE_KEY="<key>" \
  npx playwright test ff3-reconciliation-resume --config=e2e/playwright.config.ts --project=desktop --reporter=list
```
Expect **3 passed** (reconciliation fires → escalate → resolve → resume; negative scope-mismatch; pause). Capture output.

**Step 2 — Flip OFF.** In Vercel → Environment Variables → set `FF3_CAPTURE_ENABLED=false` (Preview scope) →
**Redeploy** the Preview. Wait for Ready.

**Step 3 — Verify the surface is dark, at multiple layers** (broker countersign 2026-07-14, Amendment 1). "The
spec stopped" only proves the harness halts; it does not disprove a silent flag-off disposition write. Prove dark at
the harness, disposition-store, capture-state, and route layers. Seed one probe session and produce against it with
the flag off:

- **3a — Seed + produce (flag off).** `POST /api/test/seed-ff3-session` (bearer) → capture `{sessionId, cookie}`.
  Then `POST /api/notice/produce/from-chat` with that cookie + `{"intendedServiceDate":"<today>"}`. Expected: the
  response is **NOT** `409 ff3_reconciliation_flag` / `ff3_awaiting_broker_review` / `ff3_notice_wrong_pause` — the
  FF-3 gate is skipped.
- **3b — Disposition-store query (the Sev-1 canary), Studio.** `compliance_gates` is the disposition store
  (there is no `notice_disposition` table):
  ```sql
  select gate, result from compliance_gates where chat_session_id = '<sessionId>';
  ```
  **EXPECT ZERO ROWS.**
- **3c — FF-3 capture-state query, Studio** (capture state lives on `chat_sessions`; there is no separate FF-3
  category table):
  ```sql
  select ff3_capture_status, reconciliation_resolution, broker_resume_authorization
  from chat_sessions where id = '<sessionId>';
  ```
  **EXPECT** `ff3_capture_status` NULL, `reconciliation_resolution` NULL, `broker_resume_authorization` NULL.
- **3d — Route-level probe (freeze flag-off behavior on Run 1).** The FF-3 surfaces are `/api/chat/ff3/resume` and
  the produce gate in `/api/notice/produce/from-chat` (no `/api/ff3/*` namespace):
  ```bash
  curl -i -X POST "<preview>/api/chat/ff3/resume" -H "cookie: op_chat_token=<cookie>"
  ```
  **EXPECT** `409 {"error":"ff3_resume_not_authorized"}` (no authorization on a fresh session). Freeze this exact
  response on Run 1 as the flag-off baseline; Run 2 must match.
- **3e — Clean up.** `delete from chat_sessions where id = '<sessionId>';`

**⛔ SEV-1 STOP-THE-LINE (broker countersign):** if **3b returns ANY rows** in the flag-off state, that is the
§1.5 Sev-1 scenario — the produce-gate chain silently writing a disposition under flag-off. **HALT the drill, do NOT
proceed to Step 4, file an incident, escalate.**

Corroboration: the flag-off `skip` disposition is also proven at unit level by the flag-off skip tests and
`synthetic:ff3:monitoring`.

**Step 4 — Flip back ON + confirm parity.** Set `FF3_CAPTURE_ENABLED=true` (Preview) → Redeploy → re-run the
command. Expect **3 passed** again — parity with the Step-1 baseline. Capture output.

**Step 5 — Record below.**

**Step 6 — Independent post-drill live-state probe** (broker countersign 2026-07-14, Amendment 2). The Step-5 flag
box is operator-recorded *intent* — if the Step-4 redeploy was skipped, someone marks `☐ true` while the running
build is still flag-off. From a **fresh shell**, re-run the evidence spec against the Preview (independent of the
Step-4 run):
```bash
cd ~/ownerpilot && E2E_BASE_URL="<preview-url>" E2E_RUN_ID="$(uuidgen)" TEST_SEED_SECRET="<secret>" \
  SUPABASE_URL="https://txpetdrfsmqnyooydmas.supabase.co" SUPABASE_SERVICE_ROLE_KEY="<key>" \
  npx playwright test ff3-reconciliation-resume --config=e2e/playwright.config.ts --project=desktop --reporter=list
```
**EXPECT 3 passed** — this queries the *live deployed build*: reconciliation fires only if `FF3_CAPTURE_ENABLED` is
genuinely on. If it does not reach the reconciliation card, the Step-4 redeploy did not take (build still flag-off) —
**FAIL LOUD: redeploy and re-probe before closing the drill.**

---

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

<!-- Timing hint: under the decoupled FF-3 soak clock (14-day floor from Gate-4 activation), the §1.6 attestation
     files ~2026-07-27, so Run 2 lands ~2026-07-25–27. Not a hard date — Run 2 is anchored to "within 48h before the
     attestation filing," whenever that is. See ff3_soak_clock_decouple_engineering_input_2026-07-14.md (pending broker
     supersession ruling). -->

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

---

## Secret scoping (ratification §4 clarification)

- `TEST_SEED_SECRET` (the Step-3a seed bearer, read as `process.env.TEST_SEED_SECRET`) and
  `SUPABASE_SERVICE_ROLE_KEY` (the DB key) are **separate Vercel env vars with separate values.** The omnibus §4.2
  service-role rotation does **not** invalidate the seed bearer — the drill's seed step keeps working through the
  rotation. No re-provisioning of `TEST_SEED_SECRET` is required for the rotation.
- The seed endpoint is **Preview-scope-locked**, not reachable from production: S2 prod→404 (`VERCEL_ENV`), S3
  requires `E2E_RUN_ACTIVE=true` (Preview scope only), S4 requires the `TEST_SEED_SECRET` bearer.
- **Operational note:** the drill's local run command *does* pass `SUPABASE_SERVICE_ROLE_KEY` (the spec's DB
  assertions + teardown use it). After the §4.2 rotation, use the **new** service-role value in the run command;
  the `TEST_SEED_SECRET` argument is unaffected.

## Disposition

On both runs clean, this evidence is referenced in the §1.6 Prod-Flip Attestation Packet as the §1.3 requirement.
Rollback mechanism confirmed: `FF3_CAPTURE_ENABLED` flip is the primary FF-3 containment (on-call addendum §3) —
no code deploy, env change + redeploy, fully reversible.

— Engineering runbook + template · 2026-07-13 · broker-executed per §4.13 · Jack Taglyan / CalDRE B9445457
