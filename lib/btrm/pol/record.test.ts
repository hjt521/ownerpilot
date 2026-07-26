// lib/btrm/pol/record.test.ts — POL-001 end-to-end (BTRM-001 spec §3.9, §5 POL.record interface).

import { record } from './record';

let passed = 0, failed = 0;
const check = (n: string, c: boolean, d = '') => { c ? passed++ : (failed++, console.log(`  ✗ ${n}${d ? ` — ${d}` : ''}`)); if (c) console.log(`  ✓ ${n}`); };

const ASOF = '2026-07-26T00:00:00Z';

const hint = (overrides: Partial<Parameters<typeof record>[0]> = {}): Parameters<typeof record>[0] => ({
  matterId: 'matter-1',
  optionId: 'option-1',
  result: 'completed_on_time',
  recordedAt: ASOF,
  ...overrides,
});

// -- a fresh outcome (recordedAt === asOf) carries full recency weight --
{
  const result = record(hint(), { asOf: ASOF });
  check('recordedAt === asOf yields recencyWeight of 1', result.recencyWeight === 1);
  check('result passes through unchanged', result.result === 'completed_on_time');
  check('matterId and optionId pass through unchanged', result.matterId === 'matter-1' && result.optionId === 'option-1');
}

// -- an outcome exactly one half-life old decays to ~0.5 --
{
  const oneHalfLifeAgo = new Date(Date.parse(ASOF) - 180 * 86_400_000).toISOString();
  const result = record(hint({ recordedAt: oneHalfLifeAgo }), { asOf: ASOF, halfLifeDays: 180 });
  check('one half-life old yields recencyWeight of ~0.5', Math.abs(result.recencyWeight - 0.5) < 0.001);
}

// -- an outcome two half-lives old decays to ~0.25 --
{
  const twoHalfLivesAgo = new Date(Date.parse(ASOF) - 360 * 86_400_000).toISOString();
  const result = record(hint({ recordedAt: twoHalfLivesAgo }), { asOf: ASOF, halfLifeDays: 180 });
  check('two half-lives old yields recencyWeight of ~0.25', Math.abs(result.recencyWeight - 0.25) < 0.001);
}

// -- relevantToCurrentClaim: false zeroes the weight regardless of recency --
{
  const result = record(hint({ relevantToCurrentClaim: false }), { asOf: ASOF });
  check('an irrelevant outcome has recencyWeight 0 even though it is fresh', result.recencyWeight === 0);
}

// -- relevantToCurrentClaim defaults to true when omitted --
{
  const result = record(hint(), { asOf: ASOF });
  check('omitting relevantToCurrentClaim defaults to relevant (nonzero weight for a fresh outcome)', result.recencyWeight === 1);
}

// -- a future-dated recordedAt (relative to asOf) is clamped, never exceeding a weight of 1 --
{
  const future = new Date(Date.parse(ASOF) + 30 * 86_400_000).toISOString();
  const result = record(hint({ recordedAt: future }), { asOf: ASOF });
  check('a future-dated outcome does not exceed recencyWeight of 1', result.recencyWeight === 1);
}

// -- contextNotes is preserved verbatim, never dropped or rewritten --
{
  const result = record(hint({ contextNotes: 'documented medical emergency delayed payment by 5 days' }), { asOf: ASOF });
  check('contextNotes is preserved verbatim', result.contextNotes === 'documented medical emergency delayed payment by 5 days');
}

// -- contextNotes is undefined when not supplied, never fabricated --
{
  const result = record(hint(), { asOf: ASOF });
  check('contextNotes is undefined when not supplied', result.contextNotes === undefined);
}

// -- a prohibited character-label phrase in contextNotes is rejected, not silently shipped --
{
  check('a character label in contextNotes is rejected', (() => {
    try { record(hint({ contextNotes: 'this tenant is a deadbeat' }), { asOf: ASOF }); return false; }
    catch (err) { return err instanceof Error && err.message.includes('safeguard violation'); }
  })());
}

// -- each call produces a distinct id --
{
  const a = record(hint(), { asOf: ASOF });
  const b = record(hint(), { asOf: ASOF });
  check('each record has a distinct id', a.id !== b.id);
}

console.log(`\n${'-'.repeat(44)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(44)}`);
if (failed > 0) process.exit(1);
