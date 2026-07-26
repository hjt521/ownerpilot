// lib/btrm/bae/observe.test.ts — BAE-001 end-to-end (BTRM-001 spec §3.2, §5 BAE.observe interface).

import { observe } from './observe';
import { assertSymmetricRuleSelection } from '../safeguards/guard';
import type { TimelineEvent, Commitment } from '../types';

let passed = 0, failed = 0;
const check = (n: string, c: boolean, d = '') => { c ? passed++ : (failed++, console.log(`  ✗ ${n}${d ? ` — ${d}` : ''}`)); if (c) console.log(`  ✓ ${n}`); };

const OBSERVED_AT = '2026-06-01T00:00:00Z';

const madeEvent: TimelineEvent = {
  id: 'evt-made',
  matterId: 'matter-1',
  occurredAt: '2026-01-01T00:00:00Z',
  eventType: 'message',
  participants: ['tenant:1'],
  sourceItemIds: ['ei-1'],
  provenance: 'document_supported',
  disputed: false,
};

const commitment = (overrides: Partial<Commitment>): Commitment => ({
  id: overrides.id ?? 'c-1',
  matterId: 'matter-1',
  committer: 'tenant:1',
  description: 'Pay remaining balance',
  promisedBy: '2026-02-01T00:00:00Z',
  createdFromEventId: 'evt-made',
  status: 'open',
  ...overrides,
});

// -- open commitment: only commitment_made, no resolution, no deadline check --
{
  const result = observe([madeEvent], [commitment({})], { observedAt: OBSERVED_AT });
  check('an open commitment yields exactly one observation (commitment_made)', result.length === 1);
  check('that observation is commitment_made', result[0].eventClass === 'commitment_made');
  check('dimension is commitment', result[0].dimension === 'commitment');
  check('subjectId is the committer', result[0].subjectId === 'tenant:1');
  check('provenance is inherited from the creating event', result[0].provenance === 'document_supported');
  check('observedAt matches the supplied option (deterministic, not wall-clock)', result[0].observedAt === OBSERVED_AT);
}

// -- fulfilled on time: commitment_made + commitment_fulfilled, no deadline_missed --
{
  const onTimeEvent: TimelineEvent = { ...madeEvent, id: 'evt-ontime', occurredAt: '2026-01-20T00:00:00Z', provenance: 'confirmed_fact' };
  const c = commitment({ status: 'fulfilled', fulfilledEventId: 'evt-ontime' });
  const result = observe([madeEvent, onTimeEvent], [c], { observedAt: OBSERVED_AT });
  check('fulfilled-on-time yields two observations (made + fulfilled)', result.length === 2);
  check('second observation is commitment_fulfilled', result[1].eventClass === 'commitment_fulfilled');
  check('resolution observation provenance comes from the resolving event', result[1].provenance === 'confirmed_fact');
  check('no deadline_missed observation when resolved before promisedBy', !result.some((o) => o.eventClass === 'deadline_missed'));
}

// -- fulfilled late: commitment_made + commitment_fulfilled_late + deadline_missed with magnitude --
{
  const lateEvent: TimelineEvent = { ...madeEvent, id: 'evt-late', occurredAt: '2026-02-05T00:00:00Z' };
  const c = commitment({ status: 'fulfilled_late', fulfilledEventId: 'evt-late' });
  const result = observe([madeEvent, lateEvent], [c], { observedAt: OBSERVED_AT });
  check('fulfilled-late yields three observations (made + fulfilled_late + deadline_missed)', result.length === 3);
  check('resolution observation is commitment_fulfilled_late', result[1].eventClass === 'commitment_fulfilled_late');
  const missed = result.find((o) => o.eventClass === 'deadline_missed');
  check('a deadline_missed observation is present', missed !== undefined);
  check('deadline_missed dimension is performance', missed?.dimension === 'performance');
  check('deadline_missed magnitude is 4 days (Feb 1 -> Feb 5)', missed?.magnitude === 4);
}

// -- not fulfilled, no linked resolving event: made + not_fulfilled, but NO deadline_missed guess --
{
  const c = commitment({ status: 'not_fulfilled' });
  const result = observe([madeEvent], [c], { observedAt: OBSERVED_AT });
  check('not-fulfilled-without-a-linked-event yields two observations (made + not_fulfilled)', result.length === 2);
  check('no deadline_missed is fabricated without a concrete resolving event', !result.some((o) => o.eventClass === 'deadline_missed'));
}

// -- behavioralHint on an event materializes exactly one observation, dimension always computed centrally --
{
  const hintedEvent: TimelineEvent = {
    ...madeEvent,
    id: 'evt-hinted',
    behavioralHint: { eventClass: 'communication_ignored', subjectId: 'owner:9', magnitude: 3 },
  };
  const result = observe([hintedEvent], [], { observedAt: OBSERVED_AT });
  check('a behavioralHint produces exactly one observation', result.length === 1);
  check('eventClass matches the hint', result[0].eventClass === 'communication_ignored');
  check('dimension is computed from the canonical table, not the hint', result[0].dimension === 'communication');
  check('subjectId matches the hint', result[0].subjectId === 'owner:9');
  check('magnitude passes through from the hint', result[0].magnitude === 3);
}

check('no behavioralHint means no extra observation is fabricated for that event', observe([madeEvent], []).length === 0);

// -- symmetry (spec §11): identical shapes for different subjectId values produce identical classification --
{
  const forOwner = commitment({ id: 'sym-a', committer: 'owner:1', status: 'not_fulfilled' });
  const forTenant = commitment({ id: 'sym-b', committer: 'tenant:1', status: 'not_fulfilled' });
  const resultOwner = observe([madeEvent], [forOwner], { observedAt: OBSERVED_AT }).map((o) => ({ eventClass: o.eventClass, dimension: o.dimension }));
  const resultTenant = observe([madeEvent], [forTenant], { observedAt: OBSERVED_AT }).map((o) => ({ eventClass: o.eventClass, dimension: o.dimension }));
  check('classification is symmetric across subjectId (owner vs tenant)', (() => {
    try { assertSymmetricRuleSelection(resultOwner, resultTenant, 'owner-vs-tenant not_fulfilled'); return true; } catch { return false; }
  })());
}

console.log(`\n${'-'.repeat(44)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(44)}`);
if (failed > 0) process.exit(1);
