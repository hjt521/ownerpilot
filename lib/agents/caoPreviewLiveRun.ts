/**
 * Server-only bridge for one restricted, human-initiated CAO Preview run.
 *
 * It composes the existing authenticated UI preflight, Preview gate, pinned
 * Gateway adapter, and injected CAO execution core. It performs no
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

export type CaoPreviewOutputRejectionClass =
  | 'draft_missing'
  | 'run_not_completed'
  | 'schema_invalid'
  | 'boundary_invalid'
  | 'dissent_not_preserved'
  | 'silent_substitution_invariant_failed'
  | 'automatic_fallback_invariant_failed'
  | 'human_disposition_invalid'
  | 'limit_finding_present'
  | 'tool_execution_detected'
  | 'persistence_detected'
  | 'fallback_detected'
  | 'substitution_detected'
  | 'production_eligibility_detected'
  | 'report_authority_invariant_failed'
  | 'evidence_reference_missing';

export interface CaoPreviewOutputRejectionDiagnostic {
  diagnosticVersion:
    'cao-preview-output-rejection-diagnostic-v1';
  event: 'cao_preview.output_rejected';
  rejectionClass:
    CaoPreviewOutputRejectionClass;
  runId: string;
  roleId:
    'executive.chief_architecture_officer';
  taskClass:
    | 'architecture_analysis'
    | 'evaluation_only';
  runOutcome: string;
  requiredEvidenceReferenceCount: number;
  availableEvidenceReferenceCount: number;
}

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
  outputRejectionDiagnosticSink?: (
    diagnostic:
      CaoPreviewOutputRejectionDiagnostic,
  ) => void;
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

type FailureStatus = Exclude<
  CaoPreviewLiveRunResult['status'],
  200
>;

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
  status: FailureStatus,
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

function preflightFailureStatus(
  status: number,
): FailureStatus {
  if (status === 401) {
    return 404;
  }

  if (
    status === 400 ||
    status === 404 ||
    status === 413 ||
    status === 415 ||
    status === 422 ||
    status === 429 ||
    status === 502 ||
    status === 503 ||
    status === 504
  ) {
    return status;
  }

  return 400;
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

function boundedSecret(
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

function pricingValue(
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

function parsedUiRequest(
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

function routeRequest(
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

function runRequest(
  request: ExecutiveAgentsPreviewRouteRequest,
  sourceCommitSha: string,
  nowIso: string,
): ExecutiveAgentRunRequest {
  const taskClass: TaskClass =
    request.taskClass;
  const evidenceReferences =
    request.evidence.map(
      item => item.reference,
    );

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
      startedAt: nowIso,
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

function adapterMatches(
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

type ValidatedDraftResult =
  | {
      ok: true;
      draft: ExecutiveAgentDraftOutput;
    }
  | {
      ok: false;
      rejectionClass:
        CaoPreviewOutputRejectionClass;
    };

function rejectedDraft(
  rejectionClass:
    CaoPreviewOutputRejectionClass,
): ValidatedDraftResult {
  return {
    ok: false,
    rejectionClass,
  };
}

function validatedDraft(
  report: CaoPreviewExecutionReport,
  evidenceReferences: readonly string[],
): ValidatedDraftResult {
  const local = report.localExecution;
  const run = local.modelRun;
  const draft = local.draftForHumanReview;

  if (local.actualLimitFindings.length > 0) {
    return rejectedDraft(
      'limit_finding_present',
    );
  }

  if (run.schemaValid !== true) {
    return rejectedDraft(
      'schema_invalid',
    );
  }

  if (run.boundaryValid !== true) {
    return rejectedDraft(
      'boundary_invalid',
    );
  }

  if (run.dissentPreserved !== true) {
    return rejectedDraft(
      'dissent_not_preserved',
    );
  }

  if (run.noSilentSubstitution !== true) {
    return rejectedDraft(
      'silent_substitution_invariant_failed',
    );
  }

  if (run.noAutomaticFallback !== true) {
    return rejectedDraft(
      'automatic_fallback_invariant_failed',
    );
  }

  if (run.outcome !== 'completed') {
    return rejectedDraft(
      'run_not_completed',
    );
  }

  if (
    local.finalAudit.humanDisposition !==
      'pending'
  ) {
    return rejectedDraft(
      'human_disposition_invalid',
    );
  }

  if (
    local.toolExecutionPerformed !== false
  ) {
    return rejectedDraft(
      'tool_execution_detected',
    );
  }

  if (
    local.persistencePerformed !== false
  ) {
    return rejectedDraft(
      'persistence_detected',
    );
  }

  if (local.fallbackPerformed !== false) {
    return rejectedDraft(
      'fallback_detected',
    );
  }

  if (
    local.substitutionPerformed !== false
  ) {
    return rejectedDraft(
      'substitution_detected',
    );
  }

  if (
    local.productionEligible !== false
  ) {
    return rejectedDraft(
      'production_eligibility_detected',
    );
  }

  if (
    report.requestedTools.length !== 0 ||
    report.effectiveTools.length !== 0 ||
    report.toolCalls.length !== 0 ||
    report.automaticApproval !== false ||
    report.automaticDispatch !== false ||
    report.automaticContinuation !== false
  ) {
    return rejectedDraft(
      'report_authority_invariant_failed',
    );
  }

  if (report.fallbackPerformed !== false) {
    return rejectedDraft(
      'fallback_detected',
    );
  }

  if (
    report.substitutionPerformed !== false
  ) {
    return rejectedDraft(
      'substitution_detected',
    );
  }

  if (
    report.persistencePerformed !== false
  ) {
    return rejectedDraft(
      'persistence_detected',
    );
  }

  if (
    report.productionEligible !== false
  ) {
    return rejectedDraft(
      'production_eligibility_detected',
    );
  }

  if (draft === null) {
    return rejectedDraft(
      'draft_missing',
    );
  }

  const available =
    new Set(draft.evidenceReferences);

  if (
    !evidenceReferences.every(
      reference => available.has(reference),
    )
  ) {
    return rejectedDraft(
      'evidence_reference_missing',
    );
  }

  return {
    ok: true,
    draft,
  };
}

function defaultOutputRejectionDiagnosticSink(
  diagnostic:
    CaoPreviewOutputRejectionDiagnostic,
): void {
  console.info(
    JSON.stringify(diagnostic),
  );
}

function emitOutputRejectionDiagnostic(
  dependencies:
    CaoPreviewLiveRunDependencies,
  diagnostic:
    CaoPreviewOutputRejectionDiagnostic,
): void {
  try {
    (
      dependencies
        .outputRejectionDiagnosticSink ??
      defaultOutputRejectionDiagnosticSink
    )(diagnostic);
  } catch {
    console.warn(
      JSON.stringify({
        event:
          'cao_preview.output_rejection_diagnostic_failed',
      }),
    );
  }
}

function executionFailure(
  report: CaoPreviewExecutionReport,
): CaoPreviewLiveRunResult {
  const local = report.localExecution;
  const run = local.modelRun;

  if (local.actualLimitFindings.length > 0) {
    return errorResult(
      422,
      'limit_exceeded',
      true,
    );
  }

  if (run.outcome === 'failed_timeout') {
    return errorResult(
      504,
      'provider_timeout',
      true,
    );
  }

  if (run.outcome === 'failed_provider') {
    if (
      run.providerErrorClass ===
      'authentication'
    ) {
      return errorResult(
        502,
        'provider_authentication_failed',
        true,
      );
    }

    if (
      run.providerErrorClass ===
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
        preflightFailureStatus(
          preflight.status,
        ),
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
    parsedUiRequest(
      invocation.rawBody,
    );

  if (uiRequest === null) {
    return errorResult(
      400,
      'invalid_request',
    );
  }

  const apiKey =
    boundedSecret(
      dependencies.gatewayApiKey,
    );
  const inputPricing =
    pricingValue(
      dependencies.inputMicrosPerMillionTokens,
    );
  const outputPricing =
    pricingValue(
      dependencies.outputMicrosPerMillionTokens,
    );

  if (
    apiKey === null ||
    inputPricing === null ||
    outputPricing === null
  ) {
    return errorResult(
      503,
      'gateway_unavailable',
    );
  }

  const request =
    routeRequest(
      uiRequest,
      dependencies.authenticatedHumanIdentifier,
    );

  const gate =
    evaluateExecutiveAgentsPreviewGate({
      deploymentEnvironment:
        dependencies.deploymentEnvironment,
      previewEnabledValue:
        dependencies.previewEnabledValue,
      runRequest: runRequest(
        request,
        dependencies.sourceCommitSha,
        dependencies.nowIso,
      ),
    });

  if (!gate.ok) {
    return errorResult(
      422,
      'request_rejected',
    );
  }

  let adapter: CaoPreviewGatewayAdapter;

  try {
    adapter = (
      dependencies.createGatewayAdapter ??
      createCaoPreviewGatewayAdapter
    )({
      apiKey,
    });
  } catch {
    return errorResult(
      503,
      'gateway_unavailable',
    );
  }

  if (!adapterMatches(adapter, gate.value)) {
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

  let report: CaoPreviewExecutionReport;

  try {
    report = await (
      dependencies.executePreview ??
      executeCaoPreview
    )({
      gateAcceptance:
        gate.value,
      routeRequest:
        request,
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
    request.evidence.map(
      item => item.reference,
    );
  const validation =
    validatedDraft(
      report,
      evidenceReferences,
    );

  if (!validation.ok) {
    const failure =
      executionFailure(report);

    if (
      !failure.body.ok &&
      (
        failure.body.error ===
          'output_rejected' ||
        failure.body.error ===
          'limit_exceeded'
      )
    ) {
      emitOutputRejectionDiagnostic(
        dependencies,
        {
          diagnosticVersion:
            'cao-preview-output-rejection-diagnostic-v1',
          event:
            'cao_preview.output_rejected',
          rejectionClass:
            validation.rejectionClass,
          runId: request.runId,
          roleId:
            'executive.chief_architecture_officer',
          taskClass:
            request.taskClass,
          runOutcome:
            report.localExecution
              .modelRun.outcome,
          requiredEvidenceReferenceCount:
            evidenceReferences.length,
          availableEvidenceReferenceCount:
            report.localExecution
              .draftForHumanReview
              ?.evidenceReferences
              .length ?? 0,
        },
      );
    }

    return failure;
  }

  const draft = validation.draft;

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
        request.taskClass,
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
