// lib/btrm/pol/record.ts
// POL-001 — Post-Outcome Learning (BTRM-001 spec §3.9, §5 interface: POL.record). Records what actually happened
// after a resolution option was acted on, and computes a recency/relevance decay weight for how much this
// outcome should count if/when it re-enters BAE-001's observation stream on a FUTURE assessment — this stage
// does not itself wire that feedback loop (spec §1: "async, feeds ENR/BAE on next assessment" is a future,
// separately-scoped integration; this component ships dark like every other BTRM-001 stage until explicitly
// wired).
//
// Absolute rule (spec §3.9): learning updates evidence, NEVER a stored per-person score. recencyWeight is always
// recomputed relative to a caller-supplied `asOf` reference time — never Date.now(), the same convention every
// other BTRM-001 component already follows — and is not itself a persisted, standalone score; it only weights
// THIS record if it is considered again in a future assessment.
//
// Context preservation (spec §3.9): "a missed payment during a documented emergency is not equated with
// deliberate repeated nonperformance." POL-001 never drops, rewrites, or interprets contextNotes — it is stored
// verbatim, scanned only for the §11 no-character-label safeguard.
//
// Relevance (spec §3.9: "recent, relevant behavior outweighs old or unrelated behavior" — both recency AND
// relevance gate the weight, not recency alone): a caller-supplied `relevantToCurrentClaim` hint (mirroring
// every other BTRM-001 hint — POL-001 does not infer relevance itself) zeroes the weight outright when false,
// regardless of how recent the outcome was.

import type { OutcomeResult, OutcomeRecord } from '../types';
import { assertNoCharacterLabel } from '../safeguards/guard';

export interface OutcomeRecordHint {
  matterId: string;
  optionId: string;
  result: OutcomeResult;
  contextNotes?: string;
  recordedAt: string; // ISO 8601 — when the outcome actually occurred, never Date.now() internally
  relevantToCurrentClaim?: boolean; // caller-supplied, defaults true — POL-001 does not infer relevance itself
}

export interface RecordOptions {
  /** ISO 8601 — the deterministic "as of" reference time for the recency decay calculation. Defaults to real
   *  current time; tests should always pass an explicit value to keep assertions deterministic. */
  asOf?: string;
  /** Days for the recency weight to decay by half. Default 180 (roughly six months) — a Stage 7 implementation
   *  default, not a constitutional figure; revisit if Founder/legal review specifies a different horizon. */
  halfLifeDays?: number;
}

function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

/**
 * POL-001's single entry point. Consumes a caller-supplied OutcomeRecordHint and produces one OutcomeRecord —
 * the observable historical fact plus a recency/relevance weight for future use, never a stored person score.
 */
export function record(hint: OutcomeRecordHint, options: RecordOptions = {}): OutcomeRecord {
  if (hint.contextNotes) {
    assertNoCharacterLabel(hint.contextNotes, 'OutcomeRecord.contextNotes');
  }

  const asOf = options.asOf ?? new Date().toISOString();
  const halfLifeDays = options.halfLifeDays ?? 180;
  const relevant = hint.relevantToCurrentClaim ?? true;

  let recencyWeight = 0;
  if (relevant) {
    const ageDaysRaw = (Date.parse(asOf) - Date.parse(hint.recordedAt)) / 86_400_000;
    const ageDays = Math.max(ageDaysRaw, 0); // a future-dated recordedAt never yields a weight above 1
    recencyWeight = round4(Math.pow(0.5, ageDays / halfLifeDays));
  }

  return {
    id: crypto.randomUUID(),
    matterId: hint.matterId,
    optionId: hint.optionId,
    result: hint.result,
    contextNotes: hint.contextNotes,
    recordedAt: hint.recordedAt,
    recencyWeight,
  };
}
