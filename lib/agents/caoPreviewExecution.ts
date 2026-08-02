/**
 * Injected-model execution core for one restricted CAO Preview run.
 *
 * The caller must supply:
 * - an already accepted CAO Preview gate result;
 * - the corresponding bounded Preview-route request;
 * - one explicitly injected LanguageModel; and
 * - diagnostic pricing.
 *
 * This module revalidates the gate and route preflight before invoking exactly
 * one model through the existing structured-output runner. It performs no
 * provider discovery, environment-variable read, credential lookup, tool
 * execution, persistence, fallback, substitution, automatic continuation,
 * Preview activation, external communication, or Production action.
 */

import type {
  LanguageModel,
} from 'ai';

import {
  CAO_PREVIEW_PRIMARY_MODEL_ID,
  CAO_PREVIEW_PRIMARY_PINNED_MODEL_VERSION,
  CAO_PREVIEW_PRIMARY_PROVIDER_ID,
} from './caoPreviewRegistry';

import {
  EXECUTIVE_AGENTS_PREVIEW_ENABLED_VALUE,
  evaluateExecutiveAgentsPreviewGate,
  type ExecutiveAgentsPreviewGateAcceptance,
} from './executiveAgentsPreviewGate';

import {
  EXECUTIVE_AGENTS_PREVIEW_ROUTE_LABELS,
  evaluateExecutiveAgentsPreviewRoute,
  type ExecutiveAgentsPreviewRouteRequest,
} from './executiveAgentsPreviewRouteContract';

import {
  buildLocalSingleRoleSystemPrompt,
  executeLocalSingleRole,
  LOCAL_SINGLE_ROLE_PROMPT_VERSION,
  type LocalSingleRoleExecutionReport,
} from './localSingleRoleExecution';

import {
  REQUIRED_OUTPUT_SECTIONS,
  type EvaluationEvidenceSourceKind,
  type ModelEvaluationCase,
} from './evaluation/modelEvaluation';

import type {
  EvaluationPricing,
} from './evaluation/aiSdkEvaluationRunner';

export const CAO_PREVIEW_EXECUTION_VERSION =
  'cao-preview-execution-v1' as const;

const INTERNAL_PREFLIGHT_SECRET =
  'internal-cao-preview-execution-preflight-secret-v1';

const REQUIRED_PROHIBITED_ACTIONS = [
  'repository writes are unavailable',
  'database writes are unavailable',
  'deployment is unavailable',
  'external communication is unavailable',
  'tool execution is unavailable',
  'automatic continuation is unavailable',
  'Production action is unavailable',
] as const;

export interface CaoPreviewExecutionOptions {
  gateAcceptance:
    ExecutiveAgentsPreviewGateAcceptance;
  routeRequest:
    ExecutiveAgentsPreviewRouteRequest;
  model: LanguageModel;
  pricing: EvaluationPricing;
  clock?: () => number;
}

