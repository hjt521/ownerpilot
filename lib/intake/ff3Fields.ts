// lib/intake/ff3Fields.ts
// Lane FF-3 (gate3_wave3_wiring_and_ff3_omnibus_broker_ruling_2026-07-03) — the five structured intake fields the
// wave-3 gates read, as an SSOT: enums (Amendment B), the numeric fields, the conditional amount-owed rule
// (Amendment A/B), and the recapture confirmation-card copy (Amendment C). Pure — chat capture + persistence
// mirror the service_date pattern (wiring step).

import { z } from 'zod';
import { lockedProseEntry } from '@/lib/compliance/lockedProse';

// --- Enums (locked at intake, not free-text) -------------------------------------------------------------------

/** just_cause — 13 admissible values (LAHD portal Section E dropdown at the Clifton filing). */
export const JUST_CAUSE_VALUES = [
  'nonpayment', 'breach_of_lease', 'nuisance', 'illegal_use', 'refusal_of_entry', 'unapproved_subtenant',
  'end_of_term_sro_or_covered', 'owner_move_in', 'withdrawal_ellis', 'demolition', 'capital_improvement',
  'government_order', 'other',
] as const;
export type JustCause = (typeof JUST_CAUSE_VALUES)[number];

/** notice_type — 6 admissible values. This is the SSOT vocabulary; W2's classifier is aligned to it at wiring. */
export const NOTICE_TYPE_VALUES = [
  'three_day_pay_or_quit', 'three_day_cure_or_quit', 'three_day_unconditional_quit',
  'thirty_day_termination', 'sixty_day_termination', 'ninety_day_termination_section8',
] as const;
export type NoticeType = (typeof NOTICE_TYPE_VALUES)[number];

export const JUST_CAUSE_DISPLAY: Record<JustCause, string> = {
  nonpayment: 'Non-payment of rent', breach_of_lease: 'Breach of lease', nuisance: 'Nuisance',
  illegal_use: 'Illegal use', refusal_of_entry: 'Refusal of entry', unapproved_subtenant: 'Unapproved subtenant',
  end_of_term_sro_or_covered: 'End of term (SRO/covered)', owner_move_in: 'Owner move-in',
  withdrawal_ellis: 'Withdrawal from rental market (Ellis)', demolition: 'Demolition',
  capital_improvement: 'Capital improvement', government_order: 'Government order', other: 'Other',
};
export const NOTICE_TYPE_DISPLAY: Record<NoticeType, string> = {
  three_day_pay_or_quit: '3-Day Notice to Pay Rent or Quit',
  three_day_cure_or_quit: '3-Day Notice to Perform Covenant or Quit',
  three_day_unconditional_quit: '3-Day Notice to Quit',
  thirty_day_termination: '30-Day Notice of Termination',
  sixty_day_termination: '60-Day Notice of Termination',
  ninety_day_termination_section8: '90-Day Notice of Termination (Section 8)',
};

// --- Schema (Amendment A/B) ------------------------------------------------------------------------------------

/** The five FF-3 structured intake fields. Conditional rule: a 3-day pay-or-quit MUST have amount_of_rent_owed > 0. */
export const ff3IntakeSchema = z
  .object({
    bedrooms: z.number().int().min(0).max(6),
    contract_monthly_rent: z.number().min(0),
    amount_of_rent_owed: z.number().min(0).nullable().optional(),
    just_cause: z.enum(JUST_CAUSE_VALUES),
    notice_type: z.enum(NOTICE_TYPE_VALUES),
  })
  .refine(
    (v) => v.notice_type !== 'three_day_pay_or_quit' || (v.amount_of_rent_owed != null && v.amount_of_rent_owed > 0),
    { path: ['amount_of_rent_owed'], message: 'A 3-Day Pay-or-Quit requires an amount owed greater than $0.' },
  );
export type Ff3Intake = z.infer<typeof ff3IntakeSchema>;

/** True when a case's five FF-3 fields are complete + valid (gates only fire on complete intake). */
export function isFf3Complete(input: unknown): input is Ff3Intake {
  return ff3IntakeSchema.safeParse(input).success;
}

// --- Recapture confirmation card (Amendment C) -----------------------------------------------------------------

function money(n: number | null | undefined): string {
  return n == null ? '—' : `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Render the locked FF-3 recapture confirmation card with the captured values interpolated. Function-form
 *  replacements are used so a `$` in a money value is never treated as a regex replacement token. */
export function ff3ConfirmationCard(v: Ff3Intake): string {
  // LockedKey: chatFf3IntakeConfirmationCard
  return lockedProseEntry('chatFf3IntakeConfirmationCard').value
    .replace('{bedrooms}', () => String(v.bedrooms))
    .replace('${amount_of_rent_owed}', () => money(v.amount_of_rent_owed))
    .replace('${contract_monthly_rent}', () => money(v.contract_monthly_rent))
    .replace('{just_cause_display_name}', () => JUST_CAUSE_DISPLAY[v.just_cause])
    .replace('{notice_type_display_name}', () => NOTICE_TYPE_DISPLAY[v.notice_type]);
}
