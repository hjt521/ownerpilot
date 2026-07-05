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
export type EmailTemplate =
  | 'claim'
  | 'privacy-ack'
  // P1 productization (broker standing order 2026-07-03 §2): three new transactional families.
  | 'packet-delivery'      // combined packet PDF, copy-only (NOT service — CCP §1162 disclaimer baked into copy)
  | 'broker-intake-digest' // broker notification: N intakes awaiting review (no PII in body — count + link only)
  | 'lahd-confirmation'    // forward a LAHD filing confirmation reference to the owner
  | 'admin-alert';         // internal ops alert to ADMIN_EMAILS (cron failure modes) — never owner-facing

/** A Resend attachment: base64 content + filename. Used for the packet-delivery combined PDF. */
export interface EmailAttachment {
  filename: string;
  content: string; // base64-encoded file bytes
}

function emailEnv(): string {
  return process.env.VERCEL_ENV ?? 'development';
}

async function send(
  to: string,
  subject: string,
  text: string,
  template: EmailTemplate,
  replyTo?: string,
  attachments?: EmailAttachment[],
): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.warn('RESEND_API_KEY not set — skipping email'); return; }
  const payload: Record<string, unknown> = { from: FROM, to, subject, text };
  if (replyTo) payload.reply_to = replyTo;
  if (attachments && attachments.length) payload.attachments = attachments;

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

// --- P1 productization emails (broker standing order 2026-07-03 §2) --------------------------------------------
// All bodies are Shape-B locked prose, PROVISIONAL pending broker ratification (07-10 countersign). No PII beyond
// the recipient except where the recipient legitimately needs it (LAHD confirmation ref, which identifies the
// filing, not a person). G5 footer baked into each body.

/**
 * Deliver the combined packet PDF as a records/review COPY. The locked body carries the mandatory CCP §1162
 * non-service disclaimer — emailing the PDF is NOT legal service and starts no deadline (§1162 surface handled in
 * copy, flagged for broker ratification). Recipient-neutral (owner / counsel / tenant copy).
 */
export async function sendPacketDeliveryEmail(to: string, packet: EmailAttachment): Promise<void> {
  // LockedKey: PACKET_DELIVERY_EMAIL_BODY_V1
  const e = lockedProseEntry('PACKET_DELIVERY_EMAIL_BODY_V1');
  const subject = e.subject ?? 'Your OwnerPilot AI notice packet (copy)';
  // Item 6 Tightening 1: the ruled verbatim CCP §1162 non-service disclaimer on every delivery (locked-prose).
  // LockedKey: PACKET_DELIVERY_NOT_SERVICE_1162_DISCLAIMER
  const disclaimer = lockedProseEntry('PACKET_DELIVERY_NOT_SERVICE_1162_DISCLAIMER').value;
  await send(to, subject, `${e.value}\n\n${disclaimer}`, 'packet-delivery', undefined, [packet]);
}

/**
 * Notify the broker that intakes are awaiting review. No case PII in the body — just a count + the review link
 * (the broker clicks through to the auth-gated checklist to see details).
 */
export async function sendBrokerIntakeDigestEmail(to: string, count: number, reviewUrl: string): Promise<void> {
  // LockedKey: BROKER_INTAKE_DIGEST_EMAIL_BODY_V1
  const e = lockedProseEntry('BROKER_INTAKE_DIGEST_EMAIL_BODY_V1');
  const subject = e.subject ?? 'OwnerPilot AI — intakes awaiting review';
  const text = e.value.replace('{{count}}', String(count)).replace('{{review_url}}', reviewUrl);
  await send(to, subject, text, 'broker-intake-digest');
}

/**
 * Forward a LAHD filing confirmation reference to the owner for their records. Minimal identifiers only
 * (confirmation ref + filed date); no address or personal data in the body.
 */
export async function sendLahdConfirmationEmail(to: string, confirmationRef: string, filedDateISO: string): Promise<void> {
  // LockedKey: LAHD_CONFIRMATION_FORWARD_EMAIL_BODY_V1
  const e = lockedProseEntry('LAHD_CONFIRMATION_FORWARD_EMAIL_BODY_V1');
  const subject = e.subject ?? 'Your LAHD filing confirmation — OwnerPilot AI';
  const text = e.value
    .replace('{{confirmation_ref}}', confirmationRef)
    .replace('{{filed_date}}', formatLaDate(filedDateISO));
  // B-2 safeguard 2: CAN-SPAM preference/unsubscribe footer, appended outside the locked body (same pattern as
  // the packet-delivery §1162 disclaimer). Links to the granular per-type preference page.
  await send(to, subject, `${text}\n\n${EMAIL_PREFERENCE_FOOTER}`, 'lahd-confirmation');
}

/** Functional CAN-SPAM footer for owner-facing transactional email (B-2). Not locked prose — operational. */
export const EMAIL_PREFERENCE_FOOTER =
  'To stop receiving filing-record confirmation emails, update your preferences at https://ownerpilot.ai/preferences/email';

/**
 * Internal ops alert to every address on ADMIN_EMAILS. NOT owner-facing and NOT locked-prose — this is an
 * engineering/broker failure-mode channel (e.g. the broker-intake-digest cron's ruled "query/send failed twice →
 * alert ADMIN_EMAILS, not review@" path per p1_email_trigger_dependencies_broker_ruling_2026-07-05 A3). Free-text
 * subject/body by design; no PII beyond an internal error detail the caller supplies. No-op if ADMIN_EMAILS unset.
 */
export async function sendAdminAlertEmail(subject: string, text: string): Promise<void> {
  const admins = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!admins.length) { console.warn('ADMIN_EMAILS not set — skipping admin alert'); return; }
  for (const to of admins) {
    await send(to, subject, text, 'admin-alert');
  }
}
