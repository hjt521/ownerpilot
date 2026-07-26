// lib/btrm/ocm/compare.ts
// OCM-001 — Outcome Comparison Model (BTRM-001 spec §3.7, §5 interface: OCM.compare). Compares a negotiated
// resolution path against the likely alternative (BATNA-style) WITHOUT fabricated precision — spec §3.7's
// absolute rule is qualitative bands only (SupportBand: strongly_supported / supported / uncertain /
// weakly_supported / insufficient_evidence); numeric probabilities are prohibited until backed by validated,
// sufficiently large, relevant datasets (Founder-gated, spec §3.7, §15).
//
// RQS posture (spec §3.7.1, ADR-015): this module computes an INTERNAL numeric comparison score to select which
// of the five fixed bands applies — this is exactly the "permitted internal use only" telemetry §3.7.1
// authorizes for calibration/testing/system-health purposes. That score is NEVER returned, NEVER exposed in
// OutcomeComparison, and NEVER itself approves/ranks/executes anything — only the fixed-threshold-derived
// qualitative band and a plain-language rationale citing the actual structural facts behind it (resolved
// reliance levels, confidence bands, and counted risks/gaps) are returned. Do not add a numeric field to
// OutcomeComparison without a separate Founder-gated amendment (types.ts SupportBand comment; spec §15).
//
// Scoping notes (read before changing this file):
//  - OCM-001 does not invent which option is "the negotiated path" and which is "the likely alternative" — the
//    caller designates primaryOptionId and alternativeOptionIds, mirroring the hint pattern (this module grades
//    a caller-proposed comparison, it does not construct one).
//  - The comparison is grounded only in what RIE-001 already resolved for each option (materialRisks,
//    missingInformation, and the RelianceAssessment/ConfidenceAssessment records referenced by
//    ResolutionOption.relianceAssumptions) — OCM-001 never re-reads raw evidence or reliance dimensions itself.
//  - If the primary option has ZERO resolvable reliance signal at all (none of its relianceAssumptions resolve
//    against the supplied scope), the band is 'insufficient_evidence' regardless of the alternative — the same
//    "a hard failure is not averaged away" posture applied throughout BTRM-001.

import type { ResolutionOption, RelianceAssessment, ConfidenceAssessment, SupportBand, OutcomeComparison } from '../types';
import { assertCompleteEnvelope, buildEnvelope } from '../envelope';
import { assertNoCharacterLabel } from '../safeguards/guard';

export interface CompareScope {
  reliance: RelianceAssessment[];
  confidence: ConfidenceAssessment[];
}

/** A caller-designated comparison: which option is the negotiated path under consideration, and which option(s)
 *  represent the likely alternative (BATNA) it is being weighed against. OCM-001 does not decide this itself. */
export interface ComparisonHint {
  matterId: string;
  primaryOption: ResolutionOption;
  alternativeOptions: ResolutionOption[];
}

const RELIANCE_POINTS: Record<RelianceAssessment['relianceLevel'], number> = {
  elevated: 2,
  operational: 1,
  conditional: 0,
  limited: -1,
  no_reliance: -2,
  indeterminate: 0, // neutral for comparison purposes — unknown is not itself negative, just uninformative
};

const CONFIDENCE_POINTS: Record<ConfidenceAssessment['band'], number> = {
  high: 2,
  moderate: 1,
  low: -1,
  insufficient: -2,
};

interface OptionSignal {
  resolvedRelianceCount: number;
  score: number; // internal only — never returned (spec §3.7.1)
  relianceLevels: RelianceAssessment['relianceLevel'][];
  confidenceBands: ConfidenceAssessment['band'][];
}

function signalFor(option: ResolutionOption, scope: CompareScope): OptionSignal {
  const relianceById = new Map(scope.reliance.map((r) => [r.id, r]));
  const confidenceById = new Map(scope.confidence.map((c) => [c.id, c]));

  const relianceLevels: RelianceAssessment['relianceLevel'][] = [];
  const confidenceBands: ConfidenceAssessment['band'][] = [];
  let score = 0;

  for (const id of option.relianceAssumptions) {
    const reliance = relianceById.get(id);
    if (!reliance) continue; // unresolved — contributes nothing (no fabricated support)
    relianceLevels.push(reliance.relianceLevel);
    score += RELIANCE_POINTS[reliance.relianceLevel];
    const confidence = confidenceById.get(reliance.confidenceRef);
    if (confidence) {
      confidenceBands.push(confidence.band);
      score += CONFIDENCE_POINTS[confidence.band];
    }
  }

  score -= option.materialRisks.length;
  score -= option.missingInformation.length;

  return { resolvedRelianceCount: relianceLevels.length, score, relianceLevels, confidenceBands };
}

