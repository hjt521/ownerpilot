// lib/intake/ff3AmountReconcile.ts
// Lane FF-3 amount reconciliation gate (core).
// Source: ff3_countersign_ordering_awaiting_review_reconciliation_2026-07-03.md §3 (Decision 3 amendment).
//
// This is a COMPLIANCE GATE, not a passive check. It runs immediately AFTER FF-3 capture completes and BEFORE the
// FF-4 FMR gate. It compares the amount stated on the notice (FF-3 amount_of_rent_owed) against the owner's in-app
// rent ledger total at notice scope (SUM of the captured rent_periods amounts). Divergence signals one of three
// defects (§3.1): owner arithmetic error, unlawful non-rent items on a pay-or-quit notice (CCP §1161(2) → voidable
// notice), or ledger staleness. Silently accepting either quantity would let the app assemble a packet around a
// voidable notice — hence a gate.
//
// Outcomes (ruling §3):
//   match               — quantities agree within a cent → silent pass.
//   no_ledger_baseline  — owner isn't maintaining an in-app ledger (no rent_periods) → soft-continue.
//   mismatch            — quantities diverge → surface chatFf3AmountReconciliationFlag (entry 14) with the
//                         three-way owner branch (records-wrong / notice-wrong / broker-review).
//   not_applicable      — the notice carries no amount (non-fault notice) → nothing to reconcile. [engineer-added
//                         defensive outcome; the ruling names the three above. The caller only runs this gate for
//                         amount-bearing notices, so not_applicable should not arise in the wired flow.]
//
// NAMING NOTE (as-built vs ruling): the ruling writes SUM(rent_periods.balance). The Lane-2E rent_periods capture
// stores each period as { periodStartDate, periodEndDate, amount } — there is no `balance` field. We sum `amount`,
// which is the per-period rent owed the ruling refers to. Flagged so a future rename is a conscious choice.
//
// The card copy (chatFf3AmountReconciliationFlag) is locked-prose ENTRY 14, which lands WITH migration 042 — not in
// this core PR. This module therefore only classifies + names the locked key; it does not emit the card.

/** Gate identifier for the future compliance_gates record (ruling: "gate lives in compliance_gates"). */
export const FF3_AMOUNT_RECONCILE_GATE = 'ff3_amount_reconciliation';

/** Locked-prose key for the mismatch card (entry 14; prose lands with migration 042, not this PR). */
export const FF3_RECONCILE_MISMATCH_LOCKED_KEY = 'chatFf3AmountReconciliationFlag';

export type Ff3ReconcileOutcome = 'match' | 'no_ledger_baseline' | 'mismatch' | 'not_applicable';

/** A captured rent period (Lane 2E shape). Only `amount` participates in reconciliation. */
export interface Ff3ReconcilePeriod {
  amount?: number | null;
}

export interface Ff3ReconcileResult {
  outcome: Ff3ReconcileOutcome;
  gate: typeof FF3_AMOUNT_RECONCILE_GATE;
  noticeAmount: number | null;   // FF-3 amount_of_rent_owed
  ledgerTotal: number | null;    // SUM of rent_periods amounts; null when there is no ledger baseline
  /** noticeAmount − ledgerTotal, rounded to cents. Populated on mismatch only (>0 = notice exceeds ledger). */
  delta: number | null;
  /** Card to surface (mismatch only). Prose is entry 14, lands with migration 042. */
  lockedKey: typeof FF3_RECONCILE_MISMATCH_LOCKED_KEY | null;
}

/** Half-a-cent tolerance so float summation noise never trips a mismatch. */
const CENT_TOLERANCE = 0.005;

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Sum the rent-ledger baseline from captured periods. Returns null when there is NO baseline (no periods, or every
 * period lacks a numeric amount) — the caller treats null as no_ledger_baseline (soft-continue), not zero.
 */
export function sumLedger(periods: Ff3ReconcilePeriod[] | null | undefined): number | null {
  if (!Array.isArray(periods) || periods.length === 0) return null;
  const amounts = periods
    .map((p) => (typeof p?.amount === 'number' && Number.isFinite(p.amount) ? p.amount : null))
    .filter((a): a is number => a !== null);
  if (amounts.length === 0) return null;
  return round2(amounts.reduce((acc, a) => acc + a, 0));
}

/**
 * The FF-3 reconciliation gate. Compares the notice amount against the ledger baseline and classifies the outcome.
 * Pure + deterministic. The caller runs this only for amount-bearing notices, immediately after FF-3, before FF-4.
 */
export function reconcileFf3Amount(
  noticeAmount: number | null | undefined,
  rentPeriods: Ff3ReconcilePeriod[] | null | undefined,
): Ff3ReconcileResult {
  const base = { gate: FF3_AMOUNT_RECONCILE_GATE } as const;

  // No amount on the notice → nothing to reconcile (non-fault notice). Defensive: the wired flow won't call here.
  if (noticeAmount == null || !Number.isFinite(noticeAmount)) {
    return { ...base, outcome: 'not_applicable', noticeAmount: null, ledgerTotal: null, delta: null, lockedKey: null };
  }

  const ledgerTotal = sumLedger(rentPeriods);

  // No in-app ledger to reconcile against → soft-continue (owner not maintaining an in-app ledger).
  if (ledgerTotal == null) {
    return { ...base, outcome: 'no_ledger_baseline', noticeAmount, ledgerTotal: null, delta: null, lockedKey: null };
  }

  if (Math.abs(noticeAmount - ledgerTotal) < CENT_TOLERANCE) {
    return { ...base, outcome: 'match', noticeAmount, ledgerTotal, delta: null, lockedKey: null };
  }

  // Divergence — surface the reconciliation flag. delta>0 ⇒ notice exceeds ledger (possible §1161(2) non-rent
  // items); delta<0 ⇒ notice below ledger (owner under-claimed / stale ledger). The three-way branch copy is
  // entry 14 and reads delta direction to frame the outcome-(2) "corrected notice" path (held pending §1161(2)).
  return {
    ...base,
    outcome: 'mismatch',
    noticeAmount,
    ledgerTotal,
    delta: round2(noticeAmount - ledgerTotal),
    lockedKey: FF3_RECONCILE_MISMATCH_LOCKED_KEY,
  };
}
