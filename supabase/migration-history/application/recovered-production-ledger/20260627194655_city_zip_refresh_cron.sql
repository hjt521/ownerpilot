-- 022_city_zip_refresh_cron.sql — daily 03:00 PT poll (A-3 §4.1). '0 11 * * *' UTC.
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