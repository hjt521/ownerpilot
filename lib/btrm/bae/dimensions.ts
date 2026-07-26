// lib/btrm/bae/dimensions.ts
// BAE-001 — the single canonical BehavioralEventClass -> BehavioralDimension mapping (spec §3.2: "Behavioral
// dimensions (separate observation streams): performance, commitment, communication, documentation,
// cooperation, consistency, resolution"). Dimension is ALWAYS derived from this table, never taken from a
// caller-supplied BehavioralHint — one source of truth prevents a hint from miscategorizing an observation into
// the wrong stream. Extend only via a ratified BTRM-001 amendment, same governance as the event vocabulary
// itself (spec §3.2 "closed, extensible only by ratified amendment").

import type { BehavioralDimension, BehavioralEventClass } from '../types';

export const EVENT_CLASS_DIMENSION: Record<BehavioralEventClass, BehavioralDimension> = {
  commitment_made: 'commitment',
  commitment_modified: 'commitment',
  commitment_fulfilled: 'commitment',
  commitment_partially_fulfilled: 'commitment',
  commitment_fulfilled_late: 'commitment',
  commitment_not_fulfilled: 'commitment',

  deadline_acknowledged: 'performance',
  deadline_missed: 'performance',

  delay_disclosed_proactively: 'communication',
  delay_disclosed_after_the_fact: 'communication',

  documentation_supplied: 'documentation',
  documentation_requested_not_supplied: 'documentation',

  communication_answered: 'communication',
  communication_ignored: 'communication',

  contradiction_made: 'consistency',
  contradiction_voluntarily_corrected: 'consistency',

  agreement_accepted: 'commitment',
  agreement_rejected: 'commitment',
  agreement_breached: 'commitment',

  cooperation_increased: 'cooperation',
  cooperation_declined: 'cooperation',

  conflict_escalated: 'resolution',
  conflict_deescalated: 'resolution',

  required_action_completed: 'performance',
  required_action_incomplete: 'performance',
};

export function dimensionFor(eventClass: BehavioralEventClass): BehavioralDimension {
  return EVENT_CLASS_DIMENSION[eventClass];
}
