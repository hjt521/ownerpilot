-- 027_automation_mirror_queue.sql
-- Lane 7 A14 — durable retry queue for Notion mirror writes that fail transiently. Byte-exact from ruling §5.1.
-- Numbering: renamed 026 → 027 per broker ruling 2026-06-29 (automation yields; the rebuild branch's chat schema
-- keeps 026 — it is already attested and its migration SHA is in the Lane 2 attestation block). Automation's queue
-- migration was authored today and nothing references it by number yet, so the renumber is low-cost and preserves
-- the chat-schema chain-of-custody.

create table automation_mirror_queue (
  id uuid primary key default gen_random_uuid(),
  payload_jsonb jsonb not null,
  attempts integer not null default 0,
  max_attempts integer not null default 8,
  next_retry_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  last_error text,
  resolved_at timestamptz
);

create index automation_mirror_queue_pending_idx
  on automation_mirror_queue (next_retry_at)
  where resolved_at is null;

alter table automation_mirror_queue enable row level security;
create policy automation_mirror_queue_service_role on automation_mirror_queue
  for all to service_role using (true) with check (true);
-- No public/anon access.