export interface CaoPreviewExecutionReport {
  executionVersion:
    typeof CAO_PREVIEW_EXECUTION_VERSION;
  executionMode:
    'preview_injected_cao_single_role';
  preflightValidated: true;
  routeRequestValidated: true;
  modelInvocationPerformed: true;
  providerLookupPerformed: false;
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
  labels:
    typeof EXECUTIVE_AGENTS_PREVIEW_ROUTE_LABELS;
  localExecution:
    LocalSingleRoleExecutionReport;
  requestedTools: readonly [];
  effectiveTools: readonly [];
  toolCalls: readonly [];
  humanReviewRequired: true;
  automaticApproval: false;
  automaticDispatch: false;
  automaticContinuation: false;
  fallbackPerformed: false;
  substitutionPerformed: false;
  persistencePerformed: false;
  productionEligible: false;
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

function structurallyEqual(
  left: unknown,
  right: unknown,
): boolean {
  function normalize(
    value: unknown,
  ): unknown {
    if (Array.isArray(value)) {
      return value.map(normalize);
    }

    if (isRecord(value)) {
      return Object.fromEntries(
        Object.keys(value)
          .sort()
          .map(key => [
            key,
            normalize(value[key]),
          ]),
      );
    }

    return value;
  }

  return (
    JSON.stringify(
      normalize(left),
    ) ===
    JSON.stringify(
      normalize(right),
    )
  );
}

function evidenceSourceKind(
  classification:
    ExecutiveAgentsPreviewRouteRequest[
      'evidence'
    ][number]['classification'],
): EvaluationEvidenceSourceKind {
  return classification ===
    'synthetic'
    ? 'synthetic_fixture'
    : 'repository';
}

function buildEvaluationCase(
  request:
    ExecutiveAgentsPreviewRouteRequest,
): ModelEvaluationCase {
  const evidence =
    request.evidence.map(
      item => ({
        id:
          item.reference,
        sourceKind:
          evidenceSourceKind(
            item.classification,
          ),
        locator:
          item.classification ===
            'synthetic'
            ? `synthetic://preview/${encodeURIComponent(
                item.reference,
              )}`
            : `repository://approved-nonsensitive/${encodeURIComponent(
                item.reference,
              )}`,
        description:
          item.content,
      }),
    );

  return {
    id:
      `cao-preview-${request.runId}`,
    roleId:
      'executive.chief_architecture_officer',
    taskClass:
      request.taskClass,
    title:
      request.taskClass ===
        'architecture_analysis'
        ? 'Bounded CAO Preview architecture analysis'
        : 'Bounded CAO Preview evaluation',
    humanRequest:
      request.instructions,
    evidence,
    requiredOutputSections:
      REQUIRED_OUTPUT_SECTIONS,
    prohibitedActions:
      REQUIRED_PROHIBITED_ACTIONS,
    expectedBehavior: {
      mustRefuseProhibitedAction:
        false,
      mustEscalateOnIncompleteEvidence:
        false,
      mustPreserveDissent:
        true,
      requiredEvidenceReferenceIds:
        evidence.map(
          item => item.id,
        ),
      requiredProhibitedActionLabels:
        REQUIRED_PROHIBITED_ACTIONS,
    },
  };
}

function requireAcceptedGate(
  acceptance:
    ExecutiveAgentsPreviewGateAcceptance,
): ExecutiveAgentsPreviewGateAcceptance {
  if (
    !isRecord(acceptance) ||
    acceptance.deploymentEnvironment !==
      'preview' ||
    acceptance.previewEnabled !==
      true ||
    acceptance.modelSlot !==
      'primary' ||
    acceptance.productionEligible !==
      false ||
    acceptance.persistenceAllowed !==
      false ||
    acceptance.automaticFallbackAllowed !==
      false ||
    acceptance
      .automaticProviderSubstitutionAllowed !==
      false ||
    acceptance
      .automaticContinuationAllowed !==
      false ||
    !Array.isArray(
      acceptance.requestedTools,
    ) ||
    acceptance.requestedTools.length !==
      0 ||
    !Array.isArray(
      acceptance.effectiveToolPermissions,
    ) ||
    acceptance
      .effectiveToolPermissions.length !==
      0 ||
    !Array.isArray(
      acceptance.toolCalls,
    ) ||
    acceptance.toolCalls.length !==
      0
  ) {
    throw new Error(
      'CAO Preview execution requires an exact accepted Preview gate result.',
    );
  }

  const revalidated =
    evaluateExecutiveAgentsPreviewGate({
      deploymentEnvironment:
        'preview',
      previewEnabledValue:
        EXECUTIVE_AGENTS_PREVIEW_ENABLED_VALUE,
      runRequest:
        acceptance.runRequest,
    });

  if (!revalidated.ok) {
    throw new Error(
      `CAO Preview gate revalidation failed: ${revalidated.issues
        .map(issue => issue.code)
        .join(', ')}`,
    );
  }

  if (
    !structurallyEqual(
      acceptance,
      revalidated.value,
    )
  ) {
    throw new Error(
      'Supplied CAO Preview gate acceptance does not match fresh gate evaluation.',
    );
  }

  return revalidated.value;
}

function requireRoutePreflight(
  request:
    ExecutiveAgentsPreviewRouteRequest,
  gate:
    ExecutiveAgentsPreviewGateAcceptance,
): void {
  const sourceCommitSha =
    gate.runRequest.auditMetadata
      .sourceCommitSha;

  const nowIso =
    gate.runRequest.auditMetadata
      .startedAt;

  const preflight =
    evaluateExecutiveAgentsPreviewRoute(
      {
        deploymentEnvironment:
          'preview',
        previewEnabledValue:
          EXECUTIVE_AGENTS_PREVIEW_ENABLED_VALUE,
        routeSecret:
          INTERNAL_PREFLIGHT_SECRET,
        sourceCommitSha,
        nowIso,
      },
      {
        authorizationHeader:
          `Bearer ${INTERNAL_PREFLIGHT_SECRET}`,
        contentType:
          'application/json',
        rawBody:
          JSON.stringify(
            request,
          ),
      },
    );

  if (
    preflight.status !== 200 ||
    !preflight.body.ok
  ) {
    throw new Error(
      `CAO Preview route preflight failed: ${
        preflight.body.ok
          ? 'unknown'
          : preflight.body.error
      }.`,
    );
  }

  const evidenceReferences =
    request.evidence.map(
      item => item.reference,
    );

  if (
    request.runId !==
      gate.runRequest.auditMetadata
        .runId ||
    request.taskClass !==
      gate.runRequest
        .requestedTaskClass ||
    request.roleId !==
      gate.runRequest.registryEntry
        .roleId ||
    request.modelSlot !==
      gate.modelSlot ||
    request.approvalReference !==
      gate.runRequest
        .roleApprovalReference ||
    !structurallyEqual(
      evidenceReferences,
      gate.runRequest.auditMetadata
        .evidenceReferences,
    ) ||
    preflight.body.roleId !==
      gate.runRequest.registryEntry
        .roleId ||
    preflight.body.taskClass !==
      gate.runRequest
        .requestedTaskClass ||
    preflight.body.modelSlot !==
      gate.modelSlot ||
    preflight.body.providerId !==
      CAO_PREVIEW_PRIMARY_PROVIDER_ID ||
    preflight.body.modelId !==
      CAO_PREVIEW_PRIMARY_MODEL_ID ||
    preflight.body
      .pinnedModelVersion !==
      CAO_PREVIEW_PRIMARY_PINNED_MODEL_VERSION ||
    !structurallyEqual(
      preflight.body
        .evidenceReferences,
      evidenceReferences,
    )
  ) {
    throw new Error(
      'CAO Preview route request does not match the accepted gate request.',
    );
  }
}

export async function executeCaoPreview(
  options:
    CaoPreviewExecutionOptions,
): Promise<CaoPreviewExecutionReport> {
  const gate =
    requireAcceptedGate(
      options.gateAcceptance,
    );

  requireRoutePreflight(
    options.routeRequest,
    gate,
  );

  const evaluationCase =
    buildEvaluationCase(
      options.routeRequest,
    );

  const localExecution =
    await executeLocalSingleRole({
      runRequest:
        gate.runRequest,
      evaluationCase,
      model:
        options.model,
      promptVersion:
        LOCAL_SINGLE_ROLE_PROMPT_VERSION,
      systemPrompt:
        buildLocalSingleRoleSystemPrompt(
          'executive.chief_architecture_officer',
        ),
      pricing:
        options.pricing,
      gatewayProviderRestriction: {
        onlyProviderId:
          CAO_PREVIEW_PRIMARY_PROVIDER_ID,
      },
      clock:
        options.clock,
    });

  return {
    executionVersion:
      CAO_PREVIEW_EXECUTION_VERSION,
    executionMode:
      'preview_injected_cao_single_role',
    preflightValidated: true,
    routeRequestValidated: true,
    modelInvocationPerformed: true,
    providerLookupPerformed: false,
    roleId:
      'executive.chief_architecture_officer',
    taskClass:
      options.routeRequest
        .taskClass,
    modelSlot: 'primary',
    providerId:
      CAO_PREVIEW_PRIMARY_PROVIDER_ID,
    modelId:
      CAO_PREVIEW_PRIMARY_MODEL_ID,
    pinnedModelVersion:
      CAO_PREVIEW_PRIMARY_PINNED_MODEL_VERSION,
    labels:
      EXECUTIVE_AGENTS_PREVIEW_ROUTE_LABELS,
    localExecution,
    requestedTools: [],
    effectiveTools: [],
    toolCalls: [],
    humanReviewRequired: true,
    automaticApproval: false,
    automaticDispatch: false,
    automaticContinuation: false,
    fallbackPerformed: false,
    substitutionPerformed: false,
    persistencePerformed: false,
    productionEligible: false,
  };
}
