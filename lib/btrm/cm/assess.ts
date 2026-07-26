// lib/btrm/cm/assess.ts
// CM-001 — Confidence Model (BTRM-001 spec §3.4, §5 interface: CM.assess). Reused, not redesigned, per
// roadmap/CM-001_confidence_model_proposal.md: measures the completeness/quality of the EVIDENCE behind an
// assessment, never the actor (that is TM-001's job, which in turn consumes this output — spec §1 processing
// model: BAE-001 -> CM-001 -> TM-001). Deterministic and rules-only, same posture as ENR-001/BAE-001: every
// number here is computed from structural fields already present on TimelineEvent/Commitment, never inferred
// from evidence content.
//
// Scoping notes (read before changing this file):
//  - "Completeness" measures how much of the offered evidence base ENR-001 was actually able to classify
//    (provenance !== 'unknown') — not whether more evidence "should" exist, which is not knowable from inside
//    this scope alone.
//  - "Corroboration" measures the fraction of TimelineEvents backed by more than one original EvidenceItem
//    (TimelineEvent.sourceItemIds.length > 1) — a direct structural count, not a semantic judgment.
//  - "Timeline certainty" measures the fraction of TimelineEvents whose occurrence date is not flagged
//    occurredAtUncertain.
//  - "Contradictions" cites every TimelineEvent flagged disputed:true — ENR-001's own structural signal.
//  - "Missing" surfaces two kinds of structural gaps: events ENR-001 could not classify (provenance ===
//    'unknown'), and commitments still 'open' past their promisedBy as of the supplied assessedAt (never
//    Date.now() — see AssessOptions below, mirrors BAE-001's observedAt convention so output depends only on
//    recorded evidence, not on when this function happens to run).
//  - The qualitative `band` is derived from the three numeric measures plus contradiction presence using fixed,
//    documented thresholds (deriveBand below). This is CM-001's own already-ratified categorical output
//    (BTRM-001 §4 ConfidenceAssessment.band), not a new composite score subject to the RQS/OCM-001 prohibition
//    on fused recommendation scores (RPT-014/ADR-015/§3.7.1): it is scoped to evidence quality only, one of
//    four fixed bands, never a numeric percentage, and never used on its own to approve/reject/rank/execute
//    anything (spec §3.4: "a strong recommendation must never mask low confidence").
//  - A single unresolved contradiction caps the band at 'moderate' even when the numeric measures would
//    otherwise justify 'high' — a hard failure is not averaged away, the same principle §3.7.1 already applies
//    to RQS.

import type { TimelineEvent, Commitment, ProvenanceLedger, ConfidenceAssessment, ConfidenceBand } from '../types';

export interface EvidenceScope {
  targetRef: string; // the RelianceAssessment.id or other artifact this confidence measure is about (spec §4)
  events: TimelineEvent[];
  commitments: Commitment[];
  ledger: ProvenanceLedger;
}

export interface AssessOptions {
  /** ISO 8601 — the deterministic "as of" date for open-commitment gap checks. Defaults to real current time;
   *  tests should always pass an explicit value to keep assertions deterministic. */
  assessedAt?: string;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

interface BandInputs {
  totalRecords: number;
  completeness: number;
  corroboration: number;
  timelineCertainty: number;
  contradictions: string[];
}

/** Fixed, documented thresholds — see module header for why this is not a composite recommendation score. */
function deriveBand({ totalRecords, completeness, corroboration, timelineCertainty, contradictions }: BandInputs): ConfidenceBand {
  if (totalRecords === 0) return 'insufficient';
  const avg = (completeness + corroboration + timelineCertainty) / 3;
  if (avg === 0) return 'insufficient';
  if (avg >= 0.75 && contradictions.length === 0) return 'high';
  if (avg >= 0.5) return 'moderate';
  return 'low';
}

/**
 * CM-001's single entry point. Consumes the evidence scope behind an assessment (typically ENR-001's output
 * restricted to one matter/claim) and produces a ConfidenceAssessment — a measure of the evidence, never the
 * actor.
 */
export function assess(scope: EvidenceScope, options: AssessOptions = {}): ConfidenceAssessment {
  const assessedAt = options.assessedAt ?? new Date().toISOString();
  const { events, commitments } = scope;

  const contradictions: string[] = [];
  const missing: string[] = [];

  let classifiable = 0;
  for (const e of events) {
    if (e.provenance === 'unknown') {
      missing.push(`Event ${e.id} has unknown provenance (insufficient classification data).`);
    } else {
      classifiable++;
    }
    if (e.disputed) {
      contradictions.push(`Event ${e.id} (occurred ${e.occurredAt}) is disputed.`);
    }
  }

  const completeness = events.length > 0 ? round2(classifiable / events.length) : 0;

  const corroborated = events.filter((e) => e.sourceItemIds.length > 1).length;
  const corroboration = events.length > 0 ? round2(corroborated / events.length) : 0;

  const certain = events.filter((e) => !e.occurredAtUncertain).length;
  const timelineCertainty = events.length > 0 ? round2(certain / events.length) : 0;

  const assessedAtMs = Date.parse(assessedAt);
  for (const c of commitments) {
    if (c.status !== 'open') continue;
    const promisedByMs = Date.parse(c.promisedBy);
    if (!Number.isNaN(promisedByMs) && !Number.isNaN(assessedAtMs) && assessedAtMs > promisedByMs) {
      missing.push(`Commitment ${c.id} (promised by ${c.promisedBy}) has no recorded resolution as of ${assessedAt}.`);
    }
  }

  const band = deriveBand({
    totalRecords: events.length + commitments.length,
    completeness,
    corroboration,
    timelineCertainty,
    contradictions,
  });

  return {
    id: crypto.randomUUID(),
    targetRef: scope.targetRef,
    completeness,
    corroboration,
    timelineCertainty,
    contradictions,
    missing,
    band,
  };
}
