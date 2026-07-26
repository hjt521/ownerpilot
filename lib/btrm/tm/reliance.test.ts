// lib/btrm/tm/reliance.test.ts — TM-001 end-to-end (BTRM-001 spec §3.3, §5 TM.reliance interface).

import { reliance } from './reliance';
import { assertSymmetricRuleSelection } from '../safeguards/guard';
import type { BehavioralObservation, ConfidenceAssessment, BehavioralEventClass } from '../types';

let passed = 0, failed = 0;
const check = (n: string, c: boolean, d = '') => { c ? passed++ : (failed++, console.log(`  ✗ ${n}${d ? ` — ${d}` : ''}`)); if (c) console.log(`  ✓ ${n}`); };

const ASSESSED_AT = '2026-06-01T00:00:00Z';

const claim = (subjectId: string) => ({
  matterId: 'matter-1',
  subjectId,
  claimRef: 'commitment:c-1',
  context: 'payment-plan-review',
  decisionUse: 'evaluate whether to extend a second payment plan',
});

const confidence = (overrides: Partial<ConfidenceAssessment> = {}): ConfidenceAssessment => ({
  id: 'conf-1',
  targetRef: 'ref-1',
  completeness: 1,
  corroboration: 1,
  timelineCertainty: 1,
  contradictions: [],
  missing: [],
  band: 'high',
  ...overrides,
});

let obsCounter = 0;
const obs = (eventClass: BehavioralEventClass, subjectId: string): BehavioralObservation => ({
  id: `obs-${++obsCounter}`,
  matterId: 'matter-1',
  subjectId,
  dimension: 'performance', // BAE-001's own dimension field — irrelevant to TM-001, which uses eventClass directly
  eventClass,
  sourceEventIds: ['evt-1'],
  provenance: 'confirmed_fact',
  observedAt: ASSESSED_AT,
});

// -- no observations at all: every dimension indeterminate, headline indeterminate, human review required --
{
  const result = reliance(claim('tenant:1'), [], confidence(), { assessedAt: ASSESSED_AT });
  check('no observations yields every dimension indeterminate', Object.values(result.dimensions).every((v) => v === 'indeterminate'));
  check('no observations yields headline indeterminate', result.relianceLevel === 'indeterminate');
  check('no observations requires human review', result.humanReviewRequired === true);
  check('no observations yields no supporting factors', result.supportingFactors.length === 0);
  check('no observations yields no limiting factors', result.limitingFactors.length === 0);
}

// -- a single assessed dimension among six indeterminate ones: majority-indeterminate rule controls the headline --
{
  const observations = [obs('commitment_fulfilled', 'tenant:1'), obs('commitment_fulfilled', 'tenant:1')];
  const result = reliance(claim('tenant:1'), observations, confidence(), { assessedAt: ASSESSED_AT });
  check('commitment dimension is elevated (two clean positives)', result.dimensions.commitment === 'elevated');
  check('the other six dimensions remain indeterminate (no observations)', result.dimensions.performance === 'indeterminate' && result.dimensions.agreement === 'indeterminate');
  check('headline is indeterminate when indeterminate dimensions are in the majority, even with one elevated dimension', result.relianceLevel === 'indeterminate');
}

// -- four assessed dimensions, all elevated, three indeterminate: assessed is the majority, headline elevated --
{
  const observations = [
    obs('commitment_fulfilled', 'tenant:1'), obs('commitment_fulfilled', 'tenant:1'),
    obs('deadline_acknowledged', 'tenant:1'), obs('required_action_completed', 'tenant:1'),
    obs('communication_answered', 'tenant:1'), obs('communication_answered', 'tenant:1'),
    obs('documentation_supplied', 'tenant:1'), obs('documentation_supplied', 'tenant:1'),
  ];
  const result = reliance(claim('tenant:1'), observations, confidence(), { assessedAt: ASSESSED_AT });
  check('commitment dimension is elevated', result.dimensions.commitment === 'elevated');
  check('performance dimension is elevated (two positives, no negatives)', result.dimensions.performance === 'elevated');
  check('communication dimension is elevated', result.dimensions.communication === 'elevated');
  check('documentation dimension is elevated', result.dimensions.documentation === 'elevated');
  check('headline is elevated when every assessed dimension is elevated and assessed is the majority', result.relianceLevel === 'elevated');
}

