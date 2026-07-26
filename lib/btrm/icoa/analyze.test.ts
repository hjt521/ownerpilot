// lib/btrm/icoa/analyze.test.ts — ICOA-001 end-to-end (BTRM-001 spec §3.5, §5 ICOA.analyze interface).

import { analyze } from './analyze';
import type { TimelineEvent, Commitment, InterestConstraintHint, Provenance } from '../types';

let passed = 0, failed = 0;
const check = (n: string, c: boolean, d = '') => { c ? passed++ : (failed++, console.log(`  ✗ ${n}${d ? ` — ${d}` : ''}`)); if (c) console.log(`  ✓ ${n}`); };

const event = (id: string, provenance: Provenance): TimelineEvent => ({
  id,
  matterId: 'matter-1',
  occurredAt: '2026-01-01T00:00:00Z',
  eventType: 'message',
  participants: ['tenant:1'],
  sourceItemIds: ['ei-1'],
  provenance,
  disputed: false,
});

const commitment = (id: string, createdFromEventId: string): Commitment => ({
  id,
  matterId: 'matter-1',
  committer: 'tenant:1',
  description: 'Pay remaining balance',
  promisedBy: '2026-02-01T00:00:00Z',
  createdFromEventId,
  status: 'open',
});

const hint = (overrides: Partial<InterestConstraintHint>): InterestConstraintHint => ({
  matterId: 'matter-1',
  partyId: 'tenant:1',
  kind: 'interest',
  statement: 'tenant wants a payment plan',
  ...overrides,
});

const events = [
  event('evt-confirmed', 'confirmed_fact'),
  event('evt-doc', 'document_supported'),
  event('evt-unverified', 'unverified_statement'),
  event('evt-disputed', 'disputed_statement'),
  event('evt-ai', 'ai_inference'),
  event('evt-unknown', 'unknown'),
  event('evt-pattern-a', 'confirmed_fact'),
  event('evt-pattern-b', 'confirmed_fact'),
];
const commitments = [commitment('c-1', 'evt-pattern-a')];

// -- direct statement, graded by the stated event's own provenance --
{
  const result = analyze([hint({ explicitlyStatedEventId: 'evt-confirmed' })], { events, commitments });
  check('a direct statement recorded as confirmed_fact yields confirmed', result[0].supportLabel === 'confirmed');
  check('sourceEventIds cites the stated event', result[0].sourceEventIds.includes('evt-confirmed'));
}
{
  const result = analyze([hint({ explicitlyStatedEventId: 'evt-doc' })], { events, commitments });
  check('a direct statement recorded as document_supported yields confirmed', result[0].supportLabel === 'confirmed');
}
{
  const result = analyze([hint({ explicitlyStatedEventId: 'evt-unverified' })], { events, commitments });
  check('a direct statement recorded as unverified_statement yields likely', result[0].supportLabel === 'likely');
}
{
  const result = analyze([hint({ explicitlyStatedEventId: 'evt-disputed' })], { events, commitments });
  check('a direct statement recorded as disputed_statement yields possible', result[0].supportLabel === 'possible');
}
{
  const result = analyze([hint({ explicitlyStatedEventId: 'evt-ai' })], { events, commitments });
  check('a direct statement recorded as ai_inference yields possible', result[0].supportLabel === 'possible');
}
{
  const result = analyze([hint({ explicitlyStatedEventId: 'evt-unknown' })], { events, commitments });
  check('a direct statement recorded as unknown provenance yields possible', result[0].supportLabel === 'possible');
}

// -- a direct-statement reference to a nonexistent event contributes no support (no fabrication) --
{
  const result = analyze([hint({ explicitlyStatedEventId: 'evt-does-not-exist' })], { events, commitments });
  check('a direct statement citing a nonexistent event yields unknown', result[0].supportLabel === 'unknown');
  check('sourceEventIds is empty when the cited event does not resolve', result[0].sourceEventIds.length === 0);
}

// -- pattern-based support, graded strictly by count of RESOLVED references --
{
  const result = analyze([hint({ relatedEventIds: ['evt-pattern-a', 'evt-pattern-b'] })], { events, commitments });
  check('two resolved related events yield likely', result[0].supportLabel === 'likely');
  check('sourceEventIds cites both resolved events', result[0].sourceEventIds.includes('evt-pattern-a') && result[0].sourceEventIds.includes('evt-pattern-b'));
}
{
  const result = analyze([hint({ relatedEventIds: ['evt-pattern-a'] })], { events, commitments });
  check('one resolved related event yields possible', result[0].supportLabel === 'possible');
}
{
  const result = analyze([hint({})], { events, commitments });
  check('no related references at all yields unknown', result[0].supportLabel === 'unknown');
  check('no related references yields empty sourceEventIds', result[0].sourceEventIds.length === 0);
}

// -- a related reference to a nonexistent id does not count toward the pattern total (no fabricated support) --
{
  const result = analyze([hint({ relatedEventIds: ['evt-pattern-a', 'evt-does-not-exist'] })], { events, commitments });
  check('an unresolved related event id does not count toward the total', result[0].supportLabel === 'possible', `got ${result[0].supportLabel}`);
}

// -- resolved relatedCommitmentIds count toward the pattern total and surface via their createdFromEventId --
{
  const result = analyze([hint({ relatedEventIds: ['evt-pattern-b'], relatedCommitmentIds: ['c-1'] })], { events, commitments });
  check('a resolved commitment plus a resolved event together reach likely (count 2)', result[0].supportLabel === 'likely');
  check('sourceEventIds surfaces the commitments createdFromEventId, not the commitment id', result[0].sourceEventIds.includes('evt-pattern-a') && !result[0].sourceEventIds.includes('c-1'));
}
{
  const result = analyze([hint({ relatedCommitmentIds: ['c-does-not-exist'] })], { events, commitments });
  check('an unresolved related commitment id contributes nothing', result[0].supportLabel === 'unknown');
}

// -- multiple hints processed independently, one output per hint, fields pass through unchanged --
{
  const hints = [
    hint({ partyId: 'tenant:1', kind: 'interest', statement: 'tenant wants more time', explicitlyStatedEventId: 'evt-confirmed' }),
    hint({ partyId: 'owner:1', kind: 'constraint', statement: 'owner has a statutory deadline', relatedEventIds: ['evt-pattern-a'] }),
  ];
  const result = analyze(hints, { events, commitments });
  check('two hints yield two results in the same order', result.length === 2);
  check('partyId passes through unchanged', result[0].partyId === 'tenant:1' && result[1].partyId === 'owner:1');
  check('kind passes through unchanged', result[0].kind === 'interest' && result[1].kind === 'constraint');
  check('statement passes through unchanged', result[0].statement === 'tenant wants more time');
  check('matterId passes through unchanged', result[1].matterId === 'matter-1');
  check('each result has a distinct id', result[0].id !== result[1].id);
}

console.log(`\n${'-'.repeat(44)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(44)}`);
if (failed > 0) process.exit(1);
