// lib/email/resend.ts
// Transactional email via Resend (G6). Fixed templates only; no PII beyond the recipient email + the magic-link URL.
// Transactional (claim) email is exempt from the marketing/analytics opt-out suppression (CCPA opt-out gates
// sale/share + marketing, not a service email the owner asked for by clicking "send myself this draft").

import { lockedProseEntry } from '@/lib/compliance/lockedProse';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const FROM = 'OwnerPilot <noreply@ownerpilot.ai>';

async function send(to: string, subject: string, text: string, replyTo?: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.warn('RESEND_API_KEY not set — skipping email'); return; }
  const payload: Record<string, unknown> = { from: FROM, to, subject, text };
  if (replyTo) payload.reply_to = replyTo;
  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Resend HTTP ${res.status}`);
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
  await send(to, subject, text, PRIVACY_ACK_REPLY_TO);
}

/** Fixed-template claim email — pulled from locked-prose MAGIC_LINK_EMAIL_BODY_V1 (G6). The ONLY interpolation is
 *  {{claimUrl}}; body carries no draft contents, no other PII. (Entry PROVISIONAL pending broker ratification.) */
export async function sendClaimEmail(to: string, claimUrl: string): Promise<void> {
  // LockedKey: MAGIC_LINK_EMAIL_BODY_V1
  const e = lockedProseEntry('MAGIC_LINK_EMAIL_BODY_V1');
  const subject = e.subject ?? 'Your OwnerPilot AI claim link';
  const text = e.value.replace('{{claim_url}}', claimUrl);
  await send(to, subject, text);
}