// -- a single negative-dominant dimension controls the headline outright (weakest link, not averaged away) --
{
  const observations = [
    obs('commitment_fulfilled', 'tenant:1'), obs('commitment_fulfilled', 'tenant:1'),
    obs('deadline_acknowledged', 'tenant:1'), obs('required_action_completed', 'tenant:1'),
    obs('communication_answered', 'tenant:1'), obs('communication_answered', 'tenant:1'),
    obs('documentation_requested_not_supplied', 'tenant:1'), // sole documentation observation: negative
  ];
  const result = reliance(claim('tenant:1'), observations, confidence(), { assessedAt: ASSESSED_AT });
  check('documentation dimension is no_reliance (its only observation is negative)', result.dimensions.documentation === 'no_reliance');
  check('a single no_reliance dimension controls the headline despite three elevated dimensions', result.relianceLevel === 'no_reliance');
  check('no_reliance headline requires human review', result.humanReviewRequired === true);
  check('the failing dimension is cited in limitingFactors', result.limitingFactors.some((f) => f.startsWith('documentation:')));
}

// -- a mixed-but-majority-negative dimension yields limited, and limited controls the headline --
{
  const observations = [
    obs('commitment_fulfilled', 'tenant:1'), obs('commitment_fulfilled', 'tenant:1'), // commitment: elevated
    obs('deadline_missed', 'tenant:1'), obs('deadline_missed', 'tenant:1'), obs('deadline_acknowledged', 'tenant:1'), // performance: 1 positive, 2 negative -> limited
    obs('communication_answered', 'tenant:1'), obs('communication_answered', 'tenant:1'),
  ];
  const result = reliance(claim('tenant:1'), observations, confidence(), { assessedAt: ASSESSED_AT });
  check('performance dimension is limited (1 of 3 decisive observations positive)', result.dimensions.performance === 'limited');
  check('a limited dimension controls the headline over elevated dimensions', result.relianceLevel === 'limited');
}

// -- confidenceRef passes through, and an insufficient confidence band forces human review regardless of reliance --
{
  const observations = [
    obs('commitment_fulfilled', 'tenant:1'), obs('commitment_fulfilled', 'tenant:1'),
    obs('deadline_acknowledged', 'tenant:1'), obs('required_action_completed', 'tenant:1'),
    obs('communication_answered', 'tenant:1'), obs('communication_answered', 'tenant:1'),
    obs('documentation_supplied', 'tenant:1'), obs('documentation_supplied', 'tenant:1'),
  ];
  const lowConfidence = confidence({ id: 'conf-low', band: 'insufficient' });
  const result = reliance(claim('tenant:1'), observations, lowConfidence, { assessedAt: ASSESSED_AT });
  check('confidenceRef passes through', result.confidenceRef === 'conf-low');
  check('an elevated reliance level still requires human review when confidence is insufficient', result.relianceLevel === 'elevated' && result.humanReviewRequired === true);
  check('riskIfWrong mentions the confidence caveat when confidence is low/insufficient', result.riskIfWrong.includes('insufficient'));
}

// -- validUntil is computed deterministically from assessedAt + validForDays, never from the wall clock --
{
  const result = reliance(claim('tenant:1'), [], confidence(), { assessedAt: ASSESSED_AT, validForDays: 30 });
  const expected = new Date(Date.parse(ASSESSED_AT) + 30 * 86_400_000).toISOString();
  check('validUntil is assessedAt + validForDays', result.validUntil === expected);
}

// -- observations for a different subjectId do not leak into this claim's assessment --
{
  const observations = [obs('commitment_not_fulfilled', 'owner:9')]; // different subject entirely
  const result = reliance(claim('tenant:1'), observations, confidence(), { assessedAt: ASSESSED_AT });
  check('an observation for a different subjectId does not affect this subjects commitment dimension', result.dimensions.commitment === 'indeterminate');
}

// -- symmetry (spec §11): identical observation shapes for different subjectId values produce identical dimensions/headline --
{
  const forOwner = [obs('commitment_not_fulfilled', 'owner:1'), obs('communication_ignored', 'owner:1')];
  const forTenant = [obs('commitment_not_fulfilled', 'tenant:1'), obs('communication_ignored', 'tenant:1')];
  const resultOwner = reliance(claim('owner:1'), forOwner, confidence(), { assessedAt: ASSESSED_AT });
  const resultTenant = reliance(claim('tenant:1'), forTenant, confidence(), { assessedAt: ASSESSED_AT });
  check('classification is symmetric across subjectId (owner vs tenant)', (() => {
    try {
      assertSymmetricRuleSelection(
        { dimensions: resultOwner.dimensions, relianceLevel: resultOwner.relianceLevel },
        { dimensions: resultTenant.dimensions, relianceLevel: resultTenant.relianceLevel },
        'owner-vs-tenant identical negative observations'
      );
      return true;
    } catch {
      return false;
    }
  })());
}

console.log(`\n${'-'.repeat(44)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(44)}`);
if (failed > 0) process.exit(1);
