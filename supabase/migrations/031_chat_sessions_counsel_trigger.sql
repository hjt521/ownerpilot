-- 030_chat_sessions_counsel_trigger.sql
-- Group 4 / G4 — add chat_sessions.counsel_route_trigger so the chat orchestration can record a detected
-- counsel-route trigger and the produce route can hard-stop on it server-side (before any PDF generation).
-- NEW migration (does NOT edit the attested 026_chat_sessions per §5 — preserves its chain-of-custody SHA).
-- Rebuild branch; next after 029_magic_link_tokens. Text column: holds one of the 22 trigger IDs or null.

alter table public.chat_sessions
  add column if not exists counsel_route_trigger text;

create index if not exists chat_sessions_counsel_trigger_idx
  on public.chat_sessions (counsel_route_trigger)
  where counsel_route_trigger is not null;
