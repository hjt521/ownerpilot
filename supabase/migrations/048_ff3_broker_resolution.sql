-- 048_ff3_broker_resolution.sql
-- FF-3 Preview-activation Block B — the awaiting_broker_review resolution columns + predicate index.
-- Authority: ff3_awaiting_broker_review_resolution_surface_broker_ruling_2026-07-11 §1, §4.
--
-- State model (ruling §1, option (b) tightened): a session is "awaiting broker review" when
--   reconciliation_resolution = 'broker_review' AND reconciliation_resolved_at IS NOT NULL AND broker_resolution_note IS NULL.
-- The note-nullability IS the state transition — no ff3_capture_status enum expansion (which would cost another
-- 7-day soak). Resolution writes the note (+ resolved_at + reviewer), which flips the session OUT of the awaiting set.
--
-- Three columns (ruling §4): the note (owner-facing verbatim, feeds entry-13 {broker_resolution_note}),
-- broker_resolution_resolved_at (distinct compliance question from reconciliation_resolved_at — when the BROKER
-- acted), and reviewer_email (which admin acted — the mutation audit trail). All nullable + additive → no soak.
--
-- Broker-executed in Supabase Studio. ROLLBACK: drop the three columns + the index.

alter table public.chat_sessions add column if not exists broker_resolution_note            text;
alter table public.chat_sessions add column if not exists broker_resolution_resolved_at     timestamptz;
alter table public.chat_sessions add column if not exists broker_resolution_reviewer_email  text;

-- Partial index on the awaiting-review predicate (ruling §4) — the admin list reads exactly this set.
create index if not exists chat_sessions_awaiting_broker_review_idx
  on public.chat_sessions (reconciliation_resolved_at)
  where reconciliation_resolution = 'broker_review'
    and reconciliation_resolved_at is not null
    and broker_resolution_note is null;
