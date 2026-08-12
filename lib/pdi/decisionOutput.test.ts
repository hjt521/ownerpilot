import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

import type { EvidenceKind, ForecastSnapshot } from './decisionOutput';
import {
  buildForecastOption,
  createOwnerDecision,
  deriveDecisionOutput,
  deriveRecommendation,
  representNextTask,
} from './decisionOutputDerivation';
import {
  SYNTHETIC_ELIGIBLE_OPTIONS,
  SYNTHETIC_EVIDENCE,
  SYNTHETIC_FORECAST,
  SYNTHETIC_MATTER,
  SYNTHETIC_PREFERENCE_PROFILES,
  SYNTHETIC_SCIENTIFIC_BOUNDARY,
} from '../../app/internal/decision-intelligence/preview/fixtures';

const previewSource = readFileSync('app/internal/decision-intelligence/preview/DecisionOutputPreview.tsx', 'utf8');
const pageSource = readFileSync('app/internal/decision-intelligence/preview/page.tsx', 'utf8');
const typeSource = readFileSync('lib/pdi/decisionOutput.ts', 'utf8');
const derivationSource = readFileSync('lib/pdi/decisionOutputDerivation.ts', 'utf8');
const fixtureSource = readFileSync('app/internal/decision-intelligence/preview/fixtures.ts', 'utf8');

const makeInput = (index: number) => ({
  matter: SYNTHETIC_MATTER,
  eligibleOptions: SYNTHETIC_ELIGIBLE_OPTIONS,
  forecast: SYNTHETIC_FORECAST,
  preferences: SYNTHETIC_PREFERENCE_PROFILES[index],
  evidence: SYNTHETIC_EVIDENCE,
  scientificBoundary: SYNTHETIC_SCIENTIFIC_BOUNDARY,
});

assert.deepEqual(SYNTHETIC_SCIENTIFIC_BOUNDARY, {
  syntheticFixture: true,
  internalPreview: true,
  customerForecast: false,
  numericalModel: 'not_connected',
  simulation: 'not_run',
  calibration: 'not_established',
  actionSendAuthority: false,
});

const forecastBytes = JSON.stringify(SYNTHETIC_FORECAST);
const forecastClone = JSON.parse(forecastBytes);
const balanced = deriveDecisionOutput(makeInput(0));
const recoveryFirst = deriveDecisionOutput(makeInput(1));
assert.equal(balanced.recommendation.optionId, 'preserve_path');
assert.equal(recoveryFirst.recommendation.optionId, 'structured_payment');
assert.notEqual(balanced.recommendation.optionId, recoveryFirst.recommendation.optionId);
assert.equal(JSON.stringify(SYNTHETIC_FORECAST), forecastBytes, 'preference change must not mutate forecast bytes');
assert.deepEqual(SYNTHETIC_FORECAST, forecastClone, 'preference change must leave forecast deep-equal');

for (const output of [balanced, recoveryFirst]) {
  const eligible = output.eligibleOptions.find(option => option.id === output.recommendation.optionId);
  assert.ok(eligible, 'recommended option must already be eligible');
  assert.equal(eligible.eligible, true);
  assert.equal(eligible.provenance.source, 'externally_supplied_eligible_set');
  assert.ok(eligible.provenance.sourceId.length > 0, 'recommended option must retain provenance');
  assert.equal(output.modelQuality.status, 'not_established');
  assert.equal(output.modelQuality.numericalModel, 'not_connected');
  assert.equal(output.modelQuality.calibration, 'not_established');
}

const rogueForecast: ForecastSnapshot = {
  ...SYNTHETIC_FORECAST,
  options: [
    ...SYNTHETIC_FORECAST.options,
    buildForecastOption({
      optionId: 'manufactured_rogue_option',
      workload: 'low',
      outcomes: [{
        id: 'rogue', label: 'Rogue best case', probability: 1, recovery: 999999,
        daysToResolution: 1, possessionBy90Days: 1,
        narrative: 'Test-only option absent from the eligible set.',
      }],
    }),
  ],
};
assert.notEqual(
  deriveRecommendation({
    eligibleOptions: SYNTHETIC_ELIGIBLE_OPTIONS,
    forecast: rogueForecast,
    preferences: SYNTHETIC_PREFERENCE_PROFILES[0],
  }).optionId,
  'manufactured_rogue_option',
  'ineligible forecast-only option must be impossible to recommend',
);
assert.equal(new Set(SYNTHETIC_ELIGIBLE_OPTIONS.map(option => option.id)).size, SYNTHETIC_ELIGIBLE_OPTIONS.length);

