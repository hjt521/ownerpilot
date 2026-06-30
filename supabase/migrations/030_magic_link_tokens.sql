-- 029_magic_link_tokens.sql
-- AI-first /chat rebuild — magic-link claim tokens.
-- Hash-stored, single-use, 30-min TTL, redeemed only server-side under the service role. No public RLS policy.
-- Additive only.

create table public.magic_link_tokens (
  id                uuid primary key default gen_random_uuid(),
  token_hash        text not null unique,            -- SHA-256 of the raw token; raw token only in the emailed URL
  email             text not null,
  chat_session_id   uuid references public.chat_sessions(id) on delete cascade,
  purpose           text not null check (purpose in ('claim_session','save_to_riskpath')),
  expires_at        timestamptz not null default (now() + interval '30 minutes'),
  consumed_at       timestamptz,                      -- single-use; set on redemption
  created_at        timestamptz not null default now()
);

create index magic_link_tokens_hash_idx    on public.magic_link_tokens (token_hash);
create index magic_link_tokens_expires_idx on public.magic_link_tokens (expires_at) where consumed_at is null;

alter table public.magic_link_tokens enable row level security;
-- No public policy. Issuance + redemption happen ONLY in the server route under the service role
-- (consistent with the repo no-operator-secrets posture; nothing client-readable here).
