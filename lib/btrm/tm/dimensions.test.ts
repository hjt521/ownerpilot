// lib/btrm/tm/dimensions.test.ts — TM-001 eventClass -> reliance-dimension/polarity canonical mapping (BTRM-001 spec §3.3).

import { EVENT_CLASS_RELIANCE_DIMENSION, EVENT_CLASS_POLARITY, relianceDimensionFor, polarityFor, ALL_RELIANCE_DIMENSIONS } from './dimensions';
import type { BehavioralEventClass } from '../types';

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

check('every closed-vocabulary event class has a reliance-dimension mapping', ALL_EVENT_CLASSES.every((ec) => ec in EVENT_CLASS_RELIANCE_DIMENSION));
check('every closed-vocabulary event class has a polarity', ALL_EVENT_CLASSES.every((ec) => ec in EVENT_CLASS_POLARITY));
check('every mapped dimension is one of the seven TM-001 dimensions', ALL_EVENT_CLASSES.every((ec) => ALL_RELIANCE_DIMENSIONS.includes(relianceDimensionFor(ec))));
check('all seven reliance dimensions are reachable from at least one event class', ALL_RELIANCE_DIMENSIONS.every((d) => ALL_EVENT_CLASSES.some((ec) => relianceDimensionFor(ec) === d)));

check('commitment_fulfilled maps to commitment / positive', relianceDimensionFor('commitment_fulfilled') === 'commitment' && polarityFor('commitment_fulfilled') === 'positive');
check('commitment_not_fulfilled maps to commitment / negative', relianceDimensionFor('commitment_not_fulfilled') === 'commitment' && polarityFor('commitment_not_fulfilled') === 'negative');
check('deadline_missed maps to performance / negative', relianceDimensionFor('deadline_missed') === 'performance' && polarityFor('deadline_missed') === 'negative');
check('documentation_supplied maps to documentation / positive', relianceDimensionFor('documentation_supplied') === 'documentation' && polarityFor('documentation_supplied') === 'positive');
check('agreement_breached maps to agreement (distinct from BAE-001s commitment dimension) / negative', relianceDimensionFor('agreement_breached') === 'agreement' && polarityFor('agreement_breached') === 'negative');
check('contradiction_made maps to representationConsistency / negative', relianceDimensionFor('contradiction_made') === 'representationConsistency' && polarityFor('contradiction_made') === 'negative');
check('contradiction_voluntarily_corrected is positive, not neutral', polarityFor('contradiction_voluntarily_corrected') === 'positive');
check('conflict_escalated maps to resolutionParticipation / negative', relianceDimensionFor('conflict_escalated') === 'resolutionParticipation' && polarityFor('conflict_escalated') === 'negative');
check('commitment_made is neutral (making a commitment is not yet evidence of fulfillment)', polarityFor('commitment_made') === 'neutral');
check('agreement_rejected is neutral (declining is not itself unreliable)', polarityFor('agreement_rejected') === 'neutral');

console.log(`\n${'-'.repeat(44)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(44)}`);
if (failed > 0) process.exit(1);
