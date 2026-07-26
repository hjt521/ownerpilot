// lib/btrm/cs/adaptations.test.ts — CS-001 deterministic AudienceContext -> style-adaptation notes (BTRM-001 spec §3.8).

import { adaptationsFor } from './adaptations';
import type { AudienceContext } from '../types';

let passed = 0, failed = 0;
const check = (n: string, c: boolean, d = '') => { c ? passed++ : (failed++, console.log(`  ✗ ${n}${d ? ` — ${d}` : ''}`)); if (c) console.log(`  ✓ ${n}`); };

const audience = (overrides: Partial<AudienceContext> = {}): AudienceContext => ({
  partyId: 'tenant:1',
  readingLevel: 'standard',
  ...overrides,
});

check('plain reading level yields a plain-language note', adaptationsFor(audience({ readingLevel: 'plain' })).some((n) => n.includes('plain-language')));
check('standard reading level does not yield a plain-language note', !adaptationsFor(audience({ readingLevel: 'standard' })).some((n) => n.includes('plain-language')));
check('a language preference yields a translation note naming the language', adaptationsFor(audience({ languagePreference: 'es' })).some((n) => n.includes('es')));
check('no language preference yields no translation note', !adaptationsFor(audience({})).some((n) => n.includes('translation')));
check('de-escalation need yields an acknowledgment-first note', adaptationsFor(audience({ deEscalationNeeded: true })).some((n) => n.includes('acknowledgment')));
check('no de-escalation flag yields no acknowledgment note', !adaptationsFor(audience({ deEscalationNeeded: false })).some((n) => n.includes('acknowledgment')));
check('a bare standard-reading, no-language, no-de-escalation audience yields no adaptations at all', adaptationsFor(audience({})).length === 0);
check(
  'all three flags together yield all three notes',
  adaptationsFor(audience({ readingLevel: 'plain', languagePreference: 'zh', deEscalationNeeded: true })).length === 3
);

console.log(`\n${'-'.repeat(44)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(44)}`);
if (failed > 0) process.exit(1);
