/**
 * rtc-refresh Edge Function — request handler (pure, Deno-runtime-free).
 *
 * All Deno-specific I/O (env, serve) is injected, so this module runs under both
 * Node (project test runner) and Deno (production). index.ts binds it to Deno.
 *
 * Execution order (locked by the Step-2 determination, 2026-06-23):
 *   1. Auth: x-rtc-refresh-secret header === injected secret, else 401.
 *   2. Leg: body.leg ∈ {'cron','deploy'}, else 400 (fail loud).
 *   3. Monday-in-LA gate (cron leg only): not Monday in America/Los_Angeles → 200 skipped.
 *   4. Hoisted production gate: !isLaProductionUnblocked() → 200 skipped (no core edit).
 *   5. runRefresh(deps); real errors → 500.
 */
import { isLaProductionUnblocked } from './_core/laRtcRules.ts';
import { runRefresh, type LanguageFetcher } from './_core/rtcRefreshJob.ts';
import type { AlertSink, RefreshStateStore } from './_core/rtcRefreshTypes.ts';

export type RefreshLeg = 'cron' | 'deploy';

/** Everything the handler needs, injected — keeps it Deno-free and testable. */
export interface HandlerEnv {
  /** The shared invocation secret (from RTC_REFRESH_SECRET). */
  secret: string | undefined;
  /** Clock, injectable so the Monday-LA gate is testable. */
  now: () => Date;
  /** Gate check, injectable for tests; defaults to the real _core gate. */
  gateIsOpen?: () => boolean;
  deps: { fetcher: LanguageFetcher; store: RefreshStateStore; alerts: AlertSink };
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

/** True iff `now` falls on Monday in America/Los_Angeles. */
export function isMondayInLosAngeles(now: Date): boolean {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'short',
  }).format(now);
  return weekday === 'Mon';
}

export async function handleRequest(req: Request, env: HandlerEnv): Promise<Response> {
  // 1. Auth — constant-ish check; missing/wrong secret → 401.
  const provided = req.headers.get('x-rtc-refresh-secret');
  if (!env.secret || !provided || provided !== env.secret) {
    logEvent('rtc_refresh_auth_reject', { has_header: provided !== null });
    return json({ error: 'unauthorized' }, 401);
  }

  // 2. Leg — explicit cron|deploy, else 400 (fail loud).
  let leg: unknown;
  try {
    const body = (await req.json()) as { leg?: unknown };
    leg = body?.leg;
  } catch {
    leg = undefined;
  }
  if (leg !== 'cron' && leg !== 'deploy') {
    logEvent('rtc_refresh_bad_leg', { leg: typeof leg === 'string' ? leg : null });
    return json({ error: "missing or unrecognized 'leg'; expected 'cron' or 'deploy'" }, 400);
  }
  const refreshLeg = leg as RefreshLeg;

  // 3. Monday-in-LA gate — cron leg only; deploy leg always proceeds.
  if (refreshLeg === 'cron' && !isMondayInLosAngeles(env.now())) {
    logEvent('rtc_refresh_skipped', { reason: 'not-monday-LA', leg: refreshLeg });
    return json({ skipped: 'not-monday-LA' }, 200);
  }

  // 4. Hoisted production gate — same gate runRefresh checks; no core edit, no string-match.
  const gateOpen = env.gateIsOpen ?? isLaProductionUnblocked;
  if (!gateOpen()) {
    logEvent('rtc_refresh_skipped', { reason: 'la-gate-closed', leg: refreshLeg });
    return json({ skipped: 'la-gate-closed' }, 200);
  }

  // 5. Run — real errors surface as 500.
  try {
    const result = await runRefresh({ ...env.deps, gateIsOpen: gateOpen });
    logEvent('rtc_refresh_complete', { leg: refreshLeg, allFailed: result.allFailed });
    return json(result, 200);
  } catch (err) {
    logEvent('rtc_refresh_error', { leg: refreshLeg, message: (err as Error).message });
    return json({ error: 'internal' }, 500);
  }
}
