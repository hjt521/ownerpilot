// lib/sms/twilio.ts
// Lane P3 — Twilio SMS sender (REST via fetch — no dependency), TCPA-gated.
// Source: BROKER STANDING ORDER — Productization 2026-07-03 §2 P3.
//
// Gating, in order: (1) sendGate(purpose, consent) — tenant_reminder is hard-blocked pending the §B.7 reversal;
// (2) quiet-hours 8pm–8am recipient-local (enforced for all purposes EXCEPT user-initiated auth_2fa). Only if
// both pass do we call Twilio. Every attempt emits a structured compliance log (recipient, purpose, template,
// opt-in evidence, status) per the order. NOT a service channel — CCP §1162 excludes SMS as service of notice.

import { quietHoursCheck } from './quietHours';
import { sendGate, type SmsPurpose, type SmsConsentRecord } from './smsConsent';

const TWILIO_BASE = 'https://api.twilio.com/2010-04-01/Accounts';

export interface SendSmsInput {
  to: string;                       // E.164
  body: string;
  purpose: SmsPurpose;
  templateId: string;               // for the compliance log
  consent?: SmsConsentRecord | null;
  now?: Date;                       // injectable
}

export type SendSmsResult =
  | { sent: true; sid: string }
  | { sent: false; reason: 'gate_blocked' | 'quiet_hours' | 'not_configured' | 'twilio_error'; detail?: string };

/** Structured compliance log record (the wiring layer persists it; this is what we emit). */
export interface SmsLogRecord {
  to: string;
  purpose: SmsPurpose;
  template_id: string;
  opt_in_evidence_at: string | null;
  outcome: SendSmsResult['sent'] extends never ? never : string;
  detail?: string;
  at: string;
}

function log(rec: Omit<SmsLogRecord, 'outcome'> & { outcome: string }): void {
  console.info(JSON.stringify({ evt: 'sms.attempt', ...rec }));
}

/**
 * Send an SMS through Twilio, TCPA-gated. Pure gating + a single fetch to Twilio. quiet-hours is skipped only for
 * user-initiated auth_2fa (time-sensitive login codes). Returns a structured result; never throws on a blocked send.
 */
export async function sendSms(input: SendSmsInput): Promise<SendSmsResult> {
  const now = input.now ?? new Date();
  const optInAt = input.consent?.optInEvidenceAt ?? null;
  const baseLog = { to: input.to, purpose: input.purpose, template_id: input.templateId, opt_in_evidence_at: optInAt, at: now.toISOString() };

  // (1) consent/purpose gate
  const gate = sendGate(input.purpose, input.consent ?? null);
  if (!gate.allowed) {
    log({ ...baseLog, outcome: `blocked:${gate.reason}` });
    return { sent: false, reason: 'gate_blocked', detail: gate.reason };
  }

  // (2) quiet-hours (except user-initiated 2FA)
  if (input.purpose !== 'auth_2fa') {
    const qh = quietHoursCheck(input.to, now);
    if (qh.quiet) {
      log({ ...baseLog, outcome: 'blocked:quiet_hours', detail: `localHour=${qh.localHour} tz=${qh.tz} inferred=${qh.inferred}` });
      return { sent: false, reason: 'quiet_hours', detail: `localHour=${qh.localHour}` };
    }
    if (qh.inferred) log({ ...baseLog, outcome: 'note:tz_inferred_default_pacific' });
  }

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!sid || !token || !from) {
    log({ ...baseLog, outcome: 'skipped:not_configured' });
    return { sent: false, reason: 'not_configured' };
  }

  const form = new URLSearchParams({ To: input.to, From: from, Body: input.body });
  const cb = process.env.TWILIO_STATUS_CALLBACK_URL;
  if (cb) form.set('StatusCallback', cb);

  try {
    const res = await fetch(`${TWILIO_BASE}/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => String(res.status));
      log({ ...baseLog, outcome: `error:${res.status}` });
      return { sent: false, reason: 'twilio_error', detail };
    }
    const json = (await res.json().catch(() => ({}))) as { sid?: string };
    log({ ...baseLog, outcome: 'sent', detail: json.sid });
    return { sent: true, sid: json.sid ?? '' };
  } catch (e) {
    log({ ...baseLog, outcome: 'error:network' });
    return { sent: false, reason: 'twilio_error', detail: (e as Error).message };
  }
}
