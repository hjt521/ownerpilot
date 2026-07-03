// lib/intake/fmrPreCheck.ts
// Lane FF-4 (omnibus §3.3, amended by ff4_fmr_gate_quantity_reconciliation_broker_ruling_2026-07-03).
// LAHD portal-enforced FMR gate for NON-PAYMENT 3-day filings. Per the ruling the gate compares the
// AMOUNT OWED on the 3-day notice (not contract monthly rent) against the FMR for the unit's bedroom count,
// and blocks when the amount owed is NOT HIGHER THAN the FMR (i.e. amount_owed <= fmr — "higher than" is strict).
//
// STANDING RULE (portal-derived gate): the operative quantity + operator + boundary wording MUST match the
// portal text verbatim. Pinned here so the code can be diffed against it:
export const FMR_PORTAL_TEXT_VERBATIM =
  'Landlords may not evict a tenant who falls behind in rent unless the tenant owes an amount higher than ' +
  'the Fair Market Rent (FMR). The FMR depends on the bedroom size of the rental unit.';
// → operative quantity: "amount owed"; operator: "higher than" (strict >); block side is therefore <=.

import { lockedProseEntry } from '@/lib/compliance/lockedProse';

/** LAHD Economic Threshold FMR by bedroom count, City of Los Angeles. Verified from the live portal (0–4 BR). */
export const FMR_LA_TABLE = {
  effective_from: '2026-05-21',
  effective_to: '2026-09-30',
  source: 'LAHD EFS portal — Economic Threshold FMR, verified 2026-07-02 (Clifton Alexander filing)',
  by_bedroom: { 0: 2079, 1: 2328, 2: 2903, 3: 3681, 4: 4098 } as Record<number, number>,
} as const;

/** FMR threshold for a bedroom count. Units with >4 BR clamp to the 4-BR figure (portal table tops out at 4). */
export function fmrThreshold(bedrooms: number): number {
  const key = Math.max(0, Math.min(4, Math.trunc(bedrooms)));
  return FMR_LA_TABLE.by_bedroom[key];
}

export interface FmrPreCheckInput {
  bedrooms: number;
  amountOwed: number; // total demanded on the 3-day notice — NOT contract monthly rent
}
export interface FmrPreCheckResult {
  blocked: boolean;
  fmr: number;
  amountOwed: number;
  bedrooms: number;
}

/**
 * FF-4 gate. blocked = amount owed does NOT exceed FMR (amount_owed <= fmr). A tenant owing EXACTLY the FMR is a
 * block ("higher than" is strict). Non-payment 3-day cases only — the caller gates on just_cause + notice_type.
 */
export function fmrPreCheck(input: FmrPreCheckInput): FmrPreCheckResult {
  const fmr = fmrThreshold(input.bedrooms);
  return {
    blocked: input.amountOwed <= fmr, // strict "higher than" on the pass side
    fmr,
    amountOwed: input.amountOwed,
    bedrooms: input.bedrooms,
  };
}

/** The locked FF-4 hard-block message (Correction B) with the owed amount / bedrooms / fmr interpolated. */
export function fmrHardBlockMessage(result: Pick<FmrPreCheckResult, 'amountOwed' | 'bedrooms' | 'fmr'>): string {
  // LockedKey: FMR_HARD_BLOCK_EN
  return lockedProseEntry('FMR_HARD_BLOCK_EN').value
    .replace('${amount_of_rent_owed}', `$${result.amountOwed.toLocaleString('en-US')}`)
    .replace('${bedrooms}', String(result.bedrooms))
    .replace('${fmr}', `$${result.fmr.toLocaleString('en-US')}`);
}
