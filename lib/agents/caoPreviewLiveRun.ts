/**
 * Server-only bridge for one restricted, human-initiated CAO Preview run.
 *
 * This module composes the existing authenticated UI preflight, Preview gate,
 * pinned Gateway adapter, and injected CAO execution core. It performs no
 * persistence, tools, fallback, substitution, automatic continuation,
 * orchestration, background work, Preview activation, or Production action.
 */

import {
  createHash,
} from 'node:crypto';

import type {
  ExecutiveAgentRunRequest,
  TaskClass,
} from '../ai/modelRegistry';

import {
  CAO_PREVIEW_ADAPTER_ID,
  CAO_PREVIEW_APPROVAL_REFERENCE,
  CAO_PREVIEW_PRIMARY_MODEL_ID,
  CAO_PREVIEW_PRIMARY_PINNED_MODEL_VERSION,
  CAO_PREVIEW_PRIMARY_PROVIDER_ID,
  CAO_PREVIEW_REGISTRY_ENTRY,
  CAO_PREVIEW_REGISTRY_VERSION,
} from './caoPreviewRegistry';

import {
  createCaoPreviewGatewayAdapter,
  type CaoPreviewGatewayAdapter,
} from './caoPreviewGatewayAdapter';

import {
  executeCaoPreview,
  type CaoPreviewExecutionReport,
} from './caoPreviewExecution';

import {
  evaluateExecutiveAgentsPreviewGate,
  type ExecutiveAgentsPreviewGateAcceptance,
} from './executiveAgentsPreviewGate';

import {
  EXECUTIVE_AGENTS_PREVIEW_ROUTE_LABELS,
  EXECUTIVE_AGENTS_PREVIEW_ROUTE_REQUEST_VERSION,
  type ExecutiveAgentsPreviewRouteRequest,
} from './executiveAgentsPreviewRouteContract';

import {
  EXECUTIVE_AGENTS_PREVIEW_UI_REQUEST_VERSION,
  evaluateExecutiveAgentsPreviewUi,
  type ExecutiveAgentsPreviewUiRequest,
} from './executiveAgentsPreviewUiContract';

import type {
  EvaluationPricing,
} from './evaluation/aiSdkEvaluationRunner';

import type {
  ExecutiveAgentDraftOutput,
} from './evaluation/modelEvaluation';

export const CAO_PREVIEW_LIVE_RUN_VERSION =
  'cao-preview-live-run-v1' as const;

export const CAO_PREVIEW_GATEWAY_SECRET_ENV =
  'AI_GATEWAY_API_KEY' as const;

export const CAO_PREVIEW_INPUT_PRICING_ENV =
  'EXECUTIVE_AGENTS_PREVIEW_INPUT_MICROS_PER_MILLION_TOKENS' as const;

export const CAO_PREVIEW_OUTPUT_PRICING_ENV =
  'EXECUTIVE_AGENTS_PREVIEW_OUTPUT_MICROS_PER_MILLION_TOKENS' as const;

export const CAO_PREVIEW_REPAIR_ATTEMPT_MAXIMUM =
  0 as const;

export const CAO_PREVIEW_LIVE_RUN_ERROR_CODES = [
  'not_found',
  'unsupported_media_type',
  'payload_too_large',
  'invalid_request',
  'route_unavailable',
  'request_rejected',
  'gateway_unavailable',
  'provider_authentication_failed',
  'provider_rate_limited',
  'provider_timeout',
  'provider_failed',
  'output_rejected',
  'limit_exceeded',
] as const;

export type CaoPreviewLiveRunErrorCode =
  (typeof CAO_PREVIEW_LIVE_RUN_ERROR_CODES)[number];

export interface CaoPreviewLiveRunDependencies {
  deploymentEnvironment: unknown;
  previewEnabledValue: unknown;
  routeSecret: unknown;
  sourceCommitSha: unknown;
  nowIso: unknown;
  authenticatedAdmin: unknown;
  authenticatedHumanIdentifier: unknown;
  gatewayApiKey: unknown;
  inputMicrosPerMillionTokens: unknown;
  outputMicrosPerMillionTokens: unknown;
  createGatewayAdapter?:
    typeof createCaoPreviewGatewayAdapter;
  executePreview?:
    typeof executeCaoPreview;
}

