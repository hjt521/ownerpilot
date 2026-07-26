// lib/btrm/tm/dimensions.ts
// TM-001 — the canonical BehavioralEventClass -> RelianceDimensions key mapping, and the polarity (does this
// event support or undermine reliance) each event class carries (BTRM-001 spec §3.3; roadmap/TM-001_...).
// TM-001's seven reliance dimensions (performance, commitment, communication, documentation, agreement,
// representationConsistency, resolutionParticipation — lib/btrm/types.ts RelianceDimensions) are NOT the same
// seven as BAE-001's own behavioral dimensions (lib/btrm/bae/dimensions.ts: performance, commitment,
// communication, documentation, cooperation, consistency, resolution) — BAE-001 groups events by descriptive
// category, TM-001 groups the same events by what reliance question they answer (e.g. an accepted/rejected/
// breached agreement is a 'commitment'-dimension BAE-001 observation, but its own dedicated 'agreement'
// reliance dimension in TM-001, since the ratified TM-001 spec lists Agreement as independent from Commitment).
// This file is therefore its own mapping, not a re-export of BAE-001's. Extend only via a ratified BTRM-001
// amendment, same governance as the underlying event vocabulary itself (spec §3.2).

import type { BehavioralEventClass } from '../types';

export type RelianceDimensionKey =
  | 'performance'
  | 'commitment'
  | 'communication'
  | 'documentation'
  | 'agreement'
  | 'representationConsistency'
  | 'resolutionParticipation';

/** Does an observation of this event class support reliance, undermine it, or neither? A 'neutral' class still
 *  counts as evidence that the dimension is "in play," but on its own it never moves a dimension off
 *  'indeterminate' — e.g. a commitment being *made* says nothing yet about whether it will be kept; only its
 *  resolution classes (fulfilled/not_fulfilled/etc.) carry a direction. See reliance.ts for how polarity is used. */
export type Polarity = 'positive' | 'negative' | 'neutral';

export const EVENT_CLASS_RELIANCE_DIMENSION: Record<BehavioralEventClass, RelianceDimensionKey> = {
  commitment_made: 'commitment',
  commitment_modified: 'commitment',
  commitment_fulfilled: 'commitment',
  commitment_partially_fulfilled: 'commitment',
  commitment_fulfilled_late: 'commitment',
  commitment_not_fulfilled: 'commitment',

  deadline_acknowledged: 'performance',
  deadline_missed: 'performance',
  required_action_completed: 'performance',
  required_action_incomplete: 'performance',

  delay_disclosed_proactively: 'communication',
  delay_disclosed_after_the_fact: 'communication',
  communication_answered: 'communication',
  communication_ignored: 'communication',

  documentation_supplied: 'documentation',
  documentation_requested_not_supplied: 'documentation',

  agreement_accepted: 'agreement',
  agreement_rejected: 'agreement',
  agreement_breached: 'agreement',

  contradiction_made: 'representationConsistency',
  contradiction_voluntarily_corrected: 'representationConsistency',

  cooperation_increased: 'resolutionParticipation',
  cooperation_declined: 'resolutionParticipation',
  conflict_escalated: 'resolutionParticipation',
  conflict_deescalated: 'resolutionParticipation',
};

export const EVENT_CLASS_POLARITY: Record<BehavioralEventClass, Polarity> = {
  commitment_made: 'neutral', // a commitment being made says nothing yet about whether it will be kept
  commitment_modified: 'neutral', // a modification alone is not itself positive or negative
  commitment_fulfilled: 'positive',
  commitment_partially_fulfilled: 'negative',
  commitment_fulfilled_late: 'negative',
  commitment_not_fulfilled: 'negative',

  deadline_acknowledged: 'positive',
  deadline_missed: 'negative',
  required_action_completed: 'positive',
  required_action_incomplete: 'negative',

  delay_disclosed_proactively: 'positive', // proactive disclosure is evidence of reliable communication
  delay_disclosed_after_the_fact: 'negative',
  communication_answered: 'positive',
  communication_ignored: 'negative',

  documentation_supplied: 'positive',
  documentation_requested_not_supplied: 'negative',

  agreement_accepted: 'neutral', // declining a proposed agreement is not itself unreliable
  agreement_rejected: 'neutral',
  agreement_breached: 'negative',

  contradiction_made: 'negative',
  contradiction_voluntarily_corrected: 'positive', // self-correction is a positive signal, not a neutral one

  cooperation_increased: 'positive',
  cooperation_declined: 'negative',
  conflict_escalated: 'negative',
  conflict_deescalated: 'positive',
};

export function relianceDimensionFor(eventClass: BehavioralEventClass): RelianceDimensionKey {
  return EVENT_CLASS_RELIANCE_DIMENSION[eventClass];
}

export function polarityFor(eventClass: BehavioralEventClass): Polarity {
  return EVENT_CLASS_POLARITY[eventClass];
}

export const ALL_RELIANCE_DIMENSIONS: RelianceDimensionKey[] = [
  'performance',
  'commitment',
  'communication',
  'documentation',
  'agreement',
  'representationConsistency',
  'resolutionParticipation',
];
