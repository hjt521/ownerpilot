-- 038_do_not_serve_holds.sql
-- Lane W7 (omnibus §3.8, amended by broker ruling 2026-07-03) — DO NOT SERVE hold as a first-class object.
-- The hold gates a case's progression past intake (no packet assembly / cover sheet / filing) until a broker
-- lifts it. Its lifecycle is bounded by intake (imposed pre-service) and lift (pre-filing) — strictly a subset of
-- the chat_sessions lifetime — so it anchors to chat_sessions(id), NOT the omnibus's placeholder `cases(id)`
-- (which does not exist; lahd_filing_records doesn't exist until after the hold is already lifted).
--
-- ROLLBACK (non-destructive): drop table if exists public.do_not_serve_holds;

create table if not exists public.do_not_serve_holds (
  id                   uuid primary key default gen_random_uuid(),
  case_id              uuid not null references public.chat_sessions(id) on delete cascade,
  imposed_at           timestamptz not null default now(),
  imposed_by           text not null,               -- broker signature line
  basis_document_path  text not null,               -- e.g. "lahd_eviction_filing_..._broker_ruling_2026-06-30.md"
  basis_section        text,                         -- e.g. "§3.6"
  gates                jsonb not null,               -- [{ id, description, required, satisfied_at, satisfied_by, evidence_path }]
  lifted_at            timestamptz,
  lifted_by            text,                          -- broker signature line
  countersign_path     text,                          -- e.g. "5537LaMirada-202-CliftonAlexander_do_not_serve_lift_countersign_2026-07-02.md"
  constraint dns_gates_is_array   check (jsonb_typeof(gates) = 'array'),
  constraint dns_lift_not_before_impose check (lifted_at is null or lifted_at >= imposed_at),
  constraint dns_one_hold_per_case unique (case_id)  -- one hold per session (active or historical); a session can't have competing holds
);

-- Fast lookup of the active hold for a case (partial index — only unlifted rows).
create index if not exists idx_dns_holds_case_active on public.do_not_serve_holds (case_id) where lifted_at is null;

alter table public.do_not_serve_holds enable row level security;
-- Owner reads the hold for their own session (via chat_sessions.user_id). Writes go through the service-role
-- endpoint / broker path only — no owner insert/update/delete (a hold is a broker instrument).
create policy do_not_serve_holds_owner_read on public.do_not_serve_holds
  for select using (
    exists (
      select 1 from public.chat_sessions s
      where s.id = do_not_serve_holds.case_id and s.user_id = auth.uid()
    )
  );
