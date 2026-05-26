-- OwnerPilot AI — Initial database schema
-- Migration: 001_initial_schema
--
-- Conventions:
--   * public.users.id mirrors auth.users.id (Supabase managed auth).
--   * All "owned" tables carry user_id and are protected by RLS so a user
--     can only read/write rows where auth.uid() matches.
--   * Enums are real Postgres types for data integrity.

-- ---------------------------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------------------------
create type subscription_tier as enum ('free', 'starter', 'pro', 'portfolio');

create type referring_source as enum (
  'google-crisis',
  'facebook-retiree',
  'facebook-inheritor',
  'instagram-inheritor',
  'linkedin-tech',
  'email-business',
  'organic',
  'unknown'
);

create type property_type as enum ('sfr', 'duplex', 'multifamily', 'condo', 'commercial');

create type acquired_how as enum ('purchased', 'inherited', 'retained', 'other');

create type tenant_status as enum ('current', 'late', 'notice-served', 'vacated');

create type ai_session_type as enum (
  'general',
  'lease-analysis',
  'tenant-issue',
  'notice',
  'maintenance',
  'contractor'
);

create type referral_type as enum ('document-review', 'consult', 'representation');

create type referral_status as enum ('pending', 'scheduled', 'completed');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- 1. users — application profile linked 1:1 to Supabase auth.users
create table public.users (
  id                   uuid primary key references auth.users (id) on delete cascade,
  email                text not null,
  full_name            text,
  created_at           timestamptz not null default now(),
  subscription_tier    subscription_tier not null default 'free',
  stripe_customer_id   text,
  referring_source     referring_source not null default 'unknown',
  onboarding_completed boolean not null default false
);

-- 2. properties — real estate owned by a user
create table public.properties (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users (id) on delete cascade,
  address       text not null,
  city          text,
  zip           text,
  property_type property_type,
  units_count   integer not null default 1,
  acquired_how  acquired_how,
  created_at    timestamptz not null default now()
);

-- 3. tenants — occupants tied to a property (and denormalized user_id for RLS)
create table public.tenants (
  id             uuid primary key default gen_random_uuid(),
  property_id    uuid not null references public.properties (id) on delete cascade,
  user_id        uuid not null references public.users (id) on delete cascade,
  name           text not null,
  move_in_date   date,
  rent_amount    numeric(10, 2),
  lease_end_date date,
  status         tenant_status not null default 'current',
  created_at     timestamptz not null default now()
);

-- 4. ai_sessions — record of each AI guidance interaction
create table public.ai_sessions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.users (id) on delete cascade,
  property_id          uuid references public.properties (id) on delete set null,
  session_type         ai_session_type not null,
  question_text        text,
  answer_text          text,
  statute_citations    text[],
  confidence_score     numeric(3, 2) check (confidence_score >= 0 and confidence_score <= 1),
  escalation_triggered boolean not null default false,
  created_at           timestamptz not null default now()
);

-- 5. documents — uploaded files stored in Supabase Storage
create table public.documents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users (id) on delete cascade,
  property_id  uuid references public.properties (id) on delete set null,
  doc_type     varchar(100),
  file_name    varchar(255),
  storage_path varchar(500),
  created_at   timestamptz not null default now()
);

-- 6. attorney_referrals — handoffs from AI guidance to licensed attorney
create table public.attorney_referrals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users (id) on delete cascade,
  ai_session_id  uuid references public.ai_sessions (id) on delete set null,
  referral_type  referral_type not null,
  status         referral_status not null default 'pending',
  revenue_amount numeric(10, 2),
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes on foreign keys (Postgres does not create these automatically)
-- ---------------------------------------------------------------------------
create index properties_user_id_idx          on public.properties (user_id);
create index tenants_property_id_idx          on public.tenants (property_id);
create index tenants_user_id_idx              on public.tenants (user_id);
create index ai_sessions_user_id_idx          on public.ai_sessions (user_id);
create index ai_sessions_property_id_idx      on public.ai_sessions (property_id);
create index documents_user_id_idx            on public.documents (user_id);
create index documents_property_id_idx        on public.documents (property_id);
create index attorney_referrals_user_id_idx   on public.attorney_referrals (user_id);
create index attorney_referrals_session_id_idx on public.attorney_referrals (ai_session_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Each user may only read/write rows they own. For public.users the owning
-- column is the primary key (id); for every other table it is user_id.
-- ---------------------------------------------------------------------------

-- users
alter table public.users enable row level security;

create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.users for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can delete own profile"
  on public.users for delete
  using (auth.uid() = id);

-- properties
alter table public.properties enable row level security;

create policy "Users manage own properties"
  on public.properties for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- tenants
alter table public.tenants enable row level security;

create policy "Users manage own tenants"
  on public.tenants for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ai_sessions
alter table public.ai_sessions enable row level security;

create policy "Users manage own ai_sessions"
  on public.ai_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- documents
alter table public.documents enable row level security;

create policy "Users manage own documents"
  on public.documents for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- attorney_referrals
alter table public.attorney_referrals enable row level security;

create policy "Users manage own attorney_referrals"
  on public.attorney_referrals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
