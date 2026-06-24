/**
 * rtc-refresh Edge Function — Deno entry (thin binding).
 *
 * Wires the runtime: reads secrets from Deno env, supplies the clock, and injects deps.
 * Step 3 wired the real store; Step 4 wires the real fetcher (createLanguageFetcher over
 * Deno fetch + crypto.subtle, byte-parity with scripts/rtc_url_drift_check.ts). The alert
 * sink remains a Step-named stub (lands in Step 5). All logic lives in handler.ts (Deno-free,
 * unit-tested under Node).
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleRequest, type HandlerEnv } from './handler.ts';
import { createSupabaseRefreshStore, type SupabaseRefreshClient } from './store.ts';
import { createLanguageFetcher } from './fetcher.ts';
import type { AlertSink } from './_core/rtcRefreshTypes.ts';

// Real store: service_role client, created INSIDE Supabase (never leaves; rail intact).
// SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are auto-injected into every Edge Function runtime.
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
) as unknown as SupabaseRefreshClient;
const store = createSupabaseRefreshStore({ getClient: async () => supabase });

// Real fetcher: Deno fetch + crypto.subtle SHA-256, URLs from RTC_FORM_URLS.
const fetcher = createLanguageFetcher();

// Step-named throw-on-invoke stub (lands in Step 5). The production gate short-circuits
// before runRefresh pre-go-live, so this never executes in the real path; a test that
// reaches it fails loudly. Alerts fire only on revision/failure outcomes.
const alerts: AlertSink = {
  emit: async () => { throw new Error('skeleton: alert sink not implemented; lands in Step 5'); },
};

const env: HandlerEnv = {
  secret: Deno.env.get('RTC_REFRESH_SECRET'),
  now: () => new Date(),
  deps: { fetcher, store, alerts },
};

Deno.serve((req) => handleRequest(req, env));
