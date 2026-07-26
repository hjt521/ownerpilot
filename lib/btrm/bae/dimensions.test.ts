// lib/btrm/bae/dimensions.test.ts — BAE-001 eventClass -> dimension canonical mapping (BTRM-001 spec §3.2).

import { EVENT_CLASS_DIMENSION, dimensionFor } from './dimensions';
import type { BehavioralEventClass, BehavioralDimension } from '../types';

let passed = 0, failed = 0;
const check = (n: string, c: boolean, d = '') => { c ? passed++ : (failed++, console.log(`  ✗ ${n}${d ? ` — ${d}` : ''}`)); if (c) console.log(`  ✓ ${n}`); };

const ALL_EVENT_CLASSES: BehavioralEventClass[] = [
  'commitment_made', 'commitment_modified', 'commitment_fulfilled', 'commitment_partially_fulfilled',
  'commitment_fulfilled_late', 'commitment_not_fulfilled', 'deadline_acknowledged', 'deadline_missed',
  'delay_disclosed_proactively', 'delay_disclosed_after_the_fact', 'documentation_supplied',
  'documentation_requested_not_supplied', 'communication_answered', 'communication_ignored',
  'contradiction_made', 'contradiction_voluntarily_corrected', 'agreement_accepted', 'agreement_rejected',
  'agreement_breached', 'cooperation_increased', 'cooperation_declined', 'conflict_escalated',
  'conflict_deescalated', 'required_action_completed', 'required_action_incomplete',
];

const ALL_DIMENSIONS: BehavioralDimension[] = [
  'performance', 'commitment', 'communication', 'documentation', 'cooperation', 'consistency', 'resolution',
];

check('every closed-vocabulary event class has a dimension mapping', ALL_EVENT_CLASSES.every((ec) => ec in EVENT_CLASS_DIMENSION));
check('every mapped dimension is one of the seven spec §3.2 dimensions', ALL_EVENT_CLASSES.every((ec) => ALL_DIMENSIONS.includes(EVENT_CLASS_DIMENSION[ec])));

check('commitment_made maps to commitment', dimensionFor('commitment_made') === 'commitment');
check('deadline_missed maps to performance', dimensionFor('deadline_missed') === 'performance');
check('communication_ignored maps to communication', dimensionFor('communication_ignored') === 'communication');
check('documentation_supplied maps to documentation', dimensionFor('documentation_supplied') === 'documentation');
check('cooperation_declined maps to cooperation', dimensionFor('cooperation_declined') === 'cooperation');
check('contradiction_made maps to consistency', dimensionFor('contradiction_made') === 'consistency');
check('conflict_escalated maps to resolution', dimensionFor('conflict_escalated') === 'resolution');

// every one of the seven dimensions is actually used by at least one event class (no orphaned dimension)
check('all seven dimensions are reachable from at least one event class', ALL_DIMENSIONS.every((d) => ALL_EVENT_CLASSES.some((ec) => dimensionFor(ec) === d)));

console.log(`\n${'-'.repeat(44)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(44)}`);
if (failed > 0) process.exit(1);
