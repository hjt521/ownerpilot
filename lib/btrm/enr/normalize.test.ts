// lib/btrm/enr/normalize.test.ts — ENR-001 end-to-end (BTRM-001 spec §3.1, §5 ENR.normalize interface).

import { normalize } from './normalize';
import type { EvidenceItem } from '../types';

let passed = 0, failed = 0;
const check = (n: string, c: boolean, d = '') => { c ? passed++ : (failed++, console.log(`  ✗ ${n}${d ? ` — ${d}` : ''}`)); if (c) console.log(`  ✓ ${n}`); };
const throws = (fn: () => void) => { try { fn(); return false; } catch { return true; } };

const item = (overrides: Partial<EvidenceItem>): EvidenceItem => ({
  id: overrides.id ?? 'ev-1',
  source: 'chat',
  timestamp: '2026-01-10T00:00:00Z',
  authorOrOrigin: 'owner:123',
  evidenceType: 'message',
  originalContentRef: 'ref-1',
  relatedMatter: 'matter-1',
  verificationStatus: 'unverified',
  accessPermissions: [],
  ...overrides,
});

// -- basic shape --
const single = normalize([item({})]);
check('one input item yields one event', single.events.length === 1);
check('event carries the input matterId', single.events[0].matterId === 'matter-1');
check('event carries the input occurredAt', single.events[0].occurredAt === '2026-01-10T00:00:00Z');
check('event sourceItemIds links back to the input id', single.events[0].sourceItemIds.includes('ev-1'));
check('no commitments are produced without a commitmentHint', single.commitments.length === 0);
check('provenance ledger has exactly one entry for the one event', single.provenance.entries.length === 1);
check('ledger entry targetType is timeline_event', single.provenance.entries[0].targetType === 'timeline_event');
check('ledger entry rationale is non-empty (no bare enum with no explanation)', single.provenance.entries[0].rationale.length > 0);

// -- immutability / no evidence dropped on exact duplicates --
const dupeResult = normalize([item({ id: 'a' }), item({ id: 'b' })]);
check('exact duplicates merge into one event, not two', dupeResult.events.length === 1);
check('both original ids survive in sourceItemIds (no evidence silently dropped)', dupeResult.events[0].sourceItemIds.length === 2);

// -- distinct items are not merged --
const distinctResult = normalize([item({ id: 'a' }), item({ id: 'c', source: 'email' })]);
check('genuinely distinct items yield two events', distinctResult.events.length === 2);

// -- provenance classification flows through --
const verifiedHard = normalize([item({ id: 'v1', verificationStatus: 'verified', evidenceType: 'payment_record' })]);
check('verified hard-record item is confirmed_fact', verifiedHard.events[0].provenance === 'confirmed_fact');

const disputedItem = normalize([item({ id: 'd1', verificationStatus: 'disputed' })]);
check('disputed item event is marked disputed:true', disputedItem.events[0].disputed === true);
check('disputed item provenance is disputed_statement', disputedItem.events[0].provenance === 'disputed_statement');

// -- commitment materialization only from an explicit hint --
const withHint = normalize([
  item({
    id: 'h1',
    commitmentHint: { committer: 'tenant:456', description: 'Pay remaining balance', promisedBy: '2026-02-01T00:00:00Z' },
  }),
]);
check('a commitmentHint produces exactly one Commitment', withHint.commitments.length === 1);
check('the Commitment links back to its creating event', withHint.commitments[0].createdFromEventId === withHint.events[0].id);
check('the Commitment starts in status "open"', withHint.commitments[0].status === 'open');
check('the ledger gets a second entry for the commitment', withHint.provenance.entries.filter((e) => e.targetType === 'commitment').length === 1);

const withoutHint = normalize([item({ id: 'nh1' })]);
check('no commitmentHint means no Commitment is fabricated from free text', withoutHint.commitments.length === 0);

// -- chronological ordering --
const outOfOrder = normalize([
  item({ id: 'late', timestamp: '2026-03-01T00:00:00Z' }),
  item({ id: 'early', timestamp: '2026-01-01T00:00:00Z', originalContentRef: 'ref-2' }),
]);
check('events are returned sorted chronologically within a matter', outOfOrder.events[0].sourceItemIds.includes('early') && outOfOrder.events[1].sourceItemIds.includes('late'));

// -- never invents a timestamp --
check('an unparseable timestamp throws rather than being invented', throws(() => normalize([item({ id: 'bad', timestamp: 'not-a-date' })])));

// -- determinism --
const items = [item({ id: 'x1' }), item({ id: 'x2', originalContentRef: 'ref-9' })];
const runA = normalize(items);
const runB = normalize(items);
check('normalize is deterministic for identical input (event count matches across runs)', runA.events.length === runB.events.length);

console.log(`\n${'-'.repeat(44)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(44)}`);
if (failed > 0) process.exit(1);
