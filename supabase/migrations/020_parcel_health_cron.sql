-- 020_parcel_health_cron.sql
-- Parcel-health probe cron (Move A / A3).
-- Cadence: every 30 minutes (broker ruling 2026-06-27).
-- Honors the §3 freshness window (30 min) of
--   parcel_endpoint_health_check_live_determination_broker_2026-06-25.md.
-- Cadence justification: the parcel-health cron-slice broker ruling (2026-06-27), archived
--   alongside the live determination. SUPERSEDES the §8 twice-daily baseline — do NOT cite
--   §8 as cadence precedent.
--
-- Schedules the parcel-health Edge Function via pg_cron + pg_net (in-database; service_role
-- never leaves Supabase; the invocation secret is read from Vault at run time, so cron.job
-- stores the query, never the secret literal).
--
-- PREREQUISITES (one-time, done out of band; the secret value is NEVER committed):
--   - Edge Function secret PARCEL_HEALTH_PROBE_SECRET set (boot-validated).
--   - Vault secret PARCEL_HEALTH_PROBE_SECRET stored (vault.create_secret / update_secret),
--     the SAME value as the Edge secret.
--
-- VAULT-READ MECHANIC (build correction, verified 2026-06-27): the cron-slice ruling named
--   vault.read_secret(...), but that function does NOT exist in this Supabase project. The
--   working, intent-preserving mechanism is the vault.decrypted_secrets view, read under
--   pg_cron's postgres-role context. Mechanic #4 of the ruling (read the secret from Vault
--   under the postgres role) is satisfied.
--
-- IDEMPOTENT-UPDATE PATTERN: cron.schedule(name, ...) UPSERTS by job name — re-running this
--   migration updates the existing 'parcel-health-probe' job rather than duplicating it. To
--   CHANGE the cadence later, write a NEW migration (021) that calls cron.schedule with the
--   same job name and the new expression. Do NOT use cron.unschedule + cron.schedule.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Invariant: cron cadence must be <= freshness window (currently 30 min). If the freshness
-- window changes, this cron cadence must change in parallel — the two are coupled by the
-- determination's structure, not independent knobs.
select cron.schedule(
  'parcel-health-probe',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := 'https://txpetdrfsmqnyooydmas.supabase.co/functions/v1/parcel-health',
    headers := jsonb_build_object(
      'x-parcel-health-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'PARCEL_HEALTH_PROBE_SECRET'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
