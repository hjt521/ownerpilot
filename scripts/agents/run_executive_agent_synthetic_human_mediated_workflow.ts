/**
 * Deterministic synthetic human-mediated executive workflow command.
 *
 * The command is a local test harness that supplies separate synthetic
 * human authorization records at every human-required transition.
 *
 * It uses two injected AI SDK mock models and synthetic fixtures only.
 * It performs no provider lookup, credential read, network call, tool use,
 * persistence, route creation, Preview activation, or Production action.
 */

import { MockLanguageModelV3 } from 'ai/test';

import type {
  ExecutiveAgentRunRequest,
} from '../../lib/ai/modelRegistry';

import {
  cloneSyntheticFixture,
  SYNTHETIC_VALID_RUN_REQUEST,
} from '../../lib/agents/__fixtures__/registryFixtures';

import {
  SYNTHETIC_MODEL_EVALUATION_CASES,
} from '../../lib/agents/evaluation/__fixtures__/syntheticEvaluationCases';

import type {
  ModelEvaluationCase,
} from '../../lib/agents/evaluation/modelEvaluation';

import {
  buildLocalSingleRoleSystemPrompt,
  LOCAL_SINGLE_ROLE_PROMPT_VERSION,
  type LocalSingleRoleExecutionOptions,
} from '../../lib/agents/localSingleRoleExecution';

import {
  validAuthorization,
  validClosure,
  validDisposition,
  validEnvelope,
  validEvidence,
} from '../../lib/agents/__fixtures__/humanMediatedWorkflowFixtures';

import {
  executeAuthorizedSingleRoleDraft,
  executeReceivingRoleDraft,
  prepareHumanMediatedHandoff,
  prepareInMemoryHumanMediatedWorkflow,
  presentReceivingRoleOutputForFinalHumanDisposition,
  presentRoleOutputForHumanReview,
  recordAdministrativeWorkflowClosure,
  recordExplicitHandoffAuthorization,
  recordHumanDisposition,
  recordHumanInitiationAuthorization,
  recordReceivingRoleRunAuthorization,
  recordRoleRunAuthorization,
} from '../../lib/agents/humanMediatedWorkflowCoordinator';

import {
  validateCaoHumanMediatedOutput,
  validateCeoHumanMediatedOutput,
  validateInMemoryWorkflowAuditTrail,
} from '../../lib/agents/humanMediatedWorkflowValidator';

const COMMAND_VERSION =
  'executive-agent-synthetic-human-mediated-workflow-v1';

interface IssueLike {
  message: string;
}

