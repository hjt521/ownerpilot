/**
 * city-zip-refresh Edge Function — request handler (pure, Deno-runtime-free).
 *
 * Daily poll of the City-of-LA ZIP snapshot currency trigger (A-3 §4.1). All Deno-specific
 * I/O (env, serve, fetch, Supabase client, Resend) is injected, so this module runs under
 * both Node (project test runner) and Deno (production). index.ts binds it to Deno.
 *
 * What it does each cycle:
 *   1. Auth: `x-city-zip-refresh-secret` header, constant-time-compared to the injected
 *      secret, else 401. (Cron contract: pg_net sends this custom header — NOT Authorization.)
 *   2. Fetch C-8 editingInfo.dataLastEditDate (injected fetcher; index.ts does the §3.2-c
 *      retry-once). Per the §7.3-c currency-trigger field correction (broker 2026-06-27),
 *      the polled field is dataLastEditDate — fires only on real geometry edits.
 *   3. Load the singleton state (baseline_data_last_edit, broker_attested_at, fetch-fail count).
 *   4. evaluateRefresh(state, fetch, now) → decision:
 *        - no_diff         live <= baseline → §2.3 NO-DIFF auto-attest (broker_attestation_routine)
 *        - change_detected live  > baseline → alert: boundary moved, recompute + A-2 review due
 *        - fetch_fail      fetch error → increment streak; >=2 consecutive → persistent alert (§3.2-c)
 *        - dormancy_alert  no change AND >18mo since max(baseline, attested) (§3.1-b)
 *      The poll NEVER recomputes the snapshot (geospatial Python rail, §3.3); the prior
 *      snapshot keeps serving throughout (§3.2-a operational continuity).
 *   5. Record the run + update state; send the alert if the decision warrants; 200 with summary.
 *
 * Auth uses the same constant-time SHA-256-both-sides compare as parcel-health/handler.ts
 * (web-standard crypto.subtle; identical under Node and Deno).
 */

export type RefreshOutcome =
  | 'no_diff'
  | 'change_detected'
  | 'fetch_fail'
  | 'dormancy_alert'
  | 'anomaly';

/** Singleton state row (city_zip_refresh_state). */
export interface RefreshState {
  snapshotSha256: string;
  baselineDataLastEdit: string;       // 'YYYY-MM-DD'
  brokerAttestedAt: string;           // 'YYYY-MM-DD'
  consecutiveFetchFailures: number;
}

/** Result of fetching C-8 metadata (injected). */
export type C8FetchResult =
  | { ok: true; dataLastEditDateMs: number }
  | { ok: false; error: string };

/** Pure decision produced by evaluateRefresh. */
export interface RefreshDecision {
  outcome: RefreshOutcome;
  observedDataLastEdit: string | null; // 'YYYY-MM-DD' or null on fetch fail
  baselineDataLastEdit: string;
  alert: { subject: string; body: string } | null;
  nextConsecutiveFetchFailures: number;
  dormancy: boolean;
}

/** Alert sink (injected; index.ts supplies a Resend-backed sender). */
export interface AlertDestination {
  send(alert: { subject: string; body: string }): Promise<void>;
}

/** State store (injected; index.ts supplies a Supabase-backed store). */
export interface RefreshStore {
  loadState(): Promise<RefreshState | null>;
  recordRun(run: {
    observedDataLastEdit: string | null;
    baselineDataLastEdit: string;
    outcome: RefreshOutcome;
    alertSent: boolean;
    detail: Record<string, unknown>;
  }): Promise<void>;
  updateState(update: {
    consecutiveFetchFailures: number;
    lastObservedDataLastEdit: string | null;
    lastOutcome: RefreshOutcome;
  }): Promise<void>;
}

export interface HandlerEnv {
  secret: string | undefined;
  now: () => Date;
  deps: {
    fetchC8: () => Promise<C8FetchResult>;
    store: RefreshStore;
    alerts: AlertDestination;
  };
}

/** Epoch-ms → 'YYYY-MM-DD' in UTC (the CRS-agnostic comparison key for edit dates). */
export function toUtcDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** True if `anchor` (YYYY-MM-DD) is more than 18 months before `now` (§3.1-b). */
export function isDormant(anchorYmd: string, now: Date): boolean {
  const cutoff = new Date(`${anchorYmd}T00:00:00Z`);
  cutoff.setUTCMonth(cutoff.getUTCMonth() + 18);
  return now.getTime() > cutoff.getTime();
}

/**
 * Pure currency evaluation (§2.2-d / §3.1-b / §3.2). No I/O. ISO YYYY-MM-DD strings
 * compare correctly lexicographically, so date math stays exact and timezone-free.
 */
