-- 035_staleness_guard.sql
-- PR-B serve-time stale-facial-dates guard (chat path).
-- Ruling: pr_b_staleness_scope_omnibus_broker_ruling_2026-07-01.md §§3, 5.
--
-- (1) produce_snapshot: the face-determining ProductionSnapshot captured at chat produce time (Fork 1 → 1A,
--     durable persistence, not derive-on-the-fly). Lets a later edit → re-produce (Surface 1) or a return to the
--     riskpath row (Surface 2) detect a drifted notice face via the shared evaluateStaleness engine.
-- (2) staleness_acknowledgments: insert-only compliance trail of every staleness warning the owner acknowledged
--     (§5) — makes the warn-not-block posture defensible.
-- Both additive; nullable/new. No backfill (§3.1 / §4.4 fallback covers pre-migration rows).

alter table public.riskpath_records
  add column if not exists produce_snapshot jsonb;

create table if not exists public.staleness_acknowledgments (
  id                uuid primary key default gen_random_uuid(),
  riskpath_id       uuid not null references public.riskpath_records(id) on delete cascade,
  chat_session_id   uuid references public.chat_sessions(id) on delete set null,
  acknowledged_at   timestamptz not null default now(),
  staleness_reason  text not null,          -- 'AMOUNT_CHANGED' | 'FACE_FIELD_CHANGED'
  changed_fields    jsonb not null default '[]'::jsonb,
  action_taken      text not null,          -- 'proceed_to_reproduce' | 'dismiss_banner' | 'cancel_at_generate'
  created_at        timestamptz not null default now()
);
create index staleness_acks_riskpath_idx on public.staleness_acknowledgments (riskpath_id);

alter table public.staleness_acknowledgments enable row level security;
-- Owner can read their own acks (via the parent riskpath row's user_id). Writes go through the service-role
-- endpoint (POST /api/notices/[riskpathId]/staleness-ack), owner-scoped there — mirrors the produce-audit posture.
create policy staleness_acks_owner_read on public.staleness_acknowledgments
  for select using (
    exists (
      select 1 from public.riskpath_records r
      where r.id = staleness_acknowledgments.riskpath_id and r.user_id = auth.uid()
    )
  );
