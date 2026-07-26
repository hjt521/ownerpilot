// lib/btrm/tm/reliance.ts
// TM-001 — Trust & Reliance Model (BTRM-001 spec §3.3, §5 interface: TM.reliance). Reused, not redesigned, per
// the TM-001 enterprise trust model proposal. Consumes BAE-001's BehavioralObservation[] plus CM-001's
// ConfidenceAssessment (spec §1 processing model: BAE-001 -> CM-001 -> TM-001) and produces a claim-specific
// RelianceAssessment — never a global/permanent trust score (spec §3.3 "absolute rule").
//
// Scoping notes (read before changing this file):
//  - Reliance is assessed per RelianceClaim (matterId + subjectId + claimRef + context + decisionUse), not per
//    person — the same subjectId can carry different reliance levels for different claims/contexts in the same
//    matter.
//  - Each of the seven dimensions (lib/btrm/tm/dimensions.ts) is assessed independently from the
//    BehavioralObservations whose eventClass maps to that dimension. A dimension with zero decisive
//    (positive/negative) observations is 'indeterminate' — mandatory per spec, never silently defaulted to a
//    numeric-feeling level just because some neutral observations exist.
//  - The headline relianceLevel is NEVER a mathematical average of the seven dimensions (spec §3.3: "still
//    explained by dimensions, not a fused score"). It is a weakest-link rule: any dimension at 'no_reliance'
//    controls the headline outright; failing that, any dimension at 'limited' controls; failing that, if
//    'indeterminate' dimensions are in the majority the headline is 'indeterminate'; otherwise 'elevated' only
//    if every assessed dimension is 'elevated', 'conditional' if any assessed dimension is 'conditional', else
//    'operational'. This mirrors the same "a hard failure is not averaged away" principle §3.7.1 already
//    applies to RQS.
//  - Symmetry (spec §11): nothing here branches on subjectId's value — filtering is purely by
//    BehavioralObservation.subjectId === claim.subjectId, identical rules regardless of role. See
//    reliance.test.ts for a symmetry assertion using lib/btrm/safeguards/guard.ts's assertSymmetricRuleSelection.

import type { BehavioralObservation, ConfidenceAssessment, RelianceAssessment, RelianceDimensions, RelianceLevel } from '../types';
import { ALL_RELIANCE_DIMENSIONS, polarityFor, relianceDimensionFor, type RelianceDimensionKey } from './dimensions';

export interface RelianceClaim {
  matterId: string;
  subjectId: string;
  claimRef: string; // the specific claim/commitment/representation this assessment is about
  context: string; // decision context this assessment is valid for
  decisionUse: string;
}

export interface RelianceOptions {
  /** ISO 8601 — defaults to real current time; tests should always pass an explicit value to keep assertions
   *  deterministic (mirrors BAE-001's observedAt / CM-001's assessedAt convention). */
  assessedAt?: string;
  /** How many days a reliance assessment remains valid before it must be recomputed. Default 90 (spec §3.3:
   *  reliance is claim-specific, reversible, and "time-bounded"). */
  validForDays?: number;
}

/** Per-dimension classification: zero decisive observations is mandatory 'indeterminate'; otherwise the ratio
 *  of positive to decisive (positive+negative) observations selects the band. A single clean positive
 *  observation lands at 'operational' rather than 'elevated' — one data point is not enough to call reliance
 *  "elevated," which requires at least two consistent positive observations and zero negatives. */
function assessDimension(observations: BehavioralObservation[]): RelianceLevel {
  let positive = 0;
  let negative = 0;
  for (const obs of observations) {
    const polarity = polarityFor(obs.eventClass);
    if (polarity === 'positive') positive++;
    else if (polarity === 'negative') negative++;
  }
  const decisive = positive + negative;
  if (decisive === 0) return 'indeterminate';
  if (negative === 0 && positive >= 2) return 'elevated';
  if (negative === 0) return 'operational';
  const ratio = positive / decisive;
  if (ratio >= 0.5) return 'conditional';
  if (ratio > 0) return 'limited';
  return 'no_reliance';
}

