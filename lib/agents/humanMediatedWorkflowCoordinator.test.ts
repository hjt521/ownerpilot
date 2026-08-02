/**
 * Deterministic tests for in-memory workflow preparation.
 *
 * These tests use synthetic fixtures only and perform no model invocation,
 * provider lookup, tools, persistence, routing, activation, or Production
 * action.
 */

import { MockLanguageModelV3 } from 'ai/test';

import type {
  ExecutiveAgentRunRequest,
} from '../ai/modelRegistry';

import {
  cloneSyntheticFixture,
  SYNTHETIC_VALID_RUN_REQUEST,
} from './__fixtures__/registryFixtures';

import {
  SYNTHETIC_MODEL_EVALUATION_CASES,
} from './evaluation/__fixtures__/syntheticEvaluationCases';

import type {
  ModelEvaluationCase,
} from './evaluation/modelEvaluation';

import {
  buildLocalSingleRoleSystemPrompt,
  LOCAL_SINGLE_ROLE_PROMPT_VERSION,
  type LocalSingleRoleExecutionOptions,
} from './localSingleRoleExecution';

import {
  validAuthorization,
  validClosure,
  validDisposition,
  validEnvelope,
  validEvidence,
} from './__fixtures__/humanMediatedWorkflowFixtures';

import {
  buildHumanMediatedRoleAuditExtension,
  executeAuthorizedSingleRoleDraft,
  executeReceivingRoleDraft,
  materializeHumanMediatedRoleOutput,
  presentRoleOutputForHumanReview,
  presentReceivingRoleOutputForFinalHumanDisposition,
  prepareHumanMediatedHandoff,
  prepareInMemoryHumanMediatedWorkflow,
  recordExplicitHandoffAuthorization,
  recordHumanDisposition,
  recordAdministrativeWorkflowClosure,
  recordHumanInitiationAuthorization,
  recordReceivingRoleRunAuthorization,
  recordRoleRunAuthorization,
} from './humanMediatedWorkflowCoordinator';

import {
  validateCaoHumanMediatedOutput,
  validateCeoHumanMediatedOutput,
  validateChiefOfStaffHumanMediatedOutput,
  validateInMemoryWorkflowAuditTrail,
} from './humanMediatedWorkflowValidator';

let passed = 0;
let failed = 0;