export interface CaoPreviewLiveRunInvocation {
  contentType: unknown;
  rawBody: unknown;
}

export interface CaoPreviewLiveRunSuccessBody {
  ok: true;
  completed: true;
  liveRunVersion:
    typeof CAO_PREVIEW_LIVE_RUN_VERSION;
  labels:
    typeof EXECUTIVE_AGENTS_PREVIEW_ROUTE_LABELS;
  roleId:
    'executive.chief_architecture_officer';
  taskClass:
    | 'architecture_analysis'
    | 'evaluation_only';
  modelSlot: 'primary';
  providerId:
    typeof CAO_PREVIEW_PRIMARY_PROVIDER_ID;
  modelId:
    typeof CAO_PREVIEW_PRIMARY_MODEL_ID;
  pinnedModelVersion:
    typeof CAO_PREVIEW_PRIMARY_PINNED_MODEL_VERSION;
  adapterId:
    typeof CAO_PREVIEW_ADAPTER_ID;
  registryVersion:
    typeof CAO_PREVIEW_REGISTRY_VERSION;
  charterVersion: string;
  sourceCommitSha: string;
  approvalReference:
    typeof CAO_PREVIEW_APPROVAL_REFERENCE;
  evidenceReferences: readonly string[];
  repairAttemptMaximum:
    typeof CAO_PREVIEW_REPAIR_ATTEMPT_MAXIMUM;
  draft: ExecutiveAgentDraftOutput;
  humanReviewRequired: true;
  humanDisposition: 'pending';
  requestedTools: readonly [];
  effectiveTools: readonly [];
  toolCalls: readonly [];
  automaticApproval: false;
  automaticDispatch: false;
  automaticContinuation: false;
  fallbackPerformed: false;
  substitutionPerformed: false;
  persistencePerformed: false;
  productionEligible: false;
}

export interface CaoPreviewLiveRunErrorBody {
  ok: false;
  error: CaoPreviewLiveRunErrorCode;
}

export interface CaoPreviewLiveRunResult {
  status:
    | 200
    | 400
    | 404
    | 413
    | 415
    | 422
    | 429
    | 502
    | 503
    | 504;
  body:
    | CaoPreviewLiveRunSuccessBody
    | CaoPreviewLiveRunErrorBody;
  cacheControl: 'no-store';
  providerCallPerformed: boolean;
  persistencePerformed: false;
  toolExecutionPerformed: false;
  productionActionPerformed: false;
}

function result(
  status: CaoPreviewLiveRunResult['status'],
  body: CaoPreviewLiveRunResult['body'],
  providerCallPerformed: boolean,
): CaoPreviewLiveRunResult {
  return {
    status,
    body,
    cacheControl: 'no-store',
    providerCallPerformed,
    persistencePerformed: false,
    toolExecutionPerformed: false,
    productionActionPerformed: false,
  };
}

function errorResult(
  status: Exclude<CaoPreviewLiveRunResult['status'], 200>,
  error: CaoPreviewLiveRunErrorCode,
  providerCallPerformed = false,
): CaoPreviewLiveRunResult {
  return result(
    status,
    {
      ok: false,
      error,
    },
    providerCallPerformed,
  );
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function requireBoundedSecret(
  value: unknown,
): string | null {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > 4_096 ||
    value.trim() !== value ||
    /[\r\n\0]/.test(value)
  ) {
    return null;
  }

  return value;
}

