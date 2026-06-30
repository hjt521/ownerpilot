// lib/riskpath/courtesyReminder.ts
// AI-first /riskpath/courtesy-reminder. §B.7: owner-copy-only, NO server→tenant SMS.
// Copy RATIFIED in deploy_readiness_capstone_acceptance_and_external_inputs_broker_ruling_2026-06-29.md §2 —
// 3 tones + always-on disclaimer, all locked-prose (manifest). Engineering wires; no authored copy here.

import { lockedProse } from '@/lib/compliance/lockedProse';

// Locked-prose keys resolved here (tone bodies resolved dynamically via TONE_MANIFEST_ID).
// LockedKey: COURTESY_REMINDER_FRIENDLY_V1
// LockedKey: COURTESY_REMINDER_FIRM_V1
// LockedKey: COURTESY_REMINDER_FORMAL_V1
// LockedKey: COURTESY_REMINDER_DISCLAIMER_V1

/** Locked tones (028_courtesy_reminders.tone CHECK = these three). */
export type ReminderTone = 'friendly' | 'firm' | 'formal';
export const REMINDER_TONES: ReminderTone[] = ['friendly', 'firm', 'formal'];

const TONE_MANIFEST_ID: Record<ReminderTone, string> = {
  friendly: 'COURTESY_REMINDER_FRIENDLY_V1',
  firm: 'COURTESY_REMINDER_FIRM_V1',
  formal: 'COURTESY_REMINDER_FORMAL_V1',
};

/** Locked per-tone template (pre-substitution). */
export function toneTemplate(tone: ReminderTone): string {
  return lockedProse(TONE_MANIFEST_ID[tone]);
}

/** Always-on §2.5 courtesy disclaimer (locked). Appended verbatim below every rendered reminder. */
export const COURTESY_REMINDER_DISCLAIMER = lockedProse('COURTESY_REMINDER_DISCLAIMER_V1');

/** The ONLY permitted slots (ruling §2 field-slot syntax). */
export type ReminderSlots = {
  tenant_first_name: string; amount_due: string; property_address: string;
  due_date: string; current_date: string; owner_first_name: string;
};
const SLOT_KEYS: (keyof ReminderSlots)[] = ['tenant_first_name', 'amount_due', 'property_address', 'due_date', 'current_date', 'owner_first_name'];

/** Render a reminder: locked template with the 6 named slots substituted, then the locked disclaimer appended.
 *  No free-text is interleaved into the locked prose (owner's optional postscript is added below, client-side). */
export function renderReminder(tone: ReminderTone, slots: ReminderSlots): string {
  let body = toneTemplate(tone);
  for (const k of SLOT_KEYS) body = body.split(`{{${k}}}`).join(slots[k]);
  return `${body}\n\n${COURTESY_REMINDER_DISCLAIMER}`;
}

/** Build an `sms:` deep link for the owner's own SMS app (owner-initiated; never server-sent). */
export function buildSmsUrl(body: string, phone?: string): string {
  const num = (phone ?? '').replace(/[^\d+]/g, '');
  return `sms:${num}?&body=${encodeURIComponent(body)}`;
}

export type ReminderChannel = 'owner_copy' | 'sms_app_handoff';
