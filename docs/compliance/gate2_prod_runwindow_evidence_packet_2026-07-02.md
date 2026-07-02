# Gate-2 Prod Run-Window — Evidence Packet (engineering-assembled)

**Re:** `gate2_prod_runwindow_runbook_2026-07-02_amended.md` §3.2 + `gate2_prod_runwindow_executor_path_confirmation_2026-07-02.md` (Path 1) + G15+ predicate **P-12**.
**Executed:** 2026-07-02 (broker-local, Path 1). Executor: JT on Node **v22.23.1** (nvm). Assembled + engineering-signed by Claude Code; broker countersigns to close P-12.
**Outcome:** **CLEAN PASS.**

---

## Step 0 — Advisor baseline (T-0)
Security advisors captured pre-window: **22 lints, 0 ERROR** (10 INFO `rls_enabled_no_policy` + 12 WARN: 2 `function_search_path_mutable`, 1 `extension_in_public` (pg_net), 5 `rls_policy_always_true` (append-only insert rails), 4 `audit_cliff` security-definer). All pre-existing/tracked.

## Preflight (§1 / §1.7)
- `.env.synthetic` created (gitignored) with `SUPABASE_URL` + prod `SUPABASE_SERVICE_ROLE_KEY` (never in chat).
- Wiring dry-run: `npm ci` clean; **`npm test` → 89 suites, 0 failed** (no DB writes).
- Flags confirmed OFF pre-window: `SYNTHETIC_RUN_ACTIVE` / `E2E_RUN_ACTIVE` absent on Vercel Prod.
- DB residue-zero baseline (§1.4): chat/riskpath e2e+synthetic = 0; queue synthetic residue = 0; `staleness_acknowledgments` = 0; `lahd_filing_records` = 0.

## Spine (amended — 4 steps; §2.3 Playwright STRUCK per countersign Amendment A)
**Step 1 — synthetic flag flip.** `SYNTHETIC_RUN_ACTIVE=1` set on Vercel **Production** + redeploy → deploy `6NTTq9hhE` (source `b967bb8`, Production) **Ready** before the run. Crons paused.

**Step 2 — A14 pair** (`--prod-synthetic`, run-uuid-scoped, self-cleaning):
| Scenario | Run ID | Result |
|---|---|---|
| 503 → enqueue → drain → resolve | `SYN-A14-503-20260702T215326Z-ebac5d00-3363-4ae6-9cc8-4b1f5739a1a7` | **pass=4, fail=0, cleanup_remaining=0** (1904 ms) |
| exhausted retry (exhaust @ attempt 8) | `SYN-A14-EXHAUST-20260702T215329Z-fa8eedb3-8a67-413f-8e9b-1d3531c4bb66` | **pass=4, fail=0, cleanup_remaining=0** (2127 ms) |
Run window: 2026-07-02T21:53:26Z → 21:53:31Z. (`[broker-notify] … exhausted retries` is the exhaustion scenario's expected emission.)

**Step 3 (§2.4) — advisor delta.** Post-run security advisors **byte-identical** to Step 0: 22 lints, 0 ERROR, same cache-keys. **Zero new security findings.**

## Teardown (§2.5, ordered)
- `SYNTHETIC_RUN_ACTIVE` **deleted** from Vercel Production + redeploy → deploy `EesEgjuiE` (source `b967bb8`, Production). *[Ready confirmation: broker to note timestamp.]* Crons resume.
- **Residue sweep (9 counts) — ALL ZERO:** chat/riskpath e2e+synthetic = 0; documents-FK = 0; queue for both run-ids = 0; any-synthetic queue residue = 0; `staleness_acknowledgments` = 0 (Δ0); `lahd_filing_records` = 0 (Δ0).

## Deviations
- `[DEVIATION-NODE]` executor host was Node 20 (no native WebSocket → `@supabase/supabase-js` client init failed). Resolved by switching to **Node 22** (`nvm install 22 && nvm use 22`), which is what CI already uses. §1.7 wiring dry-run (`npm test`) did not surface it because it doesn't construct a realtime client; a follow-up could add a Node-version note to `.nvmrc`/the runbook §1.7.
- `[DEVIATION-4.13 / Amendment A]` §2.3 Playwright struck (E2E is Preview-scoped by the E4 S2 lock; never prod). Covered by the enforced-guard walk + advisor delta, per the accepted countersign.

## Result & disposition
**CLEAN PASS** — all spine steps green, advisor delta zero-new, teardown residue zero, no flags left set. This satisfies **G15+ P-12**. On broker countersign (`gate2_prod_runwindow_countersign_2026-07-02.md`), the Fork-G soft-launch clocks start at the Step-1 T-0 (2026-07-02T21:53Z).

**Engineering sign-off:** verified (§4.10 verify half). — Claude Code · 2026-07-02
