# Gate-2 Prod Run-Window — Canonical Residue-Sweep SQL (§2.5.5)

**Re:** `gate2_prod_runwindow_runbook_2026-07-02_amended.md` §2.5.5 + countersign Amendment C.
**By:** engineering, 2026-07-02. Verified against migration 033 (tag surface) + the A14 harness (`automation_mirror_queue.payload_jsonb.synthetic_run_id`) + `lib/testing/e2eCleanup` (documents FK).
**Posture:** amended (Playwright §2.3 STRUCK) — so no `E2E_RUN_ACTIVE`, no E2E writes to `chat_sessions`/`riskpath_records`/`documents` this window. Counts 1–5 are therefore **confirm-zero** checks; the live residue check is #6 (`automation_mirror_queue`) + the two deltas (#7/#8).

Substitute placeholders before running: `:a14_503_run_id`, `:a14_exhaust_run_id` (the two `makeRunId('A14-503')` / `makeRunId('A14-EXHAUST')` uuids printed by the harness at start), `:staleness_baseline`, `:lahd_baseline` (the §1.4 pre-run counts).

---

## The 8 counts across 6 tables

```sql
-- 1) chat_sessions — any synthetic/e2e residue (amended posture: expected 0, no E2E ran)
select count(*) as c1_chat_sessions_synthetic
from public.chat_sessions
where e2e_run_id is not null or synthetic_source is not null;

-- 2) chat_sessions — foreign-tagged residue not from any current run (expected 0)
--    (kept distinct from #1 for parity with the tagged-run form; identical predicate under amended posture)
select count(*) as c2_chat_sessions_foreign
from public.chat_sessions
where synthetic_source is not null and synthetic_source <> '';

-- 3) riskpath_records — any synthetic/e2e residue (expected 0)
select count(*) as c3_riskpath_synthetic
from public.riskpath_records
where e2e_run_id is not null or synthetic_source is not null;

-- 4) riskpath_records — foreign-tagged residue (expected 0)
select count(*) as c4_riskpath_foreign
from public.riskpath_records
where synthetic_source is not null and synthetic_source <> '';

-- 5) documents — FK-linked to any synthetic riskpath row (untagged table; cleaned by FK per e2eCleanup). Expected 0
select count(*) as c5_documents_fk
from public.documents d
where d.id in (
  select notice_document_id from public.riskpath_records
  where (e2e_run_id is not null or synthetic_source is not null) and notice_document_id is not null
);

-- 6) automation_mirror_queue — this window's A14 rows by run-uuid. Expected 0 AFTER cleanupByRunId
select count(*) as c6_a14_queue_residue
from public.automation_mirror_queue
where payload_jsonb->>'synthetic_run_id' in (:a14_503_run_id, :a14_exhaust_run_id);

-- 7) staleness_acknowledgments — delta from §1.4 baseline. Expected 0 (== :staleness_baseline)
select count(*) as c7_staleness_now  -- compare to :staleness_baseline
from public.staleness_acknowledgments;

-- 8) lahd_filing_records — delta from §1.4 baseline. Expected 0 (== :lahd_baseline)
select count(*) as c8_lahd_now       -- compare to :lahd_baseline
from public.lahd_filing_records;
```

## Expected results (amended, Playwright-struck posture)

| # | Table | Predicate | Expected |
|---|---|---|---|
| 1 | chat_sessions | any e2e/synthetic tag | 0 |
| 2 | chat_sessions | foreign synthetic_source | 0 |
| 3 | riskpath_records | any e2e/synthetic tag | 0 |
| 4 | riskpath_records | foreign synthetic_source | 0 |
| 5 | documents | FK to synthetic riskpath | 0 |
| 6 | automation_mirror_queue | this window's A14 run-uuids | 0 (post-cleanup) |
| 7 | staleness_acknowledgments | count now vs baseline | delta 0 |
| 8 | lahd_filing_records | count now vs baseline | delta 0 |

**Any non-zero on #6** = A14 cleanup (`cleanupByRunId` / `verifyCleanupZero`) did not fully drain → halt-path per §4, re-run cleanup, do not close the window. **Any non-zero on #1–#5** in the amended posture = an unexpected synthetic write to a produce-path table with no E2E active → investigate before close (indicates something other than the A14 spine wrote tagged rows). **#7/#8 delta ≠ 0** = the harness persisted an ack/filing row it should not have.

> Note: the pre-run baseline (§1.4) already asserts `chat_sessions`/`riskpath_records` synthetic counts = 0 (matches the Preview runbook residue sweep, which found all-zero). So #1–#5 should read 0 both before and after; a change across the window is the signal.

---

— Engineering (Claude Code) · canonical residue sweep · 2026-07-02
