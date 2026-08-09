-- 021_city_zip_refresh_state.sql — state + audit tables for the daily City-of-LA ZIP
-- snapshot refresh poll (A-3 §4.1 / §2.2-d / §3.1-b), §7.3-c field correction (dataLastEditDate).

create table if not exists public.city_zip_refresh_state (
  id                         text primary key default 'singleton'
                               check (id = 'singleton'),
  snapshot_sha256            text not null,
  baseline_data_last_edit    date not null,
  broker_attested_at         date not null,
  consecutive_fetch_failures integer not null default 0,
  last_polled_at             timestamptz,
  last_observed_data_last_edit date,
  last_outcome               text,
  updated_at                 timestamptz not null default now()
);

alter table public.city_zip_refresh_state enable row level security;
revoke all on public.city_zip_refresh_state from anon, authenticated;

insert into public.city_zip_refresh_state
  (id, snapshot_sha256, baseline_data_last_edit, broker_attested_at)
values
  ('singleton',
   'e40e3ab2c47bdb9429f19c1d97d69f0ca5bd20aa6ecbd2e15b203e5f47b18452',
   date '2026-05-19',
   date '2026-06-27')
on conflict (id) do nothing;

create table if not exists public.city_zip_refresh_runs (
  id                       uuid primary key default gen_random_uuid(),
  ran_at                   timestamptz not null default now(),
  observed_data_last_edit  date,
  baseline_data_last_edit  date,
  outcome                  text not null check (
                             outcome in ('no_diff', 'change_detected',
                                         'fetch_fail', 'dormancy_alert', 'anomaly')),
  alert_sent               boolean not null default false,
  detail                   jsonb
);

alter table public.city_zip_refresh_runs enable row level security;
revoke all on public.city_zip_refresh_runs from anon, authenticated;

create index if not exists city_zip_refresh_runs_ran_at_idx
  on public.city_zip_refresh_runs (ran_at desc);