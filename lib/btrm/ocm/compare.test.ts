// lib/btrm/ocm/compare.test.ts — OCM-001 end-to-end (BTRM-001 spec §3.7, §5 OCM.compare interface).

import { compare } from './compare';
import type { ResolutionOption, RelianceAssessment, ConfidenceAssessment, RelianceDimensions } from '../types';

let passed = 0, failed = 0;
const check = (n: string, c: boolean, d = '') => { c ? passed++ : (failed++, console.log(`  ✗ ${n}${d ? ` — ${d}` : ''}`)); if (c) console.log(`  ✓ ${n}`); };

const ALL_INDETERMINATE: RelianceDimensions = {
  performance: 'indeterminate', commitment: 'indeterminate', communication: 'indeterminate',
  documentation: 'indeterminate', agreement: 'indeterminate', representationConsistency: 'indeterminate',
  resolutionParticipation: 'indeterminate',
};

const stubEnvelope = () => ({
  evidenceCited: ['evt-1'],
  behaviorsIdentified: [],
  howRelianceDetermined: 'stub',
  missingInformation: [],
  whatWouldChangeThis: 'stub',
  whyPreferred: 'stub',
});

const confidence = (id: string, band: ConfidenceAssessment['band']): ConfidenceAssessment => ({
  id, targetRef: 'ref-1', completeness: 1, corroboration: 1, timelineCertainty: 1, contradictions: [], missing: [], band,
});

const reliance = (id: string, level: RelianceAssessment['relianceLevel'], confidenceRef: string): RelianceAssessment => ({
  id, matterId: 'matter-1', subjectId: 'tenant:1', claimRef: `claim:${id}`, context: 'ctx', decisionUse: 'use',
  dimensions: ALL_INDETERMINATE, relianceLevel: level, supportingFactors: [], limitingFactors: [],
  validUntil: '2026-09-01T00:00:00Z', confidenceRef, riskIfWrong: 'stub', humanReviewRequired: false,
});

let optCounter = 0;
const option = (overrides: Partial<ResolutionOption> = {}): ResolutionOption => ({
  id: `option-${++optCounter}`,
  matterId: 'matter-1',
  type: 'payment_plan',
  purpose: 'stub',
  requiredConditions: [],
  expectedBenefit: 'stub',
  materialRisks: [],
  relianceAssumptions: [],
  missingInformation: [],
  reversibility: 'partially_reversible',
  documentationRequired: [],
  materialConsequence: false,
  humanReviewRequired: false,
  envelope: stubEnvelope(),
  ...overrides,
});

const scope1 = {
  reliance: [reliance('rel-elevated', 'elevated', 'conf-high'), reliance('rel-weak', 'no_reliance', 'conf-low'), reliance('rel-mid', 'operational', 'conf-mod')],
  confidence: [confidence('conf-high', 'high'), confidence('conf-low', 'low'), confidence('conf-mod', 'moderate')],
};

// -- a strong, unrisked primary option with no alternative supplied yields strongly_supported --
{
  const primary = option({ relianceAssumptions: ['rel-elevated'] });
  const result = compare({ matterId: 'matter-1', primaryOption: primary, alternativeOptions: [] }, scope1);
  check('strong primary, no alternative -> strongly_supported', result.supportBand === 'strongly_supported');
  check('optionIds lists just the primary when no alternative supplied', result.optionIds.length === 1 && result.optionIds[0] === primary.id);
  check('rationale cites the primary option id', result.rationale.includes(primary.id));
  check('rationale notes no alternative was supplied', result.rationale.includes('no alternative option was supplied'));
}

// -- primary clearly stronger than the alternative -> strongly_supported or supported, never weakly --
{
  const primary = option({ relianceAssumptions: ['rel-elevated'] }); // score = 2 + 2 = 4
  const alternative = option({ relianceAssumptions: ['rel-weak'] }); // score = -2 + -1 = -3
  const result = compare({ matterId: 'matter-1', primaryOption: primary, alternativeOptions: [alternative] }, scope1);
  check('primary far stronger than alternative -> strongly_supported', result.supportBand === 'strongly_supported');
  check('optionIds lists primary then alternative', result.optionIds[0] === primary.id && result.optionIds[1] === alternative.id);
}

