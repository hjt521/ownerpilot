// ============================================================================
// GENERATED FILE — DO NOT EDIT
// Source: lib/jurisdiction/parcelHealth/alert.ts
// Regenerate with: npm run build:parcel-health-core
// CI guard: git diff --exit-code supabase/functions/parcel-health/_core/
// Governing ruling: slice2_architecture_and_alert_sink_broker_ruling_2026-06-25.md
// ============================================================================
// parcel-health alert sink.
// Source: slice2_architecture_and_alert_sink_broker_ruling_2026-06-25.md §3.1 / §3.2 / §3.3 / §3.4 / §3.5
//
// §3.1 AlertDestination interface (locked) + EmailAlertDestination (Resend, Tier-1).
// The §3.4 / §3.5 email subjects and bodies are broker-authored locked prose,
// transcribed verbatim inside LOCKED-BEGIN / LOCKED-END markers. The `<...>` tokens
// in the ruling are authored fill-in slots, filled here from AlertEvent fields; the
// literal prose around the slots is not edited. Per §3.3, send() never throws and never
// retries — it returns a result union; the orchestrator decides not to block/re-fire.

import type { AlertEvent, ProbeReason } from './types.ts';

// §3.1 — AlertDestination interface (locked).
export interface AlertDestination {
  readonly kind: 'email' | 'webhook';
  send(event: AlertEvent): Promise<{ ok: true } | { ok: false; error: string }>;
}

// Rendered email payload (subject + plain-text body) for one transition.
export interface RenderedAlert {
  subject: string;
  body: string;
}

// §3.5 `<ISO-8601 UTC | never>`: render the literal "never" when there is no prior success.
function renderLastSuccess(lastSuccessAt: string | null): string {
  return lastSuccessAt === null ? 'never' : lastSuccessAt;
}

// §3.4 — to_live email content (locked prose). Pure builder; no I/O.
export function renderToLiveAlert(event: AlertEvent): RenderedAlert {
  const endpoint = event.endpoint;
  const detectedAt = event.detectedAt;
  const lastSuccess = renderLastSuccess(event.context.lastSuccessAt);
  const consecutiveFailures = event.context.consecutiveFailures;
  // LOCKED-BEGIN slice2_architecture_and_alert_sink_broker_ruling_2026-06-25.md §3.4
  const subject = `[OwnerPilot] Parcel health: \`${endpoint}\` recovered — live`;
  const body = [
    `The \`${endpoint}\` parcel endpoint has recovered.`,
    ``,
    `- Transition: not_live → live`,
    `- Detected at: \`${detectedAt}\``,
    `- Last successful probe: \`${lastSuccess}\``,
    `- Consecutive failures before recovery: \`${consecutiveFailures}\``,
    ``,
    `The parcel-health gate has flipped this endpoint to live. If both \`county\` and \`zimas\` are live, the parcel-jurisdiction feature flag is live overall.`,
    ``,
    `— OwnerPilot parcel-health watch`,
  ].join('\n');
  // LOCKED-END §3.4
  return { subject, body };
}

// §3.5 — to_not_live email content (locked prose). Pure builder; no I/O.
// Requires the reason field (present on to_not_live per AlertEvent; narrowed by the caller).
export function renderToNotLiveAlert(
  event: AlertEvent & { reason: ProbeReason }
): RenderedAlert {
  const endpoint = event.endpoint;
  const reason = event.reason;
  const detectedAt = event.detectedAt;
  const lastSuccess = renderLastSuccess(event.context.lastSuccessAt);
  const lastProbeAt = event.context.lastProbeAt;
  // LOCKED-BEGIN slice2_architecture_and_alert_sink_broker_ruling_2026-06-25.md §3.5
  const subject = `[OwnerPilot] Parcel health: \`${endpoint}\` not live — \`${reason}\``;
  const body = [
    `The \`${endpoint}\` parcel endpoint has flipped to not_live after 2 consecutive failed probes.`,
    ``,
    `- Transition: live → not_live`,
    `- Reason on the second failure: \`${reason}\``,
    `- Detected at: \`${detectedAt}\``,
    `- Last successful probe: \`${lastSuccess}\``,
    `- Last probe at: \`${lastProbeAt}\``,
    ``,
    `The parcel-health gate has flipped this endpoint to not_live. The parcel-jurisdiction feature flag is now not_live overall (both endpoints must be live for flag-live). New produces will block on the gate-read; in-flight produces complete per the fail-closed posture in §4 of the live determination.`,
    ``,
    `— OwnerPilot parcel-health watch`,
  ].join('\n');
  // LOCKED-END §3.5
  return { subject, body };
}

// Dispatch an AlertEvent to the right locked-prose builder.
function renderAlert(event: AlertEvent): RenderedAlert | { error: string } {
  if (event.transition === 'to_live') {
    return renderToLiveAlert(event);
  }
  if (!event.reason) {
    return { error: 'to_not_live AlertEvent missing required reason field' };
  }
  return renderToNotLiveAlert({ ...event, reason: event.reason });
}

// §3.2 — config injected at construction (Fork ①b, broker-ruled 2026-06-26).
// The Edge binding (supabase/functions/parcel-health/index.ts) reads RESEND_API_KEY,
// PARCEL_HEALTH_ALERT_FROM, and PARCEL_HEALTH_ALERT_EMAIL from Deno.env and injects them
// here; this class NEVER reads env. Inject-don't-read keeps env access in exactly one
// place (the binding layer) and avoids the Deno node-compat `process.env` path, whose
// failure mode is silent — the cron runs green, the function returns 200, and the alert
// just never sends. Validation is at construction, not send-time: a misconfigured env
// fails the function at BOOT (loud), never silently at the first real outage.
// §3.2 env roles: PARCEL_HEALTH_ALERT_EMAIL (recipient `to`, not secret),
// PARCEL_HEALTH_ALERT_FROM (verified Resend sender), RESEND_API_KEY (secret, credential rail).
export interface EmailAlertConfig {
  apiKey: string;
  from: string;
  to: string;
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

// §3.2 / §3.3 — Resend Tier-1 email destination.
export class EmailAlertDestination implements AlertDestination {
  readonly kind = 'email' as const;
  private readonly config: EmailAlertConfig;

  constructor(config: EmailAlertConfig) {
    // Boot-time validation: throw naming the env var, so a misconfigured Edge function
    // fails at construction (boot) rather than returning ok:false silently at first send.
    if (!config.apiKey) {
      throw new Error('EmailAlertDestination: missing apiKey (set RESEND_API_KEY)');
    }
    if (!config.from) {
      throw new Error('EmailAlertDestination: missing from (set PARCEL_HEALTH_ALERT_FROM)');
    }
    if (!config.to) {
      throw new Error('EmailAlertDestination: missing to (set PARCEL_HEALTH_ALERT_EMAIL)');
    }
    this.config = config;
  }

  async send(
    event: AlertEvent
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const rendered = renderAlert(event);
    if ('error' in rendered) {
      return { ok: false, error: rendered.error };
    }

    try {
      const res = await fetch(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.config.from,
          to: this.config.to,
          subject: rendered.subject,
          text: rendered.body,
        }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        return {
          ok: false,
          error: `Resend responded ${res.status}: ${detail.slice(0, 200)}`,
        };
      }
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: `Resend request failed: ${(err as Error).message}`,
      };
    }
  }
}
