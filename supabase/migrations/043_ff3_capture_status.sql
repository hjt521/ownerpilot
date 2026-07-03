-- 043_ff3_capture_status.sql
-- Lane FF-3 (ff3_capture_questions_locked_prose_broker_ratification_2026-07-03 §6) — the scripted capture flow can
-- exit to broker review after the rule-of-three re-ask limit. This adds a session-level FF-3 capture status whose
-- 'awaiting_broker_review' state gates the case out of downstream compliance checks until a broker clears it.
-- Additive-only per the omnibus ruling Amendment E: nullable column + NOT VALID check (validate after soak).
--
-- (Ruling wrote "migration 037" for FF-3; 037–042 are taken — this is the companion in the FF-3 PR, numbered 043.)
--
-- ROLLBACK (non-destructive):
--   alter table public.chat_sessions drop constraint if exists ff3_capture_status_enum;
--   alter table public.chat_sessions drop column if exists ff3_capture_status;

alter table public.chat_sessions
  add column if not exists ff3_capture_status text;

alter table public.chat_sessions
  add constraint ff3_capture_status_enum
  check (ff3_capture_status is null or ff3_capture_status in (
    'in_progress', 'complete', 'awaiting_broker_review'
  )) not valid;