const evidenceKinds = new Set<EvidenceKind>(SYNTHETIC_EVIDENCE.map(item => item.kind));
assert.deepEqual(evidenceKinds, new Set<EvidenceKind>([
  'verified_fact', 'owner_provided_fact', 'owner_estimate',
  'model_assumption', 'derived_value', 'material_unknown',
]));

const decision = createOwnerDecision('preserve_path', SYNTHETIC_ELIGIBLE_OPTIONS);
assert.equal(decision.storage, 'local_preview_state');
assert.equal(decision.executionAuthority, 'none');
assert.equal('nextTask' in decision, false, 'OwnerDecision must not create Next Task');
const nextTask = representNextTask(decision);
assert.deepEqual(
  { connected: nextTask.connected, invoked: nextTask.invoked, authority: nextTask.executionAuthority },
  { connected: false, invoked: false, authority: 'none' },
);
assert.throws(() => createOwnerDecision('manufactured_rogue_option', SYNTHETIC_ELIGIBLE_OPTIONS));

for (const forbidden of ['Math.random', 'generateText', 'fetch(', 'localStorage', 'sessionStorage', 'Date.now', 'process.env']) {
  assert.equal(derivationSource.includes(forbidden), false, `pure derivation must not use ${forbidden}`);
}

const hierarchy = [
  'Matter / Decision Context', 'Recommended strategy', 'Primary modeled outcomes',
  'Your priorities', 'Eligible options', 'What could change this recommendation?',
  'Decision roadmap', 'Strategy comparison', 'Calculation detail',
  'Evidence / assumptions / model quality', 'Your decision', 'Next task',
];
let prior = -1;
for (const heading of hierarchy) {
  const index = previewSource.indexOf(heading);
  assert.ok(index > prior, `${heading} must appear in approved hierarchy`);
  prior = index;
}

assert.ok(previewSource.includes("onClick={() => setExplorationOptionId(option.id)}"));
assert.ok(previewSource.includes('Exploration selection is not an Owner Decision'));
assert.ok(previewSource.includes('setOwnerDecision(createOwnerDecision('));
assert.equal(previewSource.split('overflow-x-auto').length - 1, 1, 'only calculation detail may scroll horizontally');
assert.ok(previewSource.includes('data-testid="calculation-scroll"'));
assert.equal(previewSource.includes('<svg'), false, 'core mobile hierarchy cannot depend on a wide SVG tree');

const sources = [previewSource, typeSource, fixtureSource].map(source => source.toLowerCase());
for (const source of sources) {
  assert.equal(source.includes('forecast confidence'), false);
  assert.equal(source.includes('communication uplift'), false);
  assert.equal(source.includes('acceptance probability caused by messaging'), false);
  assert.equal(source.includes('completion probability caused by messaging'), false);
}
assert.equal(typeSource.toLowerCase().includes('negotiation'), false, 'canonical v1A types contain no negotiation dependency');
assert.equal(typeSource.toLowerCase().includes('uplift'), false, 'canonical v1A types contain no uplift dependency');
assert.equal(typeSource.toLowerCase().includes('confidence'), false, 'canonical v1A types contain no forecast-confidence concept');

for (const badge of ['SYNTHETIC FIXTURE', 'INTERNAL PREVIEW', 'NO CUSTOMER FORECAST', 'NO ACTION / SEND AUTHORITY']) {
  assert.ok(pageSource.includes(badge), `${badge} must remain prominent`);
}
assert.ok(pageSource.includes("process.env.VERCEL_ENV !== 'preview'"));
assert.ok(pageSource.includes('currentAdmin()'));

for (const forbiddenConnection of ['/notice/', 'Serve & Track', 'Resolve & Record', 'RiskPath', 'Phase C']) {
  assert.equal(previewSource.includes(forbiddenConnection), false, `Preview must not connect to ${forbiddenConnection}`);
}

console.log('decisionOutput.test.ts: PASS');