function issueText(
  issues: readonly IssueLike[],
): string {
  return issues
    .map(issue => issue.message)
    .join(', ');
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

function requiredReviewableCeoCase():
  ModelEvaluationCase {
  const evaluationCase =
    requiredCase(
      'synthetic-ceo-prohibited-action-v1',
    );

  if (
    evaluationCase.roleId !==
      'executive.ceo' ||
    evaluationCase.taskClass !==
      'executive_brief' ||
    evaluationCase.expectedBehavior
      .mustEscalateOnIncompleteEvidence !==
      false
  ) {
    throw new Error(
      'The required synthetic CEO case no longer matches the bounded reviewable executive-brief demonstration.',
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

function deterministicReceivingClock():
  () => number {
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
    estimatedDailyCostMicrosAfterRun:
      1_800,
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

function handoffCandidateForState(
  state: Parameters<
    typeof prepareHumanMediatedHandoff
  >[0],
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
      pendingSubstantiveApproval: false,
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
  };
}

function receivingEnvelopeForState(
  state: Parameters<
    typeof recordReceivingRoleRunAuthorization
  >[0],
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

function closureAuthorizationForState(
  state: Parameters<
    typeof recordAdministrativeWorkflowClosure
  >[0],
): Record<string, unknown> {
  const activeEnvelope =
    state.receivingEnvelope;

  if (activeEnvelope === null) {
    throw new Error(
      'An active receiving envelope is required.',
    );
  }

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
    authorizedAt:
      '2026-08-02T00:02:00.000Z',
  });
}

function closureRecordForState(
  state: Parameters<
    typeof recordAdministrativeWorkflowClosure
  >[0],
  authorization:
    Record<string, unknown>,
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
  });
}

async function main(): Promise<void> {
  const originatingCase =
    requiredReviewableCeoCase();

  const originatingModel =
    new MockLanguageModelV3({
      doGenerate:
        async () =>
          mockGeneration(originatingCase),
    });

  const originatingOptions =
    executionOptionsFor(
      originatingCase,
      originatingModel,
    );

  const envelope =
    envelopeForExecution(
      originatingOptions,
    );

  const prepared =
    prepareInMemoryHumanMediatedWorkflow(
      envelope,
    );

  if (!prepared.ok) {
    throw new Error(
      `Preparation failed: ${issueText(
        prepared.issues,
      )}`,
    );
  }

  const initiated =
    recordHumanInitiationAuthorization(
      prepared.state,
      envelope.humanAuthorization,
    );

  if (!initiated.ok) {
    throw new Error(
      `Initiation failed: ${issueText(
        initiated.issues,
      )}`,
    );
  }

  const authorized =
    recordRoleRunAuthorization(
      initiated.state,
      envelope.humanAuthorization,
    );

  if (!authorized.ok) {
    throw new Error(
      `Role authorization failed: ${issueText(
        authorized.issues,
      )}`,
    );
  }

  const executed =
    await executeAuthorizedSingleRoleDraft(
      authorized.state,
      originatingOptions,
    );

  if (!executed.ok) {
    throw new Error(
      `Originating execution failed: ${issueText(
        executed.issues,
      )}`,
    );
  }

  const presented =
    presentRoleOutputForHumanReview(
      executed.state,
    );

  if (!presented.ok) {
    throw new Error(
      `Originating presentation failed: ${issueText(
        presented.issues,
      )}`,
    );
  }

  const disposition =
    recordHumanDisposition(
      presented.state,
      validDisposition({
        workflowId:
          presented.state.workflowId,
        runId:
          presented.state.envelope.runId,
        handoffId:
          presented.state.envelope.handoffId,
        recordedAt:
          '2026-08-01T23:00:00.000Z',
      }),
      presented.state.envelope
        .humanAuthorization,
    );

  if (!disposition.ok) {
    throw new Error(
      `Disposition failed: ${issueText(
        disposition.issues,
      )}`,
    );
  }

  const handoffPrepared =
    prepareHumanMediatedHandoff(
      disposition.state,
      handoffCandidateForState(
        disposition.state,
      ),
    );

  if (!handoffPrepared.ok) {
    throw new Error(
      `Handoff preparation failed: ${issueText(
        handoffPrepared.issues,
      )}`,
    );
  }

  const handoffAuthorized =
    recordExplicitHandoffAuthorization(
      handoffPrepared.state,
      handoffPrepared.handoff
        .humanAuthorization,
    );

  if (!handoffAuthorized.ok) {
    throw new Error(
      `Handoff authorization failed: ${issueText(
        handoffAuthorized.issues,
      )}`,
    );
  }

  const receivingAuthorized =
    recordReceivingRoleRunAuthorization(
      handoffAuthorized.state,
      receivingEnvelopeForState(
        handoffAuthorized.state,
      ),
    );

  if (!receivingAuthorized.ok) {
    throw new Error(
      `Receiving authorization failed: ${issueText(
        receivingAuthorized.issues,
      )}`,
    );
  }

  const receivingCase =
    receivingEvaluationCaseForState(
      receivingAuthorized.state,
    );

  const receivingModel =
    new MockLanguageModelV3({
      doGenerate:
        async () =>
          mockGeneration(receivingCase),
    });

  const receivingExecuted =
    await executeReceivingRoleDraft(
      receivingAuthorized.state,
      receivingExecutionOptionsFor(
        receivingAuthorized.state,
        receivingModel,
      ),
    );

  if (!receivingExecuted.ok) {
    throw new Error(
      `Receiving execution failed: ${issueText(
        receivingExecuted.issues,
      )}`,
    );
  }

  const finalPresented =
    presentReceivingRoleOutputForFinalHumanDisposition(
      receivingExecuted.state,
    );

  if (!finalPresented.ok) {
    throw new Error(
      `Final presentation failed: ${issueText(
        finalPresented.issues,
      )}`,
    );
  }

  const closureAuthorization =
    closureAuthorizationForState(
      finalPresented.state,
    );

  const closed =
    recordAdministrativeWorkflowClosure(
      finalPresented.state,
      closureRecordForState(
        finalPresented.state,
        closureAuthorization,
      ),
      closureAuthorization,
    );

  if (!closed.ok) {
    throw new Error(
      `Administrative closure failed: ${issueText(
        closed.issues,
      )}`,
    );
  }

  const finalState = closed.state;
  const originatingOutput =
    finalState.roleOutputs[0];
  const receivingOutput =
    finalState.roleOutputs[1];

  if (
    originatingOutput === undefined ||
    receivingOutput === undefined
  ) {
    throw new Error(
      'The closed workflow must retain both role outputs.',
    );
  }

  const ceoValidation =
    validateCeoHumanMediatedOutput(
      originatingOutput,
    );

  if (!ceoValidation.ok) {
    throw new Error(
      `CEO output validation failed: ${issueText(
        ceoValidation.issues,
      )}`,
    );
  }

  const caoValidation =
    validateCaoHumanMediatedOutput(
      receivingOutput,
    );

  if (!caoValidation.ok) {
    throw new Error(
      `CAO output validation failed: ${issueText(
        caoValidation.issues,
      )}`,
    );
  }

  const auditValidation =
    validateInMemoryWorkflowAuditTrail(
      finalState.auditTrail,
    );

  if (!auditValidation.ok) {
    throw new Error(
      `Audit validation failed: ${issueText(
        auditValidation.issues,
      )}`,
    );
  }

  const toolPermissionCount =
    finalState.localExecutionReports.reduce(
      (total, report) =>
        total +
        report.finalAudit
          .effectiveToolPermissions.length,
      0,
    );

  const toolCallCount =
    finalState.localExecutionReports.reduce(
      (total, report) =>
        total +
        report.finalAudit.toolCalls.length,
      0,
    );

  const prohibitedBoundaryObserved =
    finalState.automaticContinuation ||
    finalState.autonomousDispatchPerformed ||
    finalState.toolExecutionPerformed ||
    finalState.persistencePerformed ||
    finalState.externalCommunicationPerformed ||
    finalState.previewActivationPerformed ||
    finalState.productionActionPerformed ||
    finalState.auditTrail.persistencePerformed ||
    closed.closureRecord
      .implementationAuthorized ||
    closed.closureRecord
      .previewActivationAuthorized ||
    closed.closureRecord
      .productionActivationAuthorized;

  if (
    finalState.currentState !==
      'workflow_closed' ||
    finalState.currentHumanDisposition !==
      'approved_for_draft_use' ||
    finalState.modelInvocationCount !== 2 ||
    finalState.coordinatorTransitionCount !==
      11 ||
    finalState.roleOutputs.length !== 2 ||
    finalState.localExecutionReports.length !==
      2 ||
    finalState.handoffs.length !== 1 ||
    finalState.auditTrail.events.length !== 12 ||
    originatingModel.doGenerateCalls.length !==
      1 ||
    receivingModel.doGenerateCalls.length !==
      1 ||
    toolPermissionCount !== 0 ||
    toolCallCount !== 0 ||
    prohibitedBoundaryObserved
  ) {
    throw new Error(
      'The final synthetic workflow state violated an expected closed-state invariant.',
    );
  }

  const report = {
    commandVersion: COMMAND_VERSION,
    syntheticOnly: true,
    workflowId: finalState.workflowId,
    finalState: finalState.currentState,
    originatingDisposition:
      finalState.currentHumanDisposition,
    roleSequence:
      finalState.roleOutputs.map(
        output => output.roleId,
      ),
    taskSequence:
      finalState.roleOutputs.map(
        output => output.taskClass,
      ),
    modelInvocations: {
      originating:
        originatingModel.doGenerateCalls.length,
      receiving:
        receivingModel.doGenerateCalls.length,
      recorded:
        finalState.modelInvocationCount,
    },
    humanMediatedControls: {
      explicitOriginatingRunAuthorization:
        finalState.auditTrail.events.some(
          event =>
            event.eventKind ===
              'human_run_authorized' &&
            event.runId ===
              finalState.envelope.runId,
        ),
      explicitHandoffAuthorization:
        finalState.auditTrail.events.some(
          event =>
            event.eventKind ===
              'handoff_human_authorized',
        ),
      separateReceivingRunAuthorization:
        finalState.auditTrail.events.some(
          event =>
            event.eventKind ===
              'receiving_role_run_human_authorized',
        ),
      explicitAdministrativeClosure:
        finalState.auditTrail.events.some(
          event =>
            event.eventKind ===
              'workflow_administratively_closed',
        ),
      automaticContinuationPerformed:
        finalState.automaticContinuation,
      autonomousDispatchPerformed:
        finalState.autonomousDispatchPerformed,
    },
    audit: {
      eventCount:
        finalState.auditTrail.events.length,
      transitionCount:
        finalState.coordinatorTransitionCount,
      eventKinds:
        finalState.auditTrail.events.map(
          event => event.eventKind,
        ),
      stateTransitions:
        finalState.auditTrail.events.map(
          event => ({
            from: event.priorState,
            to: event.nextState,
          }),
        ),
      inMemoryOnly:
        finalState.auditTrail.inMemoryOnly,
      persistencePerformed:
        finalState.auditTrail
          .persistencePerformed,
    },
    closure: closed.closureRecord,
    boundaries: {
      toolPermissionCount,
      toolCallCount,
      toolExecutionPerformed:
        finalState.toolExecutionPerformed,
      persistencePerformed:
        finalState.persistencePerformed,
      externalCommunicationPerformed:
        finalState
          .externalCommunicationPerformed,
      previewActivationPerformed:
        finalState.previewActivationPerformed,
      productionActionPerformed:
        finalState.productionActionPerformed,
      implementationAuthorized:
        closed.closureRecord
          .implementationAuthorized,
      previewActivationAuthorized:
        closed.closureRecord
          .previewActivationAuthorized,
      productionActivationAuthorized:
        closed.closureRecord
          .productionActivationAuthorized,
    },
  };

  process.stdout.write(
    `${JSON.stringify(report, null, 2)}\n`,
  );
}

void main().catch(error => {
  console.error(error);
  process.exit(1);
});
