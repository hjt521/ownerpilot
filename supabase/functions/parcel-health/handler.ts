/**
 * parcel-health Edge Function — request handler (pure, Deno-runtime-free).
 *
 * All Deno-specific I/O (env, serve) is injected, so this module runs under both Node
 * (project test runner) and Deno (production). index.ts binds it to Deno.
 *
 * Execution order:
 *   1. Auth: `x-parcel-health-secret` header, constant-time-compared to the injected
 *      secret, else 401. (Cron contract: pg_net sends this custom header — NOT
 *      Authorization — see index.ts docblock.)
 *   2. For each endpoint (county, zimas), concurrently and in isolation:
 *        getStatus(prior) → probe() → rollUpStatus(prior, outcome) → recordProbe
 *        → setStatus → if transition: build AlertEvent + alerts.send.
 *   3. 200 with per-endpoint results; an unexpected error in one endpoint never aborts
 *      the other (per-endpoint catch; Promise.all over wrapped cycles never rejects).
 *
 * NO production-gate short-circuit (R2, broker-ruled 2026-06-26): this orchestrator FEEDS
 * parcel_health_status, which the gate later reads. Gating it behind isLaProductionUnblocked()
 * would deadlock — it would never run to produce the data that opens the gate. It runs and
 * records every cycle, pre- and post-go-live; the alert fires pre-go-live too, which is the
 * slice-6 end-to-end smoke-test (a real County outage validates the whole chain).
 *
 * DIVERGES from rtc-refresh/handler.ts auth (Flag 1, broker-ruled diverge-toward-secure):
 * rtc compares the secret with plain `!==` (a timing channel). This handler uses a
 * constant-time SHA-256-both-sides + XOR-accumulate compare. Follow-up: fix
 * rtc-refresh/handler.ts to match.
 */
import { rollUpStatus } from './_core/parcelHealthCore.ts';
import type {
  Endpoint,
  ProbeResult,
  RollUpState,
  AlertEvent,
  AlertDestination,
} from './_core/parcelHealthCore.ts';
import type { ParcelHealthStore } from './store.ts';

const ENDPOINTS: Endpoint[] = ['county', 'zimas'];

/** Everything the handler needs, injected — keeps it Deno-free and testable. */
export interface HandlerEnv {
  /** The shared invocation secret (from PARCEL_HEALTH_PROBE_SECRET). */
  secret: string | undefined;
  /** Clock, injectable so probedAt/detectedAt are deterministic in tests. */
  now: () => Date;
  deps: {
    /** Per-endpoint probe fns (probeCounty/probeZimas), injected from _core for testability. */
    probes: Record<Endpoint, () => Promise<ProbeResult>>;
    store: ParcelHealthStore;
    alerts: AlertDestination;
  };
}

/** Per-endpoint cycle outcome surfaced in the response. */
export interface EndpointCycleResult {
  endpoint: Endpoint;
  outcome: ProbeResult['outcome'] | 'skipped';
  status: 'live' | 'not_live' | null;
  transition: 'to_live' | 'to_not_live' | null;
  alertSent: boolean;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** Structured log line (Supabase Edge logs ingest these). */
function logEvent(event: string, fields: Record<string, unknown>): void {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ event, ...fields }));
}

/**
 * Constant-time secret comparison. SHA-256s both sides to fixed 32-byte digests, then
 * XOR-accumulates over the full digest with no early exit — so the compare time is
 * independent of where the first differing byte is, and unequal INPUT lengths never leak
 * (they hash to equal-length digests). Web-standard (crypto.subtle + TextEncoder), so it
 * behaves identically under Node and Deno: no `node:` import, no Deno global, no equal-length
 * precondition to trip (the crypto.timingSafeEqual pitfall).
 */
async function secretsMatch(provided: string, expected: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(provided)),
    crypto.subtle.digest('SHA-256', enc.encode(expected)),
  ]);
  const va = new Uint8Array(a);
  const vb = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];
  return diff === 0;
}

/**
 * One endpoint's full pipeline, catching its own errors so one endpoint never aborts the
 * other. A getStatus read failure (null) skips the endpoint this cycle (sub-flag A).
 */
async function runEndpointCycle(endpoint: Endpoint, env: HandlerEnv): Promise<EndpointCycleResult> {
  try {
    const prior = await env.deps.store.getStatus(endpoint);
    if (prior === null) {
      logEvent('parcel_health_skip', { endpoint, reason: 'status-read-failed' });
      return { endpoint, outcome: 'skipped', status: null, transition: null, alertSent: false };
    }

    const result = await env.deps.probes[endpoint]();
    const probedAt = env.now().toISOString();

    const prev: RollUpState = { status: prior.status, consecutiveFailures: prior.consecutiveFailures };
    const rolled = rollUpStatus(prev, result.outcome);

    // last_success_at is null-preserving: healthy → this probe; unhealthy → prior value.
    const lastSuccessAt = result.outcome === 'healthy' ? probedAt : prior.lastSuccessAt;

    await env.deps.store.recordProbe(endpoint, result, probedAt);
    await env.deps.store.setStatus(endpoint, rolled, probedAt, lastSuccessAt);

    let alertSent = false;
    if (rolled.transition !== null) {
      const event: AlertEvent = {
        endpoint,
        transition: rolled.transition,
        detectedAt: probedAt,
        // to_not_live carries the failing reason; to_live (healthy) has reason null → omit.
        ...(result.reason !== null ? { reason: result.reason } : {}),
        context: {
          consecutiveFailures: rolled.consecutiveFailures,
          lastSuccessAt,
          lastProbeAt: probedAt,
        },
      };
      const sent = await env.deps.alerts.send(event);
      alertSent = sent.ok;
      if (!sent.ok) {
        logEvent('parcel_health_alert_failed', {
          endpoint, transition: rolled.transition, error: sent.error,
        });
      }
    }

    logEvent('parcel_health_cycle', {
      endpoint,
      outcome: result.outcome,
      status: rolled.status,
      transition: rolled.transition,
      alert_sent: alertSent,
    });
    return {
      endpoint,
      outcome: result.outcome,
      status: rolled.status,
      transition: rolled.transition,
      alertSent,
    };
  } catch (err) {
    // Isolation: an unexpected throw in one endpoint's pipeline must not abort the other.
    logEvent('parcel_health_cycle_error', { endpoint, message: (err as Error).message });
    return { endpoint, outcome: 'skipped', status: null, transition: null, alertSent: false };
  }
}

export async function handleRequest(req: Request, env: HandlerEnv): Promise<Response> {
  // 1. Auth — constant-time; missing/empty secret or header → 401 (shape mirrors rtc).
  const provided = req.headers.get('x-parcel-health-secret');
  if (!env.secret || !provided || !(await secretsMatch(provided, env.secret))) {
    logEvent('parcel_health_auth_reject', { has_header: provided !== null });
    return json({ error: 'unauthorized' }, 401);
  }

  // 2/3. Run every endpoint concurrently and in isolation; no gate short-circuit (R2).
  const endpoints = await Promise.all(ENDPOINTS.map((e) => runEndpointCycle(e, env)));

  logEvent('parcel_health_complete', { count: endpoints.length });
  return json({ probedAt: env.now().toISOString(), endpoints }, 200);
}
