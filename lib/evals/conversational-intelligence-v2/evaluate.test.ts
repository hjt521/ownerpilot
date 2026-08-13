/**
 * Deterministic v2A harness tests.
 *
 * No network, provider SDK, credential, environment variable, persistence,
 * customer data, Production route, or Preview surface is used.
 */

import {
  AUTHORITY_CLAIM_KINDS,
  CONVERSATIONAL_QUALITY_DIMENSIONS,
  EXTERNAL_ACTION_KINDS,
  type ConversationalCandidateOutput,
  type ConversationalEvaluationFixture,
  type HardGateFailureCode,
  type InjectedCandidateRunReport,
  type ModelAssignment,
} from './contracts';
import {
  CONVERSATIONAL_INTELLIGENCE_V2A_FIXTURES,
  CONVERSATIONAL_INTELLIGENCE_V2A_FIXTURE_IDS,
  V2A_EVALUATION_GOVERNANCE,
} from './fixtures';
import {
  evaluateCandidateRun,
  runInjectedEvaluation,
  validateConversationalCandidateOutput,
} from './evaluate';
import { validateModelAssignment } from './governance';

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean): void {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}`);
  }
}

function fixtureById(id: string): ConversationalEvaluationFixture {
  const found = CONVERSATIONAL_INTELLIGENCE_V2A_FIXTURES.find(item => item.id === id);
  if (!found) throw new Error(`Missing fixture: ${id}`);
  return found;
}

function assignmentFor(fixture: ConversationalEvaluationFixture): ModelAssignment {
  return {
    role: 'CONVERSATIONAL_REASONER',
    provider: 'synthetic-provider-a',
    model: 'synthetic-model-a',
    taskClass: fixture.input.taskClass,
    retrievalMode: fixture.input.evidence.mode,
    environmentEligibility: 'LOCAL_SYNTHETIC_ONLY',
    tools: [],
    fallback: 'NONE',
    authority: 'NONE',
  };
}

function validOutput(fixture: ConversationalEvaluationFixture): ConversationalCandidateOutput {
  const controls = fixture.input.requiredControlIds.map(controlId => {
    const control = fixture.input.deterministicControls.values.find(item => item.id === controlId);
    if (!control) throw new Error(`Missing required control ${controlId}`);
    return { controlId, value: control.value };
  });

  return {
    schemaVersion: 'conversational-candidate-v2a',
    answer: 'Synthetic bounded answer for offline harness validation.',
    clarificationQuestion: fixture.input.clarificationExpected
      ? 'Which recorded event are you asking about?'
      : null,
    citations: [...fixture.input.requiredEvidenceIds],
    controlAcknowledgements: controls,
    authorityClaims: [],
    unresolvedConflictIds: [...fixture.input.evidence.unresolvedConflictIds],
    followedEvidenceInstructionIds: [],
    externalActionClaims: [],
    authorityTransition: 'RECOMMENDATION_ONLY',
    recommendations: ['Synthetic recommendation for human consideration.'],
    ownerDecisionRecorded: false,
    executionOccurred: false,
  };
}

function reportFor(
  fixture: ConversationalEvaluationFixture,
  output: unknown = validOutput(fixture),
  overrides: Partial<InjectedCandidateRunReport> = {},
): InjectedCandidateRunReport {
  const assignment = assignmentFor(fixture);
  return {
    runStatus: 'COMPLETED',
    actualProvider: assignment.provider,
    actualModel: assignment.model,
    fallbackUsed: false,
    providerFailureClass: null,
    output,
    metrics: {
      latencyMs: 125,
      inputTokens: 100,
      outputTokens: 80,
      estimatedCostMicros: 42,
    },
    ...overrides,
  };
}

function hasFailure(
  result: ReturnType<typeof evaluateCandidateRun>,
  code: HardGateFailureCode,
): boolean {
  return result.hardGates.failures.some(item => item.code === code);
}

async function main(): Promise<void> {
  console.log('\nConversational Intelligence v2A fixture contract');

  check(
    'contains all twelve required synthetic scenario classes',
    CONVERSATIONAL_INTELLIGENCE_V2A_FIXTURES.length === 12,
  );
  check(
    'fixture IDs are unique',
    new Set(CONVERSATIONAL_INTELLIGENCE_V2A_FIXTURE_IDS).size ===
      CONVERSATIONAL_INTELLIGENCE_V2A_FIXTURE_IDS.length,
  );
  check(
    'governance snapshot keeps deterministic controls authoritative',
    V2A_EVALUATION_GOVERNANCE.deterministicControlsAuthoritative === true,
  );
  check(
    'governance snapshot explicitly denies model decision and execution authority',
    V2A_EVALUATION_GOVERNANCE.modelDecisionAuthority === 'NONE' &&
      V2A_EVALUATION_GOVERNANCE.executionAuthority === 'NONE',
  );
  check(
    'governance snapshot explicitly excludes Production persona import',
    V2A_EVALUATION_GOVERNANCE.productionPersonaImported === false &&
      V2A_EVALUATION_GOVERNANCE.sourceRefs.every(ref => !ref.locator.includes('persona.ts')),
  );
  check(
    'fixtures use no live retrieval mode',
    CONVERSATIONAL_INTELLIGENCE_V2A_FIXTURES.every(
      item => item.input.evidence.mode === 'NONE' || item.input.evidence.mode === 'INJECTED_EVIDENCE_ONLY',
    ),
  );

  const serializedFixtures = JSON.stringify(CONVERSATIONAL_INTELLIGENCE_V2A_FIXTURES);
  check(
    'fixtures are PII-free synthetic data',
    !/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(serializedFixtures) &&
      !/\b\d{3}-\d{2}-\d{4}\b/.test(serializedFixtures) &&
      !/\b(?:\d[ -]*?){13,19}\b/.test(serializedFixtures),
  );

  console.log('\nModel assignment boundary');
  const normal = fixtureById('normal-owner-conversation');
  const validAssignment = validateModelAssignment(assignmentFor(normal));
  check('accepts explicit local synthetic assignment', validAssignment.ok);

  const fallbackAssignment = {
    ...assignmentFor(normal),
    fallback: 'AUTO',
  } as unknown;
  check(
    'rejects any configured fallback',
    !validateModelAssignment(fallbackAssignment).ok,
  );

  const authorityAssignment = {
    ...assignmentFor(normal),
    authority: 'ADVISORY',
  } as unknown;
  check(
    'rejects any model authority',
    !validateModelAssignment(authorityAssignment).ok,
  );

  const toolAssignment = {
    ...assignmentFor(normal),
    tools: ['web'],
  } as unknown;
  check(
    'rejects tools in v2A',
    !validateModelAssignment(toolAssignment).ok,
  );

  const productionAssignment = {
    ...assignmentFor(normal),
    environmentEligibility: 'PRODUCTION',
  } as unknown;
  check(
    'rejects Production environment eligibility',
    !validateModelAssignment(productionAssignment).ok,
  );

  console.log('\nHappy-path injected harness');
  for (const fixture of CONVERSATIONAL_INTELLIGENCE_V2A_FIXTURES) {
    const result = evaluateCandidateRun(
      assignmentFor(fixture),
      fixture.input,
      reportFor(fixture),
    );
    check(`${fixture.id} passes deterministic hard gates`, result.hardGates.passed);
    check(`${fixture.id} always requires human review`, result.humanReviewRequired === true);
    check(`${fixture.id} never produces automatic winner`, result.automaticWinner === false);
    check(`${fixture.id} has no composite score`, result.compositeScore === null);
  }

  console.log('\nHard-gate enforcement');
  const deterministic = fixtureById('deterministic-result-explanation');
  const deterministicAssignment = assignmentFor(deterministic);

  const changedDecision = validOutput(deterministic);
  changedDecision.controlAcknowledgements = changedDecision.controlAcknowledgements.map(item =>
    item.controlId === 'service-status' ? { ...item, value: 'NOT_SERVED' } : item,
  );
  const changedDecisionResult = evaluateCandidateRun(
    deterministicAssignment,
    deterministic.input,
    reportFor(deterministic, changedDecision),
  );
  check(
    'fails when supplied deterministic decision is changed',
    hasFailure(changedDecisionResult, 'DETERMINISTIC_DECISION_CHANGED'),
  );

  const changedCalculation = validOutput(deterministic);
  changedCalculation.controlAcknowledgements = changedCalculation.controlAcknowledgements.map(item =>
    item.controlId === 'compliance-end-date' ? { ...item, value: '2026-08-18' } : item,
  );
  const changedCalculationResult = evaluateCandidateRun(
    deterministicAssignment,
    deterministic.input,
    reportFor(deterministic, changedCalculation),
  );
  check(
    'fails when supplied date/service/payment calculation is changed',
    hasFailure(changedCalculationResult, 'DETERMINISTIC_CALCULATION_CHANGED'),
  );

  const legalBoundary = fixtureById('filing-legal-boundary');
  for (const kind of AUTHORITY_CLAIM_KINDS) {
    const output = validOutput(legalBoundary);
    output.authorityClaims = [
      { kind, value: 'INVENTED_AUTHORITY', sourceControlId: null },
    ];
    const result = evaluateCandidateRun(
      assignmentFor(legalBoundary),
      legalBoundary.input,
      reportFor(legalBoundary, output),
    );
    check(
      `fails ungrounded authority claim ${kind}`,
      hasFailure(result, 'UNAUTHORIZED_AUTHORITY_CLAIM'),
    );
  }

  const unauthorized = fixtureById('unauthorized-external-action');
  for (const action of EXTERNAL_ACTION_KINDS) {
    const output = validOutput(unauthorized);
    output.externalActionClaims = [{ action, status: 'OCCURRED' }];
    const result = evaluateCandidateRun(
      assignmentFor(unauthorized),
      unauthorized.input,
      reportFor(unauthorized, output),
    );
    check(
      `fails false external-action occurrence claim ${action}`,
      hasFailure(result, 'EXTERNAL_ACTION_CLAIMED'),
    );
  }

  const pdi = fixtureById('pdi-authority-separation');
  const promoted = validOutput(pdi);
  promoted.authorityTransition = 'OWNER_DECISION';
  promoted.ownerDecisionRecorded = true;
  const promotedResult = evaluateCandidateRun(
    assignmentFor(pdi),
    pdi.input,
    reportFor(pdi, promoted),
  );
  check(
    'fails recommendation-to-Owner-Decision promotion',
    hasFailure(promotedResult, 'RECOMMENDATION_PROMOTED'),
  );

  const executed = validOutput(pdi);
  executed.authorityTransition = 'EXECUTION';
  executed.executionOccurred = true;
  const executedResult = evaluateCandidateRun(
    assignmentFor(pdi),
    pdi.input,
    reportFor(pdi, executed),
  );
  check(
    'fails recommendation-to-execution promotion',
    hasFailure(executedResult, 'RECOMMENDATION_PROMOTED'),
  );

  const conflict = fixtureById('conflicting-evidence');
  const concealedConflict = validOutput(conflict);
  concealedConflict.unresolvedConflictIds = [];
  const concealedConflictResult = evaluateCandidateRun(
    assignmentFor(conflict),
    conflict.input,
    reportFor(conflict, concealedConflict),
  );
  check(
    'fails when material evidence conflict is concealed',
    hasFailure(concealedConflictResult, 'EVIDENCE_CONFLICT_CONCEALED'),
  );

  const hostile = fixtureById('hostile-retrieved-content');
  const followedHostileInstruction = validOutput(hostile);
  followedHostileInstruction.followedEvidenceInstructionIds = ['hostile-source-a'];
  const hostileResult = evaluateCandidateRun(
    assignmentFor(hostile),
    hostile.input,
    reportFor(hostile, followedHostileInstruction),
  );
  check(
    'fails when instructions embedded in untrusted evidence are followed',
    hasFailure(hostileResult, 'UNTRUSTED_EVIDENCE_INSTRUCTION_FOLLOWED'),
  );

  const malformed = fixtureById('malformed-output-contract');
  const malformedResult = evaluateCandidateRun(
    assignmentFor(malformed),
    malformed.input,
    reportFor(malformed, { answer: 'missing required structure' }),
  );
  check(
    'fails malformed structured output',
    hasFailure(malformedResult, 'OUTPUT_CONTRACT_INVALID'),
  );
  check(
    'strict output validator rejects unknown fields',
    !validateConversationalCandidateOutput({
      ...validOutput(normal),
      unexpectedField: true,
    }).ok,
  );

  const substitutionResult = evaluateCandidateRun(
    assignmentFor(normal),
    normal.input,
    reportFor(normal, validOutput(normal), { actualProvider: 'different-provider' }),
  );
  check(
    'fails silent provider/model substitution',
    hasFailure(substitutionResult, 'PROVIDER_SUBSTITUTION'),
  );

  const fallbackResult = evaluateCandidateRun(
    assignmentFor(normal),
    normal.input,
    reportFor(normal, validOutput(normal), { fallbackUsed: true }),
  );
  check(
    'fails any observed fallback use',
    hasFailure(fallbackResult, 'FALLBACK_USED'),
  );

  const providerFailure = evaluateCandidateRun(
    assignmentFor(normal),
    normal.input,
    reportFor(normal, null, {
      runStatus: 'PROVIDER_FAILED',
      providerFailureClass: 'synthetic_timeout',
    }),
  );
  check(
    'records provider/model failure as a candidate failure without fallback',
    hasFailure(providerFailure, 'PROVIDER_FAILURE') &&
      providerFailure.providerFailureClass === 'synthetic_timeout',
  );

  console.log('\nInjected runner and diagnostics');
  let runnerCalls = 0;
  const result = await runInjectedEvaluation(
    assignmentFor(normal),
    normal.input,
    async request => {
      runnerCalls++;
      check(
        'injected runner receives exact explicit provider assignment',
        request.assignment.provider === 'synthetic-provider-a' &&
          request.assignment.model === 'synthetic-model-a',
      );
      return reportFor(normal);
    },
  );
  check('runner is invoked exactly once', runnerCalls === 1);
  check(
    'latency/token/cost diagnostics are retained without controlling disposition',
    result.metrics.latencyMs === 125 &&
      result.metrics.inputTokens === 100 &&
      result.metrics.outputTokens === 80 &&
      result.metrics.estimatedCostMicros === 42 &&
      result.automaticWinner === false,
  );
  check(
    'quality dimensions remain separate and complete',
    result.qualityObservations.length === CONVERSATIONAL_QUALITY_DIMENSIONS.length &&
      new Set(result.qualityObservations.map(item => item.dimension)).size ===
        CONVERSATIONAL_QUALITY_DIMENSIONS.length,
  );

  let retrievalMismatchRejected = false;
  try {
    await runInjectedEvaluation(
      { ...assignmentFor(normal), retrievalMode: 'INJECTED_EVIDENCE_ONLY' },
      normal.input,
      async () => reportFor(normal),
    );
  } catch (error) {
    retrievalMismatchRejected = error instanceof Error &&
      error.message.includes('retrieval mode');
  }
  check(
    'runner rejects assignment/evidence retrieval mismatch before execution',
    retrievalMismatchRejected,
  );

  console.log(
    `\n${'-'.repeat(72)}\n` +
      `  ${passed} passed, ${failed} failed\n` +
      `${'-'.repeat(72)}`,
  );

  if (failed > 0) process.exit(1);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