function check(
  name: string,
  condition: boolean,
  detail = '',
): void {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}`);
    return;
  }

  failed += 1;
  console.log(
    `  ✗ ${name}${detail ? ` — ${detail}` : ''}`,
  );
}

function requiredCase(
  caseId: string,
): ModelEvaluationCase {
  const evaluationCase =
    SYNTHETIC_MODEL_EVALUATION_CASES.find(
      candidate => candidate.id === caseId,
    );

  if (evaluationCase === undefined) {
    throw new Error(
      `Missing synthetic evaluation case ${caseId}.`,
    );
  }

  return evaluationCase;
}

function mockGeneration(
  evaluationCase: ModelEvaluationCase,
) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({
          facts: [
            'Synthetic fact grounded in the supplied fixture.',
          ],
          assumptions: [
            'Synthetic assumption requiring human review.',
          ],
          unknowns: [
            'Synthetic evidence remains incomplete.',
          ],
          recommendations: [
            'Prepare a bounded draft-only next step.',
          ],
          dissent: [
            'Material synthetic dissent remains unresolved.',
          ],
          required_human_decisions: [
            'A human must determine final disposition.',
          ],
          prohibited_or_unavailable_actions: [
            ...evaluationCase.expectedBehavior
              .requiredProhibitedActionLabels,
            'repository writes are unavailable',
            'deployment is unavailable',
            'external communication is unavailable',
          ],
          evidence_references: [
            ...evaluationCase.expectedBehavior
              .requiredEvidenceReferenceIds,
          ],
          escalation_required:
            evaluationCase.expectedBehavior
              .mustEscalateOnIncompleteEvidence,
          draft_artifact:
            'Synthetic authorized single-role draft.',
        }),
      },
    ],
    finishReason: {
      unified: 'stop' as const,
      raw: undefined,
    },
    usage: {
      inputTokens: {
        total: 100,
        noCache: 100,
        cacheRead: undefined,
        cacheWrite: undefined,
      },
      outputTokens: {
        total: 200,
        text: 200,
        reasoning: undefined,
      },
    },
    warnings: [],
  };
}

function deterministicClock(): () => number {
  const values = [
    Date.UTC(2026, 7, 1, 21, 0, 0),
    Date.UTC(2026, 7, 1, 21, 0, 0, 250),
  ];

  let index = 0;

  return () => {
    const value =
      values[
        Math.min(
          index,
          values.length - 1,
        )
      ];

    index += 1;
    return value;
  };
}

function executionOptionsFor(
  evaluationCase: ModelEvaluationCase,
  model: MockLanguageModelV3,
): LocalSingleRoleExecutionOptions {
  const request =
    cloneSyntheticFixture(
      SYNTHETIC_VALID_RUN_REQUEST,
    ) as ExecutiveAgentRunRequest;

  request.requestedTaskClass =
    evaluationCase.taskClass;
  request.requestedTools = [];
  request.evidenceState =
    evaluationCase.expectedBehavior
      .mustEscalateOnIncompleteEvidence
      ? 'unknown'
      : 'complete';

  request.requestedUsage = {
    inputTokens: 100,
    outputTokens: 200,
    estimatedCostMicros: 1_800,
    estimatedDailyCostMicrosAfterRun: 1_800,
    elapsedLatencyMs: 250,
    requestedTimeoutMs: 5_000,
  };

  request.auditMetadata.runId =
    `synthetic-authorized:${evaluationCase.id}`;
  request.auditMetadata.taskClass =
    evaluationCase.taskClass;
  request.auditMetadata
    .effectiveToolPermissions = [];
  request.auditMetadata.toolCalls = [];
  request.auditMetadata.evidenceReferences =
    evaluationCase.expectedBehavior
      .requiredEvidenceReferenceIds;
  request.auditMetadata.unknownsRecorded = [];
  request.auditMetadata.outcome =
    request.evidenceState === 'complete'
      ? 'draft_completed'
      : 'escalation_required';
  request.auditMetadata.humanDisposition =
    'pending';

  return {
    runRequest: request,
    evaluationCase,
    model,
    promptVersion:
      LOCAL_SINGLE_ROLE_PROMPT_VERSION,
    systemPrompt:
      buildLocalSingleRoleSystemPrompt(
        request.registryEntry.roleId,
      ),
    pricing: {
      inputMicrosPerMillionTokens:
        2_000_000,
      outputMicrosPerMillionTokens:
        8_000_000,
    },
    clock: deterministicClock(),
  };
}

function envelopeForExecution(
  options: LocalSingleRoleExecutionOptions,
): Record<string, unknown> {
  const request = options.runRequest;
  const audit = request.auditMetadata;
  const entry = request.registryEntry;

  const authorization = validAuthorization({
    approvalReference:
      `synthetic-approval:${audit.runId}`,
    scopeId: audit.runId,
    roleId: entry.roleId,
    taskClass: request.requestedTaskClass,
    authorizedAt:
      '2026-08-01T20:01:00.000Z',
  });

  return validEnvelope({
    workflowId:
      `synthetic-workflow:${options.evaluationCase.id}`,
    runId: audit.runId,
    humanAuthorization: authorization,
    sourceCommitSha: audit.sourceCommitSha,
    roleId: entry.roleId,
    charterVersion: entry.charterVersion,
    registryVersion: entry.registryVersion,
    registryEntryHash:
      audit.registryEntryHash,
    requestedTaskClass:
      request.requestedTaskClass,
    requestedModelSlot: audit.modelSlot,
    providerId: audit.providerId,
    modelId: audit.modelId,
    pinnedModelVersion:
      audit.pinnedModelVersion,
    adapterId: audit.adapterId,
    reasoningLevel: entry.reasoningLevel,
    evidenceState: request.evidenceState,
    evidenceItems:
      options.evaluationCase.evidence.map(
        evidence =>
          validEvidence({
            evidenceId: evidence.id,
            locator: evidence.locator,
            description:
              evidence.description,
            classification:
              request.evidenceState ===
                'complete'
                ? 'verified_fact'
                : 'unknown',
            verificationState:
              request.evidenceState ===
                'complete'
                ? 'verified'
                : 'unknown',
          }),
      ),
    humanInstructions:
      options.evaluationCase.humanRequest,
    createdAt:
      '2026-08-01T20:00:00.000Z',
  });
}

function authorizedStateFor(
  options: LocalSingleRoleExecutionOptions,
) {
  const envelope =
    envelopeForExecution(options);

  const prepared =
    prepareInMemoryHumanMediatedWorkflow(
      envelope,
    );

  if (!prepared.ok) {
    throw new Error(
      `Preparation failed: ${prepared.issues
        .map(issue => issue.message)
        .join(', ')}`,
    );
  }

  const authorization =
    envelope.humanAuthorization;

  const initiated =
    recordHumanInitiationAuthorization(
      prepared.state,
      authorization,
    );

  if (!initiated.ok) {
    throw new Error(
      `Initiation failed: ${initiated.issues
        .map(issue => issue.message)
        .join(', ')}`,
    );
  }

  const authorized =
    recordRoleRunAuthorization(
      initiated.state,
      authorization,
    );

  if (!authorized.ok) {
    throw new Error(
      `Authorization failed: ${authorized.issues
        .map(issue => issue.message)
        .join(', ')}`,
    );
  }

  return authorized.state;
}

function materializerEnvelope(
  roleId:
    | 'executive.ceo'
    | 'executive.chief_of_staff'
    | 'executive.chief_architecture_officer',
  taskClass:
    | 'strategic_analysis'
    | 'cross_function_synthesis'
    | 'architecture_analysis',
): Record<string, unknown> {
  const authorization =
    validAuthorization({
      approvalReference:
        `synthetic-materializer:${roleId}`,
      scopeId:
        `synthetic-materializer-run:${roleId}`,
      roleId,
      taskClass,
    });

  return validEnvelope({
    workflowId:
      `synthetic-materializer-workflow:${roleId}`,
    runId:
      `synthetic-materializer-run:${roleId}`,
    roleId,
    requestedTaskClass: taskClass,
    humanAuthorization: authorization,
  });
}

function materializerDraft(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    facts: [
      'Synthetic materializer fact.',
    ],
    assumptions: [
      'Synthetic materializer assumption.',
    ],
    unknowns: [
      'Synthetic materializer unknown.',
    ],
    recommendations: [
      'Review the synthetic materialized draft.',
    ],
    dissent: [
      'Synthetic dissent remains unresolved.',
    ],
    requiredHumanDecisions: [
      'A human must determine final disposition.',
    ],
    prohibitedOrUnavailableActions: [
      'Automatic action is unavailable.',
    ],
    evidenceReferences: [
      'synthetic-evidence-001',
    ],
    escalationRequired: false,
    draftArtifact:
      'Synthetic materializer draft.',
    ...overrides,
  };
}

async function executedStateForReview(
  evaluationCase: ModelEvaluationCase,
) {
  const model =
    new MockLanguageModelV3({
      doGenerate: async () =>
        mockGeneration(evaluationCase),
    });

  const options =
    executionOptionsFor(
      evaluationCase,
      model,
    );

  const authorizedState =
    authorizedStateFor(options);

  const executed =
    await executeAuthorizedSingleRoleDraft(
      authorizedState,
      options,
    );

  if (!executed.ok) {
    throw new Error(
      `Execution failed: ${executed.issues
        .map(issue => issue.message)
        .join(', ')}`,
    );
  }

  return {
    state: executed.state,
    report: executed.report,
    model,
  };
}

function requiredReviewableCeoCase():
  ModelEvaluationCase {
  const evaluationCase =
    SYNTHETIC_MODEL_EVALUATION_CASES.find(
      candidate =>
        candidate.roleId ===
          'executive.ceo' &&
        candidate.expectedBehavior
          .mustEscalateOnIncompleteEvidence ===
          false,
    );

  if (evaluationCase === undefined) {
    throw new Error(
      'Missing non-escalating synthetic CEO case.',
    );
  }

  return evaluationCase;
}

async function presentedStateForDisposition() {
  const executed =
    await executedStateForReview(
      requiredReviewableCeoCase(),
    );

  const presented =
    presentRoleOutputForHumanReview(
      executed.state,
    );

  if (!presented.ok) {
    throw new Error(
      `Presentation failed: ${presented.issues
        .map(issue => issue.message)
        .join(', ')}`,
    );
  }

  return {
    state: presented.state,
    model: executed.model,
  };
}

function handoffCandidateForState(
  state: Parameters<
    typeof prepareHumanMediatedHandoff
  >[0],
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const output = state.roleOutputs[0];

  if (output === undefined) {
    throw new Error(
      'A source role output is required.',
    );
  }

  const handoffId =
    'synthetic-handoff-ceo-cao-001';
  const createdAt =
    '2026-08-01T23:30:00.000Z';

  return {
    handoffId,
    workflowId: state.workflowId,
    parentHandoffId:
      state.envelope.handoffId,
    originatingRunId:
      state.envelope.runId,
    originatingRoleId:
      state.envelope.roleId,
    receivingRoleId:
      'executive.chief_architecture_officer',
    originatingDraftReference: {
      draftReferenceId:
        `materialized-draft:${state.envelope.runId}`,
      originatingRunId:
        state.envelope.runId,
      originatingRoleId:
        state.envelope.roleId,
      taskClass:
        state.envelope.requestedTaskClass,
      sourceCommitSha:
        state.envelope.sourceCommitSha,
      disposition:
        state.currentHumanDisposition,
      noncanonical: true,
      pendingSubstantiveApproval:
        state.currentHumanDisposition ===
          'pending',
      evidenceReferences:
        output.commonOutput
          .evidenceReferences,
      dissent:
        output.commonOutput.dissent,
      unknowns:
        output.commonOutput.unknowns,
      requiredHumanDecisions:
        output.commonOutput
          .requiredHumanDecisions,
    },
    originatingDraftStatus:
      'noncanonical_draft',
    originatingHumanDisposition:
      state.currentHumanDisposition,
    substantiveApprovalOccurred: false,
    sectionsSelectedForTransfer: [
      'facts',
      'assumptions',
      'unknowns',
      'recommendations',
      'dissent',
      'required_human_decisions',
      'prohibited_or_unavailable_actions',
      'evidence_references',
      'draft_artifact',
      'role_extension',
      'material_disagreements',
      'escalation_packet',
      'clarification_requests',
    ],
    humanSummaryOrInstruction:
      'Prepare a bounded synthetic architecture analysis from the preserved noncanonical source draft.',
    humanAuthorization: {
      humanClass: 'founder',
      humanIdentifier:
        'synthetic-founder',
      approvalReference:
        'synthetic-approval:handoff:ceo-cao-001',
      scopeKind: 'handoff',
      scopeId: handoffId,
      roleId:
        'executive.chief_architecture_officer',
      taskClass:
        'architecture_analysis',
      authorizedAt: createdAt,
      authorizationVersion:
        'synthetic-authorization-v1',
    },
    humanConfirmationNoncanonical: true,
    humanConfirmationNoSubstantiveApproval:
      true,
    evidenceReferencesTransferred:
      output.commonOutput
        .evidenceReferences,
    dissentTransferred:
      output.commonOutput.dissent,
    unknownsTransferred:
      output.commonOutput.unknowns,
    requiredHumanDecisionsTransferred:
      output.commonOutput
        .requiredHumanDecisions,
    materialDisagreementsTransferred:
      output.materialDisagreements,
    omissions: [],
    requestedTaskClassForReceiver:
      'architecture_analysis',
    createdAt,
    receivingRoleDisposition: 'pending',
    receivingRoleSeparatelyInitiated: false,
    automaticContinuation: false,
    inheritedApproval: false,
    roleDispatchPerformed: false,
    authorityExpansionRequested: false,
    implementationAuthorized: false,
    toolPermissionInherited: false,
    modelAssignmentInherited: false,
    ...overrides,
  };
}

async function approvedStateForHandoff() {
  const reviewed =
    await presentedStateForDisposition();

  const recorded =
    recordHumanDisposition(
      reviewed.state,
      validDisposition({
        workflowId:
          reviewed.state.workflowId,
        runId:
          reviewed.state.envelope.runId,
        handoffId:
          reviewed.state.envelope.handoffId,
        recordedAt:
          '2026-08-01T23:00:00.000Z',
      }),
      reviewed.state.envelope
        .humanAuthorization,
    );

  if (!recorded.ok) {
    throw new Error(
      `Disposition failed: ${recorded.issues
        .map(issue => issue.message)
        .join(', ')}`,
    );
  }

  return {
    state: recorded.state,
    model: reviewed.model,
  };
}

async function preparedApprovedHandoffState() {
  const approved =
    await approvedStateForHandoff();

  const prepared =
    prepareHumanMediatedHandoff(
      approved.state,
      handoffCandidateForState(
        approved.state,
      ),
    );

  if (!prepared.ok) {
    throw new Error(
      `Handoff preparation failed: ${prepared.issues
        .map(issue => issue.message)
        .join(', ')}`,
    );
  }

  return {
    state: prepared.state,
    handoff: prepared.handoff,
    model: approved.model,
  };
}

async function preparedPendingHandoffState() {
  const reviewed =
    await presentedStateForDisposition();

  const prepared =
    prepareHumanMediatedHandoff(
      reviewed.state,
      handoffCandidateForState(
        reviewed.state,
      ),
    );

  if (!prepared.ok) {
    throw new Error(
      `Pending handoff preparation failed: ${prepared.issues
        .map(issue => issue.message)
        .join(', ')}`,
    );
  }

  return {
    state: prepared.state,
    handoff: prepared.handoff,
    model: reviewed.model,
  };
}

async function explicitlyAuthorizedApprovedHandoffState() {
  const prepared =
    await preparedApprovedHandoffState();

  const authorized =
    recordExplicitHandoffAuthorization(
      prepared.state,
      prepared.handoff.humanAuthorization,
    );

  if (!authorized.ok) {
    throw new Error(
      `Handoff authorization failed: ${authorized.issues
        .map(issue => issue.message)
        .join(', ')}`,
    );
  }

  return {
    state: authorized.state,
    handoff: authorized.handoff,
    model: prepared.model,
  };
}

async function explicitlyAuthorizedPendingHandoffState() {
  const prepared =
    await preparedPendingHandoffState();

  const authorized =
    recordExplicitHandoffAuthorization(
      prepared.state,
      prepared.handoff.humanAuthorization,
    );

  if (!authorized.ok) {
    throw new Error(
      `Pending handoff authorization failed: ${authorized.issues
        .map(issue => issue.message)
        .join(', ')}`,
    );
  }

  return {
    state: authorized.state,
    handoff: authorized.handoff,
    model: prepared.model,
  };
}

function receivingEnvelopeForState(
  state: Parameters<
    typeof recordReceivingRoleRunAuthorization
  >[0],
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const handoff = state.handoffs[0];

  if (handoff === undefined) {
    throw new Error(
      'An authorized handoff is required.',
    );
  }

  const runId =
    'synthetic-run-cao-receiving-001';
  const authorizedAt =
    '2026-08-02T00:00:00.000Z';

  return {
    ...state.envelope,
    runId,
    handoffId: handoff.handoffId,
    parentHandoffId:
      handoff.parentHandoffId,
    humanAuthorization: {
      humanClass: 'founder',
      humanIdentifier:
        'synthetic-founder',
      approvalReference:
        'synthetic-approval:run:cao-receiving-001',
      scopeKind: 'run',
      scopeId: runId,
      roleId: handoff.receivingRoleId,
      taskClass:
        handoff.requestedTaskClassForReceiver,
      authorizedAt,
      authorizationVersion:
        'synthetic-authorization-v1',
    },
    roleId: handoff.receivingRoleId,
    charterVersion:
      'synthetic-cao-charter-v1',
    registryEntryHash:
      'synthetic-cao-registry-entry-hash',
    requestedTaskClass:
      handoff.requestedTaskClassForReceiver,
    providerId:
      'synthetic-receiving-provider',
    modelId:
      'synthetic-cao-model-2026-08-01',
    pinnedModelVersion:
      'synthetic-cao-model-version-2026-08-01',
    adapterId:
      'synthetic-cao-adapter-v1',
    evidenceItems:
      state.envelope.evidenceItems,
    priorRoleDraftReferences: [
      handoff.originatingDraftReference,
    ],
    humanInstructions:
      handoff.humanSummaryOrInstruction,
    currentHumanDisposition: 'pending',
    createdAt: authorizedAt,
    supersedesHandoffId: null,
    automaticContinuation: false,
    authorityExpansionRequested: false,
    ...overrides,
  };
}

async function authorizedReceivingRoleState() {
  const authorizedHandoff =
    await explicitlyAuthorizedApprovedHandoffState();

  const receiving =
    recordReceivingRoleRunAuthorization(
      authorizedHandoff.state,
      receivingEnvelopeForState(
        authorizedHandoff.state,
      ),
    );

  if (!receiving.ok) {
    throw new Error(
      `Receiving authorization failed: ${receiving.issues
        .map(issue => issue.message)
        .join(', ')}`,
    );
  }

  return {
    state: receiving.state,
    originatingModel:
      authorizedHandoff.model,
  };
}

function receivingEvaluationCaseForState(
  state: Parameters<
    typeof executeReceivingRoleDraft
  >[0],
): ModelEvaluationCase {
  const receivingEnvelope =
    state.receivingEnvelope;

  if (receivingEnvelope === null) {
    throw new Error(
      'A receiving envelope is required.',
    );
  }

  const baseCase =
    requiredCase(
      'synthetic-cao-architecture-dissent-v1',
    );

  return {
    ...baseCase,
    id:
      `synthetic-receiving:${receivingEnvelope.runId}`,
    humanRequest:
      receivingEnvelope.humanInstructions,
    evidence:
      receivingEnvelope.evidenceItems.map(
        evidence => ({
          id: evidence.evidenceId,
          sourceKind:
            'synthetic_fixture' as const,
          locator: evidence.locator,
          description:
            evidence.description,
        }),
      ),
    expectedBehavior: {
      ...baseCase.expectedBehavior,
      mustEscalateOnIncompleteEvidence:
        false,
      requiredEvidenceReferenceIds:
        receivingEnvelope.evidenceItems.map(
          evidence => evidence.evidenceId,
        ),
    },
  };
}

function receivingExecutionOptionsFor(
  state: Parameters<
    typeof executeReceivingRoleDraft
  >[0],
  model: MockLanguageModelV3,
): LocalSingleRoleExecutionOptions {
  const receivingEnvelope =
    state.receivingEnvelope;

  if (receivingEnvelope === null) {
    throw new Error(
      'A receiving envelope is required.',
    );
  }

  const evaluationCase =
    receivingEvaluationCaseForState(state);

  const options =
    executionOptionsFor(
      evaluationCase,
      model,
    );

  const request = options.runRequest;
  const entry = request.registryEntry;
  const approvalReference =
    receivingEnvelope.humanAuthorization
      .approvalReference;

  entry.roleId =
    receivingEnvelope.roleId;
  entry.registryVersion =
    receivingEnvelope.registryVersion;
  entry.charterVersion =
    receivingEnvelope.charterVersion;
  entry.status = 'preview_approved';
  entry.primaryModel = {
    providerId:
      receivingEnvelope.providerId,
    modelId:
      receivingEnvelope.modelId,
    pinnedModelVersion:
      receivingEnvelope.pinnedModelVersion,
    adapterId:
      receivingEnvelope.adapterId,
    enabled: true,
    intendedUse: 'primary',
  };
  entry.challengerModel = {
    providerId:
      receivingEnvelope.providerId,
    modelId:
      `${receivingEnvelope.modelId}-challenger`,
    pinnedModelVersion:
      `${receivingEnvelope.pinnedModelVersion}-challenger`,
    adapterId:
      receivingEnvelope.adapterId,
    enabled: false,
    intendedUse: 'challenger',
  };
  entry.fallbackModel = null;
  entry.allowedTaskClasses = [
    receivingEnvelope.requestedTaskClass,
  ];
  entry.toolPermissions = {
    ...entry.toolPermissions,
    allowed: [],
    approvalRequired: [],
  };
  entry.reasoningLevel =
    receivingEnvelope.reasoningLevel;
  entry.environmentEligibility = [
    'preview',
  ];
  entry.roleApprovalReference =
    approvalReference;

  request.environment = 'preview';
  request.explicitHumanInitiation = true;
  request.roleApprovalReference =
    approvalReference;
  request.requestedTaskClass =
    receivingEnvelope.requestedTaskClass;
  request.requestedTools = [];
  request.requestedAuthorityCategories = [
    'advisory_draft',
  ];
  request.authorityExpansionRequested =
    false;
  request.disagreementPreservationRequired =
    true;
  request.uncertaintyPreservationRequired =
    true;
  request.evidenceState =
    receivingEnvelope.evidenceState;

  request.auditMetadata = {
    ...request.auditMetadata,
    runId: receivingEnvelope.runId,
    roleId: receivingEnvelope.roleId,
    registryVersion:
      receivingEnvelope.registryVersion,
    charterVersion:
      receivingEnvelope.charterVersion,
    registryEntryHash:
      receivingEnvelope.registryEntryHash,
    environment: 'preview',
    sourceCommitSha:
      receivingEnvelope.sourceCommitSha,
    requestedBy:
      receivingEnvelope.humanAuthorization
        .humanIdentifier,
    approvalReference,
    taskClass:
      receivingEnvelope.requestedTaskClass,
    modelSlot:
      receivingEnvelope.requestedModelSlot,
    providerId:
      receivingEnvelope.providerId,
    modelId:
      receivingEnvelope.modelId,
    pinnedModelVersion:
      receivingEnvelope.pinnedModelVersion,
    adapterId:
      receivingEnvelope.adapterId,
    reasoningLevel:
      receivingEnvelope.reasoningLevel,
    effectiveToolPermissions: [],
    toolCalls: [],
    substitutionRequested: false,
    substitutionReasonClass: null,
    fallbackReasonClass: null,
    evidenceReferences:
      evaluationCase.expectedBehavior
        .requiredEvidenceReferenceIds,
    unknownsRecorded: [],
    disagreements: [],
    outcome: 'draft_completed',
    humanDisposition: 'pending',
  };

  return {
    ...options,
    runRequest: request,
    evaluationCase,
    systemPrompt:
      buildLocalSingleRoleSystemPrompt(
        receivingEnvelope.roleId,
      ),
    clock: deterministicReceivingClock(),
  };
}

function deterministicReceivingClock(): () => number {
  const values = [
    Date.UTC(2026, 7, 2, 0, 1, 0),
    Date.UTC(2026, 7, 2, 0, 1, 0, 250),
  ];

  let index = 0;

  return () => {
    const value =
      values[
        Math.min(
          index,
          values.length - 1,
        )
      ];

    index += 1;
    return value;
  };
}

async function executedApprovedReceivingRoleState() {
  const authorized =
    await authorizedReceivingRoleState();

  const evaluationCase =
    receivingEvaluationCaseForState(
      authorized.state,
    );

  const receivingModel =
    new MockLanguageModelV3({
      doGenerate:
        async () =>
          mockGeneration(
            evaluationCase,
          ),
    });

  const executed =
    await executeReceivingRoleDraft(
      authorized.state,
      receivingExecutionOptionsFor(
        authorized.state,
        receivingModel,
      ),
    );

  if (!executed.ok) {
    throw new Error(
      `Receiving execution failed: ${executed.issues
        .map(issue => issue.message)
        .join(', ')}`,
    );
  }

  return {
    state: executed.state,
    originatingModel:
      authorized.originatingModel,
    receivingModel,
  };
}

async function executedPendingReceivingRoleState() {
  const authorizedHandoff =
    await explicitlyAuthorizedPendingHandoffState();

  const receiving =
    recordReceivingRoleRunAuthorization(
      authorizedHandoff.state,
      receivingEnvelopeForState(
        authorizedHandoff.state,
      ),
    );

  if (!receiving.ok) {
    throw new Error(
      `Pending receiving authorization failed: ${receiving.issues
        .map(issue => issue.message)
        .join(', ')}`,
    );
  }

  const evaluationCase =
    receivingEvaluationCaseForState(
      receiving.state,
    );

  const receivingModel =
    new MockLanguageModelV3({
      doGenerate:
        async () =>
          mockGeneration(
            evaluationCase,
          ),
    });

  const executed =
    await executeReceivingRoleDraft(
      receiving.state,
      receivingExecutionOptionsFor(
        receiving.state,
        receivingModel,
      ),
    );

  if (!executed.ok) {
    throw new Error(
      `Pending receiving execution failed: ${executed.issues
        .map(issue => issue.message)
        .join(', ')}`,
    );
  }

  return {
    state: executed.state,
    originatingModel:
      authorizedHandoff.model,
    receivingModel,
  };
}

async function presentedApprovedFinalState() {
  const executed =
    await executedApprovedReceivingRoleState();

  const presented =
    presentReceivingRoleOutputForFinalHumanDisposition(
      executed.state,
    );

  if (!presented.ok) {
    throw new Error(
      `Approved final presentation failed: ${presented.issues
        .map(issue => issue.message)
        .join(', ')}`,
    );
  }

  return {
    state: presented.state,
    originatingModel:
      executed.originatingModel,
    receivingModel:
      executed.receivingModel,
  };
}

async function presentedPendingFinalState() {
  const executed =
    await executedPendingReceivingRoleState();

  const presented =
    presentReceivingRoleOutputForFinalHumanDisposition(
      executed.state,
    );

  if (!presented.ok) {
    throw new Error(
      `Pending final presentation failed: ${presented.issues
        .map(issue => issue.message)
        .join(', ')}`,
    );
  }

  return {
    state: presented.state,
    originatingModel:
      executed.originatingModel,
    receivingModel:
      executed.receivingModel,
  };
}

async function rejectedStateForClosure() {
  const reviewed =
    await presentedStateForDisposition();

  const recorded =
    recordHumanDisposition(
      reviewed.state,
      validDisposition({
        workflowId:
          reviewed.state.workflowId,
        runId:
          reviewed.state.envelope.runId,
        handoffId:
          reviewed.state.envelope.handoffId,
        disposition: 'rejected',
        resolutionReference: null,
        permitsDraftReview: false,
        permitsDraftQuotation: false,
        permitsDraftComparison: false,
        permitsDraftRevision: false,
        permitsNoncanonicalIncorporation:
          false,
        permitsHumanMediatedHandoff:
          false,
      }),
      reviewed.state.envelope
        .humanAuthorization,
    );

  if (!recorded.ok) {
    throw new Error(
      `Rejection failed: ${recorded.issues
        .map(issue => issue.message)
        .join(', ')}`,
    );
  }

  return {
    state: recorded.state,
    model: reviewed.model,
  };
}

function closureAuthorizationForState(
  state: Parameters<
    typeof recordAdministrativeWorkflowClosure
  >[0],
): Record<string, unknown> {
  const finalPath =
    state.currentState ===
      'final_human_disposition_pending';

  const activeEnvelope =
    finalPath
      ? state.receivingEnvelope
      : state.envelope;

  if (activeEnvelope === null) {
    throw new Error(
      'An active closure envelope is required.',
    );
  }

  const authorizedAt =
    finalPath
      ? '2026-08-02T00:02:00.000Z'
      : '2026-08-01T23:00:00.000Z';

  return validAuthorization({
    humanClass: 'founder',
    humanIdentifier:
      'synthetic-founder',
    approvalReference:
      `synthetic-approval:closure:${activeEnvelope.runId}`,
    scopeKind: 'run',
    scopeId: activeEnvelope.runId,
    roleId: activeEnvelope.roleId,
    taskClass:
      activeEnvelope.requestedTaskClass,
    authorizedAt,
  });
}

function closureRecordForState(
  state: Parameters<
    typeof recordAdministrativeWorkflowClosure
  >[0],
  authorization:
    Record<string, unknown>,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const unresolvedDisagreementIds = [
    ...new Set(
      state.roleOutputs.flatMap(
        output =>
          output.materialDisagreements.map(
            disagreement =>
              disagreement.disagreementId,
          ),
      ),
    ),
  ];

  return validClosure({
    closureRecordId:
      `synthetic-closure:${state.workflowId}`,
    workflowId: state.workflowId,
    closedBy:
      authorization.humanClass,
    closedByIdentifier:
      authorization.humanIdentifier,
    closedAt:
      authorization.authorizedAt,
    unresolvedDisagreementIds,
    ...overrides,
  });
}

async function main(): Promise<void> {
  console.log(
    '\nHuman-mediated workflow coordinator preparation tests',
  );

  {
    const prepared =
      prepareInMemoryHumanMediatedWorkflow(
        validEnvelope(),
      );

    check(
      'accepts a valid synthetic workflow envelope',
      prepared.ok,
    );

    check(
      'stops at draft_request_prepared',
      prepared.ok &&
        prepared.state.currentState ===
          'draft_request_prepared' &&
        prepared.state.humanActionPending === true,
    );

    check(
      'performs no model invocation or coordinator transition',
      prepared.ok &&
        prepared.state.modelInvocationCount === 0 &&
        prepared.state
          .coordinatorTransitionCount === 0,
    );

    check(
      'creates empty role-output and handoff collections',
      prepared.ok &&
        prepared.state.receivingEnvelope === null &&
        prepared.state.roleOutputs.length === 0 &&
        prepared.state.currentHumanDisposition ===
          'pending' &&
        prepared.state
          .humanDispositionRecords.length === 0 &&
        prepared.state.handoffs.length === 0 &&
        prepared.state.closureRecord === null,
    );

    check(
      'creates one valid initial in-memory audit event',
      prepared.ok &&
        prepared.state.auditTrail.events.length === 1 &&
        prepared.state.auditTrail.events[0]
          ?.eventKind === 'request_prepared' &&
        prepared.state.auditTrail.events[0]
          ?.priorState === null &&
        prepared.state.auditTrail.events[0]
          ?.nextState ===
            'draft_request_prepared' &&
        validateInMemoryWorkflowAuditTrail(
          prepared.state.auditTrail,
        ).ok,
    );

    check(
      'retains all nonexecution boundary markers',
      prepared.ok &&
        prepared.state
          .automaticContinuation === false &&
        prepared.state
          .autonomousDispatchPerformed === false &&
        prepared.state
          .toolExecutionPerformed === false &&
        prepared.state.persistencePerformed ===
          false &&
        prepared.state
          .externalCommunicationPerformed ===
          false &&
        prepared.state
          .previewActivationPerformed === false &&
        prepared.state.productionActionPerformed ===
          false,
    );
  }

  {
    const prepared =
      prepareInMemoryHumanMediatedWorkflow(
        validEnvelope({
          automaticContinuation: true,
        }),
      );

    check(
      'rejects automatic continuation before state creation',
      !prepared.ok &&
        prepared.state === null &&
        prepared.issues.some(
          issue =>
            issue.path ===
              'workflowEnvelope.automaticContinuation',
        ),
    );
  }

  {
    const prepared =
      prepareInMemoryHumanMediatedWorkflow(
        validEnvelope({
          requestedTools: [
            'repository.read',
          ],
        }),
      );

    check(
      'rejects tool requests before state creation',
      !prepared.ok &&
        prepared.state === null &&
        prepared.issues.some(
          issue =>
            issue.path ===
              'workflowEnvelope.requestedTools',
        ),
    );
  }

  {
    const prepared =
      prepareInMemoryHumanMediatedWorkflow(
        validEnvelope({
          evidenceItems: [
            validEvidence({
              sensitiveContentPresent: true,
            }),
          ],
        }),
      );

    check(
      'rejects sensitive evidence before state creation',
      !prepared.ok &&
        prepared.state === null &&
        prepared.issues.some(
          issue =>
            issue.code ===
              'sensitive_content_prohibited',
        ),
    );
  }

  {
    const prepared =
      prepareInMemoryHumanMediatedWorkflow(
        validEnvelope(),
      );

    const originalEventCount =
      prepared.ok
        ? prepared.state.auditTrail.events.length
        : -1;

    const transitioned =
      prepared.ok
        ? recordHumanInitiationAuthorization(
            prepared.state,
            validAuthorization(),
          )
        : null;

    check(
      'records the exact human authorization for initiation review',
      transitioned !== null &&
        transitioned.ok &&
        transitioned.state.currentState ===
          'awaiting_human_initiation' &&
        transitioned.state
          .coordinatorTransitionCount === 1,
    );

    check(
      'appends one valid human audit event without mutating prepared state',
      prepared.ok &&
        transitioned !== null &&
        transitioned.ok &&
        prepared.state.currentState ===
          'draft_request_prepared' &&
        prepared.state.auditTrail.events.length ===
          originalEventCount &&
        transitioned.state.auditTrail.events.length ===
          originalEventCount + 1 &&
        transitioned.state.auditTrail.events[1]
          ?.actorKind === 'authorized_human' &&
        transitioned.state.auditTrail.events[1]
          ?.explicitHumanActionObserved === true &&
        validateInMemoryWorkflowAuditTrail(
          transitioned.state.auditTrail,
        ).ok,
    );

    check(
      'keeps model execution and dispatch at zero after human initiation',
      transitioned !== null &&
        transitioned.ok &&
        transitioned.state.modelInvocationCount ===
          0 &&
        transitioned.state
          .autonomousDispatchPerformed === false &&
        transitioned.state
          .toolExecutionPerformed === false &&
        transitioned.state.persistencePerformed ===
          false &&
        transitioned.state
          .previewActivationPerformed === false &&
        transitioned.state.productionActionPerformed ===
          false,
    );

    const replay =
      transitioned !== null &&
      transitioned.ok
        ? recordHumanInitiationAuthorization(
            transitioned.state,
            validAuthorization(),
          )
        : null;

    check(
      'rejects replay from a non-prepared workflow state',
      replay !== null &&
        !replay.ok &&
        replay.state === null &&
        replay.issues.some(
          issue =>
            issue.path ===
              'coordinator.currentState',
        ),
    );
  }

  {
    const prepared =
      prepareInMemoryHumanMediatedWorkflow(
        validEnvelope(),
      );

    const transitioned =
      prepared.ok
        ? recordHumanInitiationAuthorization(
            prepared.state,
            validAuthorization({
              scopeId:
                'synthetic-run-wrong-001',
            }),
          )
        : null;

    check(
      'rejects mismatched run authorization',
      transitioned !== null &&
        !transitioned.ok &&
        transitioned.state === null &&
        transitioned.issues.some(
          issue =>
            issue.code ===
              'human_authorization_mismatch',
        ),
    );
  }

  {
    const prepared =
      prepareInMemoryHumanMediatedWorkflow(
        validEnvelope(),
      );

    const initiated =
      prepared.ok
        ? recordHumanInitiationAuthorization(
            prepared.state,
            validAuthorization(),
          )
        : null;

    const priorEventCount =
      initiated !== null &&
      initiated.ok
        ? initiated.state.auditTrail.events.length
        : -1;

    const authorized =
      initiated !== null &&
      initiated.ok
        ? recordRoleRunAuthorization(
            initiated.state,
            validAuthorization(),
          )
        : null;

    check(
      'records explicit authorization for one role run',
      authorized !== null &&
        authorized.ok &&
        authorized.state.currentState ===
          'role_run_authorized' &&
        authorized.state
          .coordinatorTransitionCount === 2,
    );

    check(
      'appends one immutable role-run authorization audit event',
      initiated !== null &&
        initiated.ok &&
        authorized !== null &&
        authorized.ok &&
        initiated.state.currentState ===
          'awaiting_human_initiation' &&
        initiated.state.auditTrail.events.length ===
          priorEventCount &&
        authorized.state.auditTrail.events.length ===
          priorEventCount + 1 &&
        authorized.state.auditTrail.events[2]
          ?.priorState ===
            'awaiting_human_initiation' &&
        authorized.state.auditTrail.events[2]
          ?.nextState ===
            'role_run_authorized' &&
        authorized.state.auditTrail.events[2]
          ?.actorKind === 'authorized_human' &&
        validateInMemoryWorkflowAuditTrail(
          authorized.state.auditTrail,
        ).ok,
    );

    check(
      'stops before model execution after role-run authorization',
      authorized !== null &&
        authorized.ok &&
        authorized.state.modelInvocationCount ===
          0 &&
        authorized.state.roleOutputs.length === 0 &&
        authorized.state
          .autonomousDispatchPerformed === false &&
        authorized.state
          .toolExecutionPerformed === false &&
        authorized.state.persistencePerformed ===
          false &&
        authorized.state
          .previewActivationPerformed === false &&
        authorized.state.productionActionPerformed ===
          false,
    );

    const replay =
      authorized !== null &&
      authorized.ok
        ? recordRoleRunAuthorization(
            authorized.state,
            validAuthorization(),
          )
        : null;

    check(
      'rejects role-run authorization replay',
      replay !== null &&
        !replay.ok &&
        replay.state === null &&
        replay.issues.some(
          issue =>
            issue.path ===
              'coordinator.currentState',
        ),
    );
  }

  {
    const prepared =
      prepareInMemoryHumanMediatedWorkflow(
        validEnvelope(),
      );

    const initiated =
      prepared.ok
        ? recordHumanInitiationAuthorization(
            prepared.state,
            validAuthorization(),
          )
        : null;

    const authorized =
      initiated !== null &&
      initiated.ok
        ? recordRoleRunAuthorization(
            initiated.state,
            validAuthorization({
              approvalReference:
                'synthetic-approval:run:mismatch',
            }),
          )
        : null;

    check(
      'rejects mismatched role-run authorization',
      authorized !== null &&
        !authorized.ok &&
        authorized.state === null &&
        authorized.issues.some(
          issue =>
            issue.code ===
              'human_authorization_mismatch',
        ),
    );
  }

  {
    const evaluationCase =
      requiredCase(
        'synthetic-ceo-prohibited-action-v1',
      );

    const model =
      new MockLanguageModelV3({
        doGenerate: async () =>
          mockGeneration(evaluationCase),
      });

    const options =
      executionOptionsFor(
        evaluationCase,
        model,
      );

    const authorizedState =
      authorizedStateFor(options);

    const priorEventCount =
      authorizedState.auditTrail.events.length;

    const executed =
      await executeAuthorizedSingleRoleDraft(
        authorizedState,
        options,
      );

    check(
      'invokes exactly one injected model after explicit authorization',
      executed.ok &&
        model.doGenerateCalls.length === 1 &&
        executed.state.modelInvocationCount === 1,
    );

    check(
      'maps a completed draft to role_draft_completed',
      executed.ok &&
        executed.state.currentState ===
          'role_draft_completed' &&
        executed.report.finalAudit.outcome ===
          'draft_completed' &&
        executed.report
          .draftForHumanReview !== null,
    );

    check(
      'retains one report and one validated materialized role output',
      executed.ok &&
        authorizedState
          .localExecutionReports.length === 0 &&
        authorizedState.roleOutputs.length === 0 &&
        executed.state
          .localExecutionReports.length === 1 &&
        executed.state
          .localExecutionReports[0] ===
          executed.report &&
        executed.state.roleOutputs.length === 1 &&
        executed.state.roleOutputs[0]
          ?.roleId === 'executive.ceo' &&
        executed.state.roleOutputs[0]
          ?.commonOutput ===
          executed.report.draftForHumanReview,
    );

    check(
      'appends one valid coordinator execution audit event',
      executed.ok &&
        authorizedState.auditTrail.events.length ===
          priorEventCount &&
        executed.state.auditTrail.events.length ===
          priorEventCount + 1 &&
        executed.state.auditTrail.events[3]
          ?.priorState ===
            'role_run_authorized' &&
        executed.state.auditTrail.events[3]
          ?.nextState ===
            'role_draft_completed' &&
        executed.state.auditTrail.events[3]
          ?.actorKind ===
            'local_in_memory_coordinator' &&
        executed.state.auditTrail.events[3]
          ?.draftReferenceIds.length === 1 &&
        executed.state.auditTrail.events[3]
          ?.roleAuditExtension?.roleId ===
            'executive.ceo' &&
        validateInMemoryWorkflowAuditTrail(
          executed.state.auditTrail,
        ).ok,
    );

    check(
      'preserves all nonexecution boundaries after the model call',
      executed.ok &&
        executed.state.humanActionPending ===
          true &&
        executed.state
          .autonomousDispatchPerformed === false &&
        executed.state
          .toolExecutionPerformed === false &&
        executed.state.persistencePerformed ===
          false &&
        executed.state
          .externalCommunicationPerformed ===
          false &&
        executed.state
          .previewActivationPerformed === false &&
        executed.state.productionActionPerformed ===
          false &&
        executed.report
          .providerLookupPerformed === false &&
        executed.report.fallbackPerformed ===
          false &&
        executed.report.substitutionPerformed ===
          false,
    );

    const replay =
      executed.ok
        ? await executeAuthorizedSingleRoleDraft(
            executed.state,
            options,
          )
        : null;

    check(
      'rejects execution replay without a second model call',
      replay !== null &&
        !replay.ok &&
        replay.state === null &&
        model.doGenerateCalls.length === 1 &&
        replay.issues.some(
          issue =>
            issue.path ===
              'coordinator.currentState',
        ),
    );
  }

  {
    const evaluationCase =
      requiredCase(
        'synthetic-ceo-prohibited-action-v1',
      );

    const model =
      new MockLanguageModelV3({
        doGenerate: async () =>
          mockGeneration(evaluationCase),
      });

    const options =
      executionOptionsFor(
        evaluationCase,
        model,
      );

    const authorizedState =
      authorizedStateFor(options);

    options.runRequest.auditMetadata.modelId =
      'synthetic-mismatched-model';

    const executed =
      await executeAuthorizedSingleRoleDraft(
        authorizedState,
        options,
      );

    check(
      'rejects mismatched execution options before model invocation',
      !executed.ok &&
        executed.state === null &&
        executed.report === null &&
        model.doGenerateCalls.length === 0 &&
        executed.issues.some(
          issue =>
            issue.path ===
              'localExecutionOptions',
        ),
    );
  }

  {
    const evaluationCase =
      requiredCase(
        'synthetic-ceo-prohibited-action-v1',
      );

    const model =
      new MockLanguageModelV3({
        doGenerate: async () =>
          mockGeneration(evaluationCase),
      });

    const options =
      executionOptionsFor(
        evaluationCase,
        model,
      );

    const prepared =
      prepareInMemoryHumanMediatedWorkflow(
        envelopeForExecution(options),
      );

    const executed =
      prepared.ok
        ? await executeAuthorizedSingleRoleDraft(
            prepared.state,
            options,
          )
        : null;

    check(
      'rejects execution before role_run_authorized',
      executed !== null &&
        !executed.ok &&
        executed.state === null &&
        model.doGenerateCalls.length === 0 &&
        executed.issues.some(
          issue =>
            issue.path ===
              'coordinator.currentState',
        ),
    );
  }

  {
    const evaluationCase =
      requiredCase(
        'synthetic-ceo-unknown-evidence-v1',
      );

    const model =
      new MockLanguageModelV3({
        doGenerate: async () =>
          mockGeneration(evaluationCase),
      });

    const options =
      executionOptionsFor(
        evaluationCase,
        model,
      );

    const authorizedState =
      authorizedStateFor(options);

    const executed =
      await executeAuthorizedSingleRoleDraft(
        authorizedState,
        options,
      );

    check(
      'maps incomplete evidence to role_escalation_required',
      executed.ok &&
        executed.state.currentState ===
          'role_escalation_required' &&
        executed.report.finalAudit.outcome ===
          'escalation_required' &&
        executed.state.auditTrail.events[3]
          ?.eventKind ===
            'role_escalation_returned',
    );

    check(
      'keeps escalation human-mediated after one model call',
      executed.ok &&
        model.doGenerateCalls.length === 1 &&
        executed.state.modelInvocationCount === 1 &&
        executed.state.humanActionPending ===
          true &&
        executed.state
          .autonomousDispatchPerformed === false &&
        executed.state
          .toolExecutionPerformed === false &&
        executed.state.persistencePerformed ===
          false,
    );
  }

  {
    const envelope =
      materializerEnvelope(
        'executive.ceo',
        'strategic_analysis',
      );

    const draft = materializerDraft();

    const materialized =
      materializeHumanMediatedRoleOutput(
        envelope,
        draft,
      );

    check(
      'materializes a valid CEO human-mediated output',
      materialized.ok &&
        materialized.output.roleId ===
          'executive.ceo' &&
        (
          materialized.output.commonOutput as
            unknown
        ) === draft &&
        validateCeoHumanMediatedOutput(
          materialized.output,
        ).ok,
    );
  }

  {
    const envelope =
      materializerEnvelope(
        'executive.chief_of_staff',
        'cross_function_synthesis',
      );

    const draft = materializerDraft();

    const materialized =
      materializeHumanMediatedRoleOutput(
        envelope,
        draft,
      );

    const extension =
      materialized.ok
        ? materialized.output
            .roleExtension as unknown as
            Record<string, unknown>
        : null;

    check(
      'materializes a valid Chief of Staff output with preserved proposals',
      materialized.ok &&
        materialized.output.roleId ===
          'executive.chief_of_staff' &&
        extension !== null &&
        extension.proposals ===
          (
            draft as Record<string, unknown>
          ).recommendations &&
        extension.unresolvedQuestions ===
          (
            draft as Record<string, unknown>
          ).unknowns &&
        validateChiefOfStaffHumanMediatedOutput(
          materialized.output,
        ).ok,
    );
  }

  {
    const envelope =
      materializerEnvelope(
        'executive.chief_architecture_officer',
        'architecture_analysis',
      );

    const draft = materializerDraft();

    const materialized =
      materializeHumanMediatedRoleOutput(
        envelope,
        draft,
      );

    const extension =
      materialized.ok
        ? materialized.output
            .roleExtension as unknown as
            Record<string, unknown>
        : null;

    check(
      'materializes a valid CAO output without inventing architecture records',
      materialized.ok &&
        materialized.output.roleId ===
          'executive.chief_architecture_officer' &&
        extension !== null &&
        Array.isArray(
          extension.alternativesConsidered,
        ) &&
        extension.alternativesConsidered
          .length === 0 &&
        extension.approvalsStillRequired ===
          (
            draft as Record<string, unknown>
          ).requiredHumanDecisions &&
        validateCaoHumanMediatedOutput(
          materialized.output,
        ).ok,
    );
  }

  {
    const envelope =
      materializerEnvelope(
        'executive.ceo',
        'strategic_analysis',
      );

    const draft =
      materializerDraft({
        escalationRequired: true,
      });

    const materialized =
      materializeHumanMediatedRoleOutput(
        envelope,
        draft,
      );

    const escalation =
      materialized.ok
        ? materialized.output
            .escalationPacket
        : null;

    check(
      'materializes a bounded human-mediated escalation packet',
      materialized.ok &&
        escalation !== null &&
        escalation.workflowId ===
          envelope.workflowId &&
        escalation.runId ===
          envelope.runId &&
        escalation.roleId ===
          'executive.ceo' &&
        escalation.automaticActionAuthorized ===
          false &&
        validateCeoHumanMediatedOutput(
          materialized.output,
        ).ok,
    );
  }

  {
    const envelope =
      materializerEnvelope(
        'executive.ceo',
        'strategic_analysis',
      );

    const invalidDraft = {
      ...materializerDraft(),
      escalationRequired:
        'not-a-boolean',
    };

    const materialized =
      materializeHumanMediatedRoleOutput(
        envelope,
        invalidDraft,
      );

    check(
      'rejects an invalid generic draft before materialization',
      !materialized.ok &&
        materialized.output === null &&
        materialized.issues.some(
          issue =>
            issue.path ===
              'draftForHumanReview.escalationRequired',
        ),
    );
  }

  {
    const envelope =
      materializerEnvelope(
        'executive.ceo',
        'strategic_analysis',
      );

    const draft = materializerDraft();

    const first =
      materializeHumanMediatedRoleOutput(
        envelope,
        draft,
      );

    const second =
      materializeHumanMediatedRoleOutput(
        envelope,
        draft,
      );

    check(
      'materializes deterministically without model or coordinator execution',
      first.ok &&
        second.ok &&
        JSON.stringify(first.output) ===
          JSON.stringify(second.output),
    );
  }

  {
    const evaluationCase =
      requiredCase(
        'synthetic-ceo-unknown-evidence-v1',
      );

    const model =
      new MockLanguageModelV3({
        doGenerate: async () =>
          mockGeneration(evaluationCase),
      });

    const options =
      executionOptionsFor(
        evaluationCase,
        model,
      );

    const authorizedState =
      authorizedStateFor(options);

    const executed =
      await executeAuthorizedSingleRoleDraft(
        authorizedState,
        options,
      );

    check(
      'stores an escalation role output with its audit extension',
      executed.ok &&
        executed.state.roleOutputs.length === 1 &&
        executed.state.roleOutputs[0]
          ?.escalationPacket !== null &&
        executed.state.auditTrail.events[3]
          ?.roleAuditExtension?.roleId ===
            'executive.ceo' &&
        executed.state.auditTrail.events[3]
          ?.eventKind ===
            'role_escalation_returned',
    );
  }

  {
    const materialized =
      materializeHumanMediatedRoleOutput(
        materializerEnvelope(
          'executive.ceo',
          'strategic_analysis',
        ),
        materializerDraft(),
      );

    const audit =
      materialized.ok
        ? buildHumanMediatedRoleAuditExtension(
            materialized.output,
          )
        : null;

    check(
      'builds a bounded CEO role-audit extension',
      audit !== null &&
        audit.roleId === 'executive.ceo' &&
        audit.artifactKindsProduced[0] ===
          'executive_brief' &&
        audit.implementationAuthorized ===
          false,
    );
  }

  {
    const materialized =
      materializeHumanMediatedRoleOutput(
        materializerEnvelope(
          'executive.chief_of_staff',
          'cross_function_synthesis',
        ),
        materializerDraft(),
      );

    const audit =
      materialized.ok
        ? buildHumanMediatedRoleAuditExtension(
            materialized.output,
          )
        : null;

    check(
      'builds a bounded Chief of Staff role-audit extension',
      audit !== null &&
        audit.roleId ===
          'executive.chief_of_staff' &&
        audit.artifactKindsProduced[0] ===
          'executive_status_brief' &&
        audit.roleDispatchAuthorized ===
          false,
    );
  }

  {
    const materialized =
      materializeHumanMediatedRoleOutput(
        materializerEnvelope(
          'executive.chief_architecture_officer',
          'architecture_analysis',
        ),
        materializerDraft(),
      );

    const audit =
      materialized.ok
        ? buildHumanMediatedRoleAuditExtension(
            materialized.output,
          )
        : null;

    check(
      'builds a bounded CAO role-audit extension',
      audit !== null &&
        audit.roleId ===
          'executive.chief_architecture_officer' &&
        audit.artifactKindsProduced[0] ===
          'architecture_option_memorandum' &&
        audit.implementationAuthorized ===
          false,
    );
  }

  {
    const evaluationCase =
      SYNTHETIC_MODEL_EVALUATION_CASES.find(
        candidate =>
          candidate.roleId ===
            'executive.ceo' &&
          candidate.expectedBehavior
            .mustEscalateOnIncompleteEvidence ===
            false,
      );

    if (evaluationCase === undefined) {
      throw new Error(
        'Missing non-escalating synthetic CEO case.',
      );
    }

    const executed =
      await executedStateForReview(
        evaluationCase,
      );

    const presented =
      presentRoleOutputForHumanReview(
        executed.state,
      );

    check(
      'presents a completed role draft for explicit human review',
      presented.ok &&
        presented.state.currentState ===
          'awaiting_human_review' &&
        presented.state.auditTrail.events[4]
          ?.eventKind ===
            'role_output_presented_for_review' &&
        presented.state.auditTrail.events[4]
          ?.priorState ===
            'role_draft_completed' &&
        presented.state.auditTrail.events[4]
          ?.explicitHumanActionObserved ===
            false &&
        presented.state
          .coordinatorTransitionCount === 4 &&
        executed.model.doGenerateCalls.length ===
          1,
    );
  }

  {
    const evaluationCase =
      requiredCase(
        'synthetic-ceo-unknown-evidence-v1',
      );

    const executed =
      await executedStateForReview(
        evaluationCase,
      );

    const presented =
      presentRoleOutputForHumanReview(
        executed.state,
      );

    check(
      'presents an escalation packet for explicit human review',
      presented.ok &&
        presented.state.currentState ===
          'awaiting_human_review' &&
        presented.state.roleOutputs[0]
          ?.escalationPacket !== null &&
        presented.state.auditTrail.events[4]
          ?.priorState ===
            'role_escalation_required' &&
        presented.state
          .humanActionPending === true &&
        executed.model.doGenerateCalls.length ===
          1,
    );
  }

  {
    const evaluationCase =
      SYNTHETIC_MODEL_EVALUATION_CASES.find(
        candidate =>
          candidate.roleId ===
            'executive.ceo' &&
          candidate.expectedBehavior
            .mustEscalateOnIncompleteEvidence ===
            false,
      );

    if (evaluationCase === undefined) {
      throw new Error(
        'Missing non-escalating synthetic CEO case.',
      );
    }

    const executed =
      await executedStateForReview(
        evaluationCase,
      );

    const presented =
      presentRoleOutputForHumanReview(
        executed.state,
      );

    const replay =
      presented.ok
        ? presentRoleOutputForHumanReview(
            presented.state,
          )
        : null;

    check(
      'rejects presentation replay without another model call',
      replay !== null &&
        !replay.ok &&
        replay.state === null &&
        executed.model.doGenerateCalls.length ===
          1,
    );
  }

  {
    const reviewed =
      await presentedStateForDisposition();

    const disposition =
      validDisposition({
        workflowId:
          reviewed.state.workflowId,
        runId:
          reviewed.state.envelope.runId,
        handoffId:
          reviewed.state.envelope.handoffId,
      });

    const recorded =
      recordHumanDisposition(
        reviewed.state,
        disposition,
        reviewed.state.envelope
          .humanAuthorization,
      );

    check(
      'records approved_for_draft_use as bounded noncanonical permission',
      recorded.ok &&
        recorded.state.currentState ===
          'approved_for_draft_use' &&
        recorded.state
          .currentHumanDisposition ===
            'approved_for_draft_use' &&
        recorded.state
          .humanDispositionRecords.length === 1 &&
        recorded.state.auditTrail.events[5]
          ?.eventKind ===
            'human_disposition_recorded' &&
        recorded.state.auditTrail.events[5]
          ?.explicitHumanActionObserved ===
            true &&
        recorded.state
          .coordinatorTransitionCount === 5 &&
        reviewed.model.doGenerateCalls.length ===
          1,
    );
  }

  {
    const reviewed =
      await presentedStateForDisposition();

    const recorded =
      recordHumanDisposition(
        reviewed.state,
        validDisposition({
          workflowId:
            reviewed.state.workflowId,
          runId:
            reviewed.state.envelope.runId,
          handoffId:
            reviewed.state.envelope.handoffId,
          disposition:
            'revision_required',
          resolutionReference: null,
          permitsDraftReview: true,
          permitsDraftQuotation: false,
          permitsDraftComparison: false,
          permitsDraftRevision: true,
          permitsNoncanonicalIncorporation:
            false,
          permitsHumanMediatedHandoff:
            false,
        }),
        reviewed.state.envelope
          .humanAuthorization,
      );

    check(
      'records revision_required without automatic retry',
      recorded.ok &&
        recorded.state.currentState ===
          'revision_required' &&
        recorded.state.auditTrail.events[5]
          ?.eventKind ===
            'revision_requested' &&
        recorded.state
          .automaticContinuation === false &&
        recorded.state.modelInvocationCount ===
          1 &&
        reviewed.model.doGenerateCalls.length ===
          1,
    );
  }

  {
    const reviewed =
      await presentedStateForDisposition();

    const recorded =
      recordHumanDisposition(
        reviewed.state,
        validDisposition({
          workflowId:
            reviewed.state.workflowId,
          runId:
            reviewed.state.envelope.runId,
          handoffId:
            reviewed.state.envelope.handoffId,
          disposition: 'rejected',
          resolutionReference: null,
          permitsDraftReview: false,
          permitsDraftQuotation: false,
          permitsDraftComparison: false,
          permitsDraftRevision: false,
          permitsNoncanonicalIncorporation:
            false,
          permitsHumanMediatedHandoff:
            false,
        }),
        reviewed.state.envelope
          .humanAuthorization,
      );

    check(
      'records rejection with no retained draft-use permission',
      recorded.ok &&
        recorded.state.currentState ===
          'rejected' &&
        recorded.dispositionRecord
          .permitsDraftReview === false &&
        recorded.dispositionRecord
          .permitsHumanMediatedHandoff ===
            false &&
        recorded.state
          .productionActionPerformed === false,
    );
  }

  {
    const reviewed =
      await presentedStateForDisposition();

    const recorded =
      recordHumanDisposition(
        reviewed.state,
        validDisposition({
          workflowId:
            reviewed.state.workflowId,
          runId:
            reviewed.state.envelope.runId,
          handoffId:
            reviewed.state.envelope.handoffId,
          sourceIdentifier:
            'different-human',
        }),
        reviewed.state.envelope
          .humanAuthorization,
      );

    check(
      'rejects disposition provenance that mismatches the human authorization',
      !recorded.ok &&
        recorded.state === null &&
        recorded.dispositionRecord === null &&
        reviewed.model.doGenerateCalls.length ===
          1,
    );
  }

  {
    const reviewed =
      await presentedStateForDisposition();

    const recorded =
      recordHumanDisposition(
        reviewed.state,
        validDisposition({
          workflowId:
            reviewed.state.workflowId,
          runId:
            reviewed.state.envelope.runId,
          handoffId:
            reviewed.state.envelope.handoffId,
        }),
        reviewed.state.envelope
          .humanAuthorization,
      );

    const replay =
      recorded.ok
        ? recordHumanDisposition(
            recorded.state,
            recorded.dispositionRecord,
            recorded.state.envelope
              .humanAuthorization,
          )
        : null;

    check(
      'rejects disposition replay without another human-review state',
      replay !== null &&
        !replay.ok &&
        replay.state === null &&
        reviewed.model.doGenerateCalls.length ===
          1,
    );
  }

  {
    const approved =
      await approvedStateForHandoff();

    const prepared =
      prepareHumanMediatedHandoff(
        approved.state,
        handoffCandidateForState(
          approved.state,
        ),
      );

    check(
      'prepares an approved noncanonical CEO-to-CAO handoff',
      prepared.ok &&
        prepared.state.currentState ===
          'handoff_prepared' &&
        prepared.state.handoffs.length ===
          1 &&
        prepared.handoff
          .originatingHumanDisposition ===
            'approved_for_draft_use' &&
        prepared.handoff
          .substantiveApprovalOccurred ===
            false &&
        prepared.state.auditTrail.events[6]
          ?.eventKind ===
            'handoff_prepared' &&
        prepared.state.auditTrail.events[6]
          ?.explicitHumanActionObserved ===
            true &&
        prepared.state
          .coordinatorTransitionCount === 6 &&
        approved.model.doGenerateCalls.length ===
          1,
    );
  }

  {
    const reviewed =
      await presentedStateForDisposition();

    const prepared =
      prepareHumanMediatedHandoff(
        reviewed.state,
        handoffCandidateForState(
          reviewed.state,
        ),
      );

    check(
      'prepares a human-authorized pending draft handoff without substantive approval',
      prepared.ok &&
        prepared.state.currentState ===
          'handoff_prepared' &&
        prepared.handoff
          .originatingHumanDisposition ===
            'pending' &&
        prepared.handoff
          .originatingDraftReference
          .pendingSubstantiveApproval ===
            true &&
        prepared.handoff
          .humanConfirmationNoSubstantiveApproval ===
            true &&
        prepared.state
          .currentHumanDisposition ===
            'pending' &&
        reviewed.model.doGenerateCalls.length ===
          1,
    );
  }

  {
    const approved =
      await approvedStateForHandoff();

    const prepared =
      prepareHumanMediatedHandoff(
        approved.state,
        handoffCandidateForState(
          approved.state,
          {
            originatingRunId:
              'different-run',
          },
        ),
      );

    check(
      'rejects handoff preparation with mismatched source lineage',
      !prepared.ok &&
        prepared.state === null &&
        prepared.handoff === null &&
        approved.model.doGenerateCalls.length ===
          1,
    );
  }

  {
    const approved =
      await approvedStateForHandoff();

    const prepared =
      prepareHumanMediatedHandoff(
        approved.state,
        handoffCandidateForState(
          approved.state,
        ),
      );

    const replay =
      prepared.ok
        ? prepareHumanMediatedHandoff(
            prepared.state,
            prepared.handoff,
          )
        : null;

    check(
      'rejects handoff-preparation replay without dispatch or another model call',
      replay !== null &&
        !replay.ok &&
        replay.state === null &&
        prepared.ok &&
        prepared.state
          .autonomousDispatchPerformed ===
            false &&
        approved.model.doGenerateCalls.length ===
          1,
    );
  }

  {
    const prepared =
      await preparedApprovedHandoffState();

    const authorized =
      recordExplicitHandoffAuthorization(
        prepared.state,
        prepared.handoff
          .humanAuthorization,
      );

    check(
      'records explicit authorization for an approved-draft handoff',
      authorized.ok &&
        authorized.state.currentState ===
          'handoff_explicitly_authorized' &&
        authorized.state.auditTrail.events[7]
          ?.eventKind ===
            'handoff_human_authorized' &&
        authorized.state.auditTrail.events[7]
          ?.explicitHumanActionObserved ===
            true &&
        authorized.state
          .coordinatorTransitionCount === 7 &&
        authorized.state
          .autonomousDispatchPerformed ===
            false &&
        authorized.handoff
          .receivingRoleSeparatelyInitiated ===
            false &&
        prepared.model.doGenerateCalls.length ===
          1,
    );
  }

  {
    const prepared =
      await preparedPendingHandoffState();

    const authorized =
      recordExplicitHandoffAuthorization(
        prepared.state,
        prepared.handoff
          .humanAuthorization,
      );

    check(
      'records explicit authorization for a pending-draft handoff',
      authorized.ok &&
        authorized.state.currentState ===
          'handoff_explicitly_authorized' &&
        authorized.state
          .currentHumanDisposition ===
            'pending' &&
        authorized.state
          .humanDispositionRecords.length === 0 &&
        authorized.state
          .coordinatorTransitionCount === 6 &&
        authorized.handoff
          .originatingDraftReference
          .pendingSubstantiveApproval ===
            true &&
        prepared.model.doGenerateCalls.length ===
          1,
    );
  }

  {
    const prepared =
      await preparedApprovedHandoffState();

    const authorized =
      recordExplicitHandoffAuthorization(
        prepared.state,
        {
          ...prepared.handoff
            .humanAuthorization,
          approvalReference:
            'different-approval-reference',
        },
      );

    check(
      'rejects authorization that differs from prepared provenance',
      !authorized.ok &&
        authorized.state === null &&
        authorized.handoff === null &&
        prepared.model.doGenerateCalls.length ===
          1,
    );
  }

  {
    const prepared =
      await preparedApprovedHandoffState();

    const authorized =
      recordExplicitHandoffAuthorization(
        prepared.state,
        prepared.handoff
          .humanAuthorization,
      );

    const replay =
      authorized.ok
        ? recordExplicitHandoffAuthorization(
            authorized.state,
            authorized.handoff
              .humanAuthorization,
          )
        : null;

    check(
      'rejects handoff-authorization replay without receiving-role initiation',
      replay !== null &&
        !replay.ok &&
        replay.state === null &&
        authorized.ok &&
        authorized.state
          .autonomousDispatchPerformed ===
            false &&
        authorized.state.modelInvocationCount ===
          1 &&
        prepared.model.doGenerateCalls.length ===
          1,
    );
  }

  {
    const authorized =
      await explicitlyAuthorizedApprovedHandoffState();

    const receiving =
      recordReceivingRoleRunAuthorization(
        authorized.state,
        receivingEnvelopeForState(
          authorized.state,
        ),
      );

    check(
      'separately authorizes an approved-handoff receiving-role run',
      receiving.ok &&
        receiving.state.currentState ===
          'receiving_role_run_authorized' &&
        receiving.state.receivingEnvelope
          ?.roleId ===
            'executive.chief_architecture_officer' &&
        receiving.state.receivingEnvelope
          ?.runId !==
            receiving.state.envelope.runId &&
        receiving.state.auditTrail.events[8]
          ?.eventKind ===
            'receiving_role_run_human_authorized' &&
        receiving.state
          .coordinatorTransitionCount === 8 &&
        receiving.state.modelInvocationCount ===
          1 &&
        authorized.model.doGenerateCalls.length ===
          1,
    );
  }

  {
    const authorized =
      await explicitlyAuthorizedPendingHandoffState();

    const receiving =
      recordReceivingRoleRunAuthorization(
        authorized.state,
        receivingEnvelopeForState(
          authorized.state,
        ),
      );

    check(
      'separately authorizes a pending-handoff receiving-role run',
      receiving.ok &&
        receiving.state.currentState ===
          'receiving_role_run_authorized' &&
        receiving.state
          .currentHumanDisposition ===
            'pending' &&
        receiving.state
          .humanDispositionRecords.length === 0 &&
        receiving.state
          .coordinatorTransitionCount === 7 &&
        receiving.state.modelInvocationCount ===
          1 &&
        authorized.model.doGenerateCalls.length ===
          1,
    );
  }

  {
    const authorized =
      await explicitlyAuthorizedApprovedHandoffState();

    const receiving =
      recordReceivingRoleRunAuthorization(
        authorized.state,
        receivingEnvelopeForState(
          authorized.state,
          {
            priorRoleDraftReferences: [],
          },
        ),
      );

    check(
      'rejects receiving-role authorization without exact source-draft lineage',
      !receiving.ok &&
        receiving.state === null &&
        receiving.receivingEnvelope === null &&
        authorized.model.doGenerateCalls.length ===
          1,
    );
  }

  {
    const authorized =
      await explicitlyAuthorizedApprovedHandoffState();

    const handoff =
      authorized.state.handoffs[0];

    if (handoff === undefined) {
      throw new Error(
        'An authorized handoff is required.',
      );
    }

    const candidate =
      receivingEnvelopeForState(
        authorized.state,
      );

    const candidateAuthorization =
      candidate.humanAuthorization;

    if (
      typeof candidateAuthorization !==
        'object' ||
      candidateAuthorization === null ||
      Array.isArray(candidateAuthorization)
    ) {
      throw new Error(
        'A receiving authorization is required.',
      );
    }

    const receiving =
      recordReceivingRoleRunAuthorization(
        authorized.state,
        {
          ...candidate,
          humanAuthorization: {
            ...candidateAuthorization,
            approvalReference:
              handoff.humanAuthorization
                .approvalReference,
          },
        },
      );

    check(
      'rejects reuse of the handoff approval as receiving-run authorization',
      !receiving.ok &&
        receiving.state === null &&
        receiving.receivingEnvelope === null &&
        authorized.model.doGenerateCalls.length ===
          1,
    );
  }

  {
    const authorized =
      await explicitlyAuthorizedApprovedHandoffState();

    const receiving =
      recordReceivingRoleRunAuthorization(
        authorized.state,
        receivingEnvelopeForState(
          authorized.state,
        ),
      );

    const replay =
      receiving.ok
        ? recordReceivingRoleRunAuthorization(
            receiving.state,
            receiving.receivingEnvelope,
          )
        : null;

    check(
      'rejects receiving-role authorization replay before model execution',
      replay !== null &&
        !replay.ok &&
        replay.state === null &&
        receiving.ok &&
        receiving.state.modelInvocationCount ===
          1 &&
        receiving.state
          .autonomousDispatchPerformed ===
            false &&
        authorized.model.doGenerateCalls.length ===
          1,
    );
  }

  {
    const authorized =
      await authorizedReceivingRoleState();

    const evaluationCase =
      receivingEvaluationCaseForState(
        authorized.state,
      );

    const receivingModel =
      new MockLanguageModelV3({
        doGenerate:
          async () =>
            mockGeneration(
              evaluationCase,
            ),
      });

    const executed =
      await executeReceivingRoleDraft(
        authorized.state,
        receivingExecutionOptionsFor(
          authorized.state,
          receivingModel,
        ),
      );

    check(
      'executes exactly one separately authorized receiving-role model call',
      executed.ok &&
        executed.state.currentState ===
          'receiving_role_draft_completed' &&
        executed.state.roleOutputs.length ===
          2 &&
        executed.state.roleOutputs[1]
          ?.roleId ===
            'executive.chief_architecture_officer' &&
        executed.state
          .localExecutionReports.length ===
            2 &&
        executed.state.auditTrail.events[9]
          ?.eventKind ===
            'receiving_role_run_completed' &&
        executed.state.auditTrail.events[9]
          ?.runId ===
            executed.state.receivingEnvelope
              ?.runId &&
        executed.state.modelInvocationCount ===
          2 &&
        executed.state
          .coordinatorTransitionCount === 9 &&
        authorized.originatingModel
          .doGenerateCalls.length === 1 &&
        receivingModel.doGenerateCalls.length ===
          1,
    );
  }

  {
    const authorized =
      await authorizedReceivingRoleState();

    const evaluationCase =
      receivingEvaluationCaseForState(
        authorized.state,
      );

    const receivingModel =
      new MockLanguageModelV3({
        doGenerate:
          async () =>
            mockGeneration(
              evaluationCase,
            ),
      });

    const options =
      receivingExecutionOptionsFor(
        authorized.state,
        receivingModel,
      );

    options.runRequest.auditMetadata.runId =
      'different-receiving-run';

    const executed =
      await executeReceivingRoleDraft(
        authorized.state,
        options,
      );

    check(
      'rejects mismatched receiving execution options before model invocation',
      !executed.ok &&
        executed.state === null &&
        executed.report === null &&
        authorized.originatingModel
          .doGenerateCalls.length === 1 &&
        receivingModel.doGenerateCalls.length ===
          0,
    );
  }

  {
    const authorized =
      await authorizedReceivingRoleState();

    const evaluationCase =
      receivingEvaluationCaseForState(
        authorized.state,
      );

    const receivingModel =
      new MockLanguageModelV3({
        doGenerate:
          async () =>
            mockGeneration(
              evaluationCase,
            ),
      });

    const options =
      receivingExecutionOptionsFor(
        authorized.state,
        receivingModel,
      );

    options.evaluationCase = {
      ...options.evaluationCase,
      humanRequest:
        'Different unapproved receiving instruction.',
    };

    const executed =
      await executeReceivingRoleDraft(
        authorized.state,
        options,
      );

    check(
      'rejects changed receiving instructions before model invocation',
      !executed.ok &&
        executed.state === null &&
        executed.report === null &&
        receivingModel.doGenerateCalls.length ===
          0,
    );
  }

  {
    const authorized =
      await authorizedReceivingRoleState();

    const evaluationCase =
      receivingEvaluationCaseForState(
        authorized.state,
      );

    const receivingModel =
      new MockLanguageModelV3({
        doGenerate:
          async () =>
            mockGeneration(
              evaluationCase,
            ),
      });

    const executed =
      await executeReceivingRoleDraft(
        authorized.state,
        receivingExecutionOptionsFor(
          authorized.state,
          receivingModel,
        ),
      );

    const replay =
      executed.ok
        ? await executeReceivingRoleDraft(
            executed.state,
            receivingExecutionOptionsFor(
              executed.state,
              receivingModel,
            ),
          )
        : null;

    check(
      'rejects receiving-role execution replay without a third model call',
      replay !== null &&
        !replay.ok &&
        replay.state === null &&
        executed.ok &&
        executed.state.modelInvocationCount ===
          2 &&
        executed.state
          .autonomousDispatchPerformed ===
            false &&
        receivingModel.doGenerateCalls.length ===
          1,
    );
  }

  {
    const authorized =
      await authorizedReceivingRoleState();

    const evaluationCase =
      receivingEvaluationCaseForState(
        authorized.state,
      );

    const receivingModel =
      new MockLanguageModelV3({
        doGenerate:
          async () => {
            const generation =
              mockGeneration(
                evaluationCase,
              );

            const textPart =
              generation.content[0];

            if (
              textPart === undefined ||
              textPart.type !== 'text'
            ) {
              throw new Error(
                'Expected synthetic text output.',
              );
            }

            const parsed = JSON.parse(
              textPart.text,
            ) as {
              evidence_references:
                string[];
            };

            parsed.evidence_references = [];

            return {
              ...generation,
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify(parsed),
                },
              ],
            };
          },
      });

    const executed =
      await executeReceivingRoleDraft(
        authorized.state,
        receivingExecutionOptionsFor(
          authorized.state,
          receivingModel,
        ),
      );

    check(
      'rejects a receiving draft that drops transferred evidence',
      !executed.ok &&
        executed.state === null &&
        executed.report !== null &&
        authorized.originatingModel
          .doGenerateCalls.length === 1 &&
        receivingModel.doGenerateCalls.length ===
          1,
    );
  }

  {
    const executed =
      await executedApprovedReceivingRoleState();

    const presented =
      presentReceivingRoleOutputForFinalHumanDisposition(
        executed.state,
      );

    check(
      'presents an approved-chain receiving draft for final human disposition',
      presented.ok &&
        presented.state.currentState ===
          'final_human_disposition_pending' &&
        presented.state.auditTrail.events[10]
          ?.eventKind ===
            'role_output_presented_for_review' &&
        presented.state.auditTrail.events[10]
          ?.runId ===
            presented.state.receivingEnvelope
              ?.runId &&
        presented.state.auditTrail.events[10]
          ?.explicitHumanActionObserved ===
            false &&
        presented.state
          .coordinatorTransitionCount === 10 &&
        presented.state.modelInvocationCount ===
          2 &&
        executed.originatingModel
          .doGenerateCalls.length === 1 &&
        executed.receivingModel
          .doGenerateCalls.length === 1,
    );
  }

  {
    const executed =
      await executedPendingReceivingRoleState();

    const presented =
      presentReceivingRoleOutputForFinalHumanDisposition(
        executed.state,
      );

    check(
      'presents a pending-chain receiving draft without substantive approval',
      presented.ok &&
        presented.state.currentState ===
          'final_human_disposition_pending' &&
        presented.state
          .currentHumanDisposition ===
            'pending' &&
        presented.state
          .humanDispositionRecords.length === 0 &&
        presented.state.auditTrail.events[9]
          ?.eventKind ===
            'role_output_presented_for_review' &&
        presented.state
          .coordinatorTransitionCount === 9 &&
        presented.state.modelInvocationCount ===
          2 &&
        executed.originatingModel
          .doGenerateCalls.length === 1 &&
        executed.receivingModel
          .doGenerateCalls.length === 1,
    );
  }

  {
    const executed =
      await executedApprovedReceivingRoleState();

    const presented =
      presentReceivingRoleOutputForFinalHumanDisposition(
        executed.state,
      );

    const replay =
      presented.ok
        ? presentReceivingRoleOutputForFinalHumanDisposition(
            presented.state,
          )
        : null;

    check(
      'rejects final-presentation replay without another model call',
      replay !== null &&
        !replay.ok &&
        replay.state === null &&
        presented.ok &&
        presented.state.modelInvocationCount ===
          2 &&
        presented.state
          .autonomousDispatchPerformed ===
            false &&
        executed.originatingModel
          .doGenerateCalls.length === 1 &&
        executed.receivingModel
          .doGenerateCalls.length === 1,
    );
  }

  {
    const executed =
      await executedApprovedReceivingRoleState();

    const invalidState = {
      ...executed.state,
      roleOutputs:
        executed.state.roleOutputs.slice(0, 1),
    };

    const presented =
      presentReceivingRoleOutputForFinalHumanDisposition(
        invalidState,
      );

    check(
      'rejects final presentation without the receiving output',
      !presented.ok &&
        presented.state === null &&
        executed.originatingModel
          .doGenerateCalls.length === 1 &&
        executed.receivingModel
          .doGenerateCalls.length === 1,
    );
  }

  {
    const presented =
      await presentedApprovedFinalState();

    const authorization =
      closureAuthorizationForState(
        presented.state,
      );

    const closed =
      recordAdministrativeWorkflowClosure(
        presented.state,
        closureRecordForState(
          presented.state,
          authorization,
        ),
        authorization,
      );

    check(
      'administratively closes an approved final two-role workflow',
      closed.ok &&
        closed.state.currentState ===
          'workflow_closed' &&
        closed.state.closureRecord !== null &&
        closed.state.auditTrail.events[11]
          ?.eventKind ===
            'workflow_administratively_closed' &&
        closed.state.auditTrail.events[11]
          ?.explicitHumanActionObserved ===
            true &&
        closed.state
          .coordinatorTransitionCount === 11 &&
        closed.state.modelInvocationCount ===
          2 &&
        closed.closureRecord
          .unresolvedDissentRemainsVisible ===
            true &&
        presented.originatingModel
          .doGenerateCalls.length === 1 &&
        presented.receivingModel
          .doGenerateCalls.length === 1,
    );
  }

  {
    const presented =
      await presentedPendingFinalState();

    const authorization =
      closureAuthorizationForState(
        presented.state,
      );

    const closed =
      recordAdministrativeWorkflowClosure(
        presented.state,
        closureRecordForState(
          presented.state,
          authorization,
        ),
        authorization,
      );

    check(
      'administratively closes a pending final chain without substantive approval',
      closed.ok &&
        closed.state.currentState ===
          'workflow_closed' &&
        closed.state
          .currentHumanDisposition ===
            'pending' &&
        closed.state
          .humanDispositionRecords.length === 0 &&
        closed.state.auditTrail.events[10]
          ?.eventKind ===
            'workflow_administratively_closed' &&
        closed.state
          .coordinatorTransitionCount === 10 &&
        closed.state.modelInvocationCount ===
          2 &&
        presented.originatingModel
          .doGenerateCalls.length === 1 &&
        presented.receivingModel
          .doGenerateCalls.length === 1,
    );
  }

  {
    const rejected =
      await rejectedStateForClosure();

    const authorization =
      closureAuthorizationForState(
        rejected.state,
      );

    const closed =
      recordAdministrativeWorkflowClosure(
        rejected.state,
        closureRecordForState(
          rejected.state,
          authorization,
        ),
        authorization,
      );

    check(
      'administratively closes an explicitly rejected workflow',
      closed.ok &&
        closed.state.currentState ===
          'workflow_closed' &&
        closed.state
          .currentHumanDisposition ===
            'rejected' &&
        closed.state.auditTrail.events[6]
          ?.eventKind ===
            'workflow_administratively_closed' &&
        closed.state
          .coordinatorTransitionCount === 6 &&
        closed.state.modelInvocationCount ===
          1 &&
        rejected.model.doGenerateCalls.length ===
          1,
    );
  }

  {
    const presented =
      await presentedApprovedFinalState();

    const authorization =
      closureAuthorizationForState(
        presented.state,
      );

    const closed =
      recordAdministrativeWorkflowClosure(
        presented.state,
        closureRecordForState(
          presented.state,
          authorization,
          {
            unresolvedDisagreementIds: [
              'fabricated-disagreement',
            ],
          },
        ),
        authorization,
      );

    check(
      'rejects closure that changes unresolved disagreement identifiers',
      !closed.ok &&
        closed.state === null &&
        closed.closureRecord === null &&
        presented.originatingModel
          .doGenerateCalls.length === 1 &&
        presented.receivingModel
          .doGenerateCalls.length === 1,
    );
  }

  {
    const presented =
      await presentedApprovedFinalState();

    const activeEnvelope =
      presented.state.receivingEnvelope;

    if (activeEnvelope === null) {
      throw new Error(
        'A receiving envelope is required.',
      );
    }

    const reusedAuthorization = {
      ...activeEnvelope.humanAuthorization,
    };

    const closed =
      recordAdministrativeWorkflowClosure(
        presented.state,
        closureRecordForState(
          presented.state,
          reusedAuthorization,
        ),
        reusedAuthorization,
      );

    check(
      'rejects reuse of prior run authorization for closure',
      !closed.ok &&
        closed.state === null &&
        closed.closureRecord === null &&
        presented.originatingModel
          .doGenerateCalls.length === 1 &&
        presented.receivingModel
          .doGenerateCalls.length === 1,
    );
  }

  {
    const presented =
      await presentedApprovedFinalState();

    const authorization =
      closureAuthorizationForState(
        presented.state,
      );

    const closed =
      recordAdministrativeWorkflowClosure(
        presented.state,
        closureRecordForState(
          presented.state,
          authorization,
        ),
        authorization,
      );

    const replay =
      closed.ok
        ? recordAdministrativeWorkflowClosure(
            closed.state,
            closed.closureRecord,
            authorization,
          )
        : null;

    check(
      'rejects administrative-closure replay without another model call',
      replay !== null &&
        !replay.ok &&
        replay.state === null &&
        replay.closureRecord === null &&
        closed.ok &&
        closed.state.modelInvocationCount ===
          2 &&
        closed.state
          .autonomousDispatchPerformed ===
            false &&
        presented.originatingModel
          .doGenerateCalls.length === 1 &&
        presented.receivingModel
          .doGenerateCalls.length === 1,
    );
  }

  console.log(
    `\n${'-'.repeat(72)}\n` +
      `  ${passed} passed, ${failed} failed\n` +
      `${'-'.repeat(72)}`,
  );

  if (failed > 0) {
    process.exit(1);
  }
}

void main().catch(error => {
  console.error(error);
  process.exit(1);
});
