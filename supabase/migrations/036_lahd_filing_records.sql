-- 036_lahd_filing_records.sql
-- PR-C LAHD filing checklist. Insert-only child table recording the owner's LAHD filing-completion action as a
-- compliance artifact (§6). Append-mutable: a correction inserts a new row; the read surface uses the most-recent
-- row per riskpath. Distinct from produce_audit (produce-time state) — owner-attested post-service state.
-- Ruling: pr_c_lahd_checklist_scope_omnibus_broker_ruling_2026-07-01.md §6.
--
-- ROLLBACK (non-destructive): drop table if exists public.lahd_filing_records;

create table if not exists public.lahd_filing_records (
  id                   uuid primary key default gen_random_uuid(),
  riskpath_id          uuid not null references public.riskpath_records(id) on delete cascade,
  chat_session_id      uuid references public.chat_sessions(id) on delete set null,
  filed_at             timestamptz not null default now(),
  filing_date          date not null,                 -- owner-attested date filed with LAHD (ISO date)
  filing_channel       text not null,                 -- 'online_portal' | 'mail_with_cover_sheet' | 'other'
  cover_sheet_revision text,                           -- LAHD cover-sheet revision in effect at record time
  created_at           timestamptz not null default now()
);
create index lahd_filing_records_riskpath_idx on public.lahd_filing_records (riskpath_id);

alter table public.lahd_filing_records enable row level security;
-- Owner reads their own filing records via the parent riskpath row's user_id. Writes go through the
-- service-role endpoint (POST /api/notices/[riskpathId]/lahd-filing-record), owner-scoped there. No UPDATE.
create policy lahd_filing_records_owner_read on public.lahd_filing_records
  for select using (
    exists (
      select 1 from public.riskpath_records r
      where r.id = lahd_filing_records.riskpath_id and r.user_id = auth.uid()
    )
  );
