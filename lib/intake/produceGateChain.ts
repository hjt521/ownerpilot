// lib/intake/produceGateChain.ts
// FF-3 Migration-042 co-batch §2 — the produce-gate chain (canonical order).
// Design: docs/compliance/ff3_migration_042_cobatch_implementation_design_2026-07-03.md §2.
//
// Pure, in-memory aggregate of the four MERGED gate primitives, run in a NON-NEGOTIABLE order behind the FF-3 gate.
// The chain is a no-op pre-flag-on: the CALLER gates invocation on FF3_CAPTURE_ENABLED + populated FF-3 typed
// columns, so production produce behavior is unaffected until FF-3 flag-on (design §8). This module contains no I/O
// and no flag reads — persistence + owner-branch routing live at the call-site (design §3).
//
// Order (design §2.1 of the FF-4 authorization):
//   1. FF-3 amount reconciliation  reconcileFf3Amount    match | no_ledger_baseline | not_applicable → continue
//                                                        mismatch → HALT (entry-14 card; owner (1)/(2)/(3) at call-site)
//   2. FF-4 FMR                     fmrPreCheck           applies only when notice_type==three_day_pay_or_quit
//                                                        OR just_cause==nonpayment; blocked → HALT; pass → continue
//   3. W6 late-filing              evaluateLateFilingGate block → HALT; pass → continue
//   4. W2 notice-pathway           evaluateNoticePathwayGate informational (pathway); continue
//
// prerequisite_incomplete from ANY node (a null FF-3 field after capture completed) is a DEFECT → fail-closed,
// surface for broker review (design §2, final paragraph).

import {
  reconcileFf3Amount,
  FF3_AMOUNT_RECONCILE_GATE,
  type Ff3ReconcilePeriod,
  type Ff3ReconcileResult,
} from '@/lib/intake/ff3AmountReconcile';
import { fmrPreCheck, type FmrPreCheckResult } from '@/lib/intake/fmrPreCheck';
import { evaluateLateFilingGate, type W6GateResult } from '@/lib/filing/lateFilingGate';
import { evaluateNoticePathwayGate, type W2GateResult } from '@/lib/intake/noticePathwayGate';
import type { NoticeType, JustCause } from '@/lib/intake/ff3Fields';

export const FF4_FMR_GATE = 'ff4_fmr' as const;

/** The FF-3 typed columns + ledger + service date the chain reads. Mirrors chat_sessions FF-3 fields (041). */
export interface ProduceGateChainInput {
  bedrooms: number | null | undefined;
  amount_of_rent_owed: number | null | undefined;
  just_cause: JustCause | string | null | undefined;
  notice_type: NoticeType | string | null | undefined;
  /** Captured rent-ledger periods for the reconciliation baseline (null/empty ⇒ no_ledger_baseline). */
  rent_periods: Ff3ReconcilePeriod[] | null | undefined;
  /** Intended service date (ISO YYYY-MM-DD) for the W6 late-filing gate. */
  service_date: string | null | undefined;
  /** ISO date the chain evaluates filing-lateness against. */
  today: string;
  /** ISO-8601 eval timestamp; defaults to now (injectable for deterministic tests). */
  evaluatedAt?: string;
}

/** A single gate node as recorded in the chain (normalized envelope). */
export interface GateNode {
  gate: string;
  result: string;
  /** Locked-prose card to surface for this node, when it halts with one. */
  lockedKey: string | null;
  context: Record<string, unknown>;
}

export type ChainStatus =
  | 'clear' // all gates passed / continued; produce may proceed
  | 'halted' // a gate halted the chain (mismatch / FMR block / late-filing block) — owner remediation required
  | 'defect'; // prerequisite_incomplete after capture completed — fail-closed, broker review

export interface ProduceGateChainResult {
  status: ChainStatus;
  /** Gate nodes in execution order (may be shorter than 4 on short-circuit). */
  gates: GateNode[];
  /** The gate that halted or defected, if any. */
  stoppedAt: string | null;
  /** The locked-prose card to surface for a halt, if the stopping node carries one. */
  lockedKey: string | null;
  evaluated_at: string;
}

const APPLIES_FMR_JUST_CAUSE = 'nonpayment';
const APPLIES_FMR_NOTICE_TYPE = 'three_day_pay_or_quit';

