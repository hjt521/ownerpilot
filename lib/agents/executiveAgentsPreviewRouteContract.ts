/**
 * Testable contract for the restricted internal executive-agent Preview route.
 *
 * The contract performs access checks, bounded request parsing, construction
 * of the exact CAO Preview run request, and fail-closed gate evaluation.
 *
 * It performs no provider call, model execution, tool execution, persistence,
 * external communication, automatic continuation, Preview deployment action,
 * or Production action.
 */

import {
  createHash,
  timingSafeEqual,
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
  EXECUTIVE_AGENTS_PREVIEW_ENABLED_VALUE,
  EXECUTIVE_AGENTS_PREVIEW_GATE_VERSION,
  evaluateExecutiveAgentsPreviewGate,
} from './executiveAgentsPreviewGate';

export const EXECUTIVE_AGENTS_PREVIEW_ROUTE_VERSION =
  'executive-agents-preview-route-v1' as const;

export const EXECUTIVE_AGENTS_PREVIEW_ROUTE_REQUEST_VERSION =
  'executive-agents-preview-route-request-v1' as const;

export const EXECUTIVE_AGENTS_PREVIEW_ROUTE_SECRET_ENV =
  'EXECUTIVE_AGENTS_PREVIEW_ROUTE_SECRET' as const;

export const EXECUTIVE_AGENTS_PREVIEW_ROUTE_MAX_BODY_BYTES =
  32_768 as const;

export const EXECUTIVE_AGENTS_PREVIEW_ROUTE_MAX_INSTRUCTIONS_LENGTH =
  8_000 as const;

export const EXECUTIVE_AGENTS_PREVIEW_ROUTE_MAX_EVIDENCE_ITEMS =
  16 as const;

export const EXECUTIVE_AGENTS_PREVIEW_ROUTE_MAX_EVIDENCE_CONTENT_LENGTH =
  4_000 as const;

export const EXECUTIVE_AGENTS_PREVIEW_ROUTE_MAX_TOTAL_EVIDENCE_LENGTH =
  16_000 as const;

export const EXECUTIVE_AGENTS_PREVIEW_ROUTE_LABELS = [
  'NONCANONICAL',
  'ADVISORY',
  'DRAFT-ONLY',
  'HUMAN REVIEW REQUIRED',
  'NO IMPLEMENTATION AUTHORITY',
  'NO PRODUCTION AUTHORITY',
] as const;

export const EXECUTIVE_AGENTS_PREVIEW_EVIDENCE_CLASSIFICATIONS = [
  'synthetic',
  'approved_non_sensitive_repository_derived',
] as const;

export type ExecutiveAgentsPreviewEvidenceClassification =
  (
    typeof EXECUTIVE_AGENTS_PREVIEW_EVIDENCE_CLASSIFICATIONS
  )[number];

export const EXECUTIVE_AGENTS_PREVIEW_HUMAN_CLASSES = [
  'founder',
  'human_engineering_reviewer',
] as const;

export type ExecutiveAgentsPreviewHumanClass =
  (
    typeof EXECUTIVE_AGENTS_PREVIEW_HUMAN_CLASSES
  )[number];

export interface ExecutiveAgentsPreviewRouteEvidenceItem {
  reference: string;
  classification:
    ExecutiveAgentsPreviewEvidenceClassification;
  content: string;
}

export interface ExecutiveAgentsPreviewRouteRequest {
  requestVersion:
    typeof EXECUTIVE_AGENTS_PREVIEW_ROUTE_REQUEST_VERSION;
  roleId:
    'executive.chief_architecture_officer';
  taskClass:
    | 'architecture_analysis'
    | 'evaluation_only';
  modelSlot: 'primary';
  explicitHumanInitiation: true;
  approvalReference:
    typeof CAO_PREVIEW_APPROVAL_REFERENCE;
  humanClass:
    ExecutiveAgentsPreviewHumanClass;
  humanIdentifier: string;
  runId: string;
  instructions: string;
  sensitiveContentPresent: false;
  evidence:
    readonly ExecutiveAgentsPreviewRouteEvidenceItem[];
}

export interface ExecutiveAgentsPreviewRouteDependencies {
  deploymentEnvironment: unknown;
  previewEnabledValue: unknown;
  routeSecret: unknown;
  sourceCommitSha: unknown;
  nowIso: unknown;
}

export interface ExecutiveAgentsPreviewRouteInvocation {
  authorizationHeader: unknown;
  contentType: unknown;
  rawBody: unknown;
}

