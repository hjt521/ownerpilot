-- ===========================================================================
-- 010_section8_runs.sql
--   Slice 8 verification-suite monitor output table (the "ninth" audit table).
--   Ruled: slice8_verification_premise_broker_ruling_response_2026-06-22.md
--          §2.7-(3) / §3.1 / §3.5.
--
--   One row per §8 monitor execution (scripts/section8_monitor.ts, broker-local
--   CLI, daily 03:00 PT). Records the four-component decomposition + verdict for
--   the window.
--
--   Posture: broker/meta tier -- service_role ONLY, no app access. Mirrors
--   audit_deletion_incidents / audit_access_grants / audit_exports in 002
--   ("no app access at all; service_role only"). anon/authenticated get nothing;
--   service_role bypasses RLS and is the monitor's read/write path. The
--   service_role key is sourced from the broker-local environment per Slice 4
--   2.2 and is NEVER referenced from app/Vercel/git/CI.
--
--   Lean by specification: the ruling enumerates exactly nine columns. This is
--   monitor OUTPUT, not a retention-class audit-of-record, so it intentionally
--   OMITS the audit-base columns (retention_class / legal_hold / soft_deleted_at)
--   and the no-delete-held trigger the 002 audit tables carry. (Flagged to the
--   broker; build follows the enumerated schema.)
-- ===========================================================================
create table public.section8_runs (
  run_id                              uuid        primary key default gen_random_uuid(),
  window_start                        timestamptz not null,
  window_end                          timestamptz not null,
  rows_written                        integer     not null,
  write_failures_unrecovered          integer     not null,
  dispositions_with_no_row_by_design  integer     not null,
  -- SIGNED on purpose: a NEGATIVE residual is a DEFINED red "substrate bug"
  -- signal (ruling 2.5 / 3.5). Do NOT add a >= 0 check constraint here.
  freeze_loss_suspected               integer     not null,
  -- Free text to mirror the substrate "enum-ish fields are text" convention
  -- (002 disposition/branch posture). Expected values: green / yellow / red.
  verdict                             text        not null,
  created_at                          timestamptz not null default now()
);

-- Index supports the monitor's prior-window verdict lookup (consecutive-window
-- yellow/red logic reads the most recent run). Build-added; not in the column
-- spec, which enumerates data columns only.
create index section8_runs_window_end_idx on public.section8_runs (window_end);

-- ---------------------------------------------------------------------------
-- Broker/meta-tier RLS (service_role only). Enable RLS, revoke all from the app
-- roles, grant NOTHING, add NO insert policy. service_role bypasses RLS.
-- (Mirrors the service_role-only meta tables in 002; confirm against that idiom.)
-- ---------------------------------------------------------------------------
alter table public.section8_runs enable row level security;
revoke all on public.section8_runs from anon, authenticated;
