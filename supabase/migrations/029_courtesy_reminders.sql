-- 028_courtesy_reminders.sql
-- AI-first /chat rebuild — owner-copy-only courtesy reminders (no OwnerPilot->tenant SMS in MVP, master prompt §B.7).
-- `tone` check constraint (friendly/firm/formal) is RATIFIED per deploy_readiness_capstone_acceptance_and_external_inputs_broker_ruling_2026-06-29.md §2.
-- Additive only.

create table public.courtesy_reminders (
  id                  uuid primary key default gen_random_uuid(),
  riskpath_record_id  uuid not null references public.riskpath_records(id) on delete cascade,
  user_id             uuid not null references public.users(id) on delete cascade,
  tone                text not null check (tone in ('friendly','firm','formal')),  -- TODO lane D: match addendum verbatim
  message_text        text not null,
  channel             text not null default 'owner_copy'
                        check (channel in ('owner_copy','sms_app_handoff')),       -- never server-sent SMS in MVP
  created_at          timestamptz not null default now()
);

create index courtesy_reminders_record_idx on public.courtesy_reminders (riskpath_record_id);

alter table public.courtesy_reminders enable row level security;
create policy courtesy_owner_all on public.courtesy_reminders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
