-- 056_owner_continuations.sql
-- Owner Continuation QR V1 — purpose-specific, hash-only locator persistence.
-- Raw continuation locators never enter durable storage. Possession is not authority;
-- all private reads are re-authorized server-side against riskpath_records.user_id.

create table public.owner_continuations (
  id                  uuid primary key default gen_random_uuid(),
  locator_digest      text not null unique check (locator_digest ~ '^[0-9a-f]{64}$'),
  riskpath_record_id  uuid not null references public.riskpath_records(id) on delete cascade,
  purpose             text not null default 'owner_record_continuation'
                      check (purpose = 'owner_record_continuation'),
  version             text not null default 'v1' check (version = 'v1'),
  created_at          timestamptz not null default now(),
  revoked_at          timestamptz
);

create index owner_continuations_riskpath_idx
  on public.owner_continuations (riskpath_record_id);

alter table public.owner_continuations enable row level security;
-- Deliberately no anon/authenticated RLS policy. Server routes use service_role and
-- MUST independently authorize the current session.user_id against the exact RiskPath row.
revoke all on public.owner_continuations from anon, authenticated;

-- Extend the existing finite magic-link purpose set without turning it into a callback registry.
alter table public.magic_link_tokens
  add column owner_continuation_id uuid references public.owner_continuations(id) on delete set null;

alter table public.magic_link_tokens
  drop constraint magic_link_tokens_purpose_check;

alter table public.magic_link_tokens
  add constraint magic_link_tokens_purpose_check
  check (purpose in ('claim_session', 'save_to_riskpath', 'owner_record_continuation'));

-- Purpose binding is exact: Owner Continuation links require an association; unrelated
-- existing purposes must not carry one.
alter table public.magic_link_tokens
  add constraint magic_link_tokens_owner_continuation_binding_check
  check (
    (purpose = 'owner_record_continuation' and owner_continuation_id is not null)
    or
    (purpose <> 'owner_record_continuation' and owner_continuation_id is null)
  );

create index magic_link_tokens_owner_continuation_idx
  on public.magic_link_tokens (owner_continuation_id)
  where purpose = 'owner_record_continuation' and consumed_at is null;
