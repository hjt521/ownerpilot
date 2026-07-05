-- 045_email_notifications_consent_suppression.sql
-- Part B-2 of p1_email_trigger_dependencies_broker_ruling_2026-07-05 (B2). Consent gate + suppression store for
-- owner-facing transactional email (the LAHD-confirmation send). Additive + nullable; safe, no VALIDATE gate.
--
-- ROLLBACK (non-destructive):
--   drop table if exists public.email_notification_suppressions;
--   alter table public.users drop column if exists email_notifications_ack_at;

-- (1) First-time consent gate (B2 safeguard 1). Set once per owner when they first authorize OwnerPilot to send
--     filing-record acknowledgments to their account email. NULL = not yet consented → no owner-facing send.
alter table public.users
  add column if not exists email_notifications_ack_at timestamptz;

-- (2) Suppression / per-notification-type opt-out store (B2 safeguards 2 + 3). One row per (owner, type, reason).
--     reason ∈ opt_out (owner turned this type off in preferences) | hard_bounce | spam_complaint (delivery signal).
--     Any matching row for the owner+type (or type='all') suppresses the send.
create table if not exists public.email_notification_suppressions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  notification_type text not null,   -- 'lahd-confirmation' | 'all' | (future types)
  reason            text not null,   -- 'opt_out' | 'hard_bounce' | 'spam_complaint'
  created_at        timestamptz not null default now()
);
create index if not exists email_notification_suppressions_user_idx
  on public.email_notification_suppressions (user_id, notification_type);

alter table public.email_notification_suppressions enable row level security;
-- Owner reads their own suppressions (to render the preference page). Writes go through the service-role
-- preference/webhook endpoints, owner-scoped there. No direct client insert/update.
create policy email_notification_suppressions_owner_read on public.email_notification_suppressions
  for select using (auth.uid() = user_id);
