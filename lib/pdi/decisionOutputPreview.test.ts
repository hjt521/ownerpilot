import { strict as assert } from 'node:assert';

import {
  SYNTHETIC_DECISION_OUTPUT_PREVIEW,
  buildStrategyProjection,
  directProposalCompletionProbability,
  percentagePointDelta,
} from './decisionOutputPreview';

const fixture = SYNTHETIC_DECISION_OUTPUT_PREVIEW;

assert.equal(fixture.synthetic, true);
assert.equal(fixture.authority.advisoryOnly, true);
assert.equal(fixture.authority.customerForecast, false);
assert.equal(fixture.authority.communicationSendAuthority, false);
assert.equal(fixture.authority.actionAuthority, 'none');
assert.equal(fixture.authority.productionAuthority, false);
assert.equal(fixture.provenance.source, 'deterministic_synthetic_fixture');
assert.equal(fixture.provenance.numericalEngine, 'not_connected');
assert.equal(fixture.provenance.simulationRuns, 0);
assert.equal(fixture.provenance.calibrationCohort, 'not_established');

for (const strategy of fixture.strategies) {
  const total = strategy.outcomes.reduce(
    (sum, outcome) => sum + outcome.probability,
    0,
  );
  assert.ok(Math.abs(total - 1) < 1e-9, `${strategy.id} must sum to 1`);

  const expectedRecovery = strategy.outcomes.reduce(
    (sum, outcome) => sum + outcome.probability * outcome.recovery,
    0,
  );
  const expectedDays = strategy.outcomes.reduce(
    (sum, outcome) => sum + outcome.probability * outcome.daysToResolution,
    0,
  );
  const possession = strategy.outcomes.reduce(
    (sum, outcome) => sum + outcome.probability * outcome.possessionBy90Days,
    0,
  );

  assert.equal(strategy.expectedRecovery, Math.round(expectedRecovery * 100) / 100);
  assert.equal(strategy.expectedDaysToResolution, Math.round(expectedDays * 100) / 100);
  assert.equal(strategy.possessionBy90Days, Math.round(possession * 10000) / 10000);
}

assert.throws(
  () =>
    buildStrategyProjection({
      id: 'bad',
      label: 'Bad probabilities',
      shortLabel: 'Bad',
      workload: 'low',
      outcomes: [
        {
          id: 'a',
          label: 'A',
          probability: 0.4,
          recovery: 1,
          daysToResolution: 1,
          possessionBy90Days: 0,
          narrative: 'A',
        },
        {
          id: 'b',
          label: 'B',
          probability: 0.4,
          recovery: 1,
          daysToResolution: 1,
          possessionBy90Days: 0,
          narrative: 'B',
        },
      ],
    }),
  /probability total must equal 1/,
);

const baseline = fixture.negotiation.baseline;
const optimized = fixture.negotiation.variants.find(
  variant => variant.id === fixture.negotiation.optimizedVariantId,
);
assert.ok(optimized);

assert.equal(percentagePointDelta(baseline.responseProbability, optimized.responseProbability), 19);
assert.equal(percentagePointDelta(baseline.acceptanceProbability, optimized.acceptanceProbability), 15);
assert.equal(percentagePointDelta(baseline.completionGivenAcceptance, optimized.completionGivenAcceptance), 7);
assert.equal(optimized.expectedRecovery - baseline.expectedRecovery, 560);
assert.equal(optimized.expectedDaysToResolution - baseline.expectedDaysToResolution, -8);
assert.equal(
  percentagePointDelta(
    baseline.voluntaryResolutionProbability,
    optimized.voluntaryResolutionProbability,
  ),
  14,
);

assert.equal(
  directProposalCompletionProbability(optimized),
  0.3392,
  'acceptance and completion must remain separate; direct completion is conditional multiplication',
);

const highestAcceptance = [...fixture.negotiation.variants].sort(
  (a, b) => b.acceptanceProbability - a.acceptanceProbability,
)[0];
assert.equal(highestAcceptance.id, 'highly_accommodating');
assert.notEqual(
  highestAcceptance.id,
  optimized.id,
  'the negotiation model must not equate highest acceptance with best represented final outcome',
);
assert.ok(
  optimized.expectedRecovery > highestAcceptance.expectedRecovery,
  'recommended communication should demonstrate why final-outcome optimization differs from acceptance optimization',
);

const responseTotal = fixture.negotiation.responseTree.reduce(
  (sum, branch) => sum + branch.probability,
  0,
);
assert.ok(Math.abs(responseTotal - 1) < 1e-9, 'response tree must sum to 1');

assert.equal(
  fixture.ownerPriorities.reduce((sum, priority) => sum + priority.weight, 0),
  1,
  'synthetic owner priorities must be explicit and normalized',
);

const serialized = JSON.stringify(fixture).toLowerCase();
for (const forbidden of [
  'ownerpilot score',
  'universal score',
  'sendauthority":true',
  'productionauthority":true',
  'customerforecast":true',
]) {
  assert.equal(serialized.includes(forbidden), false, `${forbidden} must remain absent`);
}

assert.ok(
  fixture.evidence.some(item => item.kind === 'unknown'),
  'material unknowns must remain visible',
);
assert.ok(
  fixture.evidence.some(item => item.kind === 'model_assumption'),
  'model assumptions must remain distinct from verified facts',
);
assert.ok(
  fixture.highestValueUnknown.question.length > 0,
  'the Preview must identify a highest-value unknown rather than always proposing another offer',
);

console.log('decisionOutputPreview.test.ts: PASS');
