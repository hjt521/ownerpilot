-- 026_chat_sessions.sql
-- AI-first /chat rebuild — multi-turn chat session container.
-- Anonymous-first; claimed via magic link. intake_state + transcript as jsonb columns (master prompt §C).
-- Additive only. Numbering: 023-025 reserved for the carved-out Decision 2 broker_confirm track;
-- the rebuild starts at 026 (clean main HEAD is migration 022).

create table public.chat_sessions (
  id                uuid primary key default gen_random_uuid(),
  anon_token_hash   text not null unique,          -- SHA-256 of the opaque browser token; raw token never stored
  user_id           uuid references public.users(id) on delete set null,   -- null until claimed
  property_id       uuid references public.properties(id) on delete set null,
  status            text not null default 'active'
                      check (status in ('active','intake_complete','claimed','abandoned','expired')),
  intake_state      jsonb not null default '{}'::jsonb,   -- { field: { value, confidence, updated_at } }
  intake_complete   boolean not null default false,
  transcript        jsonb not null default '[]'::jsonb,   -- [{ role, content, refusal, extracted_fields, ts }]
  last_refusal      text check (last_refusal in
                      ('legal_advice','ud_filing','settlement','non_la_city','security_concern')),
  message_count     integer not null default 0,
  -- retention / governance (mirrors existing audit-table convention; intake_state holds PII)
  retention_class   text not null default 'chat_session',
  legal_hold        boolean not null default false,
  legal_hold_ref    text,
  soft_deleted_at   timestamptz,
  -- lifecycle
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),   -- server sets explicitly on each turn (no trigger helper in repo)
  claimed_at        timestamptz,
  expires_at        timestamptz not null default (now() + interval '30 days')
);

create index chat_sessions_anon_token_hash_idx on public.chat_sessions (anon_token_hash);
create index chat_sessions_user_id_idx          on public.chat_sessions (user_id) where user_id is not null;
create index chat_sessions_status_idx           on public.chat_sessions (status);
create index chat_sessions_expires_at_idx       on public.chat_sessions (expires_at) where soft_deleted_at is null;

alter table public.chat_sessions enable row level security;

-- Claimed owner can read/update only their own sessions.
create policy chat_sessions_owner_select on public.chat_sessions
  for select using (auth.uid() = user_id);
create policy chat_sessions_owner_update on public.chat_sessions
  for update using (auth.uid() = user_id);
-- Anonymous + server writes go through the service role (server route); no public anon policy by design.
