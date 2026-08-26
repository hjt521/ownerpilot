-- E2.3D1R1 single-use auth-session compatibility ceremony lease.
-- Source-only migration in this PR. Applying it to Production is separately held.

create table public.auth_compatibility_ceremony_leases (
  purpose text primary key
    check (purpose = 'E2.3D1R1_AUTH_SESSION_COMPATIBILITY'),
  verifier_hash text not null unique
    check (verifier_hash ~ '^[0-9a-f]{64}$'),
  owner_user_id uuid not null
    check (owner_user_id = '0981b2d6-9245-4387-9929-f6feb1c07903'::uuid),
  email text not null
    check (email = 'e2e-owner@ownerpilot.ai'),
  environment text not null
    check (environment = 'production'),
  route_context text not null
    check (route_context = '/api/auth/magic-link/request'),
  attempt_limit smallint not null default 1
    check (attempt_limit = 1),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint auth_compatibility_ceremony_lease_lifetime_check
    check (
      expires_at > created_at
      and expires_at <= created_at + interval '15 minutes'
    )
);

alter table public.auth_compatibility_ceremony_leases enable row level security;

revoke all on table public.auth_compatibility_ceremony_leases from public, anon, authenticated;
grant select, insert, update, delete on table public.auth_compatibility_ceremony_leases to service_role;

create function public.consume_auth_compatibility_ceremony_lease(
  p_verifier_hash text,
  p_purpose text,
  p_owner_user_id uuid,
  p_email text,
  p_environment text,
  p_route_context text,
  p_attempt_limit smallint
)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  with consumed as (
    update public.auth_compatibility_ceremony_leases
       set consumed_at = now()
     where purpose = p_purpose
       and verifier_hash = p_verifier_hash
       and owner_user_id = p_owner_user_id
       and email = p_email
       and environment = p_environment
       and route_context = p_route_context
       and attempt_limit = 1
       and p_attempt_limit = 1
       and consumed_at is null
       and expires_at > now()
     returning purpose
  )
  select count(*) = 1 from consumed;
$$;

revoke all on function public.consume_auth_compatibility_ceremony_lease(
  text, text, uuid, text, text, text, smallint
) from public, anon, authenticated;
grant execute on function public.consume_auth_compatibility_ceremony_lease(
  text, text, uuid, text, text, text, smallint
) to service_role;
