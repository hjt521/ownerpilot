create table public.magic_link_tokens (
  id                uuid primary key default gen_random_uuid(),
  token_hash        text not null unique,
  email             text not null,
  chat_session_id   uuid references public.chat_sessions(id) on delete cascade,
  purpose           text not null check (purpose in ('claim_session','save_to_riskpath')),
  expires_at        timestamptz not null default (now() + interval '30 minutes'),
  consumed_at       timestamptz,
  created_at        timestamptz not null default now()
);

create index magic_link_tokens_hash_idx    on public.magic_link_tokens (token_hash);
create index magic_link_tokens_expires_idx on public.magic_link_tokens (expires_at) where consumed_at is null;

alter table public.magic_link_tokens enable row level security;