/**
 * city-zip-refresh Edge Function — Deno entry (thin binding).
 *
 * Daily poll of the City-of-LA ZIP snapshot currency trigger (A-3 §4.1). Reads secrets from
 * Deno env (boot-validated), supplies the clock, constructs the real C-8 fetcher (with the
 * §3.2-c retry-once), the Supabase state store, and the Resend alert sink, then serves.
 * All logic lives in handler.ts (Deno-free, unit-tested under Node).
 *
 * Cron contract: pg_cron + pg_net POSTs this function's URL with header
 *   x-city-zip-refresh-secret: <CITY_ZIP_REFRESH_SECRET>
 * — a CUSTOM header, NOT Authorization. No request body is read.
 *
 * Polled field: editingInfo.dataLastEditDate (per the §7.3-c currency-trigger field
 * correction, broker 2026-06-27) — NOT lastEditDate.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleRequest, type HandlerEnv, type C8FetchResult } from './handler.ts';
import { createSupabaseRefreshStore, type SupabaseRefreshClient } from './store.ts';

function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`city-zip-refresh: missing required env var ${name}`);
  return v;
}

const C8_METADATA_URL =
  'https://services1.arcgis.com/PTh9WC0Sf2WS7AAq/arcgis/rest/services/' +
  'LA_City_Boundary_detailed/FeatureServer/0?f=json';
const FETCH_TIMEOUT_MS = 10_000;
const RETRY_BACKOFF_MS = 60_000;

/** Fetch C-8 layer metadata and extract editingInfo.dataLastEditDate (epoch ms). */
async function fetchC8Once(): Promise<C8FetchResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(C8_METADATA_URL, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'OwnerPilot-A3-construction/refresh-poll' },
    });
    if (!res.ok) return { ok: false, error: `http_${res.status}` };
    const body = await res.json();
    const ms = body?.editingInfo?.dataLastEditDate;
    if (typeof ms !== 'number') return { ok: false, error: 'missing_dataLastEditDate' };
    return { ok: true, dataLastEditDateMs: ms };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.name : String(e) };
  } finally {
    clearTimeout(timer);
  }
}

/** §3.2-c: retry once after a 60s back-off before reporting a fetch failure. */
async function fetchC8WithRetry(): Promise<C8FetchResult> {
  const first = await fetchC8Once();
  if (first.ok) return first;
  await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS));
  return fetchC8Once();
}

/** Resend-backed alert sink (boot-validated config). */
function makeAlerts(apiKey: string, from: string, to: string) {
  return {
    async send(alert: { subject: string; body: string }): Promise<void> {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, subject: alert.subject, text: alert.body }),
      });
      if (!res.ok) throw new Error(`resend_http_${res.status}`);
    },
  };
}

const supabase = createClient(
  requireEnv('SUPABASE_URL'),
  requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
) as unknown as SupabaseRefreshClient;

const env: HandlerEnv = {
  secret: requireEnv('CITY_ZIP_REFRESH_SECRET'),
  now: () => new Date(),
  deps: {
    fetchC8: fetchC8WithRetry,
    store: createSupabaseRefreshStore({ getClient: async () => supabase }),
    alerts: makeAlerts(
      requireEnv('RESEND_API_KEY'),
      requireEnv('CITY_ZIP_REFRESH_ALERT_FROM'),
      requireEnv('CITY_ZIP_REFRESH_ALERT_EMAIL'),
    ),
  },
};

Deno.serve((req) => handleRequest(req, env));
