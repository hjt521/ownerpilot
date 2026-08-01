/**
 * Human-initiated local single-role execution seam.
 *
 * The caller injects the model. This module performs no provider lookup,
 * credential access, persistence, tool execution, route activation, fallback,
 * substitution, Preview activation, or Production action.
 */

import type { LanguageModel } from 'ai';

import type {
  AgentRunOutcome,
  ExecutiveAgentRunRequest,
  ExecutiveRoleId,
  ModelAssignment,
  RegistryAuditMetadata,
  TaskClass,
} from '../ai/modelRegistry';

import {
  runInjectedModelEvaluation,
  type EvaluationPricing,
  type GatewayProviderRestriction,
} from './evaluation/aiSdkEvaluationRunner';

import type {
  EvaluationModelCandidate,
  ExecutiveAgentDraftOutput,
  ModelEvaluationCase,
  ModelEvaluationRunEvidence,
} from './evaluation/modelEvaluation';

import {
  validateExecutiveAgentRunRequest,
} from './registryValidator';

export const LOCAL_SINGLE_ROLE_PROMPT_VERSION =
  'executive-agent-local-single-role-v1' as const;

export interface LocalSingleRoleExecutionOptions {
  runRequest: ExecutiveAgentRunRequest;
  evaluationCase: ModelEvaluationCase;
  model: LanguageModel;
  promptVersion:
    typeof LOCAL_SINGLE_ROLE_PROMPT_VERSION;
  systemPrompt: string;
  pricing: EvaluationPricing;
  gatewayProviderRestriction?:
    GatewayProviderRestriction;
  clock?: () => number;
}

export interface LocalSingleRoleExecutionReport {
  executionMode: 'local_injected_single_role';
  runRequestValidated: true;
  roleId: ExecutiveRoleId;
  taskClass: TaskClass;
  modelSlot: 'primary' | 'challenger';
  modelRun: ModelEvaluationRunEvidence;
  finalAudit: RegistryAuditMetadata;
  actualDailyCostMicrosAfterRun: number;
  actualLimitFindings: readonly string[];
  draftForHumanReview:
    ExecutiveAgentDraftOutput | null;
  humanDecisionRequired: true;
  automaticApproval: false;
  automaticSelection: false;
  toolExecutionPerformed: false;
  persistencePerformed: false;
  providerLookupPerformed: false;
  fallbackPerformed: false;
  substitutionPerformed: false;
  previewActivationPerformed: false;
  productionEligible: false;
}

function selectedAssignment(
  request: ExecutiveAgentRunRequest,
): {
  slot: 'primary' | 'challenger';
  assignment: ModelAssignment;
} {
  const slot =
    request.auditMetadata.modelSlot;

  if (slot === 'fallback') {
    throw new Error(
      'Local single-role execution does not permit the fallback slot.',
    );
  }

  const assignment =
    slot === 'primary'
      ? request.registryEntry.primaryModel
      : request.registryEntry.challengerModel;

  if (assignment.intendedUse !== slot) {
    throw new Error(
      'Selected assignment does not match the requested model slot.',
    );
  }

  return {
    slot,
    assignment,
  };
}

function candidateFor(
  slot: 'primary' | 'challenger',
  assignment: ModelAssignment,
  request: ExecutiveAgentRunRequest,
): EvaluationModelCandidate {
  return {
    providerId: assignment.providerId,
    modelId: assignment.modelId,
    pinnedModelVersion:
      assignment.pinnedModelVersion,
    adapterId: assignment.adapterId,
    slot,
    reasoningLevel:
      request.registryEntry.reasoningLevel,
  };
}

function validateLocalOptions(
  options: LocalSingleRoleExecutionOptions,
): {
  request: ExecutiveAgentRunRequest;
  slot: 'primary' | 'challenger';
  assignment: ModelAssignment;
} {
  const validation =
    validateExecutiveAgentRunRequest(
      options.runRequest,
    );

  if (!validation.ok) {
    throw new Error(
      `Invalid executive-agent run request: ${validation.issues
        .map(issue => issue.code)
        .join(', ')}`,
    );
  }

  const request = validation.value;

  if (request.requestedTools.length > 0) {
    throw new Error(
      'The local single-role foundation does not execute tools.',
    );
  }

  if (
    request.auditMetadata
      .effectiveToolPermissions.length > 0 ||
    request.auditMetadata.toolCalls.length > 0
  ) {
    throw new Error(
      'Effective tools and tool-call records must be empty.',
    );
  }

  if (
    options.evaluationCase.roleId !==
    request.registryEntry.roleId
  ) {
    throw new Error(
      'Evaluation-case role must match the validated registry role.',
    );
  }

  if (
    options.evaluationCase.taskClass !==
    request.requestedTaskClass
  ) {
    throw new Error(
      'Evaluation-case task must match the validated requested task.',
    );
  }

  if (
    options.evaluationCase.expectedBehavior
      .mustEscalateOnIncompleteEvidence &&
    request.evidenceState === 'complete'
  ) {
    throw new Error(
      'An incomplete-evidence case cannot use complete evidence state.',
    );
  }

  if (
    typeof options.systemPrompt !== 'string' ||
    options.systemPrompt.trim().length === 0 ||
    options.systemPrompt.length > 8_000
  ) {
    throw new Error(
      'A nonempty bounded system prompt is required.',
    );
  }

  if (
    !options.systemPrompt.includes(
      request.registryEntry.roleId,
    )
  ) {
    throw new Error(
      'The system prompt must identify the validated executive role.',
    );
  }

  const {
    slot,
    assignment,
  } = selectedAssignment(request);

  return {
    request,
    slot,
    assignment,
  };
}

