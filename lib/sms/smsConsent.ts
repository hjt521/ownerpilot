// lib/sms/smsConsent.ts
// Lane P3 — SMS consent + inbound-keyword handling (pure). TCPA discipline.
// Source: BROKER STANDING ORDER — Productization 2026-07-03 §2 P3.
//
// PURPOSES and their consent posture:
//   'broker_alert' — server → the OPERATING BROKER (intake ready / packet ready / review pending). The broker is
//                    the operator; no tenant TCPA consent applies. Allowed.
//   'auth_2fa'     — server → the ACCOUNT USER for a login/2FA code they just requested. Transactional,
//                    user-initiated; TCPA-exempt. Allowed.
//   'tenant_reminder' — server → TENANT courtesy reminder. **HARD-BLOCKED** here: it reverses prior ruling §B.7
//                    ("owner-copy-only, NO server→tenant SMS"; see lib/riskpath/courtesyReminder.ts). The P3
//                    standing order authorizes it, but a prior standing ruling forbids it — that conflict needs
//                    an explicit broker reversal (TCPA rationale) before any server→tenant SMS ships. Fail-closed
//                    until then (see P3 attestation §3 fork).

export type SmsPurpose = 'broker_alert' | 'auth_2fa' | 'tenant_reminder';

/** Purposes that require stored recipient opt-in (double opt-in for marketing/reminder-class). */
export const CONSENT_REQUIRED: Record<SmsPurpose, boolean> = {
  broker_alert: false,   // internal operator
  auth_2fa: false,       // transactional, user-initiated
  tenant_reminder: true, // marketing/reminder-class → explicit prior express consent + double opt-in
};

/** Inbound keyword classification (Twilio Advanced Opt-Out mirrors these; we still classify for our own log). */
export type InboundKeyword = 'stop' | 'start' | 'help' | null;

const STOP_WORDS = new Set(['stop', 'stopall', 'unsubscribe', 'cancel', 'end', 'quit', 'optout', 'opt-out']);
const START_WORDS = new Set(['start', 'yes', 'unstop', 'optin', 'opt-in']);
const HELP_WORDS = new Set(['help', 'info']);

export function parseInboundKeyword(body: string): InboundKeyword {
  const w = (body ?? '').trim().toLowerCase().replace(/[^a-z-]/g, '');
  if (STOP_WORDS.has(w)) return 'stop';
  if (START_WORDS.has(w)) return 'start';
  if (HELP_WORDS.has(w)) return 'help';
  return null;
}

/** Stored consent state for a recipient (persisted by the wiring layer; this module is pure). */
export interface SmsConsentRecord {
  phone: string;
  optedIn: boolean;             // explicit prior express consent captured
  doubleOptInConfirmed: boolean; // reminder-class requires the confirm reply
  optedOut: boolean;            // STOP received — overrides everything
  optInEvidenceAt?: string;     // ISO timestamp of the opt-in evidence
}

export type SendGate =
  | { allowed: true }
  | { allowed: false; reason: 'purpose_blocked_pending_ruling' | 'opted_out' | 'no_consent' | 'double_opt_in_pending' };

/**
 * Decide whether an OUTBOUND message of `purpose` may be sent to a recipient with `consent`. Pure.
 * tenant_reminder is hard-blocked pending the §B.7 reversal ruling regardless of consent (fail-closed).
 */
export function sendGate(purpose: SmsPurpose, consent: SmsConsentRecord | null): SendGate {
  if (purpose === 'tenant_reminder') {
    return { allowed: false, reason: 'purpose_blocked_pending_ruling' };
  }
  if (!CONSENT_REQUIRED[purpose]) return { allowed: true };
  // (Unreachable today — only tenant_reminder requires consent, and it's blocked above. Kept for when the
  //  broker reverses §B.7: opted-out overrides all; then explicit opt-in; then the double-opt-in confirm.)
  if (!consent || consent.optedOut) return { allowed: false, reason: 'opted_out' };
  if (!consent.optedIn) return { allowed: false, reason: 'no_consent' };
  if (!consent.doubleOptInConfirmed) return { allowed: false, reason: 'double_opt_in_pending' };
  return { allowed: true };
}

/** Apply an inbound keyword to a consent record (STOP/START/HELP). Returns the updated record + whether to reply. */
export function applyKeyword(
  consent: SmsConsentRecord,
  keyword: InboundKeyword,
  now: string,
): { consent: SmsConsentRecord; autoReply: 'help' | 'stop_ack' | 'start_ack' | null } {
  switch (keyword) {
    case 'stop':
      return { consent: { ...consent, optedOut: true, optedIn: false, doubleOptInConfirmed: false }, autoReply: 'stop_ack' };
    case 'start':
      return { consent: { ...consent, optedOut: false, optedIn: true, optInEvidenceAt: now }, autoReply: 'start_ack' };
    case 'help':
      return { consent, autoReply: 'help' };
    default:
      return { consent, autoReply: null };
  }
}
