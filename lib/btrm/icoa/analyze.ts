// lib/btrm/icoa/analyze.ts
// ICOA-001 — Interest, Constraint & Objective Analysis (BTRM-001 spec §3.5, §5 interface: ICOA.analyze).
// Consumes TM-001/CM-001's output position in the pipeline (spec §1: ... -> TM-001 -> ICOA-001 -> RIE-001) but
// this module's own inputs are narrower: a set of caller-supplied candidate interests/constraints plus the
// evidence base, because identifying WHAT a candidate interest/constraint IS from free text is a semantic
// classification step this module does not perform — the same posture ENR-001's commitmentHint and BAE-001's
// behavioralHint already establish (lib/btrm/types.ts InterestConstraintHint). ICOA-001's own job is strictly
// deterministic: given a candidate statement and the evidence offered in support of it, assign the correct
// SupportLabel (spec §3.5: "every inferred interest is labelled Confirmed/Likely/Possible/Unknown — never
// asserted as fact").
//
// Scoping notes (read before changing this file):
//  - A hint referencing an event/commitment id that does not resolve against the supplied evidence scope
//    contributes NOTHING to the support label — this prevents a caller from fabricating support by citing ids
//    that do not actually exist in this matter's evidence.
//  - Direct statement (explicitlyStatedEventId) is the strongest form of support, graded by the STATED event's
//    own provenance class (confirmed_fact/document_supported -> confirmed; unverified_statement -> likely;
//    disputed_statement/ai_inference/unknown -> possible) — ICOA-001 never treats "the party said this" as
//    automatically confirmed regardless of how well-documented the saying itself is.
//  - Absent a direct statement, pattern-based support (relatedEventIds / relatedCommitmentIds) is graded by
//    COUNT of resolved references only: >=2 resolved references -> likely, exactly 1 -> possible, 0 -> unknown.
//    This is a coarse, deliberately conservative measure — ICOA-001 does not weigh evidence quality here
//    (that is CM-001's job upstream); it only counts whether independent evidence exists at all.
//  - sourceEventIds on the output always resolves to actual TimelineEvent ids — a resolved relatedCommitmentId
//    is represented via its Commitment.createdFromEventId, never the commitment id itself, keeping the field's
//    meaning consistent with BehavioralObservation.sourceEventIds elsewhere in BTRM-001.

import type { TimelineEvent, Commitment, InterestConstraint, InterestConstraintHint, SupportLabel } from '../types';

export interface AnalyzeScope {
  events: TimelineEvent[];
  commitments: Commitment[];
}

function labelForStatedEvent(event: TimelineEvent | undefined): SupportLabel {
  if (!event) return 'unknown'; // the cited event does not exist in scope — no support at all
  switch (event.provenance) {
    case 'confirmed_fact':
    case 'document_supported':
      return 'confirmed';
    case 'unverified_statement':
      return 'likely';
    case 'disputed_statement':
    case 'ai_inference':
    case 'unknown':
      return 'possible';
  }
}

function labelForPatternCount(resolvedCount: number): SupportLabel {
  if (resolvedCount >= 2) return 'likely';
  if (resolvedCount === 1) return 'possible';
  return 'unknown';
}

/**
 * ICOA-001's single entry point. Evaluates each caller-supplied candidate interest/constraint against the
 * supplied evidence scope and returns one InterestConstraint per hint, in the same order.
 */
export function analyze(hints: InterestConstraintHint[], scope: AnalyzeScope): InterestConstraint[] {
  const eventsById = new Map(scope.events.map((e) => [e.id, e]));
  const commitmentsById = new Map(scope.commitments.map((c) => [c.id, c]));

  return hints.map((hint) => {
    const sourceEventIds: string[] = [];
    let supportLabel: SupportLabel;

    if (hint.explicitlyStatedEventId) {
      const statedEvent = eventsById.get(hint.explicitlyStatedEventId);
      supportLabel = labelForStatedEvent(statedEvent);
      if (statedEvent) sourceEventIds.push(statedEvent.id);
    } else {
      let resolvedCount = 0;
      for (const eventId of hint.relatedEventIds ?? []) {
        const event = eventsById.get(eventId);
        if (event) {
          resolvedCount++;
          sourceEventIds.push(event.id);
        }
      }
      for (const commitmentId of hint.relatedCommitmentIds ?? []) {
        const commitment = commitmentsById.get(commitmentId);
        if (commitment) {
          resolvedCount++;
          if (!sourceEventIds.includes(commitment.createdFromEventId)) sourceEventIds.push(commitment.createdFromEventId);
        }
      }
      supportLabel = labelForPatternCount(resolvedCount);
    }

    return {
      id: crypto.randomUUID(),
      matterId: hint.matterId,
      partyId: hint.partyId,
      kind: hint.kind,
      statement: hint.statement,
      supportLabel,
      sourceEventIds,
    };
  });
}
