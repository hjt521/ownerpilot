// lib/intake/reconciliationCallSite.ts
// FF-3 Migration-042 co-batch §3 — the produce-flow call-site for the gate chain.
// Design: docs/compliance/ff3_migration_042_cobatch_implementation_design_2026-07-03.md §3, and the reconciliation
// three-way branch in ff3_countersign_ordering_awaiting_review_reconciliation_2026-07-03.md §3.2.
//
// Pure + testable. The chain itself is I/O-free; this module adds (a) the flag+capture gate so the whole thing is a
// no-op pre-flag-on, (b) entry-14 card emission on mismatch, (c) the (1)/(2)/(3) owner-selection → next-state map,
// and (d) the compliance_gates persistence payload. The actual Supabase writes + chat-route dispatch consume these
// payloads at the seam — no DB access here.

import { ff3CaptureEnabled } from '@/lib/chat/ff3Flag';
import { lockedProseEntry } from '@/lib/compliance/lockedProse';
import { FF3_RECONCILE_MISMATCH_LOCKED_KEY } from '@/lib/intake/ff3AmountReconcile';
import {
  runProduceGateChain,
  type ProduceGateChainInput,
  type ProduceGateChainResult,
  type GateNode,
} from '@/lib/intake/produceGateChain';

// --- Owner three-way selection (reconciliation mismatch) -------------------------------------------------------

/** The owner's answer to the entry-14 mismatch card. Ordinal maps to countersign §3.2 (1)/(2)/(3). */
export type ReconciliationSelection = '1' | '2' | '3';

export interface ReconciliationDisposition {
  /** Persisted to chat_sessions.reconciliation_resolution. */
  resolution: 'records_incomplete' | 'notice_wrong' | 'broker_review';
  /** Whether the produce flow proceeds to FF-4 after this selection. */
  proceedToFf4: boolean;
  /** The next case state the caller routes to. */
  nextState: 'continue' | 'pause' | 'awaiting_broker_review';
}

/** Countersign §3.2: (1) notice right/records wrong → continue with case-notes flag; (2) notice wrong → PAUSE (no
 *  FF-4); (3) unsure → route awaiting_broker_review (no FF-4). */
export const RECONCILIATION_DISPOSITIONS: Record<ReconciliationSelection, ReconciliationDisposition> = {
  '1': { resolution: 'records_incomplete', proceedToFf4: true, nextState: 'continue' },
  '2': { resolution: 'notice_wrong', proceedToFf4: false, nextState: 'pause' },
  '3': { resolution: 'broker_review', proceedToFf4: false, nextState: 'awaiting_broker_review' },
};

export function resolveReconciliationSelection(sel: ReconciliationSelection): ReconciliationDisposition {
  return RECONCILIATION_DISPOSITIONS[sel];
}

// --- Entry-14 card emission ------------------------------------------------------------------------------------

function money(n: number | null | undefined): string {
  return n == null ? '—' : `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Render the locked entry-14 reconciliation card. `expected_owed` is the rent-ledger baseline (chain ledgerTotal);
 * `amount_of_rent_owed` is the notice figure. Function-form replacements so a `$` in a money value is never treated
 * as a regex token. Returns null when the reconcile node is not a mismatch (no card to show).
 */
export function buildReconciliationCard(node: GateNode): string | null {
  if (node.lockedKey !== FF3_RECONCILE_MISMATCH_LOCKED_KEY) return null;
  const expected = money(node.context.ledgerTotal as number | null);
  const notice = money(node.context.noticeAmount as number | null);
  return lockedProseEntry(FF3_RECONCILE_MISMATCH_LOCKED_KEY).value
    .replace('${expected_owed}', () => expected)
    .replace('${amount_of_rent_owed}', () => notice);
}

// --- Flag-gated chain runner -----------------------------------------------------------------------------------

/**
 * Run the produce-gate chain ONLY when FF-3 capture is enabled. Returns null (a no-op) otherwise, so production
 * produce behavior is unchanged until FF-3 flag-on in Preview (design §8). The caller still owns the "capture
 * complete" precondition (isFf3Complete) — this function assumes the FF-3 typed columns are populated.
 */
export function runGatedProduceChain(input: ProduceGateChainInput): ProduceGateChainResult | null {
  if (!ff3CaptureEnabled()) return null;
  return runProduceGateChain(input);
}

// --- compliance_gates persistence payload ----------------------------------------------------------------------

export interface ComplianceGateRow {
  chat_session_id: string;
  gate: string;
  result: string;
  evaluated_at: string;
  verbatim_hash: string | null;
  context_json: Record<string, unknown>;
}

/** Map a chain result to one compliance_gates row per evaluated node (design §5: written by the caller). */
export function toComplianceGateRows(chatSessionId: string, chain: ProduceGateChainResult): ComplianceGateRow[] {
  return chain.gates.map((n) => ({
    chat_session_id: chatSessionId,
    gate: n.gate,
    result: n.result,
    evaluated_at: (n.context.evaluated_at as string) ?? chain.evaluated_at,
    verbatim_hash: (n.context.verbatim_hash as string) ?? null,
    context_json: n.context,
  }));
}
