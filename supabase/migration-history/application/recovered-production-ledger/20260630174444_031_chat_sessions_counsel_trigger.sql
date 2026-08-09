alter table public.chat_sessions
  add column if not exists counsel_route_trigger text;

create index if not exists chat_sessions_counsel_trigger_idx
  on public.chat_sessions (counsel_route_trigger)
  where counsel_route_trigger is not null;