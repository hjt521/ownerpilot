// lib/btrm/bae/observe.ts
// BAE-001 — Behavioral Analysis Engine (BTRM-001 spec §3.2, §5 interface: BAE.observe). Concretizes the
// reserved MODEL-BEH slot (MAP-001). Descriptive only — answers "what behavior is supported by the evidence?"
// — NEVER assigns trust or a character label (spec §11; this module produces no free-text field, so it never
// needs to call lib/btrm/safeguards/guard.ts's assertNoCharacterLabel).
//
// Scoping notes (read before changing this file):
//  - Only two parts of the closed BehavioralEventClass vocabulary are derived here without a caller hint,
//    because only these are objectively computable from ENR-001's structured output (Commitment.status,
//    TimelineEvent.occurredAt) rather than requiring semantic judgment about evidence content:
//      1. 'commitment_made' and the resolution classes ('commitment_modified' / '..._fulfilled' /
//         '..._partially_fulfilled' / '..._fulfilled_late' / '..._not_fulfilled') — driven directly by
//         Commitment.status, which is itself the caller's structured signal (no inference performed here).
//      2. 'deadline_missed' — only ever emitted when a concrete resolving TimelineEvent is linked
//         (Commitment.fulfilledEventId) and its occurredAt is strictly after Commitment.promisedBy. This
//         function never calls Date.now() to decide "missed as of today" — that would make output depend on
//         when the function happens to run rather than on recorded evidence, and would blur into inference
//         about an as-yet-unresolved commitment.
//  - Everything else in the vocabulary (documentation supplied/requested, communication answered/ignored,
//    contradiction made/corrected, agreement accepted/rejected/breached, cooperation increased/declined,
//    conflict escalated/de-escalated, required action completed/incomplete, delay disclosed, deadline
//    acknowledged) requires reading what an evidence item's content actually says — not derivable from
//    ENR-001's current structured fields. BAE-001 accepts these only via an explicit, caller-supplied
//    `behavioralHint` on a TimelineEvent (lib/btrm/types.ts), mirroring ENR-001's `commitmentHint` pattern —
//    BAE-001 never infers them itself.
//  - Symmetry (spec §11): nothing here branches on subjectId's *value* (owner vs. tenant vs. vendor) — the same
//    rules produce the same eventClass/dimension for identical Commitment/TimelineEvent shapes regardless of who
//    the subject is. See observe.test.ts for a symmetry assertion using
//    lib/btrm/safeguards/guard.ts's assertSymmetricRuleSelection.

import type {
  TimelineEvent,
  Commitment,
  BehavioralObservation,
  BehavioralEventClass,
} from '../types';
import { dimensionFor } from './dimensions';

const COMMITMENT_STATUS_TO_EVENT_CLASS: Record<Exclude<Commitment['status'], 'open'>, BehavioralEventClass> = {
  modified: 'commitment_modified',
  fulfilled: 'commitment_fulfilled',
  partially_fulfilled: 'commitment_partially_fulfilled',
  fulfilled_late: 'commitment_fulfilled_late',
  not_fulfilled: 'commitment_not_fulfilled',
};

function makeObservation(
  matterId: string,
  subjectId: string,
  eventClass: BehavioralEventClass,
  sourceEventIds: string[],
  provenance: BehavioralObservation['provenance'],
  observedAt: string,
  magnitude?: number
): BehavioralObservation {
  const observation: BehavioralObservation = {
    id: crypto.randomUUID(),
    matterId,
    subjectId,
    dimension: dimensionFor(eventClass),
    eventClass,
    sourceEventIds,
    provenance,
    observedAt,
  };
  if (magnitude !== undefined) observation.magnitude = magnitude;
  return observation;
}

export interface ObserveOptions {
  /** ISO 8601 timestamp recorded on every observation as "when BAE-001 recorded this" (spec §4
   *  BehavioralObservation.observedAt — deliberately distinct from occurredAt). Defaults to the real current
   *  time; tests should always pass an explicit value to keep assertions deterministic. */
  observedAt?: string;
}

/**
 * BAE-001's single entry point. Consumes ENR-001's output (TimelineEvent[], Commitment[]) and produces
 * BehavioralObservation[] — see the module-level scoping notes above for exactly which observations are
 * derived automatically vs. only from an explicit `behavioralHint`.
 */
export function observe(events: TimelineEvent[], commitments: Commitment[], options: ObserveOptions = {}): BehavioralObservation[] {
  const observedAt = options.observedAt ?? new Date().toISOString();
  const eventsById = new Map(events.map((e) => [e.id, e]));
  const observations: BehavioralObservation[] = [];

  for (const commitment of commitments) {
    const createdEvent = eventsById.get(commitment.createdFromEventId);
    const createdProvenance = createdEvent?.provenance ?? 'unknown';

    observations.push(
      makeObservation(commitment.matterId, commitment.committer, 'commitment_made', [commitment.createdFromEventId], createdProvenance, observedAt)
    );

    if (commitment.status !== 'open') {
      const resolutionEventClass = COMMITMENT_STATUS_TO_EVENT_CLASS[commitment.status];
      const resolvingId = commitment.fulfilledEventId ?? commitment.createdFromEventId;
      const resolvingEvent = eventsById.get(resolvingId);
      observations.push(
        makeObservation(
          commitment.matterId,
          commitment.committer,
          resolutionEventClass,
          [resolvingId],
          resolvingEvent?.provenance ?? createdProvenance,
          observedAt
        )
      );
    }

    if (commitment.fulfilledEventId) {
      const resolvingEvent = eventsById.get(commitment.fulfilledEventId);
      if (resolvingEvent) {
        const promisedByMs = Date.parse(commitment.promisedBy);
        const resolvedAtMs = Date.parse(resolvingEvent.occurredAt);
        if (!Number.isNaN(promisedByMs) && !Number.isNaN(resolvedAtMs) && resolvedAtMs > promisedByMs) {
          const daysLate = (resolvedAtMs - promisedByMs) / 86_400_000;
          observations.push(
            makeObservation(
              commitment.matterId,
              commitment.committer,
              'deadline_missed',
              [commitment.fulfilledEventId],
              resolvingEvent.provenance,
              observedAt,
              daysLate
            )
          );
        }
      }
    }
  }

  for (const event of events) {
    if (!event.behavioralHint) continue;
    const hint = event.behavioralHint;
    observations.push(
      makeObservation(event.matterId, hint.subjectId, hint.eventClass, [event.id], event.provenance, observedAt, hint.magnitude)
    );
  }

  return observations;
}
