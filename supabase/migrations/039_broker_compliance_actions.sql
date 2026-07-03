-- 039_broker_compliance_actions.sql
-- Lane C1-followthrough (omnibus §3.10) — persistence for broker-side compliance actions tracked by the platform
-- (e.g. the Sentry org-level Data Scrubber / Scrub IP toggles for the C1 evidence packet). One row per action_key;
-- completion upserts. Admin-only surface (see /admin/broker-checklist, gated by ADMIN_EMAILS); no owner/anon access.
--
-- ROLLBACK (non-destructive): drop table if exists public.broker_compliance_actions;

create table if not exists public.broker_compliance_actions (
  id            uuid primary key default gen_random_uuid(),
  action_key    text not null unique,           -- stable id, e.g. 'sentry_data_scrubber'
  completed_at  timestamptz,                     -- null = outstanding
  completed_by  text,                            -- broker signature line / admin email
  evidence_path text,                            -- screenshot filename or URL for the C1 evidence packet
  updated_at    timestamptz not null default now()
);

alter table public.broker_compliance_actions enable row level security;
-- No policies: this table is service-role only. Reads/writes go through the admin-gated API (ADMIN_EMAILS check
-- in the route, then service-role client). RLS-on with no policy = deny to anon/authenticated by default.
