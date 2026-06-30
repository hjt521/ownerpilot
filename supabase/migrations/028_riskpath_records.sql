-- 027_riskpath_records.sql
-- AI-first /chat rebuild — owner records dashboard backing table. Claimed-only.
-- Option B (LOCKED 2026-06-29): transcript_snapshot + transcript_snapshot_at frozen at notice generation.
-- Additive only.

create table public.riskpath_records (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references public.users(id) on delete cascade,
  chat_session_id         uuid references public.chat_sessions(id) on delete set null,
  property_id             uuid references public.properties(id) on delete set null,
  notice_document_id      uuid references public.documents(id) on delete set null,
  current_state           text not null default 'notice_created',  -- validated by lib/riskpath/transitions.ts (§R adds 15 enums)
  state_history           jsonb not null default '[]'::jsonb,      -- [{ from, to, trigger, ts }]
  captured_payload        jsonb not null default '{}'::jsonb,      -- snapshot of intake_state at notice generation
  transcript_snapshot     jsonb,                                   -- Option B: frozen at notice generation; same shape as chat_sessions.transcript
  transcript_snapshot_at  timestamptz,                             -- = notice generation time
  counsel_route_trigger   text,                                    -- one of the 10 §R hard triggers, or null
  -- retention / governance
  retention_class         text not null default 'riskpath_record',
  legal_hold              boolean not null default false,
  legal_hold_ref          text,
  soft_deleted_at         timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index riskpath_records_user_id_idx on public.riskpath_records (user_id);
create index riskpath_records_session_idx on public.riskpath_records (chat_session_id);
create index riskpath_records_state_idx   on public.riskpath_records (current_state);

alter table public.riskpath_records enable row level security;
create policy riskpath_owner_all on public.riskpath_records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
