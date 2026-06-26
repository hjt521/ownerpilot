/**
 * parcel-health Edge Function — Deno entry (thin binding).
 *
 * Wires the runtime: reads secrets from Deno env (boot-validated), supplies the clock,
 * constructs the real store + alert sink, injects the probes from the mirrored _core barrel,
 * and serves. All logic lives in handler.ts (Deno-free, unit-tested under Node).
 *
 * NO production-gate short-circuit (R2): the orchestrator feeds the status the gate reads;
 * it runs every cycle pre- and post-go-live (gating it behind the gate would deadlock).
 *
 * Cron contract (future slice): pg_cron + pg_net POSTs this function's URL with header
 *   x-parcel-health-secret: <PARCEL_HEALTH_PROBE_SECRET>
 * — a CUSTOM header, NOT Authorization (see handler.ts auth). No request body is read.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleRequest, type HandlerEnv } from './handler.ts';
import {
  createSupabaseParcelHealthStore,
  type SupabaseParcelHealthClient,
} from './store.ts';
import {
  EmailAlertDestination,
  probeCounty,
  probeZimas,
} from './_core/parcelHealthCore.ts';

/** Read a required env var or throw at boot, naming the var (boot-validation posture). */
function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`parcel-health: missing required env var ${name}`);
  return v;
}

// Service_role client, created INSIDE Supabase (never leaves; rail intact).
// SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are auto-injected into every Edge runtime.
const supabase = createClient(
  requireEnv('SUPABASE_URL'),
  requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
) as unknown as SupabaseParcelHealthClient;
const store = createSupabaseParcelHealthStore({ getClient: async () => supabase });

// Real alert sink: config injected at construction (Fork ①b). The constructor boot-validates
// apiKey/from/to, so a misconfigured env fails the function at boot — loud, never silent.
const alerts = new EmailAlertDestination({
  apiKey: requireEnv('RESEND_API_KEY'),
  from: requireEnv('PARCEL_HEALTH_ALERT_FROM'),
  to: requireEnv('PARCEL_HEALTH_ALERT_EMAIL'),
});

const env: HandlerEnv = {
  secret: requireEnv('PARCEL_HEALTH_PROBE_SECRET'),
  now: () => new Date(),
  deps: {
    // Probes self-fetch + self-evaluate; injected from _core so the handler stays testable.
    probes: { county: probeCounty, zimas: probeZimas },
    store,
    alerts,
  },
};

Deno.serve((req) => handleRequest(req, env));
