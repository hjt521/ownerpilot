// lib/btrm/cm/assess.test.ts — CM-001 end-to-end (BTRM-001 spec §3.4, §5 CM.assess interface).

import { assess } from './assess';
import type { TimelineEvent, Commitment, ProvenanceLedger } from '../types';

let passed = 0, failed = 0;
const check = (n: string, c: boolean, d = '') => { c ? passed++ : (failed++, console.log(`  ✗ ${n}${d ? ` — ${d}` : ''}`)); if (c) console.log(`  ✓ ${n}`); };

const ASSESSED_AT = '2026-06-01T00:00:00Z';
const emptyLedger: ProvenanceLedger = { entries: [] };

const event = (overrides: Partial<TimelineEvent>): TimelineEvent => ({
  id: overrides.id ?? 'evt-1',
  matterId: 'matter-1',
  occurredAt: '2026-01-01T00:00:00Z',
  eventType: 'message',
  participants: ['tenant:1'],
  sourceItemIds: overrides.sourceItemIds ?? ['ei-1'],
  provenance: overrides.provenance ?? 'confirmed_fact',
  disputed: overrides.disputed ?? false,
  ...overrides,
});

const commitment = (overrides: Partial<Commitment>): Commitment => ({
  id: overrides.id ?? 'c-1',
  matterId: 'matter-1',
  committer: 'tenant:1',
  description: 'Pay remaining balance',
  promisedBy: '2026-02-01T00:00:00Z',
  createdFromEventId: 'evt-1',
  status: 'open',
  ...overrides,
});

// -- empty scope: insufficient, all-zero numeric measures, no crash --
{
  const result = assess({ targetRef: 'ref-empty', events: [], commitments: [], ledger: emptyLedger }, { assessedAt: ASSESSED_AT });
  check('empty scope yields band insufficient', result.band === 'insufficient');
  check('empty scope has completeness 0', result.completeness === 0);
  check('empty scope has corroboration 0', result.corroboration === 0);
  check('empty scope has timelineCertainty 0', result.timelineCertainty === 0);
  check('empty scope has no contradictions', result.contradictions.length === 0);
  check('targetRef passes through', result.targetRef === 'ref-empty');
}

// -- fully corroborated, certain, classified, no contradictions, no open-past-deadline commitments: high --
{
  const events = [
    event({ id: 'evt-a', sourceItemIds: ['ei-1', 'ei-2'], provenance: 'confirmed_fact' }),
    event({ id: 'evt-b', sourceItemIds: ['ei-3', 'ei-4'], provenance: 'document_supported' }),
  ];
  const commitments = [commitment({ id: 'c-a', createdFromEventId: 'evt-a', status: 'fulfilled', promisedBy: '2026-02-01T00:00:00Z' })];
  const result = assess({ targetRef: 'ref-high', events, commitments, ledger: emptyLedger }, { assessedAt: ASSESSED_AT });
  check('fully corroborated/certain/classified evidence yields completeness 1', result.completeness === 1);
  check('fully corroborated/certain/classified evidence yields corroboration 1', result.corroboration === 1);
  check('fully corroborated/certain/classified evidence yields timelineCertainty 1', result.timelineCertainty === 1);
  check('no contradictions present', result.contradictions.length === 0);
  check('band is high when avg >= 0.75 and no contradictions', result.band === 'high');
}

// -- a disputed event caps the band at moderate even when numeric measures justify high --
{
  const events = [
    event({ id: 'evt-a', sourceItemIds: ['ei-1', 'ei-2'], provenance: 'confirmed_fact', disputed: true }),
    event({ id: 'evt-b', sourceItemIds: ['ei-3', 'ei-4'], provenance: 'document_supported' }),
  ];
  const result = assess({ targetRef: 'ref-disputed', events, commitments: [], ledger: emptyLedger }, { assessedAt: ASSESSED_AT });
  check('a disputed event is cited in contradictions', result.contradictions.some((c) => c.includes('evt-a')));
  check('a single unresolved contradiction caps the band at moderate, not high', result.band === 'moderate');
}