/** Weakest-link headline — see module header. Never an average of the seven dimension levels. */
function deriveHeadline(dimensions: RelianceDimensions): RelianceLevel {
  const values = ALL_RELIANCE_DIMENSIONS.map((key) => dimensions[key]);
  if (values.some((v) => v === 'no_reliance')) return 'no_reliance';
  if (values.some((v) => v === 'limited')) return 'limited';
  const assessed = values.filter((v) => v !== 'indeterminate');
  if (assessed.length < values.length / 2) return 'indeterminate'; // indeterminate dimensions in the majority (or all)
  if (assessed.some((v) => v === 'conditional')) return 'conditional';
  if (assessed.every((v) => v === 'elevated')) return 'elevated';
  return 'operational';
}

function describeDimension(key: RelianceDimensionKey, level: RelianceLevel, observations: BehavioralObservation[]): string {
  const count = observations.length;
  return `${key}: ${level} (${count} observation${count === 1 ? '' : 's'})`;
}

function describeRisk(level: RelianceLevel, band: ConfidenceAssessment['band']): string {
  const confidenceCaveat =
    band === 'insufficient' || band === 'low'
      ? ` Confidence in the underlying evidence is ${band}, so this reliance level may change materially as more evidence arrives.`
      : '';
  switch (level) {
    case 'no_reliance':
      return `Documented negative observations dominate this claim — proceeding as if it is reliable risks acting on unsupported reliance.${confidenceCaveat}`;
    case 'limited':
      return `More negative than positive observations are documented — treat this claim cautiously and seek corroborating evidence before relying on it materially.${confidenceCaveat}`;
    case 'indeterminate':
      return `Evidence is insufficient to assess reliance on this claim across most dimensions — no reliance decision should be made until more evidence is available.${confidenceCaveat}`;
    case 'conditional':
      return `Observations are mixed — reliance may be reasonable for limited purposes but should not be extended to material decisions without further corroboration.${confidenceCaveat}`;
    case 'operational':
      return `Observations are consistent but thin — reliance is reasonable for routine purposes; reassess as more evidence accumulates.${confidenceCaveat}`;
    case 'elevated':
      return `Observations are consistently positive — reliance is reasonable for this claim and context, though it remains claim-specific, time-bounded, and reversible.${confidenceCaveat}`;
  }
}

/**
 * TM-001's single entry point. Consumes a claim, BAE-001's observations, and CM-001's confidence assessment for
 * the same evidence scope, and produces a claim-specific RelianceAssessment.
 */
export function reliance(
  claim: RelianceClaim,
  observations: BehavioralObservation[],
  confidence: ConfidenceAssessment,
  options: RelianceOptions = {}
): RelianceAssessment {
  const assessedAt = options.assessedAt ?? new Date().toISOString();
  const validForDays = options.validForDays ?? 90;

  const subjectObservations = observations.filter((o) => o.subjectId === claim.subjectId);

  const byDimension = new Map<RelianceDimensionKey, BehavioralObservation[]>();
  for (const key of ALL_RELIANCE_DIMENSIONS) byDimension.set(key, []);
  for (const obs of subjectObservations) {
    byDimension.get(relianceDimensionFor(obs.eventClass))!.push(obs);
  }

  const dimensions = {} as RelianceDimensions;
  const supportingFactors: string[] = [];
  const limitingFactors: string[] = [];

  for (const key of ALL_RELIANCE_DIMENSIONS) {
    const obsForDim = byDimension.get(key)!;
    const level = assessDimension(obsForDim);
    dimensions[key] = level;
    if (obsForDim.length === 0) continue; // nothing to cite as a supporting/limiting factor
    const description = describeDimension(key, level, obsForDim);
    if (level === 'elevated' || level === 'operational') supportingFactors.push(description);
    else if (level === 'limited' || level === 'no_reliance') limitingFactors.push(description);
  }

  const relianceLevel = deriveHeadline(dimensions);
  const assessedAtMs = Date.parse(assessedAt);
  const validUntil = new Date(assessedAtMs + validForDays * 86_400_000).toISOString();
  const humanReviewRequired = relianceLevel === 'no_reliance' || relianceLevel === 'indeterminate' || confidence.band === 'insufficient';

  return {
    id: crypto.randomUUID(),
    matterId: claim.matterId,
    subjectId: claim.subjectId,
    claimRef: claim.claimRef,
    context: claim.context,
    decisionUse: claim.decisionUse,
    dimensions,
    relianceLevel,
    supportingFactors,
    limitingFactors,
    validUntil,
    confidenceRef: confidence.id,
    riskIfWrong: describeRisk(relianceLevel, confidence.band),
    humanReviewRequired,
  };
}
