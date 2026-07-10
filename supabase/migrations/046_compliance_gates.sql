-- 046_compliance_gates.sql
-- FF-3 Migration-042 co-batch §5 — the compliance_gates audit table + the reconciliation-resolution column.
-- Design: docs/compliance/ff3_migration_042_cobatch_implementation_design_2026-07-03.md §5 (+ §3 owner-selection).
--
-- ADDITIVE + nullable-tolerant. compliance_gates is a NEW empty table, so its constraints are created VALID inline
-- (no existing rows to scan — the 041->042 soak discipline applies only to constraints added to populated tables).
-- Rows are written by the produce-gate chain's CALLER (not the pure gates), one row per gate node evaluated.
--
-- Broker-executed in Supabase Studio. Safe to run any time (no dependency on the 042 VALIDATE window).
-- ROLLBACK: drop table public.compliance_gates; alter table public.chat_sessions
--            drop column reconciliation_resolution, drop column reconciliation_resolved_at;

create table if not exists public.compliance_gates (
  id                uuid primary key default gen_random_uuid(),
  chat_session_id   uuid not null references public.chat_sessions(id) on delete cascade,
  gate              text not null,          -- 'ff3_amount_reconciliation' | 'ff4_fmr' | 'w6_late_filing' | 'w2_notice_pathway'
  result            text not null,          -- pass|block|match|no_ledger_baseline|mismatch|not_applicable|prerequisite_incomplete|efs|declaration_of_intent
  evaluated_at      timestamptz not null,
  verbatim_hash     text,                   -- null for gates without a verbatim constant (e.g. W2, reconciliation)
  context_json      jsonb not null,
  created_at        timestamptz not null default now()
);

-- The packet-manifest lane reads a case's gate rows in evaluation order.
create index if not exists compliance_gates_session_idx
  on public.compliance_gates (chat_session_id, evaluated_at);

-- §3 owner-selection persistence: the reconciliation three-way branch ((1)/(2)/(3)) + when it was chosen.
-- Nullable; reused on chat_sessions (no new table) per the batch decision. Values: 'records_incomplete' (1) |
-- 'notice_wrong' (2) | 'broker_review' (3).
alter table public.chat_sessions add column if not exists reconciliation_resolution    text;
alter table public.chat_sessions add column if not exists reconciliation_resolved_at   timestamptz;
