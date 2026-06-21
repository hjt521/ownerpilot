-- OwnerPilot AI — Manual-review queue enqueue trigger
-- Migration: 003_manual_review_enqueue
--
-- Implements Slice 2 queue population per broker ruling 2026-06-20
-- (slice2_audit_sink_queue_population_broker_ruling_response_2026-06-20.md), 4.1=A / 4.2=A.
--
-- When a geocode_audit_log row lands with disposition='manual_review', an AFTER
-- INSERT trigger derives the linked manual_review_queue row using NEW.id. This
-- guarantees the §2.1(4) review surface is a function of the audit row's
-- disposition, not of a second app call succeeding.
--
-- BULLETPROOF BY CONSTRUCTION (ruling §2.2 — the trigger MUST NOT be able to fail,
-- because it runs inside the audit insert's transaction; a failure here would roll
-- back the audit row itself):
--   1. Every NOT NULL column the trigger populates is sourced from a NOT NULL
--      column on geocode_audit_log or a constant. review_reason is nullable on the
--      audit row, so it is COALESCEd to the sentinel 'unspecified'.
--   2. The FK geocode_audit_id -> geocode_audit_log(id) is satisfied by
--      construction: AFTER INSERT fires after NEW's row exists.
--   3. No UNIQUE on manual_review_queue.geocode_audit_id (confirmed: Slice 1's
--      002 migration created only a plain index, not a unique constraint), so a
--      future reopen can add a second queue row for the same audit row.
--   4. Fires only on NEW.disposition = 'manual_review'; all other dispositions
--      fall through silently with no exception.
--   5. No SECURITY DEFINER — runs as the app role, which already holds INSERT on
--      manual_review_queue (granted in 002).
--   6. Trigger function + trigger live in this single migration file.

create or replace function public.enqueue_manual_review()
returns trigger
language plpgsql
as $$
begin
  if new.disposition = 'manual_review' then
    insert into public.manual_review_queue
      (geocode_audit_id, input_address, review_reason, enqueued_at)
    values
      (new.id,
       new.input_address,
       coalesce(new.review_reason, 'unspecified'),
       new.decided_at);
  end if;
  return new;
end;
$$;

create trigger geocode_audit_enqueue_manual_review
  after insert on public.geocode_audit_log
  for each row execute function public.enqueue_manual_review();
