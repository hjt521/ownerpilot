create table public.chat_sessions (
  id                uuid primary key default gen_random_uuid(),
  anon_token_hash   text not null unique,
  user_id           uuid references public.users(id) on delete set null,
  property_id       uuid references public.properties(id) on delete set null,
  status            text not null default 'active'
                      check (status in ('active','intake_complete','claimed','abandoned','expired')),
  intake_state      jsonb not null default '{}'::jsonb,
  intake_complete   boolean not null default false,
  transcript        jsonb not null default '[]'::jsonb,
  last_refusal      text check (last_refusal in
                      ('legal_advice','ud_filing','settlement','non_la_city','security_concern')),
  message_count     integer not null default 0,
  retention_class   text not null default 'chat_session',
  legal_hold        boolean not null default false,
  legal_hold_ref    text,
  soft_deleted_at   timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  claimed_at        timestamptz,
  expires_at        timestamptz not null default (now() + interval '30 days')
);

create index chat_sessions_anon_token_hash_idx on public.chat_sessions (anon_token_hash);
create index chat_sessions_user_id_idx          on public.chat_sessions (user_id) where user_id is not null;
create index chat_sessions_status_idx           on public.chat_sessions (status);
create index chat_sessions_expires_at_idx       on public.chat_sessions (expires_at) where soft_deleted_at is null;

alter table public.chat_sessions enable row level security;

create policy chat_sessions_owner_select on public.chat_sessions
  for select using (auth.uid() = user_id);
create policy chat_sessions_owner_update on public.chat_sessions
  for update using (auth.uid() = user_id);