/** FMR gate applies only to non-payment 3-day cases (design §2 step 2 applicability). */
function fmrApplies(notice_type: string | null | undefined, just_cause: string | null | undefined): boolean {
  return notice_type === APPLIES_FMR_NOTICE_TYPE || just_cause === APPLIES_FMR_JUST_CAUSE;
}

function reconcileNode(r: Ff3ReconcileResult): GateNode {
  return {
    gate: r.gate,
    result: r.outcome,
    lockedKey: r.lockedKey,
    context: { noticeAmount: r.noticeAmount, ledgerTotal: r.ledgerTotal, delta: r.delta },
  };
}

function fmrNode(r: FmrPreCheckResult, applied: boolean): GateNode {
  return {
    gate: FF4_FMR_GATE,
    result: !applied ? 'not_applicable' : r.blocked ? 'block' : 'pass',
    lockedKey: applied && r.blocked ? 'FMR_HARD_BLOCK_EN' : null,
    context: {
      evaluated_at: r.evaluated_at,
      verbatim_hash: r.verbatim_hash,
      applied,
      fmr: r.fmr,
      amountOwed: r.amountOwed,
      bedrooms: r.bedrooms,
    },
  };
}

function w6Node(r: W6GateResult): GateNode {
  return { gate: r.gate, result: r.result, lockedKey: null, context: { ...r.context } };
}

function w2Node(r: W2GateResult): GateNode {
  return { gate: r.gate, result: r.result, lockedKey: null, context: { ...r.context } };
}

/**
 * Run the four-gate produce chain in canonical order. Pure + deterministic. Short-circuits on the first
 * halt/defect; nodes after the stop are not evaluated (mirrors the produce-flow's fail-fast posture). The caller is
 * responsible for (a) gating this behind FF3_CAPTURE_ENABLED + complete FF-3 capture, and (b) routing the
 * owner-selection branch when status === 'halted' with the reconciliation card.
 */
export function runProduceGateChain(input: ProduceGateChainInput): ProduceGateChainResult {
  const evaluated_at = input.evaluatedAt ?? new Date().toISOString();
  const gates: GateNode[] = [];

  const halt = (stoppedAt: string, lockedKey: string | null): ProduceGateChainResult => ({
    status: 'halted',
    gates,
    stoppedAt,
    lockedKey,
    evaluated_at,
  });
  const defect = (stoppedAt: string): ProduceGateChainResult => ({
    status: 'defect',
    gates,
    stoppedAt,
    lockedKey: null,
    evaluated_at,
  });

  // 1. FF-3 amount reconciliation.
  const reconcile = reconcileFf3Amount(input.amount_of_rent_owed, input.rent_periods);
  gates.push(reconcileNode(reconcile));
  if (reconcile.outcome === 'mismatch') {
    return halt(FF3_AMOUNT_RECONCILE_GATE, reconcile.lockedKey);
  }

  // 2. FF-4 FMR (non-payment 3-day only).
  const applies = fmrApplies(input.notice_type, input.just_cause);
  const fmr = fmrPreCheck({
    bedrooms: input.bedrooms ?? 0,
    amountOwed: input.amount_of_rent_owed ?? 0,
    evaluatedAt: evaluated_at,
  });
  const node2 = fmrNode(fmr, applies);
  gates.push(node2);
  if (applies && fmr.blocked) {
    return halt(FF4_FMR_GATE, node2.lockedKey);
  }

  // 3. W6 late-filing.
  const w6 = evaluateLateFilingGate({
    notice_type: input.notice_type,
    service_date: input.service_date,
    today: input.today,
    evaluatedAt: evaluated_at,
  });
  gates.push(w6Node(w6));
  if (w6.result === 'prerequisite_incomplete') return defect(w6.gate);
  if (w6.result === 'block') return halt(w6.gate, null);

  // 4. W2 notice-pathway (informational).
  const w2 = evaluateNoticePathwayGate({ notice_type: input.notice_type, evaluatedAt: evaluated_at });
  gates.push(w2Node(w2));
  if (w2.result === 'prerequisite_incomplete') return defect(w2.gate);

  return { status: 'clear', gates, stoppedAt: null, lockedKey: null, evaluated_at };
}
