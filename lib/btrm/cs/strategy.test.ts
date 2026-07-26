// lib/btrm/cs/strategy.test.ts — CS-001 end-to-end (BTRM-001 spec §3.8, §5 CS.strategy interface).

import { strategy } from './strategy';
import type { ResolutionOption, AudienceContext } from '../types';

let passed = 0, failed = 0;
const check = (n: string, c: boolean, d = '') => { c ? passed++ : (failed++, console.log(`  ✗ ${n}${d ? ` — ${d}` : ''}`)); if (c) console.log(`  ✓ ${n}`); };

const option = (overrides: Partial<ResolutionOption> = {}): ResolutionOption => ({
  id: 'option-1',
  matterId: 'matter-1',
  type: 'payment_plan',
  purpose: 'stub',
  requiredConditions: [],
  expectedBenefit: 'stub',
  materialRisks: [],
  relianceAssumptions: [],
  missingInformation: ['gap one'],
  reversibility: 'partially_reversible',
  deadlineImplications: '10 days from notice',
  documentationRequired: [],
  materialConsequence: false,
  humanReviewRequired: false,
  envelope: {
    evidenceCited: ['evt-1'],
    behaviorsIdentified: ['obs-1'],
    howRelianceDetermined: 'stub',
    missingInformation: ['gap one'],
    whatWouldChangeThis: 'stub',
    whyPreferred: 'stub',
  },
  ...overrides,
});

const audience = (overrides: Partial<AudienceContext> = {}): AudienceContext => ({
  partyId: 'tenant:1',
  readingLevel: 'plain',
  ...overrides,
});

const baseHint = (overrides: Partial<Parameters<typeof strategy>[0]> = {}): Parameters<typeof strategy>[0] => ({
  matterId: 'matter-1',
  option: option(),
  audience: audience(),
  factsStatement: 'Rent for June was not received by the due date.',
  requestedAction: 'Please submit the outstanding balance or propose a payment plan by the stated deadline.',
  ...overrides,
});

// -- a well-formed hint produces a complete, correctly-assembled recommendation --
{
  const result = strategy(baseHint());
  check('resolutionOptionRef cites the referenced option', result.resolutionOptionRef === 'option-1');
  check('factsStatement passes through unchanged', result.factsStatement === baseHint().factsStatement);
  check('allegationsStatement is undefined when not supplied', result.allegationsStatement === undefined);
  check('deadline defaults from the referenced options deadlineImplications', result.deadline === '10 days from notice');
  check('offeredOptions defaults to an empty array when not supplied', Array.isArray(result.offeredOptions) && result.offeredOptions.length === 0);
  check('humanReviewRequired is inherited from the referenced option (false here)', result.humanReviewRequired === false);
  check('styleAdaptations reflects the plain-reading audience', result.styleAdaptations.some((n) => n.includes('plain-language')));
  check('envelope evidenceCited is reused from the options own envelope', result.envelope.evidenceCited.includes('evt-1'));
  check('envelope missingInformation is reused from the option', result.envelope.missingInformation.includes('gap one'));
}

// -- facts and allegations stay in separate fields, never concatenated --
{
  const result = strategy(baseHint({ allegationsStatement: 'The tenant may be deliberately withholding payment.' }));
  check('allegationsStatement is preserved as its own field', result.allegationsStatement === 'The tenant may be deliberately withholding payment.');
  check('factsStatement does not absorb the allegation text', !result.factsStatement.includes('deliberately'));
}

// -- an explicit deadline override takes precedence over the options own deadlineImplications --
{
  const result = strategy(baseHint({ deadline: '2026-08-15T00:00:00Z' }));
  check('an explicit deadline override wins over option.deadlineImplications', result.deadline === '2026-08-15T00:00:00Z');
}

// -- humanReviewRequired is inherited from a material-consequence option, never lowered --
{
  const materialOption = option({ materialConsequence: true, humanReviewRequired: true });
  const result = strategy(baseHint({ option: materialOption }));
  check('humanReviewRequired true on the option is inherited, never lowered', result.humanReviewRequired === true);
}

// -- a prohibited character-label phrase in any free-text field is rejected, not silently shipped --
{
  check('a character label in factsStatement is rejected', (() => {
    try { strategy(baseHint({ factsStatement: 'The tenant is a deadbeat who never pays.' })); return false; }
    catch (err) { return err instanceof Error && err.message.includes('safeguard violation'); }
  })());
  check('a character label in allegationsStatement is rejected', (() => {
    try { strategy(baseHint({ allegationsStatement: 'This tenant is manipulative.' })); return false; }
    catch (err) { return err instanceof Error && err.message.includes('safeguard violation'); }
  })());
  check('a character label in requestedAction is rejected', (() => {
    try { strategy(baseHint({ requestedAction: 'Stop being a difficult tenant and pay.' })); return false; }
    catch (err) { return err instanceof Error && err.message.includes('safeguard violation'); }
  })());
}

console.log(`\n${'-'.repeat(44)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(44)}`);
if (failed > 0) process.exit(1);
