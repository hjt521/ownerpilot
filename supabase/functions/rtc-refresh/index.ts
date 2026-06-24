/**
 * rtc-refresh Edge Function — Deno entry (thin binding).
 *
 * Wires the runtime: reads secrets from Deno env, supplies the clock, injects deps.
 * Steps 3/4/5 wired the real store, fetcher, and alert sink respectively — so as of Step 5
 * NOTHING is a stub; the function is feature-complete (pending deploy + the 9-URL parity
 * check + the read route + attestation). All logic lives in handler.ts (Deno-free, unit-tested
 * under Node). The production gate still short-circuits before runRefresh pre-go-live.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleRequest, type HandlerEnv } from './handler.ts';
import { createSupabaseRefreshStore, type SupabaseRefreshClient } from './store.ts';
import { createLanguageFetcher } from './fetcher.ts';
import { createConsoleAlertSink } from './alerts.ts';

// Real store: service_role client, created INSIDE Supabase (never leaves; rail intact).
// SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are auto-injected into every Edge Function runtime.
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
) as unknown as SupabaseRefreshClient;
const store = createSupabaseRefreshStore({ getClient: async () => supabase });

// Real fetcher: Deno fetch + crypto.subtle SHA-256, URLs from RTC_FORM_URLS.
const fetcher = createLanguageFetcher();

// Real alert sink: console-stub transport (project-wide posture); inherits the shared
// in_app+email transport when that lands. Pure transport — serializes the core-built alert.
const alerts = createConsoleAlertSink();

const env: HandlerEnv = {
  secret: Deno.env.get('RTC_REFRESH_SECRET'),
  now: () => new Date(),
  deps: { fetcher, store, alerts },
};

Deno.serve((req) => handleRequest(req, env));
