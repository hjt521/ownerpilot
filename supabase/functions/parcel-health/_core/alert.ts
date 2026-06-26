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

// §3.2 env split: PARCEL_HEALTH_ALERT_EMAIL (recipient, not secret),
// RESEND_API_KEY (secret, credential rail). PARCEL_HEALTH_ALERT_FROM is the verified
// Resend sender — NOT named in the §3.2 split; see the flag in the PR/handoff.
const RESEND_ENDPOINT = 'https://api.resend.com/emails';

// §3.2 / §3.3 — Resend Tier-1 email destination.
export class EmailAlertDestination implements AlertDestination {
  readonly kind = 'email' as const;

  async send(
    event: AlertEvent
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const rendered = renderAlert(event);
    if ('error' in rendered) {
      return { ok: false, error: rendered.error };
    }

    const apiKey = process.env.RESEND_API_KEY;
    const to = process.env.PARCEL_HEALTH_ALERT_EMAIL;
    const from = process.env.PARCEL_HEALTH_ALERT_FROM;

    if (!apiKey) return { ok: false, error: 'RESEND_API_KEY is not set' };
    if (!to) return { ok: false, error: 'PARCEL_HEALTH_ALERT_EMAIL is not set' };
    if (!from) return { ok: false, error: 'PARCEL_HEALTH_ALERT_FROM is not set' };

    try {
      const res = await fetch(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to,
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
