// lib/chat/stalenessCheck.ts
// PR-B serve-time stale-facial-dates guard — the pure comparison used by both surfaces.
// Source: pr_b_staleness_scope_omnibus_broker_ruling_2026-07-01.md §§4, 6.
//
// Reuses the wizard's evaluateStaleness engine UNCHANGED (wizard parity, §3.1). Given the current derived
// NoticeFlowData and the prior produced snapshot (from riskpath_records.produce_snapshot), it returns the
// staleness verdict + the ratified warning copy with {{changedFields}} filled. evaluateStaleness already emits
// human-readable field labels (e.g. "Amount demanded", "Property address"), so no separate label mapper is
// needed — the {{changedFields}} slot is the joined label list (as-built note for the attestation).

import { evaluateStaleness } from '@/lib/flow/escalation';
import type { NoticeFlowData, ProductionSnapshot, StalenessReason } from '@/lib/flow/noticeFlowState';
import { chatStalenessWarningAmountChanged, chatStalenessWarningFaceChanged } from './stalenessCopy';

export interface StalenessOutcome {
  stale: boolean;
  reason: StalenessReason | null;
  changedFields: string[];
  /** Ratified warning copy with {{changedFields}} filled, or null when the notice is fresh. */
  warning: string | null;
}

/** Fill the single {{changedFields}} slot with the human-readable label list. */
export function fillChangedFields(template: string, changedFields: string[]): string {
  return template.replace('{{changedFields}}', changedFields.join(', '));
}

/**
 * Compare the current notice data against the snapshot captured at produce time. No prior snapshot (fresh, or a
 * pre-migration row) → not stale (Surface 2 renders its transitional fallback instead; §4.4). Deterministic copy
 * selection on reason — never an LLM.
 */
export function checkStaleness(
  current: NoticeFlowData,
  prior: ProductionSnapshot | null | undefined,
): StalenessOutcome {
  if (!prior) return { stale: false, reason: null, changedFields: [], warning: null };
  const s = evaluateStaleness(current, prior);
  if (!s.stale || !s.reason) return { stale: false, reason: null, changedFields: [], warning: null };
  const template = s.reason === 'AMOUNT_CHANGED'
    ? chatStalenessWarningAmountChanged
    : chatStalenessWarningFaceChanged;
  return {
    stale: true,
    reason: s.reason,
    changedFields: s.changedFields,
    warning: fillChangedFields(template, s.changedFields),
  };
}