function bandFor(primary: OptionSignal, bestAlternative: OptionSignal | undefined): SupportBand {
  if (primary.resolvedRelianceCount === 0) return 'insufficient_evidence';
  const diff = primary.score - (bestAlternative?.score ?? 0);
  if (diff >= 3) return 'strongly_supported';
  if (diff >= 1) return 'supported';
  if (diff === 0) return 'uncertain';
  return 'weakly_supported';
}

function describeSignal(label: string, optionId: string, signal: OptionSignal, materialRisks: number, missingInfo: number): string {
  const levels = signal.relianceLevels.length ? signal.relianceLevels.join(', ') : 'no resolved reliance assessments';
  const confidence = signal.confidenceBands.length ? signal.confidenceBands.join(', ') : 'no resolved confidence records';
  return `${label} (option ${optionId}): reliance levels [${levels}], confidence [${confidence}], ${materialRisks} material risk(s), ${missingInfo} missing-information item(s)`;
}

/**
 * OCM-001's single entry point. Consumes a caller-designated primary/alternative comparison plus the shared
 * TM-001/CM-001 scope those options' relianceAssumptions reference, and produces one OutcomeComparison — a
 * qualitative band, never a numeric probability.
 */
export function compare(hint: ComparisonHint, scope: CompareScope): OutcomeComparison {
  const primarySignal = signalFor(hint.primaryOption, scope);
  const alternativeSignals = hint.alternativeOptions.map((opt) => ({ option: opt, signal: signalFor(opt, scope) }));

  let bestAlternative: OptionSignal | undefined;
  let bestAlternativeOption: ResolutionOption | undefined;
  for (const { option, signal } of alternativeSignals) {
    if (!bestAlternative || signal.score > bestAlternative.score) {
      bestAlternative = signal;
      bestAlternativeOption = option;
    }
  }

  const supportBand = bandFor(primarySignal, bestAlternative);

  const rationaleParts = [
    describeSignal('negotiated path', hint.primaryOption.id, primarySignal, hint.primaryOption.materialRisks.length, hint.primaryOption.missingInformation.length),
  ];
  if (bestAlternativeOption && bestAlternative) {
    rationaleParts.push(
      describeSignal('strongest alternative considered', bestAlternativeOption.id, bestAlternative, bestAlternativeOption.materialRisks.length, bestAlternativeOption.missingInformation.length)
    );
  } else {
    rationaleParts.push('no alternative option was supplied for comparison');
  }
  const rationale = rationaleParts.join('; ');
  assertNoCharacterLabel(rationale, 'OutcomeComparison.rationale');

  // Cite the compared options' OWN already-validated envelopes rather than re-deriving from relianceAssumptions:
  // RIE-001 already guarantees each ResolutionOption.envelope.evidenceCited is non-empty (spec §5), so this stays
  // non-empty even in the insufficient_evidence case where the primary itself has no resolved reliance signal.
  const evidenceCited = Array.from(
    new Set([...hint.primaryOption.envelope.evidenceCited, ...(bestAlternativeOption?.envelope.evidenceCited ?? [])])
  );

  const envelope = buildEnvelope({
    evidenceCited,
    behaviorsIdentified: [],
    howRelianceDetermined: rationale,
    missingInformation: [...hint.primaryOption.missingInformation, ...(bestAlternativeOption?.missingInformation ?? [])],
    whatWouldChangeThis:
      primarySignal.resolvedRelianceCount === 0
        ? 'at least one resolved reliance assessment for the negotiated path would be needed before any comparison can be made'
        : 'additional resolved reliance/confidence records, or a change in the alternatives considered, could shift this comparison',
    whyPreferred: `compares option ${hint.primaryOption.id} as the negotiated path against ${hint.alternativeOptions.length} alternative(s)`,
  });
  assertCompleteEnvelope(envelope);

  return {
    id: crypto.randomUUID(),
    matterId: hint.matterId,
    optionIds: [hint.primaryOption.id, ...hint.alternativeOptions.map((o) => o.id)],
    supportBand,
    rationale,
    envelope,
  };
}
