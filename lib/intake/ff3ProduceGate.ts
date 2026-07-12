// lib/intake/ff3ProduceGate.ts
// FF-3 Migration-042 co-batch — Block A (Preview-activation route-dispatch seam), produce-flow side.
// Design: ff3_migration_042_cobatch_implementation_design_2026-07-03.md §3; owner three-way branch in
// ff3_countersign_ordering_awaiting_review_reconciliation_2026-07-03.md §3.2.
//
// Pure evaluation: builds the chain input from the FF-3 typed columns, runs the FLAG-GATED chain (a no-op returning
// null until FF3_CAPTURE_ENABLED — so this whole seam is dark in prod), and maps the result + the owner's
// reconciliation selection to a produce disposition. The route consumes the disposition to persist compliance_gates
// rows, write chat_sessions.reconciliation_resolution, and either continue producing or return a 409 with the card.

import {
  runGatedProduceChain,
  buildReconciliationCard,
  resolveReconciliationSelection,
  type ReconciliationSelection,
} from '@/lib/intake/reconciliationCallSite';
import { FF3_AMOUNT_RECONCILE_GATE } from '@/lib/intake/ff3AmountReconcile';
import {
  FF4_FMR_GATE,
  type ProduceGateChainInput,
  type ProduceGateChainResult,
} from '@/lib/intake/produceGateChain';

/** The FF-3 typed columns as read off chat_sessions (any of them may be null pre-capture). */
export interface Ff3SessionColumns {
  bedrooms: number | null | undefined;
  amount_of_rent_owed: number | null | undefined;
  just_cause: string | null | undefined;
  notice_type: string | null | undefined;
  rent_periods: { amount?: number | null }[] | null | undefined;
}

export type Ff3GateDispositionKind =
  | 'skip' // flag off — chain not run; produce proceeds unchanged
  | 'proceed' // chain clear (or owner resolved (1)); produce may continue
  | 'reconciliation_flag' // mismatch, owner has not selected yet — surface entry-14 card
  | 'pause' // owner selected (2) notice-wrong — do not produce
  | 'broker_review' // owner selected (3) OR a fail-closed defect — route awaiting_broker_review
  | 'fmr_block' // FF-4 hard block
  | 'late_filing_block'; // W6 block

export interface Ff3GateDisposition {
  kind: Ff3GateDispositionKind;
  /** Locked-prose card to surface (reconciliation_flag / fmr_block). */
  card?: string | null;
  /** chat_sessions.reconciliation_resolution value to persist, when a selection was applied. */
  reconciliation_resolution?: string;
}

export interface Ff3GateOutcome {
  /** The raw chain result (null when the flag is off). Used by the route to persist compliance_gates rows. */
  chain: ProduceGateChainResult | null;
  disposition: Ff3GateDisposition;
}

/**
 * PR A reconciliation-gate runtime-defect fix — ff3_reconciliation_gate_runtime_defect_ruling_2026-07-12.
 * rent_periods is NOT a chat_sessions column; it lives in intake_state (jsonb) as {value, confidence, updated_at}.
 * The produce seam previously read session.rent_periods (a non-existent column → undefined), so the reconciliation
 * gate always saw a null ledger and soft-continued (no_ledger_baseline) — it never fired. Read the real data shape:
 * intake_state.rent_periods.value. Genuine ledgerless sessions (no rent_periods captured) still return null → the
 * no_ledger_baseline soft-continue is preserved for them.
 */
export function ff3RentPeriodsFromSession(
  session: { intake_state?: Record<string, { value?: unknown } | undefined> | null } | null | undefined,
): { amount?: number | null }[] | null {
  const rp = session?.intake_state?.rent_periods?.value;
  return Array.isArray(rp) ? (rp as { amount?: number | null }[]) : null;
}

export interface EvaluateFf3GateArgs {
  ff3: Ff3SessionColumns;
  intendedServiceDate: string;
  /** ISO date the chain evaluates filing-lateness against (defaults injected by caller for determinism). */
  today: string;
  /** The owner's answer to a prior reconciliation flag, if this is the resolving request. */
  selection?: ReconciliationSelection | null;
  evaluatedAt?: string;
}

/**
 * Evaluate the FF-3 produce gate for a session. No I/O. When the flag is off, returns { chain: null, skip } and the
 * produce flow is unchanged. Selection (2)/(3) short-circuit to pause/broker_review; (1) sets the override so a
 * mismatch is recorded but the chain continues to FF-4.
 */
export function evaluateFf3Gate(args: EvaluateFf3GateArgs): Ff3GateOutcome {
  const { ff3, intendedServiceDate, today, selection, evaluatedAt } = args;

  // Owner selected (2) notice-wrong or (3) unsure BEFORE we re-run — short-circuit (no produce).
  if (selection === '2') {
    return {
      chain: null,
      disposition: { kind: 'pause', reconciliation_resolution: resolveReconciliationSelection('2').resolution },
    };
  }
  if (selection === '3') {
    return {
      chain: null,
      disposition: { kind: 'broker_review', reconciliation_resolution: resolveReconciliationSelection('3').resolution },
    };
  }

  const input: ProduceGateChainInput = {
    bedrooms: ff3.bedrooms,
    amount_of_rent_owed: ff3.amount_of_rent_owed,
    just_cause: ff3.just_cause,
    notice_type: ff3.notice_type,
    rent_periods: ff3.rent_periods,
    service_date: intendedServiceDate,
    today,
    evaluatedAt,
    reconciliationOverride: selection === '1',
  };

  const chain = runGatedProduceChain(input);
  if (chain === null) return { chain: null, disposition: { kind: 'skip' } };

  if (chain.status === 'clear') {
    return {
      chain,
      disposition: selection === '1'
        ? { kind: 'proceed', reconciliation_resolution: resolveReconciliationSelection('1').resolution }
        : { kind: 'proceed' },
    };
  }

  if (chain.status === 'defect') {
    return { chain, disposition: { kind: 'broker_review' } };
  }

  // halted — branch on which gate stopped it.
  if (chain.stoppedAt === FF3_AMOUNT_RECONCILE_GATE) {
    const node = chain.gates.find((g) => g.gate === FF3_AMOUNT_RECONCILE_GATE);
    return { chain, disposition: { kind: 'reconciliation_flag', card: node ? buildReconciliationCard(node) : null } };
  }
  if (chain.stoppedAt === FF4_FMR_GATE) {
    return { chain, disposition: { kind: 'fmr_block', card: chain.lockedKey } };
  }
  return { chain, disposition: { kind: 'late_filing_block' } };
}
