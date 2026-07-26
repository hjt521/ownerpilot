// lib/btrm/rie/options.ts
// RIE-001 — Resolution Intelligence Engine (BTRM-001 spec §3.6, §5 interface: RIE.options). Consumes ICOA-001's
// InterestConstraint[], TM-001's RelianceAssessment[], and CM-001's ConfidenceAssessment[] for the same matter,
// plus a caller-supplied ResolutionOptionHint identifying which option TYPE is being considered and what it is
// meant to achieve — mirroring the hint pattern already established by ENR-001 (CommitmentHint), BAE-001
// (BehavioralHint), and ICOA-001 (InterestConstraintHint). RIE-001 does not invent what a candidate option is,
// what it is meant to achieve, or what documents it requires — a caller (a future, separately-scoped resolution-
// design step) supplies that. RIE-001's own job is strictly deterministic:
//   1. fix reversibility and materialConsequence by the option's closed type (lib/btrm/rie/catalog.ts, never
//      inferred from free text or hint content);
//   2. grade the option's documented support by resolving cited InterestConstraint/RelianceAssessment ids against
//      the supplied scope — an id that does not resolve contributes NOTHING (no fabricated support), the same
//      rule ICOA-001 already applies to its own hint references;
//   3. assemble a complete ExplainabilityEnvelope (spec §5) citing exactly the evidence/behaviors/reliance
//      actually resolved, never anything invented;
//   4. enforce the §6/§11 human-review gate before returning — see lib/btrm/rie/catalog.ts for the
//      materialConsequence classification rationale.
//
// Explicitly NOT a negotiation simulator (spec §3.6): this module never models two simulated parties bargaining
// against each other. It only grades a single, caller-proposed option against already-assessed, documented
// interests, constraints, reliance, and confidence.

import type {
  InterestConstraint,
  RelianceAssessment,
  ConfidenceAssessment,
  BehavioralObservation,
  ResolutionOption,
} from '../types';
import { assertCompleteEnvelope, buildEnvelope } from '../envelope';
import { assertHumanReviewGated } from '../safeguards/guard';
import { reversibilityFor, isMaterialConsequence, type ResolutionOptionType } from './catalog';

/** A caller-supplied candidate resolution option to evaluate (spec §3.6). RIE-001 does not invent the option's
 *  purpose, expected benefit, required documentation, or communication plan from free text — those are
 *  caller-supplied, the same posture CommitmentHint/BehavioralHint/InterestConstraintHint already establish.
 *  RIE-001's own job is strictly grading the option's documented support against the referenced evidence. */
export interface ResolutionOptionHint {
  matterId: string;
  type: ResolutionOptionType;
  purpose: string; // caller-supplied — why this option is being considered
  expectedBenefit: string; // caller-supplied
  documentationRequired?: string[]; // caller-supplied — domain content, not derivable from structured data alone
  deadlineImplications?: string; // caller-supplied
  recommendedCommunicationRef?: string; // links to a future CS-001 (Stage 6) recommendation, passthrough only
  interestConstraintIds?: string[]; // InterestConstraint.id refs this option is built to serve or address
  relianceAssessmentIds?: string[]; // RelianceAssessment.id refs this option's assumptions rest on
}

/** The assessed evidence scope RIE-001 grades a hint against. All four are typically ICOA-001/TM-001/CM-001's own
 *  output for the same matter, plus BAE-001's observations for the explainability envelope's behaviorsIdentified. */
export interface ResolutionOptionScope {
  interests: InterestConstraint[];
  reliance: RelianceAssessment[];
  confidence: ConfidenceAssessment[];
  observations: BehavioralObservation[];
}

function resolveByRef<T extends { id: string }>(ids: string[] | undefined, scope: T[]): T[] {
  if (!ids || ids.length === 0) return [];
  const byId = new Map(scope.map((item) => [item.id, item]));
  const resolved: T[] = [];
  for (const id of ids) {
    const hit = byId.get(id);
    if (hit) resolved.push(hit);
  }
  return resolved;
}

/**
 * RIE-001's single entry point. Consumes one option hint plus the assessed evidence scope it references, and
 * produces one complete, envelope-carrying ResolutionOption.
 */