export const EXECUTIVE_AGENTS_PREVIEW_ROUTE_ERROR_CODES = [
  'not_found',
  'unauthorized',
  'unsupported_media_type',
  'payload_too_large',
  'invalid_request',
  'route_unavailable',
  'request_rejected',
] as const;

export type ExecutiveAgentsPreviewRouteErrorCode =
  (
    typeof EXECUTIVE_AGENTS_PREVIEW_ROUTE_ERROR_CODES
  )[number];

export interface ExecutiveAgentsPreviewRouteAcceptedBody {
  ok: true;
  accepted: true;
  executionPerformed: false;
  routeVersion:
    typeof EXECUTIVE_AGENTS_PREVIEW_ROUTE_VERSION;
  gateVersion:
    typeof EXECUTIVE_AGENTS_PREVIEW_GATE_VERSION;
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
  requestedTools: readonly [];
  effectiveTools: readonly [];
  toolCalls: readonly [];
  humanReviewRequired: true;
  automaticApproval: false;
  automaticDispatch: false;
  automaticContinuation: false;
  fallbackAllowed: false;
  providerSubstitutionAllowed: false;
  persistencePerformed: false;
  productionEligible: false;
}

export interface ExecutiveAgentsPreviewRouteErrorBody {
  ok: false;
  error:
    ExecutiveAgentsPreviewRouteErrorCode;
  issueCodes?: readonly string[];
  registryIssueCodes?: readonly string[];
}

export interface ExecutiveAgentsPreviewRouteResult {
  status: 200 | 400 | 401 | 404 | 413 | 415 | 422 | 503;
  body:
    | ExecutiveAgentsPreviewRouteAcceptedBody
    | ExecutiveAgentsPreviewRouteErrorBody;
  cacheControl: 'no-store';
  executionPerformed: false;
  providerCallPerformed: false;
  persistencePerformed: false;
  toolExecutionPerformed: false;
  productionActionPerformed: false;
}

type UnknownRecord =
  Record<string, unknown>;

const REQUEST_KEYS = [
  'requestVersion',
  'roleId',
  'taskClass',
  'modelSlot',
  'explicitHumanInitiation',
  'approvalReference',
  'humanClass',
  'humanIdentifier',
  'runId',
  'instructions',
  'sensitiveContentPresent',
  'evidence',
] as const;

const EVIDENCE_KEYS = [
  'reference',
  'classification',
  'content',
] as const;

const MAX_IDENTIFIER_LENGTH = 128;
const MAX_REFERENCE_LENGTH = 256;

function result(
  status:
    ExecutiveAgentsPreviewRouteResult['status'],
  body:
    ExecutiveAgentsPreviewRouteResult['body'],
): ExecutiveAgentsPreviewRouteResult {
  return {
    status,
    body,
    cacheControl: 'no-store',
    executionPerformed: false,
    providerCallPerformed: false,
    persistencePerformed: false,
    toolExecutionPerformed: false,
    productionActionPerformed: false,
  };
}

function errorResult(
  status:
    Exclude<
      ExecutiveAgentsPreviewRouteResult['status'],
      200
    >,
  error:
    ExecutiveAgentsPreviewRouteErrorCode,
  options?: {
    issueCodes?: readonly string[];
    registryIssueCodes?: readonly string[];
  },
): ExecutiveAgentsPreviewRouteResult {
  return result(status, {
    ok: false,
    error,
    ...(options?.issueCodes
      ? {
          issueCodes:
            options.issueCodes,
        }
      : {}),
    ...(options?.registryIssueCodes
      ? {
          registryIssueCodes:
            options.registryIssueCodes,
        }
      : {}),
  });
}

function isRecord(
  value: unknown,
): value is UnknownRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function hasExactKeys(
  value: UnknownRecord,
  expected: readonly string[],
): boolean {
  const actual =
    Object.keys(value).sort();

  const normalizedExpected =
    [...expected].sort();

  return (
    actual.length ===
      normalizedExpected.length &&
    actual.every(
      (key, index) =>
        key ===
        normalizedExpected[index],
    )
  );
}

function isBoundedString(
  value: unknown,
  maximumLength: number,
): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= maximumLength
  );
}

function isTaskClass(
  value: unknown,
): value is
  | 'architecture_analysis'
  | 'evaluation_only' {
  return (
    value === 'architecture_analysis' ||
    value === 'evaluation_only'
  );
}

function isHumanClass(
  value: unknown,
): value is
  ExecutiveAgentsPreviewHumanClass {
  return (
    typeof value === 'string' &&
    (
      EXECUTIVE_AGENTS_PREVIEW_HUMAN_CLASSES as
        readonly string[]
    ).includes(value)
  );
}

