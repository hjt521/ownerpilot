-- 037_waitlist_signups.sql
-- Fork B2 — closed-beta waitlist capture. Broker-only (service role; NO public read; broker reads via Studio).
-- Additive + idempotent on the table; run once. Source: gate3_forks_C_D_B_E_F_G_omnibus_broker_ruling_2026-07-02 (B2).
-- Rollback (non-destructive intent): drop table public.waitlist_signups;

create table if not exists public.waitlist_signups (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  city       text,
  source     text not null default 'waitlist_page',
  created_at timestamptz not null default now()
);

alter table public.waitlist_signups enable row level security;
create policy waitlist_signups_service_role on public.waitlist_signups
  for all to service_role using (true) with check (true);
-- No public/anon policy: signups are broker-only, read via Supabase Studio.