export function evaluateOption(hint: ResolutionOptionHint, scope: ResolutionOptionScope): ResolutionOption {
  const resolvedInterests = resolveByRef(hint.interestConstraintIds, scope.interests);
  const resolvedReliance = resolveByRef(hint.relianceAssessmentIds, scope.reliance);

  const unresolvedInterestIds = (hint.interestConstraintIds ?? []).filter(
    (id) => !resolvedInterests.some((i) => i.id === id)
  );
  const unresolvedRelianceIds = (hint.relianceAssessmentIds ?? []).filter(
    (id) => !resolvedReliance.some((r) => r.id === id)
  );

  const requiredConditions: string[] = [];
  const missingInformation: string[] = [];
  const materialRisks: string[] = [];
  const evidenceCited: string[] = [];

  for (const interest of resolvedInterests) {
    const description = `${interest.statement} (${interest.supportLabel})`;
    if (interest.supportLabel === 'confirmed' || interest.supportLabel === 'likely') {
      requiredConditions.push(description);
    } else {
      missingInformation.push(`${description} — not yet confirmed or likely`);
    }
    evidenceCited.push(...interest.sourceEventIds);
  }
  for (const id of unresolvedInterestIds) {
    missingInformation.push(`cited interest/constraint ${id} does not resolve in the supplied evidence scope`);
  }

  const confidenceById = new Map(scope.confidence.map((c) => [c.id, c]));

  for (const reliance of resolvedReliance) {
    // claimRef is the specific claim/commitment/representation the reliance assessment is about (spec §4) — a
    // resolved RelianceAssessment always contributes its claimRef as a citation, distinct from an interest's
    // sourceEventIds, so an option grounded only in reliance (no interest reference) still has something to cite.
    evidenceCited.push(reliance.claimRef);
    if (reliance.relianceLevel === 'no_reliance' || reliance.relianceLevel === 'limited') {
      materialRisks.push(
        `reliance on claim ${reliance.claimRef} is ${reliance.relianceLevel}` +
          (reliance.limitingFactors.length ? `: ${reliance.limitingFactors.join('; ')}` : '')
      );
    } else if (reliance.relianceLevel === 'indeterminate') {
      missingInformation.push(
        `reliance on claim ${reliance.claimRef} is indeterminate — insufficient evidence to assess`
      );
    }
    const confidence = confidenceById.get(reliance.confidenceRef);
    if (confidence && (confidence.band === 'low' || confidence.band === 'insufficient')) {
      materialRisks.push(`confidence in the evidence behind claim ${reliance.claimRef} is ${confidence.band}`);
    }
  }
  for (const id of unresolvedRelianceIds) {
    missingInformation.push(`cited reliance assessment ${id} does not resolve in the supplied evidence scope`);
  }

  const relevantSubjects = new Set(resolvedReliance.map((r) => r.subjectId));
  const behaviorsIdentified = scope.observations
    .filter((obs) => relevantSubjects.has(obs.subjectId))
    .map((obs) => obs.id);

  const reversibility = reversibilityFor(hint.type);
  const materialConsequence = isMaterialConsequence(hint.type);
  const insufficientConfidenceCited = resolvedReliance.some(
    (r) => confidenceById.get(r.confidenceRef)?.band === 'insufficient'
  );
  const weakRelianceCited = resolvedReliance.some(
    (r) => r.relianceLevel === 'no_reliance' || r.relianceLevel === 'indeterminate'
  );
  const humanReviewRequired = materialConsequence || insufficientConfidenceCited || weakRelianceCited;

  const howRelianceDetermined = resolvedReliance.length
    ? resolvedReliance
        .map(
          (r) =>
            `${r.claimRef}: ${r.relianceLevel} per TM-001 (supporting: ${r.supportingFactors.join(', ') || 'none'}; ` +
            `limiting: ${r.limitingFactors.join(', ') || 'none'})`
        )
        .join(' | ')
    : 'no reliance assessment was cited in support of this option';

  const hasOpenGaps = unresolvedInterestIds.length > 0 || unresolvedRelianceIds.length > 0 || missingInformation.length > 0;

  const envelope = buildEnvelope({
    evidenceCited: Array.from(new Set(evidenceCited)),
    behaviorsIdentified: Array.from(new Set(behaviorsIdentified)),
    howRelianceDetermined,
    missingInformation: [...missingInformation],
    whatWouldChangeThis: hasOpenGaps
      ? 'resolving the cited-but-unresolved references, and confirming the currently possible/unknown interests or constraints, would sharpen this option'
      : 'additional evidence beyond what is currently documented would be needed to change this assessment',
    whyPreferred: hint.purpose,
  });
  assertCompleteEnvelope(envelope);

  const option: ResolutionOption = {
    id: crypto.randomUUID(),
    matterId: hint.matterId,
    type: hint.type,
    purpose: hint.purpose,
    requiredConditions,
    expectedBenefit: hint.expectedBenefit,
    materialRisks,
    relianceAssumptions: resolvedReliance.map((r) => r.id),
    missingInformation,
    reversibility,
    deadlineImplications: hint.deadlineImplications,
    documentationRequired: hint.documentationRequired ?? [],
    recommendedCommunicationRef: hint.recommendedCommunicationRef,
    materialConsequence,
    humanReviewRequired,
    envelope,
  };

  assertHumanReviewGated(option);
  return option;
}

/** Convenience: evaluate a batch of hints against the same scope, one ResolutionOption per hint, same order. */
export function options(hints: ResolutionOptionHint[], scope: ResolutionOptionScope): ResolutionOption[] {
  return hints.map((hint) => evaluateOption(hint, scope));
}
