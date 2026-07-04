# Gate-2 Prod Run-Window Runbook — Engineering Countersign

**Re:** `gate2_prod_runwindow_runbook_2026-07-02.md` §9 (countersign requirement before window opens).
**By:** Claude Code (engineering), 2026-07-02. Verified against repo HEAD `main` (post-#127).
**Disposition:** **CONDITIONAL — 1 blocking amendment (A), 2 correctness amendments (B, C), 1 operational amendment (D).** Item 4 (ordered-unset) verified clean. Broker must rule on A–D before the window opens (§9).

---

## §1 — The four required verifications

### (1) A14 harness invocation surface — VERIFIED, with correction (see Amendment B)
- **Commands (verified in `package.json` + script headers):** `npm run synthetic:a14:503 -- --prod-synthetic` and `npm run synthetic:a14:exhaust -- --prod-synthetic`.
- **Env required:** `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (shell or `.env.synthetic`). `guardProdSyntheticTarget()` enforces B1 (prod-target guard) + D5. `SYNTHETIC_RUN_ACTIVE=true` set before, unset after.
- **Target table:** `automation_mirror_queue` (the retry queue), via `drainSyntheticOnly`. **Not** the produce path, **not** `chat_sessions`/`riskpath_records`.
- **Correction:** the runbook's §2.2 characterization ("same seed, identical output, pair-diff = zero") does not match the harness — see Amendment B.

### (2) Playwright entrypoint — VERIFIED, and it surfaces a BLOCKER (see Amendment A)
- **Config:** `e2e/playwright.config.ts` — `baseURL = process.env.E2E_BASE_URL`, tags requests with `X-E2E-Run-Id` from `E2E_RUN_ID`, `globalTeardown: ./global-teardown.ts`. Header comment: *"Runs against a deployed PREVIEW (BASE_URL), not the sandbox."*
- **Seed path:** `app/api/test/seed-session/route.ts` — gated by four E4 locks. **Lock S2 is unconditional in production:** `if (VERCEL_ENV === 'production' || NODE_ENV === 'production') return 404`. It is checked **before** the `E2E_RUN_ACTIVE` lock (S3).
- **Consequence:** the seed endpoint is **hard-404'd on live prod by design** — setting `E2E_RUN_ACTIVE=true` on prod does **not** unlock it (S2 precedes S3). So §2.3 "Playwright against the live prod URL with the seeded test-user path" **cannot execute as written.** → Amendment A (blocking).

### (3) Residue-sweep SQL patterns — VERIFIED tag surface, sweep is INCOMPLETE (see Amendment C)
- **Migration 033 tags only** `chat_sessions` and `riskpath_records` with `e2e_run_id` + `synthetic_source`. `documents` is **intentionally untagged** (033 header) — cleaned by FK from `riskpath_records.notice_document_id` via `lib/testing/e2eCleanup` (the one flagged E2-D1 deviation).
- **A14 rows** are tagged `synthetic_run_id` inside `automation_mirror_queue.payload_jsonb`, cleaned by run-uuid (`cleanupByRunId` + `verifyCleanupZero`).
- The runbook's six counts miss `automation_mirror_queue` (A14's real table) and `documents`, and would score A14 residue on `chat_sessions` — a table A14 never writes — as an always-zero **false clean**. → Amendment C (corrected 8-count sweep below).

### (4) Ordered-unset discipline — VERIFIED ✓
- Both flags are read server-side from `process.env` at request time: `E2E_RUN_ACTIVE` gates the seed route (S3) + the deterministic mock; `SYNTHETIC_RUN_ACTIVE` pauses the mirror-queue crons + gates the harness. There is **no in-app runtime toggle** — the mechanism is exactly Vercel env write/delete + redeploy so serving instances pick up the change. The runbook's "trigger redeploy → smoke-probe the fresh deploy" is the correct propagation check. ✓ **No amendment.**

---

## §2 — Amendment requests (broker rules before window opens)

### Amendment A — BLOCKING: §2.3 Playwright cannot run against live prod
The E2E infrastructure is Preview-scoped by construction: the seed endpoint 404s in prod (E4 lock S2), and `playwright.config` targets a Preview `BASE_URL`. Forcing the suite onto live prod either (i) fails — the counsel-route-hardstop spec can't seed → 404 → spec red — or (ii) requires disabling S2, which is a **compliance regression** (S2 is a ratified E4 defense-in-depth lock keeping the test-seed surface invisible in prod). Corollary: there is **no runtime E2E analytics suppression** in `lib/analytics` — Preview isolation was achieved via the E1 *test* GA4 stream, not runtime gating. Running E2E against prod (with §1.2 confirming the *prod* GA4 stream) would pollute prod analytics with synthetic events.

**Recommended ruling (pick one):**
- **(A-1, recommended)** Drop Playwright from the prod window. The prod window validates the **A14 mirror-queue spine + advisor delta** against real prod — the parts that genuinely need prod. The Playwright E2E stays Preview-scoped and is already green (Preview runbook evidence packet). Net: prod window = Steps 1, 2, 4, 5 (minus the E2E-specific residue).
- **(A-2)** Re-point §2.3 at a fresh **Preview deploy** (its designed target) as a "current-HEAD E2E re-confirmation," explicitly *not* a prod exercise. Keeps a Playwright step but honors S2.
- Either way: do **not** weaken S2 to make the seed reachable in prod.

### Amendment B — §2.2 A14 characterization is wrong
Replace the "same-seed identical-output pair, pair-diff = zero" language. The two scripts are **distinct scenarios**, each self-asserting:
- `a14_503_enqueue_drain_resolve` — 503 → enqueue → drain → resolve; asserts the backoff ladder `1,2,4,8,16,32,60` and terminal resolve.
- `a14_exhausted_retry` — asserts exhaustion at attempt 8.
Both run against `automation_mirror_queue` via `drainSyntheticOnly`, each reporting its own pass/fail + `cleanup_remaining=0`. **There is no cross-script pair-equivalence diff** — replace §2.2's verification with "each script exits pass with `cleanup_remaining=0`; run-uuid-scoped cleanup verified zero."

### Amendment C — §2.5.5 residue sweep: 8 counts across 6 tables (not 6 counts across 4)
Corrected sweep (substitute `:e2e_run_id` and `:a14_run_id` with the run's actual ids, `:tag` with the run's synthetic_source tag):
```sql
-- 1-2 chat_sessions: own-run (expected >0 if E2E ran) / foreign (expected 0)
select count(*) from chat_sessions where e2e_run_id = :e2e_run_id or synthetic_source = :tag;
select count(*) from chat_sessions where (e2e_run_id is not null or synthetic_source is not null)
  and coalesce(e2e_run_id::text,'') <> :e2e_run_id and coalesce(synthetic_source,'') <> :tag;
-- 3-4 riskpath_records: own / foreign (same shape)
-- 5 documents (untagged; via FK) — after teardown expected 0
select count(*) from documents d
  where d.id in (select notice_document_id from riskpath_records where e2e_run_id = :e2e_run_id);
-- 6 automation_mirror_queue: A14 rows by run-uuid — after cleanupByRunId expected 0
select count(*) from automation_mirror_queue where payload_jsonb->>'synthetic_run_id' = :a14_run_id;
-- 7-8 deltas from §1.4 baseline — expected 0 each
select count(*) from staleness_acknowledgments;   -- compare to baseline
select count(*) from lahd_filing_records;          -- compare to baseline
```
If Amendment A-1 is adopted (no Playwright), counts 1–5 collapse to "expected 0" (no E2E writes occur) and the meaningful residue check is #6 (`automation_mirror_queue`) + the two deltas.

### Amendment D — operational/secret prerequisites (§4.13 "never a secret in chat")
The A14 spine needs `SUPABASE_SERVICE_ROLE_KEY` + `SUPABASE_URL` (prod) in the **executor's shell** — a prod service-role secret. Per the hard invariant, these live in the broker's local `.env.synthetic`/shell and are **never** transmitted in chat. The executor also needs the repo + `npm install`'d deps + `tsx`; Playwright (if retained per A-2) additionally needs `npx playwright install`. **Flag:** this session already hit CLI walls on the broker machine (`gh`, `supabase` both "command not found"). Confirm the executing host can actually run `npm run synthetic:a14:*` against prod with the service-role key present — if not, the prod window needs a host/executor decision before T-0, not at T-0.

---

## §3 — Countersign disposition

Engineering **does not clean-sign** the runbook as written. Item 4 (ordered-unset) is verified. Items 1–3 are verified *as to what the code does*, and that verification is precisely what surfaced Amendments A (blocking), B, and C. Amendment D is an execution-feasibility flag.

**On broker ruling A–D**, engineering will file the sign-off addendum and the window may open. Recommended fastest clean path: **A-1** (prod window = A14 spine + advisor delta; Playwright stays Preview-scoped) + **B/C** corrections folded into §2.2/§2.5.5 + **D** host confirmation. That yields a prod window that genuinely validates the prod-only surfaces without weakening the E4 S2 lock or polluting prod analytics.

---

— Engineering (Claude Code) · countersign w/ amendment requests · 2026-07-02
