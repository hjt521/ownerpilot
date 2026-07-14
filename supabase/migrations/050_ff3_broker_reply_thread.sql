-- 050_ff3_broker_reply_thread.sql
-- Omnibus §3 row 1 — FF-3 reply-to-broker seam. Owner-authored replies to a broker resolution note, persisted as an
-- ordered jsonb array on the session. Pre-staged behind FF3_REPLY_TO_BROKER_ENABLED (default OFF); the column is
-- inert until the flag ships (a separate broker ruling).
--
-- Shape: broker_reply_thread jsonb, default '[]'::jsonb — array of { author, text, at }. Additive + defaulted →
-- no backfill on existing rows beyond the catalog default, no soak, no lock beyond the brief catalog update.
-- Broker-executed in Supabase Studio. ROLLBACK: drop the column.

alter table public.chat_sessions
  add column if not exists broker_reply_thread jsonb not null default '[]'::jsonb;
