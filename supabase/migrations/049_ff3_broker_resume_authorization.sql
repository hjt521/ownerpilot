-- 049_ff3_broker_resume_authorization.sql
-- FF-3 Block C server-resume seam — the scoped, one-shot broker-authorization override that lets a resolved
-- awaiting_broker_review session continue PAST the reconciliation gate without silently reusing the owner's
-- selection-(1) path (which would erase the audit distinction between "owner claimed records incomplete" and
-- "broker reviewed and authorized").
-- Authority: ff3_block_c_resume_and_pause_seams_broker_ruling_2026-07-12 §Gap-A (Option 2).
--
-- State model:
--   • broker_resume_authorization (jsonb): written by the admin resolve, in the SAME transaction as
--     broker_resolution_note, DERIVED SERVER-SIDE from existing session state (no admin UI change). It is the
--     scoped authorization: { session_id, notice_amount, ledger_total, ledger_period, broker_email,
--     resolution_note_hash, authorized_at }. Every field is a constraint checked at resume time — the broker
--     authorizes THIS mismatch on THIS session, not an open-ended override.
--   • broker_resume_consumed_at (timestamptz): stamped once, on the first successful resume. A second attempt is
--     a no-op that returns ff3_resume_already_consumed (soft error; reachable only via client bug / replay).
--
-- Both columns nullable + additive → no backfill, no soak, no lock beyond the brief catalog update.
-- Broker-executed in Supabase Studio. ROLLBACK: drop the two columns.

alter table public.chat_sessions add column if not exists broker_resume_authorization jsonb;
alter table public.chat_sessions add column if not exists broker_resume_consumed_at    timestamptz;

-- Partial index on the "authorized, not yet consumed" set — the resume endpoint and produce gate both read
-- exactly this predicate. Shape mirrors 048's ff3_awaiting_broker_review_idx for query-planner symmetry
-- (omnibus signature §3): indexed column reconciliation_resolved_at, predicate on the authz/consumed nullability.
create index if not exists ff3_authorized_unconsumed_idx
  on public.chat_sessions (reconciliation_resolved_at)
  where broker_resume_authorization is not null
    and broker_resume_consumed_at is null;
