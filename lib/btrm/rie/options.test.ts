// lib/btrm/rie/options.test.ts — RIE-001 end-to-end (BTRM-001 spec §3.6, §5 RIE.options interface).

import { evaluateOption, options } from './options';
import { assertHumanReviewGated } from '../safeguards/guard';
import type {
  InterestConstraint,
  RelianceAssessment,
  ConfidenceAssessment,
  BehavioralObservation,
  RelianceDimensions,
} from '../types';

let passed = 0, failed = 0;
const check = (n: string, c: boolean, d = '') => { c ? passed++ : (failed++, console.log(`  ✗ ${n}${d ? ` — ${d}` : ''}`)); if (c) console.log(`  ✓ ${n}`); };

const ALL_INDETERMINATE: RelianceDimensions = {
  performance: 'indeterminate',
  commitment: 'indeterminate',
  communication: 'indeterminate',
  documentation: 'indeterminate',
  agreement: 'indeterminate',
  representationConsistency: 'indeterminate',
  resolutionParticipation: 'indeterminate',
};

const interest = (overrides: Partial<InterestConstraint> = {}): InterestConstraint => ({
  id: 'interest-1',
  matterId: 'matter-1',
  partyId: 'tenant:1',
  kind: 'interest',
  statement: 'tenant wants a payment plan',
  supportLabel: 'confirmed',
  sourceEventIds: ['evt-1'],
  ...overrides,
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

const reliance = (overrides: Partial<RelianceAssessment> = {}): RelianceAssessment => ({
  id: 'reliance-1',
  matterId: 'matter-1',
  subjectId: 'tenant:1',
  claimRef: 'commitment:c-1',
  context: 'payment-plan-review',
  decisionUse: 'evaluate a payment plan',
  dimensions: ALL_INDETERMINATE,
  relianceLevel: 'elevated',
  supportingFactors: ['commitment: elevated (2 observations)'],
  limitingFactors: [],
  validUntil: '2026-09-01T00:00:00Z',
  confidenceRef: 'conf-1',
  riskIfWrong: 'Observations are consistently positive.',
  humanReviewRequired: false,
  ...overrides,
});

const observation = (id: string, subjectId: string): BehavioralObservation => ({
  id,
  matterId: 'matter-1',
  subjectId,
  dimension: 'commitment',
  eventClass: 'commitment_fulfilled',
  sourceEventIds: ['evt-1'],
  provenance: 'confirmed_fact',
  observedAt: '2026-06-01T00:00:00Z',
});

const hint = (overrides: Partial<Parameters<typeof evaluateOption>[0]> = {}): Parameters<typeof evaluateOption>[0] => ({
  matterId: 'matter-1',
  type: 'reminder',
  purpose: 'remind the tenant of the upcoming payment date',
  expectedBenefit: 'keeps the payment plan on track without escalation',
  ...overrides,
});

// -- fully resolved, strong support, non-material type: clean option, no risks, no gaps, no human review forced --
{
  const scope = { interests: [interest()], reliance: [reliance()], confidence: [confidence()], observations: [observation('obs-1', 'tenant:1')] };
  const result = evaluateOption(hint({ interestConstraintIds: ['interest-1'], relianceAssessmentIds: ['reliance-1'] }), scope);
  check('confirmed interest becomes a required condition', result.requiredConditions.some((c) => c.includes('confirmed')));
  check('no material risks for elevated reliance + high confidence', result.materialRisks.length === 0);
  check('no missing information when everything resolves and is confirmed', result.missingInformation.length === 0);
  check('relianceAssumptions cites the resolved reliance id', result.relianceAssumptions.includes('reliance-1'));
  check('reversibility is fixed by type (reminder -> fully_reversible)', result.reversibility === 'fully_reversible');
  check('materialConsequence is false for reminder', result.materialConsequence === false);
  check('humanReviewRequired is false (non-material, strong support, high confidence)', result.humanReviewRequired === false);
  check('envelope whyPreferred equals the caller-supplied purpose (RIE-001 does not invent it)', result.envelope.whyPreferred === hint().purpose);
  check('envelope evidenceCited includes the interests cited source event', result.envelope.evidenceCited.includes('evt-1'));
  check('envelope behaviorsIdentified includes the matching-subject observation', result.envelope.behaviorsIdentified.includes('obs-1'));
}

// -- an unresolved interestConstraintId contributes no fabricated support, alongside one that does resolve --
{
  const scope = { interests: [interest()], reliance: [], confidence: [], observations: [] };
  const result = evaluateOption(hint({ interestConstraintIds: ['interest-1', 'interest-does-not-exist'] }), scope);
  check('only the resolved interest becomes a required condition', result.requiredConditions.length === 1);
  check('an unresolved interest id is cited in missingInformation', result.missingInformation.some((m) => m.includes('interest-does-not-exist')));
}

// -- an unresolved relianceAssessmentId contributes nothing to relianceAssumptions, alongside one that does resolve --
{
  const scope = { interests: [], reliance: [reliance()], confidence: [confidence()], observations: [] };
  const result = evaluateOption(hint({ relianceAssessmentIds: ['reliance-1', 'reliance-does-not-exist'] }), scope);
  check('relianceAssumptions cites only the id that resolves', result.relianceAssumptions.length === 1 && result.relianceAssumptions[0] === 'reliance-1');
  check('an unresolved reliance id is cited in missingInformation', result.missingInformation.some((m) => m.includes('reliance-does-not-exist')));
}

// -- a hint citing no interest or reliance references at all has nothing to ground its conclusion in, and the
// explainability envelope (spec §5, "no black-box results") correctly rejects it rather than shipping an
// ungrounded option --
{
  const scope = { interests: [], reliance: [], confidence: [], observations: [] };
  check('an entirely ungrounded hint is rejected by the envelope guard, not silently shipped', (() => {
    try {
      evaluateOption(hint({}), scope);
      return false;
    } catch (err) {
      return err instanceof Error && err.message.includes('explainability envelope incomplete');
    }
  })());
}

// -- a resolved but weak (limited/no_reliance) reliance assessment surfaces as a material risk, not silently dropped --
{
  const weak = reliance({ id: 'reliance-weak', relianceLevel: 'no_reliance', limitingFactors: ['documentation: no_reliance (1 observation)'] });
  const scope = { interests: [], reliance: [weak], confidence: [confidence()], observations: [] };
  const result = evaluateOption(hint({ relianceAssessmentIds: ['reliance-weak'] }), scope);
  check('a no_reliance dimension is cited as a material risk', result.materialRisks.some((r) => r.includes('no_reliance')));
  check('the weak reliance id is still counted as a resolved assumption (it does exist, it is just weak)', result.relianceAssumptions.includes('reliance-weak'));
  check('a materially-weak but non-material-type option still requires human review', result.humanReviewRequired === true);
}

// -- indeterminate reliance is a missing-information gap, not a material risk --
{
  const indeterminate = reliance({ id: 'reliance-indet', relianceLevel: 'indeterminate' });
  const scope = { interests: [], reliance: [indeterminate], confidence: [confidence()], observations: [] };
  const result = evaluateOption(hint({ relianceAssessmentIds: ['reliance-indet'] }), scope);
  check('indeterminate reliance is cited in missingInformation', result.missingInformation.some((m) => m.includes('indeterminate')));
  check('indeterminate reliance is not itself listed as a material risk', !result.materialRisks.some((r) => r.includes('indeterminate')));
  check('indeterminate reliance forces human review regardless of type', result.humanReviewRequired === true);
}

// -- insufficient confidence, cited transitively via a resolved reliance assessment, forces human review and a risk note --
{
  const lowConfReliance = reliance({ id: 'reliance-lowconf', confidenceRef: 'conf-insufficient' });
  const insufficientConfidence = confidence({ id: 'conf-insufficient', band: 'insufficient' });
  const scope = { interests: [], reliance: [lowConfReliance], confidence: [insufficientConfidence], observations: [] };
  const result = evaluateOption(hint({ relianceAssessmentIds: ['reliance-lowconf'] }), scope);
  check('insufficient confidence is cited as a material risk', result.materialRisks.some((r) => r.includes('insufficient')));
  check('insufficient confidence forces human review even for an elevated, non-material option', result.humanReviewRequired === true);
}

// -- a materialConsequence type ALWAYS requires human review, even with strong support and high confidence --
{
  const scope = { interests: [interest()], reliance: [reliance()], confidence: [confidence()], observations: [] };
  const result = evaluateOption(
    hint({ type: 'formal_notice_workflow', interestConstraintIds: ['interest-1'], relianceAssessmentIds: ['reliance-1'] }),
    scope
  );
  check('formal_notice_workflow is materialConsequence', result.materialConsequence === true);
  check('materialConsequence forces humanReviewRequired true regardless of support strength', result.humanReviewRequired === true);
  check('reversibility for formal_notice_workflow is not_reversible', result.reversibility === 'not_reversible');
  check('the human-review gate does not throw for a correctly-gated material option', (() => {
    try { assertHumanReviewGated(result); return true; } catch { return false; }
  })());
}

// -- batch options() processes multiple hints independently, same order, distinct ids, fields pass through --
{
  const scope = { interests: [interest()], reliance: [reliance()], confidence: [confidence()], observations: [] };
  const hints = [
    hint({ type: 'reminder', purpose: 'send a reminder', documentationRequired: ['none'], interestConstraintIds: ['interest-1'] }),
    hint({ type: 'payment_plan', purpose: 'propose a payment plan', deadlineImplications: '10 days to respond', recommendedCommunicationRef: 'cs-ref-1', relianceAssessmentIds: ['reliance-1'] }),
  ];
  const result = options(hints, scope);
  check('two hints yield two options in the same order', result.length === 2);
  check('each result has a distinct id', result[0].id !== result[1].id);
  check('documentationRequired passes through unchanged', result[0].documentationRequired.includes('none'));
  check('deadlineImplications passes through unchanged', result[1].deadlineImplications === '10 days to respond');
  check('recommendedCommunicationRef passes through unchanged', result[1].recommendedCommunicationRef === 'cs-ref-1');
  check('payment_plan is materialConsequence (financial concession)', result[1].materialConsequence === true);
}

console.log(`\n${'-'.repeat(44)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(44)}`);
if (failed > 0) process.exit(1);
