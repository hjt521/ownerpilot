-- 009_cliff_schedule.sql
-- Slice 4b of Supabase audit-durability per broker ruling 2026-06-21
--   (slice4_export_cliff_resolver_wiring_broker_ruling_response_2026-06-21.md §2.5).
-- Schedules the retention cliff DRY-RUN only, weekly, via pg_cron (in-database;
-- no service_role key leaves Supabase). The live cliff is NEVER scheduled — it is
-- broker-run from scripts/audit_cliff_live.ts only (ruling §2.5 req 5). The
-- CI guard scripts/ci/verify_no_live_cliff_schedule.mjs rejects any migration
-- that schedules audit_cliff with a false dry-run. No gate flip.
--
-- CADENCE: the ruling defers the day/time to the broker at 4b PR review. The
-- default below is Mondays 17:00 UTC (~9am Pacific during PDT). Adjust the cron
-- expression before applying if a different cadence is chosen.

create extension if not exists pg_cron;

-- Idempotent: drop the existing job if present, then (re)schedule the dry-run.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'audit_cliff_weekly_dryrun') then
    perform cron.unschedule('audit_cliff_weekly_dryrun');
  end if;
end
$$;

select cron.schedule(
  'audit_cliff_weekly_dryrun',
  '0 17 * * 1',
  $$select public.audit_cliff(p_dry_run := true, p_table := null, p_triggered_by := 'pg_cron', p_reason := null)$$
);
