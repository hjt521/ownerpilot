// lib/email/resend.ts
// Transactional email via Resend (G6). Fixed templates only; no PII beyond the recipient email + the magic-link URL.
// Transactional (claim) email is exempt from the marketing/analytics opt-out suppression (CCPA opt-out gates
// sale/share + marketing, not a service email the owner asked for by clicking "send myself this draft").

import { lockedProseEntry } from '@/lib/compliance/lockedProse';
import { captureException } from '@/lib/monitoring';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const FROM = 'OwnerPilot <noreply@ownerpilot.ai>';

/** Transactional template families — the C1-A email-send monitor tags every send by this so the Fork-G watch
 *  can track "sends observed + Resend failure rate = 0" per family. */
export type EmailTemplate = 'claim' | 'privacy-ack';

function emailEnv(): string {
  return process.env.VERCEL_ENV ?? 'development';
}

async function send(
  to: string,
  subject: string,
  text: string,
  template: EmailTemplate,
  replyTo?: string,
): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.warn('RESEND_API_KEY not set — skipping email'); return; }
  const payload: Record<string, unknown> = { from: FROM, to, subject, text };
  if (replyTo) payload.reply_to = replyTo;

  let res: Response;
  try {
    res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (networkErr) {
    // C1-A §5.2 email-send monitor: capture transport failures too. Tags/fingerprint group by family + mode.
    await captureException(networkErr, {
      tags: { service: 'resend', template, env: emailEnv() },
      fingerprint: ['resend', template, 'network'],
    });
    throw networkErr;
  }

  if (!res.ok) {
    // Extract the Resend error code + message (message A15-scrubbed in `extra` before send; fingerprint groups by
    // code so repeated failures of the same mode collapse into one Sentry issue).
    const body = await res.text().catch(() => '');
    let code = String(res.status);
    let message = body;
    try {
      const j = JSON.parse(body) as { name?: string; statusCode?: number; message?: string };
      code = j.name ?? (j.statusCode != null ? String(j.statusCode) : code);
      message = j.message ?? message;
    } catch { /* non-JSON body — keep raw text */ }
    const err = new Error(`Resend HTTP ${res.status} (${code})`);
    await captureException(err, {
      tags: { service: 'resend', template, env: emailEnv() },
      extra: { status: res.status, code, message },
      fingerprint: ['resend', template, code],
    });
    throw err;
  }

  // Soak signal: "sends observed" per template family (feeds the Fork-G watch: sends > 0 + failure rate = 0).
  console.info(JSON.stringify({ evt: 'email.sent', template, env: emailEnv() }));
}

/** Reply-To for privacy acks (D1). Closes the loop to the monitored mailbox without wiring privacy@ as a send path. */
export const PRIVACY_ACK_REPLY_TO = 'privacy@ownerpilot.ai';

/** Format an ISO timestamp as "Month D, YYYY" in America/Los_Angeles (matches the app's date rendering). */
function formatLaDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso));
}

/** CCPA receipt-acknowledgment email (D1 §3.1). Body is the locked PRIVACY_ACK_CCPA_TIMELINE_EN with [DATE]
 *  interpolated from the request's submitted_at; Reply-To routes replies to the privacy mailbox. No other PII. */
export async function sendPrivacyAckEmail(to: string, submittedAtISO: string): Promise<void> {
  // LockedKey: PRIVACY_ACK_CCPA_TIMELINE_EN
  const e = lockedProseEntry('PRIVACY_ACK_CCPA_TIMELINE_EN');
  const text = e.value.replace('[DATE]', formatLaDate(submittedAtISO));
  const subject = e.subject ?? 'We received your privacy request';
  await send(to, subject, text, 'privacy-ack', PRIVACY_ACK_REPLY_TO);
}

/** Fixed-template claim email — pulled from locked-prose MAGIC_LINK_EMAIL_BODY_V1 (G6). The ONLY interpolation is
 *  {{claimUrl}}; body carries no draft contents, no other PII. (Entry PROVISIONAL pending broker ratification.) */
export async function sendClaimEmail(to: string, claimUrl: string): Promise<void> {
  // LockedKey: MAGIC_LINK_EMAIL_BODY_V1
  const e = lockedProseEntry('MAGIC_LINK_EMAIL_BODY_V1');
  const subject = e.subject ?? 'Your OwnerPilot AI claim link';
  const text = e.value.replace('{{claim_url}}', claimUrl);
  await send(to, subject, text, 'claim');
}