// -- unknown provenance and uncertain timestamps lower completeness/timelineCertainty and surface as missing --
{
  const events = [
    event({ id: 'evt-a', provenance: 'unknown' }),
    event({ id: 'evt-b', provenance: 'confirmed_fact', occurredAtUncertain: true }),
  ];
  const result = assess({ targetRef: 'ref-gaps', events, commitments: [], ledger: emptyLedger }, { assessedAt: ASSESSED_AT });
  check('unknown-provenance event lowers completeness', result.completeness === 0.5);
  check('unknown-provenance event is surfaced in missing', result.missing.some((m) => m.includes('evt-a') && m.includes('unknown provenance')));
  check('uncertain-timestamp event lowers timelineCertainty', result.timelineCertainty === 0.5);
}

// -- single-sourced events lower corroboration --
{
  const events = [event({ id: 'evt-a', sourceItemIds: ['ei-1'] }), event({ id: 'evt-b', sourceItemIds: ['ei-2', 'ei-3'] })];
  const result = assess({ targetRef: 'ref-corrob', events, commitments: [], ledger: emptyLedger }, { assessedAt: ASSESSED_AT });
  check('a single-sourced event lowers corroboration to 0.5', result.corroboration === 0.5);
}

// -- an open commitment past its promisedBy as of assessedAt is a documented gap --
{
  const commitments = [commitment({ id: 'c-late', status: 'open', promisedBy: '2026-01-01T00:00:00Z' })];
  const result = assess({ targetRef: 'ref-open-late', events: [event({})], commitments, ledger: emptyLedger }, { assessedAt: ASSESSED_AT });
  check('an open commitment past its promisedBy is surfaced in missing', result.missing.some((m) => m.includes('c-late') && m.includes('no recorded resolution')));
}

// -- an open commitment NOT yet past its promisedBy is not a gap --
{
  const commitments = [commitment({ id: 'c-future', status: 'open', promisedBy: '2026-12-01T00:00:00Z' })];
  const result = assess({ targetRef: 'ref-open-future', events: [event({})], commitments, ledger: emptyLedger }, { assessedAt: ASSESSED_AT });
  check('an open commitment not yet due is not flagged as missing', !result.missing.some((m) => m.includes('c-future')));
}

// -- a resolved commitment (non-open) is never flagged regardless of date --
{
  const commitments = [commitment({ id: 'c-done', status: 'fulfilled', promisedBy: '2020-01-01T00:00:00Z' })];
  const result = assess({ targetRef: 'ref-resolved', events: [event({})], commitments, ledger: emptyLedger }, { assessedAt: ASSESSED_AT });
  check('a resolved commitment is never flagged as an open-past-deadline gap', !result.missing.some((m) => m.includes('c-done')));
}

// -- moderate band: avg in [0.5, 0.75) --
{
  // evt-c fails all three measures (unknown provenance, single-sourced, uncertain timestamp); evt-a/evt-b pass
  // all three -> completeness = corroboration = timelineCertainty = 2/3 = 0.667, avg = 0.667.
  const events = [
    event({ id: 'evt-a', sourceItemIds: ['ei-1', 'ei-2'] }),
    event({ id: 'evt-b', sourceItemIds: ['ei-3', 'ei-4'] }),
    event({ id: 'evt-c', provenance: 'unknown', sourceItemIds: ['ei-5'], occurredAtUncertain: true }),
  ];
  const result = assess({ targetRef: 'ref-moderate', events, commitments: [], ledger: emptyLedger }, { assessedAt: ASSESSED_AT });
  check('avg in [0.5, 0.75) yields band moderate', result.band === 'moderate', `got ${result.band}, completeness=${result.completeness} corroboration=${result.corroboration} timelineCertainty=${result.timelineCertainty}`);
}

// -- low band: avg below 0.5 --
{
  const events = [
    event({ id: 'evt-a', provenance: 'unknown', sourceItemIds: ['ei-1'], occurredAtUncertain: true }),
    event({ id: 'evt-b', provenance: 'confirmed_fact', sourceItemIds: ['ei-2'], occurredAtUncertain: true }),
  ];
  const result = assess({ targetRef: 'ref-low', events, commitments: [], ledger: emptyLedger }, { assessedAt: ASSESSED_AT });
  check('mostly-uncertain/unclassified/uncorroborated evidence yields band low', result.band === 'low', `got ${result.band}`);
}

console.log(`\n${'-'.repeat(44)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(44)}`);
if (failed > 0) process.exit(1);
