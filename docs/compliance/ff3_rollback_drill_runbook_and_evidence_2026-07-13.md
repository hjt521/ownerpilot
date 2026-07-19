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

- Date/time (PT): 2026-07-18, drill window ~16:40–17:15 PT (broker-executed)
- Preview URL: https://ownerpilot-git-chore-security-advisors-we-2cd259-jt-s-projects3.vercel.app
- Preview commit SHA: bc75188 (Merge branch 'main' into chore/security-advisors-weekly-baseline)

### Step 1 (flag on) baseline
- ☑ 3 passed — tail: `3 passed (46.5s)` (escalate→resolve→resume→produce 20.7s; scope-mismatch negative 14.0s; notice-wrong pause 8.9s). Note: green only after migration 050 applied mid-drill (see Anomalies).

### Step 3 (flag off) multi-layer dark verification
- Seeded sessionId: ab97345c-1f3b-475b-9f45-c3d51ba389e4
- **3a** produce response NOT `ff3_reconciliation_flag` / `ff3_awaiting_broker_review` / `ff3_notice_wrong_pause`: ☑
    - Response body: `HTTP/2 200 {"ok":true,"riskpathId":"86c491d7-a13a-4c90-8e89-51694f888ce3","lahdCopyVersion":"v1","baseName":"5537-la-mirada-ave-unit-202-los-angeles-",...}` — produce-ready envelope, gate skipped.
- **3b** `compliance_gates` rows for sessionId = **ZERO**: ☑ **(Sev-1 canary — clear)**
    - Query result (MCP `execute_sql`): `gates_count = 0`
- **3c** `chat_sessions` fields all NULL (ff3_capture_status / reconciliation_resolution / broker_resume_authorization): ☑
    - Query result (MCP): `ff3_capture_status = NULL`, `reconciliation_resolution = NULL`, `broker_resume_authorization = NULL`
- **3d** `/api/chat/ff3/resume` response = `409 ff3_resume_not_authorized`: ☑
    - Full response: `HTTP/2 409` · `content-type: application/json` · `date: Sun, 19 Jul 2026 00:00:50 GMT` · `x-matched-path: /api/chat/ff3/resume` · `x-vercel-id: cdg1::iad1::tssxm-1784419249283-ed663b88c943` · body `{"error":"ff3_resume_not_authorized"}`
    - **This response is FROZEN as the Run-1 baseline; Run 2 must match byte-for-byte.**
- **3e** cleanup delete confirmed: ☑ (`delete from public.chat_sessions where id = 'ab97345c-...'` → "Success. No rows returned"). Also cleaned an earlier flag-on probe session `0b50dd7a-...` (3 gate rows + row) created before the flag-off redeploy propagated.

### Step 4 (flag back on) parity
- ☑ 3 passed — tail: `3 passed (45.2s)` (22.4s / 13.9s / 6.5s)

### Step 5 recorded
- Flag state left at end of run: ☑ `true` (Preview) — confirmed by the Step-4 parity pass (reconciliation fires only when flag is genuinely on)

### Step 6 independent post-drill live-state probe
- ☑ 3 passed from fresh shell — tail: `3 passed (52.3s)` (16.9s / 15.5s / 11.4s). Independent live-state probe confirms the deployed build is genuinely flag-on.
- If FAIL: n/a — passed on first probe.

**Run 1 status: COMPLETE + CLEAN (2026-07-18).** Sev-1 canary clear; rollback mechanism confirmed bidirectional (flag off → dark at all four layers → flag on → parity). Referenced in the §1.6 prod-flip attestation packet as the §1.3 requirement (first of two runs).

### Anomalies / notes
- **Drift caught by the drill (standing ruling #5 — schema-before-flag).** Step-1 baseline initially failed 2/3 (admin-resolve textbox never rendered). Root cause: migration 050 (`broker_reply_thread` on `chat_sessions`, WS1 reply-to-broker seam) was merged to `main` but never applied to prod; `loadAwaitingReview` selects that column unconditionally, PostgREST errored, the error was swallowed (unchecked destructure), the awaiting-review list came back empty → no textbox. Remediated mid-drill: 050 applied to prod via Studio (additive/defaulted/idempotent), verified present via information_schema, baseline then 3 passed. This is exactly the ten-day merge/flip-gap ruling #5 exists to catch. Follow-ups ticketed: silent-error-swallow fix in `loadAwaitingReview`; systematic merged-vs-live schema-drift diagnostic before the 2026-07-28 flip; 050 into the migration-history reconciliation sweep.
- **Redeploy-propagation note.** The Step-2 flag flip did not take on the first attempt because the Preview build hadn't been redeployed after the env change (first flag-off produce returned `ff3_awaiting_broker_review`, i.e. still flag-on, and wrote 3 gate rows on `0b50dd7a` — cleaned). After Redeploy → Ready, the flag-off dark path behaved as specified. Same env-change-requires-redeploy rule applied to `TEST_SEED_SECRET`.
- **Credential exposure.** `TEST_SEED_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` were entered in plaintext in the working channel during the drill. Rotation ticketed (service-role key is full RLS-bypass — higher priority) to run post-Run-2. Rotation does not affect the drill per §4 secret-scoping note.

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