function isEvidenceClassification(
  value: unknown,
): value is
  ExecutiveAgentsPreviewEvidenceClassification {
  return (
    typeof value === 'string' &&
    (
      EXECUTIVE_AGENTS_PREVIEW_EVIDENCE_CLASSIFICATIONS as
        readonly string[]
    ).includes(value)
  );
}

function utf8ByteLength(
  value: string,
): number {
  return Buffer.byteLength(
    value,
    'utf8',
  );
}

function parseBearerToken(
  authorizationHeader: unknown,
): string | null {
  if (
    typeof authorizationHeader !==
    'string'
  ) {
    return null;
  }

  const match =
    /^Bearer ([^\s]+)$/.exec(
      authorizationHeader,
    );

  return match?.[1] ?? null;
}

function secretsMatch(
  presented: string,
  expected: string,
): boolean {
  const presentedBuffer =
    Buffer.from(presented, 'utf8');

  const expectedBuffer =
    Buffer.from(expected, 'utf8');

  if (
    presentedBuffer.length !==
    expectedBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    presentedBuffer,
    expectedBuffer,
  );
}

function isValidSourceCommitSha(
  value: unknown,
): value is string {
  return (
    typeof value === 'string' &&
    /^[a-f0-9]{40}$/.test(value)
  );
}

function isValidIsoTimestamp(
  value: unknown,
): value is string {
  if (
    typeof value !== 'string' ||
    value.length > 64
  ) {
    return false;
  }

  const parsed = Date.parse(value);

  return (
    Number.isFinite(parsed) &&
    new Date(parsed).toISOString() ===
      value
  );
}

function validateEvidence(
  value: unknown,
): value is
  readonly ExecutiveAgentsPreviewRouteEvidenceItem[] {
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length >
      EXECUTIVE_AGENTS_PREVIEW_ROUTE_MAX_EVIDENCE_ITEMS
  ) {
    return false;
  }

  const references =
    new Set<string>();

  let totalContentLength = 0;

  for (const item of value) {
    if (
      !isRecord(item) ||
      !hasExactKeys(
        item,
        EVIDENCE_KEYS,
      ) ||
      !isBoundedString(
        item.reference,
        MAX_REFERENCE_LENGTH,
      ) ||
      !isEvidenceClassification(
        item.classification,
      ) ||
      !isBoundedString(
        item.content,
        EXECUTIVE_AGENTS_PREVIEW_ROUTE_MAX_EVIDENCE_CONTENT_LENGTH,
      )
    ) {
      return false;
    }

    if (
      references.has(
        item.reference,
      )
    ) {
      return false;
    }

    references.add(
      item.reference,
    );

    totalContentLength +=
      item.content.length;

    if (
      totalContentLength >
      EXECUTIVE_AGENTS_PREVIEW_ROUTE_MAX_TOTAL_EVIDENCE_LENGTH
    ) {
      return false;
    }
  }

  return true;
}

function parseRequest(
  rawBody: unknown,
): ExecutiveAgentsPreviewRouteRequest | null {
  if (
    typeof rawBody !== 'string' ||
    rawBody.length === 0 ||
    utf8ByteLength(rawBody) >
      EXECUTIVE_AGENTS_PREVIEW_ROUTE_MAX_BODY_BYTES
  ) {
    return null;
  }

  let parsed: unknown;

  try {
    parsed =
      JSON.parse(rawBody);
  } catch {
    return null;
  }

  if (
    !isRecord(parsed) ||
    !hasExactKeys(
      parsed,
      REQUEST_KEYS,
    ) ||
    parsed.requestVersion !==
      EXECUTIVE_AGENTS_PREVIEW_ROUTE_REQUEST_VERSION ||
    parsed.roleId !==
      'executive.chief_architecture_officer' ||
    !isTaskClass(
      parsed.taskClass,
    ) ||
    parsed.modelSlot !==
      'primary' ||
    parsed.explicitHumanInitiation !==
      true ||
    parsed.approvalReference !==
      CAO_PREVIEW_APPROVAL_REFERENCE ||
    !isHumanClass(
      parsed.humanClass,
    ) ||
    !isBoundedString(
      parsed.humanIdentifier,
      MAX_IDENTIFIER_LENGTH,
    ) ||
    !isBoundedString(
      parsed.runId,
      MAX_IDENTIFIER_LENGTH,
    ) ||
    !/^[A-Za-z0-9._:-]+$/.test(
      parsed.runId,
    ) ||
    !isBoundedString(
      parsed.instructions,
      EXECUTIVE_AGENTS_PREVIEW_ROUTE_MAX_INSTRUCTIONS_LENGTH,
    ) ||
    parsed.sensitiveContentPresent !==
      false ||
    !validateEvidence(
      parsed.evidence,
    )
  ) {
    return null;
  }

  return parsed as unknown as
    ExecutiveAgentsPreviewRouteRequest;
}