// -- primary weaker than the alternative -> weakly_supported --
{
  const primary = option({ relianceAssumptions: ['rel-weak'] }); // score = -3
  const alternative = option({ relianceAssumptions: ['rel-elevated'] }); // score = 4
  const result = compare({ matterId: 'matter-1', primaryOption: primary, alternativeOptions: [alternative] }, scope1);
  check('primary weaker than alternative -> weakly_supported', result.supportBand === 'weakly_supported');
}

// -- primary and alternative roughly equal -> uncertain --
{
  const primary = option({ relianceAssumptions: ['rel-mid'] }); // score = 1 + 1 = 2
  const alternative = option({ relianceAssumptions: ['rel-mid'] });
  const result = compare({ matterId: 'matter-1', primaryOption: primary, alternativeOptions: [alternative] }, scope1);
  check('equal scores -> uncertain', result.supportBand === 'uncertain');
}

// -- a primary option with zero resolvable reliance is insufficient_evidence regardless of the alternative --
{
  const primary = option({ relianceAssumptions: ['rel-does-not-exist'] });
  const alternative = option({ relianceAssumptions: ['rel-weak'] }); // even a weak alternative doesn't matter here
  const result = compare({ matterId: 'matter-1', primaryOption: primary, alternativeOptions: [alternative] }, scope1);
  check('zero resolved reliance on the primary forces insufficient_evidence', result.supportBand === 'insufficient_evidence');
}

// -- material risks and missing information on the primary pull its score down and are reflected in the rationale --
{
  const primary = option({ relianceAssumptions: ['rel-elevated'], materialRisks: ['risk one', 'risk two'], missingInformation: ['gap one'] });
  // score = 2 + 2 - 2 - 1 = 1 -> only 'supported' vs a 0-baseline, not strongly_supported
  const result = compare({ matterId: 'matter-1', primaryOption: primary, alternativeOptions: [] }, scope1);
  check('material risks and missing info reduce the band from strongly_supported to supported', result.supportBand === 'supported');
  check('rationale cites the material risk count', result.rationale.includes('2 material risk(s)'));
  check('rationale cites the missing-information count', result.rationale.includes('1 missing-information item(s)'));
}

// -- envelope completeness: evidenceCited is the union of the primary's and alternative's OWN already-validated
// envelopes (reused, not re-derived — each ResolutionOption's envelope.evidenceCited is guaranteed non-empty by
// RIE-001, so this stays non-empty even in an insufficient_evidence comparison) --
{
  const primary = option({ relianceAssumptions: ['rel-elevated'], envelope: { evidenceCited: ['evt-primary'], behaviorsIdentified: [], howRelianceDetermined: 'stub', missingInformation: [], whatWouldChangeThis: 'stub', whyPreferred: 'stub' } });
  const alternative = option({ relianceAssumptions: ['rel-mid'], envelope: { evidenceCited: ['evt-alternative'], behaviorsIdentified: [], howRelianceDetermined: 'stub', missingInformation: [], whatWouldChangeThis: 'stub', whyPreferred: 'stub' } });
  const result = compare({ matterId: 'matter-1', primaryOption: primary, alternativeOptions: [alternative] }, scope1);
  check('envelope evidenceCited includes the primarys own envelope citation', result.envelope.evidenceCited.includes('evt-primary'));
  check('envelope evidenceCited includes the alternatives own envelope citation', result.envelope.evidenceCited.includes('evt-alternative'));
  check('envelope whatWouldChangeThis is populated', result.envelope.whatWouldChangeThis.length > 0);
}

console.log(`\n${'-'.repeat(44)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(44)}`);
if (failed > 0) process.exit(1);