function inspectActualLimits(
  request: ExecutiveAgentRunRequest,
  run: ModelEvaluationRunEvidence,
): {
  findings: readonly string[];
  actualDailyCostMicrosAfterRun: number;
} {
  const findings: string[] = [];
  const limits = request.registryEntry.limits;

  const priorDailyCostMicros = Math.max(
    0,
    request.requestedUsage
      .estimatedDailyCostMicrosAfterRun -
      request.requestedUsage
        .estimatedCostMicros,
  );

  const actualDailyCostMicrosAfterRun =
    priorDailyCostMicros +
    run.usage.estimatedCostMicros;

  if (
    run.usage.inputTokens >
    limits.maximumInputTokens
  ) {
    findings.push(
      'actual_input_token_limit_exceeded',
    );
  }

  if (
    run.usage.outputTokens >
    limits.maximumOutputTokens
  ) {
    findings.push(
      'actual_output_token_limit_exceeded',
    );
  }

  if (
    run.usage.estimatedCostMicros >
    limits.maximumEstimatedCostMicrosPerRun
  ) {
    findings.push(
      'actual_per_run_cost_limit_exceeded',
    );
  }

  if (
    actualDailyCostMicrosAfterRun >
    limits.maximumEstimatedCostMicrosPerDay
  ) {
    findings.push(
      'actual_daily_cost_limit_exceeded',
    );
  }

  if (
    run.usage.latencyMs >
    limits.targetP95LatencyMs
  ) {
    findings.push(
      'actual_latency_target_exceeded',
    );
  }

  return {
    findings,
    actualDailyCostMicrosAfterRun,
  };
}

function determineOutcome(
  run: ModelEvaluationRunEvidence,
  limitFindings: readonly string[],
): AgentRunOutcome {
  if (limitFindings.length > 0) {
    return 'blocked_limit';
  }

  if (
    run.outcome !== 'completed' &&
    run.outcome !== 'refused_as_required'
  ) {
    return 'blocked_validation';
  }

  return run.output?.escalationRequired
    ? 'escalation_required'
    : 'draft_completed';
}

function buildFinalAudit(
  request: ExecutiveAgentRunRequest,
  run: ModelEvaluationRunEvidence,
  limitFindings: readonly string[],
): RegistryAuditMetadata {
  return {
    ...request.auditMetadata,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    latencyMs: run.usage.latencyMs,
    inputTokenCount:
      run.usage.inputTokens,
    outputTokenCount:
      run.usage.outputTokens,
    estimatedCostMicros:
      run.usage.estimatedCostMicros,
    evidenceReferences:
      run.output?.evidenceReferences ?? [],
    unknownsRecorded:
      run.output?.unknowns ?? [],
    toolCalls: [],
    substitutionRequested: false,
    substitutionReasonClass: null,
    fallbackReasonClass: null,
    outcome: determineOutcome(
      run,
      limitFindings,
    ),
    humanDisposition: 'pending',
  };
}

export function buildLocalSingleRoleSystemPrompt(
  roleId: ExecutiveRoleId,
): string {
  return [
    'You are executing one bounded, human-initiated local executive-agent task.',
    `Operate only as the approved role ${roleId}.`,
    'Produce one noncanonical advisory draft for human review.',
    'Preserve facts, assumptions, unknowns, recommendations, dissent, evidence references, prohibited actions, and required human decisions separately.',
    'Do not perform tools, repository writes, database writes, deployments, external communications, legal-control actions, notices, payments, attorney routing, jurisdiction actions, Los Angeles-rule actions, or constitutional modifications.',
    'Do not substitute providers, invoke fallback, schedule work, initiate another role, or treat model output as approval.',
    'A human retains all authority and determines final disposition.',
  ].join('\n');
}

export async function executeLocalSingleRole(
  options: LocalSingleRoleExecutionOptions,
): Promise<LocalSingleRoleExecutionReport> {
  const {
    request,
    slot,
    assignment,
  } = validateLocalOptions(options);

  const modelRun =
    await runInjectedModelEvaluation({
      runId: request.auditMetadata.runId,
      evaluationCase:
        options.evaluationCase,
      candidate: candidateFor(
        slot,
        assignment,
        request,
      ),
      model: options.model,
      promptVersion:
        options.promptVersion,
      systemPrompt:
        options.systemPrompt,
      maximumOutputTokens:
        request.registryEntry.limits
          .maximumOutputTokens,
      timeoutMs:
        request.requestedUsage
          .requestedTimeoutMs,
      pricing: options.pricing,
      gatewayProviderRestriction:
        options.gatewayProviderRestriction,
      clock: options.clock,
    });

  const {
    findings,
    actualDailyCostMicrosAfterRun,
  } = inspectActualLimits(
    request,
    modelRun,
  );

  const draftForHumanReview =
    findings.length === 0 &&
    modelRun.schemaValid &&
    modelRun.boundaryValid
      ? modelRun.output
      : null;

  return {
    executionMode:
      'local_injected_single_role',
    runRequestValidated: true,
    roleId: request.registryEntry.roleId,
    taskClass:
      request.requestedTaskClass,
    modelSlot: slot,
    modelRun,
    finalAudit: buildFinalAudit(
      request,
      modelRun,
      findings,
    ),
    actualDailyCostMicrosAfterRun,
    actualLimitFindings: findings,
    draftForHumanReview,
    humanDecisionRequired: true,
    automaticApproval: false,
    automaticSelection: false,
    toolExecutionPerformed: false,
    persistencePerformed: false,
    providerLookupPerformed: false,
    fallbackPerformed: false,
    substitutionPerformed: false,
    previewActivationPerformed: false,
    productionEligible: false,
  };
}
