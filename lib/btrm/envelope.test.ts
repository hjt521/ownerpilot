// lib/btrm/envelope.test.ts — BTRM-001 §5 explainability envelope guard.

import { isCompleteEnvelope, assertCompleteEnvelope, buildEnvelope, type ExplainabilityEnvelope } from './envelope';

let passed = 0, failed = 0;
const check = (n: string, c: boolean, d = '') => { c ? passed++ : (failed++, console.log(`  ✗ ${n}${d ? ` — ${d}` : ''}`)); if (c) console.log(`  ✓ ${n}`); };

const complete: ExplainabilityEnvelope = buildEnvelope({
  evidenceCited: ['evt-1', 'evt-2'],
  behaviorsIdentified: ['obs-1'],
  howRelianceDetermined: 'Two of three prior commitments fulfilled late; documentation always provided.',
  missingInformation: ['no bank record for the May 10 payment'],
  whatWouldChangeThis: 'A returned payment or contradictory income documentation would lower reliance.',
  whyPreferred: 'Preferred over immediate escalation because prior payment plans were ultimately completed.',
});

check('a fully-populated envelope is complete', isCompleteEnvelope(complete));
check('assertCompleteEnvelope does not throw on a complete envelope', (() => {
  try { assertCompleteEnvelope(complete); return true; } catch { return false; }
})());

check('missing evidenceCited is incomplete', !isCompleteEnvelope({ ...complete, evidenceCited: [] }));
check('empty howRelianceDetermined is incomplete', !isCompleteEnvelope({ ...complete, howRelianceDetermined: '' }));
check('empty whatWouldChangeThis is incomplete', !isCompleteEnvelope({ ...complete, whatWouldChangeThis: '' }));
check('empty whyPreferred is incomplete', !isCompleteEnvelope({ ...complete, whyPreferred: '' }));
check('missing field entirely is incomplete', !isCompleteEnvelope({ evidenceCited: ['x'] }));
check('non-object is incomplete', !isCompleteEnvelope('not an envelope'));

check('assertCompleteEnvelope throws on an incomplete envelope (no black-box results, spec §5)', (() => {
  try { assertCompleteEnvelope({ ...complete, whyPreferred: '' }); return false; } catch { return true; }
})());

console.log(`\n${'-'.repeat(44)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(44)}`);
if (failed > 0) process.exit(1);