function registryEntryHash():
string {
  return createHash('sha256')
    .update(
      JSON.stringify(
        CAO_PREVIEW_REGISTRY_ENTRY,
      ),
    )
    .digest('hex');
}

function buildRunRequest(
  request:
    ExecutiveAgentsPreviewRouteRequest,
  sourceCommitSha: string,
  nowIso: string,
): ExecutiveAgentRunRequest {
  const evidenceReferences =
    request.evidence.map(
      item => item.reference,
    );

  const taskClass:
    TaskClass =
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

function acceptedBody(
  request:
    ExecutiveAgentsPreviewRouteRequest,
  runRequest:
    ExecutiveAgentRunRequest,
  sourceCommitSha: string,
): ExecutiveAgentsPreviewRouteAcceptedBody {
  return {
    ok: true,
    accepted: true,
    executionPerformed: false,
    routeVersion:
      EXECUTIVE_AGENTS_PREVIEW_ROUTE_VERSION,
    gateVersion:
      EXECUTIVE_AGENTS_PREVIEW_GATE_VERSION,
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
      runRequest.registryEntry
        .charterVersion,
    sourceCommitSha,
    approvalReference:
      CAO_PREVIEW_APPROVAL_REFERENCE,
    evidenceReferences:
      runRequest.auditMetadata
        .evidenceReferences,
    requestedTools: [],
    effectiveTools: [],
    toolCalls: [],
    humanReviewRequired: true,
    automaticApproval: false,
    automaticDispatch: false,
    automaticContinuation: false,
    fallbackAllowed: false,
    providerSubstitutionAllowed: false,
    persistencePerformed: false,
    productionEligible: false,
  };
}

export function evaluateExecutiveAgentsPreviewRoute(
  dependencies:
    ExecutiveAgentsPreviewRouteDependencies,
  invocation:
    ExecutiveAgentsPreviewRouteInvocation,
): ExecutiveAgentsPreviewRouteResult {
  if (
    dependencies.deploymentEnvironment !==
      'preview' ||
    dependencies.previewEnabledValue !==
      EXECUTIVE_AGENTS_PREVIEW_ENABLED_VALUE
  ) {
    return errorResult(
      404,
      'not_found',
    );
  }

  if (
    !isBoundedString(
      dependencies.routeSecret,
      512,
    )
  ) {
    return errorResult(
      404,
      'not_found',
    );
  }

  const presentedSecret =
    parseBearerToken(
      invocation.authorizationHeader,
    );

  if (
    presentedSecret === null ||
    !secretsMatch(
      presentedSecret,
      dependencies.routeSecret,
    )
  ) {
    return errorResult(
      401,
      'unauthorized',
    );
  }

  if (
    typeof invocation.contentType !==
      'string' ||
    !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(
      invocation.contentType,
    )
  ) {
    return errorResult(
      415,
      'unsupported_media_type',
    );
  }

  if (
    typeof invocation.rawBody !==
      'string'
  ) {
    return errorResult(
      400,
      'invalid_request',
    );
  }

  if (
    utf8ByteLength(
      invocation.rawBody,
    ) >
    EXECUTIVE_AGENTS_PREVIEW_ROUTE_MAX_BODY_BYTES
  ) {
    return errorResult(
      413,
      'payload_too_large',
    );
  }

  if (
    !isValidSourceCommitSha(
      dependencies.sourceCommitSha,
    ) ||
    !isValidIsoTimestamp(
      dependencies.nowIso,
    )
  ) {
    return errorResult(
      503,
      'route_unavailable',
    );
  }

  const request =
    parseRequest(
      invocation.rawBody,
    );

  if (request === null) {
    return errorResult(
      400,
      'invalid_request',
    );
  }

  const runRequest =
    buildRunRequest(
      request,
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
      {
        issueCodes:
          gate.issues.map(
            issue => issue.code,
          ),
        registryIssueCodes:
          gate.registryValidationIssues.map(
            issue => issue.code,
          ),
      },
    );
  }

  return result(
    200,
    acceptedBody(
      request,
      gate.value.runRequest,
      dependencies.sourceCommitSha,
    ),
  );
}