function parsePricing(
  value: unknown,
): number | null {
  if (
    typeof value !== 'string' ||
    !/^\d+$/.test(value)
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isSafeInteger(parsed)
    ? parsed
    : null;
}

function parseValidatedUiRequest(
  rawBody: unknown,
): ExecutiveAgentsPreviewUiRequest | null {
  if (typeof rawBody !== 'string') {
    return null;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return null;
  }

  if (
    !isRecord(parsed) ||
    parsed.requestVersion !==
      EXECUTIVE_AGENTS_PREVIEW_UI_REQUEST_VERSION
  ) {
    return null;
  }

  return parsed as unknown as
    ExecutiveAgentsPreviewUiRequest;
}

function buildRouteRequest(
  request: ExecutiveAgentsPreviewUiRequest,
  humanIdentifier: string,
): ExecutiveAgentsPreviewRouteRequest {
  return {
    requestVersion:
      EXECUTIVE_AGENTS_PREVIEW_ROUTE_REQUEST_VERSION,
    roleId:
      'executive.chief_architecture_officer',
    taskClass:
      request.taskClass,
    modelSlot: 'primary',
    explicitHumanInitiation: true,
    approvalReference:
      CAO_PREVIEW_APPROVAL_REFERENCE,
    humanClass:
      'human_engineering_reviewer',
    humanIdentifier,
    runId:
      request.runId,
    instructions:
      request.instructions,
    sensitiveContentPresent: false,
    evidence: [
      {
        reference:
          request.evidenceReference,
        classification:
          request.evidenceClassification,
        content:
          request.evidenceContent,
      },
    ],
  };
}

function registryEntryHash(): string {
  return createHash('sha256')
    .update(
      JSON.stringify(
        CAO_PREVIEW_REGISTRY_ENTRY,
      ),
    )
    .digest('hex');
}

function buildRunRequest(
  request: ExecutiveAgentsPreviewRouteRequest,
  sourceCommitSha: string,
  nowIso: string,
): ExecutiveAgentRunRequest {
  const evidenceReferences =
    request.evidence.map(
      item => item.reference,
    );

  const taskClass: TaskClass =
    request.taskClass;

  return {
    registryEntry:
      CAO_PREVIEW_REGISTRY_ENTRY,
    environment: 'preview',
    explicitHumanInitiation: true,
    roleApprovalReference:
      CAO_PREVIEW_APPROVAL_REFERENCE,
    requestedTaskClass:
      taskClass,
    requestedTools: [],
    requestedAuthorityCategories: [
      'advisory_draft',
    ],
    authorityExpansionRequested: false,
    disagreementPreservationRequired: true,
    uncertaintyPreservationRequired: true,
    evidenceState: 'complete',
    requestedUsage: {
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostMicros: 0,
      estimatedDailyCostMicrosAfterRun: 0,
      elapsedLatencyMs: 0,
      requestedTimeoutMs:
        CAO_PREVIEW_REGISTRY_ENTRY
          .limits.hardTimeoutMs,
    },
    auditMetadata: {
      runId:
        request.runId,
      roleId:
        'executive.chief_architecture_officer',
      registryVersion:
        CAO_PREVIEW_REGISTRY_VERSION,
      charterVersion:
        CAO_PREVIEW_REGISTRY_ENTRY
          .charterVersion,
      registryEntryHash:
        registryEntryHash(),
      environment: 'preview',
      sourceCommitSha,
      requestedBy:
        `${request.humanClass}:${request.humanIdentifier}`,
      approvalReference:
        CAO_PREVIEW_APPROVAL_REFERENCE,
      taskClass,
      modelSlot: 'primary',
      providerId:
        CAO_PREVIEW_PRIMARY_PROVIDER_ID,
      modelId:
        CAO_PREVIEW_PRIMARY_MODEL_ID,
      pinnedModelVersion:
        CAO_PREVIEW_PRIMARY_PINNED_MODEL_VERSION,
      adapterId:
        CAO_PREVIEW_ADAPTER_ID,
      reasoningLevel:
        CAO_PREVIEW_REGISTRY_ENTRY
          .reasoningLevel,
      effectiveToolPermissions: [],
      toolCalls: [],
      substitutionRequested: false,
      substitutionReasonClass: null,
      fallbackReasonClass: null,
      startedAt:
        nowIso,
      completedAt: null,
      latencyMs: 0,
      inputTokenCount: 0,
      outputTokenCount: 0,
      estimatedCostMicros: 0,
      evidenceReferences,
      unknownsRecorded: [],
      disagreements: [],
      outcome: 'blocked_validation',
      humanDisposition: 'pending',
    },
  };
}

function requireAdapterMatch(
  adapter: CaoPreviewGatewayAdapter,
  gate: ExecutiveAgentsPreviewGateAcceptance,
): boolean {
  return (
    adapter.adapterId ===
      gate.selectedAssignment.adapterId &&
    adapter.providerId ===
      gate.selectedAssignment.providerId &&
    adapter.modelId ===
      gate.selectedAssignment.modelId &&
    adapter.pinnedModelVersion ===
      gate.selectedAssignment.pinnedModelVersion &&
    adapter.modelSlot === 'primary' &&
    adapter.providerCallPerformed === false &&
    adapter.requestedTools.length === 0 &&
    adapter.effectiveTools.length === 0 &&
    adapter.toolCalls.length === 0 &&
    adapter.fallbackAllowed === false &&
    adapter.substitutionAllowed === false &&
    adapter.automaticContinuationAllowed === false &&
    adapter.persistenceAllowed === false &&
    adapter.productionEligible === false
  );
}

function mapExecutionFailure(
  report: CaoPreviewExecutionReport,
): CaoPreviewLiveRunResult {
  if (
    report.localExecution
      .actualLimitFindings.length > 0
  ) {
    return errorResult(
      422,
      'limit_exceeded',
      true,
    );
  }

  const modelRun =
    report.localExecution.modelRun;

  if (modelRun.outcome === 'failed_timeout') {
    return errorResult(
      504,
      'provider_timeout',
      true,
    );
  }

  if (modelRun.outcome === 'failed_provider') {
    if (
      modelRun.providerErrorClass ===
      'authentication'
    ) {
      return errorResult(
        502,
        'provider_authentication_failed',
        true,
      );
    }

    if (
      modelRun.providerErrorClass ===
      'rate_limit'
    ) {
      return errorResult(
        429,
        'provider_rate_limited',
        true,
      );
    }

    return errorResult(
      502,
      'provider_failed',
      true,
    );
  }

  return errorResult(
    422,
    'output_rejected',
    true,
  );
}

function validateCompletedReport(
  report: CaoPreviewExecutionReport,
  evidenceReferences: readonly string[],
): ExecutiveAgentDraftOutput | null {
  const local = report.localExecution;
  const run = local.modelRun;
  const draft = local.draftForHumanReview;

  if (
    draft === null ||
    run.outcome !== 'completed' ||
    run.schemaValid !== true ||
    run.boundaryValid !== true ||
    run.dissentPreserved !== true ||
    run.noSilentSubstitution !== true ||
    run.noAutomaticFallback !== true ||
    local.finalAudit.humanDisposition !==
      'pending' ||
    local.toolExecutionPerformed !== false ||
    local.persistencePerformed !== false ||
    local.fallbackPerformed !== false ||
    local.substitutionPerformed !== false ||
    local.productionEligible !== false ||
    report.requestedTools.length !== 0 ||
    report.effectiveTools.length !== 0 ||
    report.toolCalls.length !== 0 ||
    report.automaticApproval !== false ||
    report.automaticDispatch !== false ||
    report.automaticContinuation !== false ||
    report.fallbackPerformed !== false ||
    report.substitutionPerformed !== false ||
    report.persistencePerformed !== false ||
    report.productionEligible !== false
  ) {
    return null;
  }

  const available =
    new Set(draft.evidenceReferences);

  if (
    !evidenceReferences.every(
      reference => available.has(reference),
    )
  ) {
    return null;
  }

  return draft;
}

export async function executeCaoPreviewLiveRun(
  dependencies: CaoPreviewLiveRunDependencies,
  invocation: CaoPreviewLiveRunInvocation,
): Promise<CaoPreviewLiveRunResult> {
  const preflight =
    evaluateExecutiveAgentsPreviewUi(
      {
        deploymentEnvironment:
          dependencies.deploymentEnvironment,
        previewEnabledValue:
          dependencies.previewEnabledValue,
        routeSecret:
          dependencies.routeSecret,
        sourceCommitSha:
          dependencies.sourceCommitSha,
        nowIso:
          dependencies.nowIso,
        authenticatedAdmin:
          dependencies.authenticatedAdmin,
        authenticatedHumanIdentifier:
          dependencies.authenticatedHumanIdentifier,
      },
      invocation,
    );

  if (!preflight.body.ok) {
    const error =
      preflight.body.error;

    if (
      error === 'not_found' ||
      error === 'unsupported_media_type' ||
      error === 'payload_too_large' ||
      error === 'invalid_request' ||
      error === 'route_unavailable' ||
      error === 'request_rejected'
    ) {
      return errorResult(
        preflight.status === 401
          ? 404
          : preflight.status,
        error,
      );
    }

    return errorResult(
      400,
      'invalid_request',
    );
  }

  if (
    typeof dependencies.authenticatedHumanIdentifier !==
      'string' ||
    typeof dependencies.sourceCommitSha !==
      'string' ||
    typeof dependencies.nowIso !==
      'string'
  ) {
    return errorResult(
      503,
      'route_unavailable',
    );
  }

  const uiRequest =
    parseValidatedUiRequest(
      invocation.rawBody,
    );

  if (uiRequest === null) {
    return errorResult(
      400,
      'invalid_request',
    );
  }

  const gatewayApiKey =
    requireBoundedSecret(
      dependencies.gatewayApiKey,
    );

  const inputPricing =
    parsePricing(
      dependencies.inputMicrosPerMillionTokens,
    );

  const outputPricing =
    parsePricing(
      dependencies.outputMicrosPerMillionTokens,
    );

  if (
    gatewayApiKey === null ||
    inputPricing === null ||
    outputPricing === null
  ) {
    return errorResult(
      503,
      'gateway_unavailable',
    );
  }

  const routeRequest =
    buildRouteRequest(
      uiRequest,
      dependencies.authenticatedHumanIdentifier,
    );

  const runRequest =
    buildRunRequest(
      routeRequest,
      dependencies.sourceCommitSha,
      dependencies.nowIso,
    );

  const gate =
    evaluateExecutiveAgentsPreviewGate({
      deploymentEnvironment:
        dependencies.deploymentEnvironment,
      previewEnabledValue:
        dependencies.previewEnabledValue,
      runRequest,
    });

  if (!gate.ok) {
    return errorResult(
      422,
      'request_rejected',
    );
  }

  const createAdapter =
    dependencies.createGatewayAdapter ??
    createCaoPreviewGatewayAdapter;

  let adapter: CaoPreviewGatewayAdapter;

  try {
    adapter = createAdapter({
      apiKey: gatewayApiKey,
    });
  } catch {
    return errorResult(
      503,
      'gateway_unavailable',
    );
  }

  if (!requireAdapterMatch(adapter, gate.value)) {
    return errorResult(
      422,
      'request_rejected',
    );
  }

  const pricing: EvaluationPricing = {
    inputMicrosPerMillionTokens:
      inputPricing,
    outputMicrosPerMillionTokens:
      outputPricing,
  };

  const executePreview =
    dependencies.executePreview ??
    executeCaoPreview;

  let report: CaoPreviewExecutionReport;

  try {
    report = await executePreview({
      gateAcceptance:
        gate.value,
      routeRequest,
      model:
        adapter.model,
      pricing,
    });
  } catch {
    return errorResult(
      502,
      'provider_failed',
      true,
    );
  }

  const evidenceReferences =
    routeRequest.evidence.map(
      item => item.reference,
    );

  const draft =
    validateCompletedReport(
      report,
      evidenceReferences,
    );

  if (draft === null) {
    return mapExecutionFailure(report);
  }

  return result(
    200,
    {
      ok: true,
      completed: true,
      liveRunVersion:
        CAO_PREVIEW_LIVE_RUN_VERSION,
      labels:
        EXECUTIVE_AGENTS_PREVIEW_ROUTE_LABELS,
      roleId:
        'executive.chief_architecture_officer',
      taskClass:
        routeRequest.taskClass,
      modelSlot: 'primary',
      providerId:
        CAO_PREVIEW_PRIMARY_PROVIDER_ID,
      modelId:
        CAO_PREVIEW_PRIMARY_MODEL_ID,
      pinnedModelVersion:
        CAO_PREVIEW_PRIMARY_PINNED_MODEL_VERSION,
      adapterId:
        CAO_PREVIEW_ADAPTER_ID,
      registryVersion:
        CAO_PREVIEW_REGISTRY_VERSION,
      charterVersion:
        CAO_PREVIEW_REGISTRY_ENTRY
          .charterVersion,
      sourceCommitSha:
        dependencies.sourceCommitSha,
      approvalReference:
        CAO_PREVIEW_APPROVAL_REFERENCE,
      evidenceReferences,
      repairAttemptMaximum:
        CAO_PREVIEW_REPAIR_ATTEMPT_MAXIMUM,
      draft,
      humanReviewRequired: true,
      humanDisposition: 'pending',
      requestedTools: [],
      effectiveTools: [],
      toolCalls: [],
      automaticApproval: false,
      automaticDispatch: false,
      automaticContinuation: false,
      fallbackPerformed: false,
      substitutionPerformed: false,
      persistencePerformed: false,
      productionEligible: false,
    },
    true,
  );
}
