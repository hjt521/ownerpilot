-- 033_e2e_test_tagging.sql
-- Path-to-live Gate 2 (E2) test-infrastructure tagging, per e2e_attestation_E1_E2_E3_E4_broker_ruling_2026-06-30.
-- Additive, nullable, no backfill. Adds the e2e_run_id + synthetic_source tag columns to the two write tables the
-- E2E harness controls, so it can tag the rows it creates and clean them up by tag (E2-D1..D4). The `documents`
-- table is created by the FROZEN Phase 2D rail and is intentionally NOT tagged here — it is cleaned by FK
-- reference from riskpath_records.notice_document_id (lib/testing/e2eCleanup), the one E2-D1 deviation (flagged).
--
-- synthetic_source mirrors A14's marker convention ('a14' vs 'e2e') for cross-harness distinguishability.
-- Partial indexes keep the tag cheap to scan at cleanup and zero-cost for real rows (NULL → not indexed).

alter table public.chat_sessions   add column if not exists e2e_run_id       uuid;
alter table public.chat_sessions   add column if not exists synthetic_source text;
alter table public.riskpath_records add column if not exists e2e_run_id       uuid;
alter table public.riskpath_records add column if not exists synthetic_source text;

create index if not exists chat_sessions_e2e_run_id_idx
  on public.chat_sessions (e2e_run_id) where e2e_run_id is not null;
create index if not exists riskpath_records_e2e_run_id_idx
  on public.riskpath_records (e2e_run_id) where e2e_run_id is not null;
