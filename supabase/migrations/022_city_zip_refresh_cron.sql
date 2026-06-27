-- 022_city_zip_refresh_cron.sql
-- City-of-LA ZIP snapshot refresh poll cron (A-3 §4.1).
-- Cadence: daily at 03:00 PT (broker ruling §4.1). Expressed as '0 11 * * *' UTC
--   (= 03:00 PST / 04:00 PDT). The bound property is "daily" (§4.3); the one-hour
--   DST wobble of the clock-time is build-adjustable per §4.3 and does not change cadence.
--
-- Cadence justification: A-3 §4.2 (publisher edits the boundary rarely; one-day lag is
--   negligible; daily polling is the defensible middle). The poll is a lightweight
--   editingInfo metadata call (no geometry transfer) — §4.2 Axis 3.
--
-- What the cron invokes: the city-zip-refresh Edge Function, which fetches C-8
--   editingInfo.dataLastEditDate (§7.3-c currency-trigger field correction) and compares to
--   the baseline in city_zip_refresh_state. NO-DIFF → broker_attestation_routine (§2.3);
--   change → recompute-due alert (the geospatial recompute stays operator-supervised, §3.3).
--
-- PREREQUISITES (one-time, out of band; secret value NEVER committed):
--   - Edge Function secret CITY_ZIP_REFRESH_SECRET set (boot-validated in index.ts).
--   - Vault secret CITY_ZIP_REFRESH_SECRET stored (vault.create_secret), SAME value as the
--     Edge secret. Read at run time via the vault.decrypted_secrets view under pg_cron's
--     postgres-role context (same mechanic as 020 — vault.read_secret does not exist here).
--   - Edge env: RESEND_API_KEY, CITY_ZIP_REFRESH_ALERT_FROM, CITY_ZIP_REFRESH_ALERT_EMAIL.
--   - Migration 021 applied (city_zip_refresh_state seeded singleton).
--
-- IDEMPOTENT-UPDATE PATTERN: cron.schedule(name, ...) UPSERTS by job name. To change the
--   cadence later, write a NEW migration (023) calling cron.schedule with the same job name
--   and the new expression. Do NOT use cron.unschedule + cron.schedule.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'city-zip-refresh',
  '0 11 * * *',
  $$
  select net.http_post(
    url := 'https://txpetdrfsmqnyooydmas.supabase.co/functions/v1/city-zip-refresh',
    headers := jsonb_build_object(
      'x-city-zip-refresh-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'CITY_ZIP_REFRESH_SECRET'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
