-- 013_rtc_refresh_state.sql
-- RTC form-refresh substrate — per-language state + serve-time pins (store, part 2 of 2).
--
-- Authorized by: la_rtc_refresh_runner_architecture_broker_ruling_response_2026-06-23.md
--   D-5 / §2.6 (table scope + RLS posture), D-1 (R-4 Supabase Edge Function writer),
--   D-2 (P-B server-side read route; no anon SELECT).
-- State model: rtc_refresh_job_step_e_compliance_questions_broker_ruling_response_2026-06-20.md
--   (Q1 hard-block; Q3 per-language pin, 30-day lifetime from acceptance date).
-- Cadence/policy frame: la_rtc_forms_authoritative_source_and_refresh_policy_broker_ruling_response_2026-06-19.md (W4).
--
-- WRITER: the Supabase Edge Function (R-4) ONLY, via the in-Supabase service-role
-- context that never leaves Supabase (standing rail intact — no service_role in
-- Vercel/git/CI). The serve path READS these tables via the P-B server-side route
-- using a scoped read-only role; the read-role GRANT and the route are a SEPARATE
-- migration/PR pending the reader-auth-mechanism determination
-- (la_rtc_block_state_reader_auth_mechanism_ruling_request_2026-06-23.md) — this
-- migration deliberately creates NO custom role and NO anon/authenticated access.
--
-- RLS POSTURE (D-5 / §2.6): "Broker/meta: no app access. RLS on, no policies =>
-- app sees/writes nothing." Mirrors 002's audit_access_grants / audit_exports
-- block verbatim. service_role bypasses RLS inherently (Edge Function writes,
-- broker-local operator reads for diagnostics); anon + authenticated get NOTHING
-- (no SELECT, no INSERT, no UPDATE, no DELETE). The scoped read path is added
-- later via the dedicated read-only role, NOT via an anon policy here.

-- ---------------------------------------------------------------------------
-- rtc_refresh_state — one row per published RTC language (Q1/Q2 runtime gate
-- source of truth). The serve path consults current_status + last_successful_
-- refresh_at (the latter drives the §2.5 14-day freshness-fail-closed guard).
-- ---------------------------------------------------------------------------
create table if not exists public.rtc_refresh_state (
  language                    text        primary key,             -- one row per RtcLanguage; PK enforces single-row-per-language
  last_attempted_refresh_at   timestamptz,                          -- null until first run
  last_successful_refresh_at  timestamptz,                          -- null until first MATCH/accepted run; drives 14-day freshness guard (§2.5)
  current_status              text        not null default 'unblocked',  -- 'unblocked' | 'refresh_failure' | 'staged_revision' (Q2 §2.3)
  current_hash                text,                                 -- last observed full-body SHA-256 (null until first fetch)
  block_reason                text,                                 -- null when unblocked; else 'refresh_failure' | 'revision_detected' | 'manual'
  block_since                 timestamptz                           -- when the current block began; null when unblocked
);

-- ---------------------------------------------------------------------------
-- rtc_refresh_pins — one row per pinned form-version (Q3). Pins the specific
-- language hash an in-flight draft will attach; 30-day lifetime from the broker
-- acceptance-file date (Q3 §3.2). acceptance_doc_path references the broker
-- acceptance determination (la_rtc_form_revision_acceptance_<lang>_<date>.md).
-- ---------------------------------------------------------------------------
create table if not exists public.rtc_refresh_pins (
  id                   uuid        primary key default gen_random_uuid(),
  language             text        not null,                        -- RtcLanguage the pin applies to
  pinned_hash          text        not null,                        -- the specific language hash pinned (Q3 §3.1 — language-specific, not the 9-tuple)
  pinned_at            timestamptz not null default now(),
  pin_reason           text        not null,                        -- e.g. 'in_flight_draft' | broker grant reference
  acceptance_doc_path  text                                         -- path to the superseding-revision acceptance determination; day-0 of the 30-day clock (Q3 §3.2.1)
);

create index if not exists rtc_refresh_pins_language_idx
  on public.rtc_refresh_pins (language);

-- ---------------------------------------------------------------------------
-- RLS: broker/meta posture — no app access (D-5 / §2.6). Mirrors 002's
-- audit_access_grants / audit_exports block verbatim: RLS on, revoke all from
-- anon + authenticated, NO policies. The Edge Function writes via service_role
-- (RLS bypass, in-Supabase). The serve path's scoped read-only role + its SELECT
-- grant are a SEPARATE migration pending the reader-auth determination — NOT here.
-- ---------------------------------------------------------------------------
alter table public.rtc_refresh_state enable row level security;
alter table public.rtc_refresh_pins  enable row level security;
revoke all on public.rtc_refresh_state from anon, authenticated;
revoke all on public.rtc_refresh_pins  from anon, authenticated;
