// lib/email/resend.ts
// Transactional email via Resend (G6). Fixed templates only; no PII beyond the recipient email + the magic-link URL.
// Transactional (claim) email is exempt from the marketing/analytics opt-out suppression (CCPA opt-out gates
// sale/share + marketing, not a service email the owner asked for by clicking "send myself this draft").

import { lockedProseEntry } from '@/lib/compliance/lockedProse';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const FROM = 'OwnerPilot <noreply@ownerpilot.ai>';

async function send(to: string, subject: string, text: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.warn('RESEND_API_KEY not set — skipping email'); return; }
  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, text }),
  });
  if (!res.ok) throw new Error(`Resend HTTP ${res.status}`);
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