export function evaluateRefresh(
  state: RefreshState,
  fetch: C8FetchResult,
  now: Date,
): RefreshDecision {
  const baseline = state.baselineDataLastEdit;

  // --- §3.2-c: fetch failure → increment streak; escalate at 2 consecutive. ---
  if (!fetch.ok) {
    const streak = state.consecutiveFetchFailures + 1;
    const persistent = streak >= 2;
    return {
      outcome: 'fetch_fail',
      observedDataLastEdit: null,
      baselineDataLastEdit: baseline,
      alert: persistent
        ? {
            subject: '[OwnerPilot] C-8 boundary fetch FAILED (persistent) — city-zip-refresh',
            body:
              `The daily City-of-LA ZIP refresh poll failed to reach C-8 for ${streak} ` +
              `consecutive cycles (${fetch.error}). Investigate the FeatureServer endpoint ` +
              `(moved/renamed/deactivated?) per A-3 §5.3-c. The prior snapshot keeps serving.`,
          }
        : null,
      nextConsecutiveFetchFailures: streak,
      dormancy: false,
    };
  }

  const observed = toUtcDate(fetch.dataLastEditDateMs);

  // --- §2.2-d: boundary geometry moved → recompute due (operator rail). ---
  if (observed > baseline) {
    return {
      outcome: 'change_detected',
      observedDataLastEdit: observed,
      baselineDataLastEdit: baseline,
      alert: {
        subject: '[OwnerPilot] C-8 boundary changed — snapshot recompute due (city-zip-refresh)',
        body:
          `C-8 editingInfo.dataLastEditDate advanced to ${observed} (baseline ${baseline}). ` +
          `Run the operator-supervised construction (scripts/build_la_authoritative_zips.py) ` +
          `to produce a refreshed snapshot, then process the A-2 diff per A-3 §2.2-d/§4. ` +
          `The prior snapshot (${state.snapshotSha256.slice(0, 12)}…) keeps serving until the ` +
          `refresh is attested (§3.2-a).`,
      },
      nextConsecutiveFetchFailures: 0,
      dormancy: false,
    };
  }

  // --- anomaly: observed earlier than baseline (re-publish/rollback) → surface. ---
  if (observed < baseline) {
    return {
      outcome: 'anomaly',
      observedDataLastEdit: observed,
      baselineDataLastEdit: baseline,
      alert: {
        subject: '[OwnerPilot] C-8 dataLastEditDate REGRESSED — city-zip-refresh',
        body:
          `Observed C-8 dataLastEditDate ${observed} is EARLIER than the baseline ${baseline}. ` +
          `This suggests a republish, rollback, or wrong endpoint. Investigate before trusting ` +
          `the next refresh (A-3 §5.3).`,
      },
      nextConsecutiveFetchFailures: 0,
      dormancy: false,
    };
  }

  // --- no change (observed == baseline). §3.1-b dormancy check on the anchor. ---
  const anchor = baseline > state.brokerAttestedAt ? baseline : state.brokerAttestedAt;
  const dormant = isDormant(anchor, now);
  if (dormant) {
    return {
      outcome: 'dormancy_alert',
      observedDataLastEdit: observed,
      baselineDataLastEdit: baseline,
      alert: {
        subject: '[OwnerPilot] C-8 publisher dormant >18 months — verify (city-zip-refresh)',
        body:
          `No advance in C-8 dataLastEditDate or broker attestation for >18 months ` +
          `(anchor ${anchor}). Per A-3 §3.1-b, verify the BOE/GIS Mapping Division layer is ` +
          `still maintained (GeoHub item live, publisher active, no deprecation notice). ` +
          `Dismiss with a one-line audit note if stable, or open a re-source fork (§3.2-b).`,
      },
      nextConsecutiveFetchFailures: 0,
      dormancy: true,
    };
  }

  // §2.3 NO-DIFF: snapshot is current → auto-attest (broker_attestation_routine).
  return {
    outcome: 'no_diff',
    observedDataLastEdit: observed,
    baselineDataLastEdit: baseline,
    alert: null,
    nextConsecutiveFetchFailures: 0,
    dormancy: false,
  };
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function logEvent(event: string, fields: Record<string, unknown>): void {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ event, ...fields }));
}

/** Constant-time secret compare (SHA-256 both sides, XOR-accumulate; Node/Deno identical). */
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

/** Full request handler — gate-free (it feeds currency state; it does not read the prod gate). */
export async function handleRequest(req: Request, env: HandlerEnv): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (!env.secret) return json({ error: 'server_misconfigured' }, 500);

  const provided = req.headers.get('x-city-zip-refresh-secret') ?? '';
  if (!(await secretsMatch(provided, env.secret))) {
    return json({ error: 'unauthorized' }, 401);
  }

  const state = await env.deps.store.loadState();
  if (!state) {
    logEvent('city_zip_refresh_no_state', {});
    return json({ error: 'no_state_row' }, 500);
  }

  const fetched = await env.deps.fetchC8();
  const decision = evaluateRefresh(state, fetched, env.now());

  let alertSent = false;
  if (decision.alert) {
    try {
      await env.deps.alerts.send(decision.alert);
      alertSent = true;
    } catch (e) {
      logEvent('city_zip_refresh_alert_failed', { error: String(e) });
    }
  }

  const detail: Record<string, unknown> = {
    snapshot_sha256: state.snapshotSha256,
    consecutive_fetch_failures: decision.nextConsecutiveFetchFailures,
    dormancy: decision.dormancy,
  };
  await env.deps.store.recordRun({
    observedDataLastEdit: decision.observedDataLastEdit,
    baselineDataLastEdit: decision.baselineDataLastEdit,
    outcome: decision.outcome,
    alertSent,
    detail,
  });
  await env.deps.store.updateState({
    consecutiveFetchFailures: decision.nextConsecutiveFetchFailures,
    lastObservedDataLastEdit: decision.observedDataLastEdit,
    lastOutcome: decision.outcome,
  });

  // §2.3 NO-DIFF auto-attestation event — the common daily case (boundary rarely moves).
  if (decision.outcome === 'no_diff') {
    logEvent('broker_attestation_routine', {
      snapshot_sha256: state.snapshotSha256,
      observed_data_last_edit: decision.observedDataLastEdit,
      baseline_data_last_edit: decision.baselineDataLastEdit,
    });
  }

  logEvent('city_zip_refresh_cycle', {
    outcome: decision.outcome,
    observed: decision.observedDataLastEdit,
    baseline: decision.baselineDataLastEdit,
    alert_sent: alertSent,
  });

  return json(
    {
      outcome: decision.outcome,
      observedDataLastEdit: decision.observedDataLastEdit,
      baselineDataLastEdit: decision.baselineDataLastEdit,
      alertSent,
      dormancy: decision.dormancy,
    },
    200,
  );
}
