/**
 * rtc-refresh Edge Function — Deno entry (thin binding).
 *
 * Wires the runtime: reads secrets from Deno env, supplies the clock, and injects deps.
 * Step 3: the real Supabase store is wired (createSupabaseRefreshStore over a service_role
 * client created in-Supabase — rail intact). fetcher + alerts remain Step-named stubs
 * (lands in Steps 4 / 5). All logic lives in handler.ts (Deno-free, unit-tested under Node).
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleRequest, type HandlerEnv } from './handler.ts';
import { createSupabaseRefreshStore, type SupabaseRefreshClient } from './store.ts';
import type { LanguageFetcher } from './_core/rtcRefreshJob.ts';
import type { AlertSink } from './_core/rtcRefreshTypes.ts';

// Real store: service_role client, created INSIDE Supabase (never leaves; rail intact).
// SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are auto-injected into every Edge Function runtime.
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
) as unknown as SupabaseRefreshClient;
const store = createSupabaseRefreshStore({ getClient: async () => supabase });

// Step-named throw-on-invoke stubs (lands in Steps 4 / 5). fetcher throws are absorbed by
// runRefresh into fetch_error outcomes; the alerts stub is the current observable frontier.
const fetcher: LanguageFetcher = async () => {
  throw new Error('skeleton: fetcher not implemented; lands in Step 4');
};
const alerts: AlertSink = {
  emit: async () => { throw new Error('skeleton: alert sink not implemented; lands in Step 5'); },
};

const env: HandlerEnv = {
  secret: Deno.env.get('RTC_REFRESH_SECRET'),
  now: () => new Date(),
  deps: { fetcher, store, alerts },
};

Deno.serve((req) => handleRequest(req, env));
