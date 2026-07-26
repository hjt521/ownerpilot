// lib/btrm/enr/normalize.ts
// ENR-001 — Evidence Normalization & Reconstruction (BTRM-001 spec §3.1, §5 interface: ENR.normalize).
// Deterministic pre-processing: dedup, chronological timeline reconstruction, provenance classification.
// NOT a learned model where avoidable (spec §3.1) — every rule here is auditable and explained via the returned
// ProvenanceLedger. Non-goals (spec §3.1): no behavioral judgment, no reliance, no interest inference — this
// module never calls the §11 character-label guard because it never produces a free-text conclusion, only
// structured records.
//
// Scoping notes (read before changing this file):
//  - Corroboration across items is intentionally NOT computed here — see provenance.ts's header comment. It is
//    CM-001's (Stage 3) responsibility (spec §4 ConfidenceAssessment.corroboration).
//  - Commitment extraction never parses free text for implied promises (that would be inference, not
//    deterministic pre-processing, and would blur into BAE-001/AI-inference territory). A Commitment is only
//    materialized when the caller has already tagged the EvidenceItem with `commitmentHint` (lib/btrm/types.ts).
//  - Original evidence is immutable (spec §3.1): this module reads EvidenceItem[] and returns new derived
//    records; it never mutates or discards an input item, including duplicates (their ids are preserved in
//    sourceItemIds so no evidence is silently dropped from the audit trail).
//  - Missing/invalid timestamps are never invented (spec §3.1): an item with an unparseable `timestamp` causes
//    normalize() to throw rather than silently fabricate an occurredAt value — this is a caller contract
//    violation (EvidenceItem.timestamp is required), not a normal runtime case to paper over.

import type {
  EvidenceItem,
  TimelineEvent,
  Commitment,
  ProvenanceLedger,
  ProvenanceLedgerEntry,
} from '../types';
import { dedupeEvidence } from './dedupe';
import { classifyProvenance, provenanceRationale } from './provenance';

export interface NormalizeResult {
  events: TimelineEvent[];
  commitments: Commitment[];
  provenance: ProvenanceLedger;
}

function assertParsableTimestamp(item: EvidenceItem): void {
  const t = Date.parse(item.timestamp);
  if (Number.isNaN(t)) {
    throw new Error(
      `ENR-001: EvidenceItem ${item.id} has an unparseable timestamp ("${item.timestamp}") — ` +
        `ENR-001 never invents a timestamp (spec §3.1); fix at the source or set timestampUncertain with a valid ISO value.`
    );
  }
}

/**
 * ENR-001's single entry point. Ingests raw EvidenceItem[], deduplicates exact repeats, reconstructs a
 * chronological TimelineEvent per surviving item, materializes a Commitment for any item carrying a
 * `commitmentHint`, and returns a ProvenanceLedger explaining every classification. Events are sorted by
 * (matterId, occurredAt) ascending — deterministic, reproducible for identical input.
 */
export function normalize(items: EvidenceItem[]): NormalizeResult {
  for (const item of items) assertParsableTimestamp(item);

  const groups = dedupeEvidence(items);
  const events: TimelineEvent[] = [];
  const commitments: Commitment[] = [];
  const ledgerEntries: ProvenanceLedgerEntry[] = [];

  for (const group of groups) {
    const { survivor, memberIds } = group;
    const provenance = classifyProvenance(survivor);
    const rationale = provenanceRationale(survivor, provenance);

    const event: TimelineEvent = {
      id: crypto.randomUUID(),
      matterId: survivor.relatedMatter,
      occurredAt: survivor.timestamp,
      occurredAtUncertain: survivor.timestampUncertain ?? false,
      eventType: survivor.evidenceType,
      participants: [survivor.authorOrOrigin],
      sourceItemIds: memberIds,
      provenance,
      disputed: survivor.verificationStatus === 'disputed',
    };
    events.push(event);

    ledgerEntries.push({
      targetId: event.id,
      targetType: 'timeline_event',
      provenance,
      sourceItemIds: memberIds,
      rationale,
    });

    if (survivor.commitmentHint) {
      const hint = survivor.commitmentHint;
      const commitment: Commitment = {
        id: crypto.randomUUID(),
        matterId: survivor.relatedMatter,
        committer: hint.committer,
        description: hint.description,
        promisedBy: hint.promisedBy,
        createdFromEventId: event.id,
        status: 'open',
      };
      commitments.push(commitment);

      ledgerEntries.push({
        targetId: commitment.id,
        targetType: 'commitment',
        provenance,
        sourceItemIds: memberIds,
        rationale: `Commitment materialized from caller-supplied commitmentHint on EvidenceItem ${survivor.id}; provenance inherited from the source event (${rationale})`,
      });
    }
  }

  events.sort((a, b) => {
    if (a.matterId !== b.matterId) return a.matterId < b.matterId ? -1 : 1;
    return Date.parse(a.occurredAt) - Date.parse(b.occurredAt);
  });

  return { events, commitments, provenance: { entries: ledgerEntries } };
}
