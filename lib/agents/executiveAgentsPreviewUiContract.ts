/**
 * Server-only bridge between the restricted internal Preview UI and the
 * existing executive-agent Preview-route contract.
 *
 * The browser may submit only bounded task instructions and one bounded
 * synthetic or approved-nonsensitive evidence item. The server derives the
 * role, model slot, approval reference, human identity, authority category,
 * registry entry, tool posture, and internal route authorization.
 *
 * This contract performs no provider call, model execution, tool execution,
 * persistence, external communication, automatic continuation, Preview
 * deployment action, or Production action.
 */

import {
  CAO_PREVIEW_APPROVAL_REFERENCE,
} from './caoPreviewRegistry';

import {
  EXECUTIVE_AGENTS_PREVIEW_EVIDENCE_CLASSIFICATIONS,
  EXECUTIVE_AGENTS_PREVIEW_ROUTE_MAX_BODY_BYTES,
  EXECUTIVE_AGENTS_PREVIEW_ROUTE_MAX_EVIDENCE_CONTENT_LENGTH,
  EXECUTIVE_AGENTS_PREVIEW_ROUTE_MAX_INSTRUCTIONS_LENGTH,
  EXECUTIVE_AGENTS_PREVIEW_ROUTE_REQUEST_VERSION,
  evaluateExecutiveAgentsPreviewRoute,
  type ExecutiveAgentsPreviewEvidenceClassification,
  type ExecutiveAgentsPreviewRouteRequest,
  type ExecutiveAgentsPreviewRouteResult,
} from './executiveAgentsPreviewRouteContract';

import {
  EXECUTIVE_AGENTS_PREVIEW_ENABLED_VALUE,
} from './executiveAgentsPreviewGate';

export const EXECUTIVE_AGENTS_PREVIEW_UI_VERSION =
  'executive-agents-preview-ui-v1' as const;

export const EXECUTIVE_AGENTS_PREVIEW_UI_REQUEST_VERSION =
  'executive-agents-preview-ui-request-v1' as const;

export const EXECUTIVE_AGENTS_PREVIEW_UI_MAX_BODY_BYTES =
  EXECUTIVE_AGENTS_PREVIEW_ROUTE_MAX_BODY_BYTES;

export const EXECUTIVE_AGENTS_PREVIEW_UI_MAX_RUN_ID_LENGTH =
  128 as const;

export const EXECUTIVE_AGENTS_PREVIEW_UI_MAX_EVIDENCE_REFERENCE_LENGTH =
  256 as const;

export interface ExecutiveAgentsPreviewUiRequest {
  requestVersion:
    typeof EXECUTIVE_AGENTS_PREVIEW_UI_REQUEST_VERSION;
  taskClass:
    | 'architecture_analysis'
    | 'evaluation_only';
  runId: string;
  instructions: string;
  evidenceReference: string;
  evidenceClassification:
    ExecutiveAgentsPreviewEvidenceClassification;
  evidenceContent: string;
  explicitHumanInitiation: true;
  sensitiveContentPresent: false;
}

export interface ExecutiveAgentsPreviewUiDependencies {
  deploymentEnvironment: unknown;
  previewEnabledValue: unknown;
  routeSecret: unknown;
  sourceCommitSha: unknown;
  nowIso: unknown;
  authenticatedAdmin: unknown;
  authenticatedHumanIdentifier:
    unknown;
}

export interface ExecutiveAgentsPreviewUiInvocation {
  contentType: unknown;
  rawBody: unknown;
}

type UnknownRecord =
  Record<string, unknown>;

const UI_REQUEST_KEYS = [
  'requestVersion',
  'taskClass',
  'runId',
  'instructions',
  'evidenceReference',
  'evidenceClassification',
  'evidenceContent',
  'explicitHumanInitiation',
  'sensitiveContentPresent',
] as const;

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
    | 'not_found'
    | 'unsupported_media_type'
    | 'payload_too_large'
    | 'invalid_request'
    | 'route_unavailable',
): ExecutiveAgentsPreviewRouteResult {
  return result(
    status,
    {
      ok: false,
      error,
    },
  );
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

function isValidRunId(
  value: unknown,
): value is string {
  return (
    isBoundedString(
      value,
      EXECUTIVE_AGENTS_PREVIEW_UI_MAX_RUN_ID_LENGTH,
    ) &&
    /^[A-Za-z0-9._:-]+$/.test(
      value,
    )
  );
}

function isValidRouteSecret(
  value: unknown,
): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 16 &&
    value.length <= 512 &&
    !/\s/.test(value)
  );
}

function isValidHumanIdentifier(
  value: unknown,
): value is string {
  return isBoundedString(
    value,
    256,
  );
}

function parseRequest(
  rawBody: unknown,
): ExecutiveAgentsPreviewUiRequest | null {
  if (
    typeof rawBody !== 'string' ||
    rawBody.length === 0 ||
    Buffer.byteLength(
      rawBody,
      'utf8',
    ) >
      EXECUTIVE_AGENTS_PREVIEW_UI_MAX_BODY_BYTES
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
      UI_REQUEST_KEYS,
    ) ||
    parsed.requestVersion !==
      EXECUTIVE_AGENTS_PREVIEW_UI_REQUEST_VERSION ||
    !isTaskClass(
      parsed.taskClass,
    ) ||
    !isValidRunId(
      parsed.runId,
    ) ||
    !isBoundedString(
      parsed.instructions,
      EXECUTIVE_AGENTS_PREVIEW_ROUTE_MAX_INSTRUCTIONS_LENGTH,
    ) ||
    !isBoundedString(
      parsed.evidenceReference,
      EXECUTIVE_AGENTS_PREVIEW_UI_MAX_EVIDENCE_REFERENCE_LENGTH,
    ) ||
    !isEvidenceClassification(
      parsed.evidenceClassification,
    ) ||
    !isBoundedString(
      parsed.evidenceContent,
      EXECUTIVE_AGENTS_PREVIEW_ROUTE_MAX_EVIDENCE_CONTENT_LENGTH,
    ) ||
    parsed.explicitHumanInitiation !==
      true ||
    parsed.sensitiveContentPresent !==
      false
  ) {
    return null;
  }

  return parsed as unknown as
    ExecutiveAgentsPreviewUiRequest;
}

function buildRouteRequest(
  request:
    ExecutiveAgentsPreviewUiRequest,
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

export function evaluateExecutiveAgentsPreviewUi(
  dependencies:
    ExecutiveAgentsPreviewUiDependencies,
  invocation:
    ExecutiveAgentsPreviewUiInvocation,
): ExecutiveAgentsPreviewRouteResult {
  if (
    dependencies.deploymentEnvironment !==
      'preview' ||
    dependencies.previewEnabledValue !==
      EXECUTIVE_AGENTS_PREVIEW_ENABLED_VALUE ||
    dependencies.authenticatedAdmin !==
      true
  ) {
    return errorResult(
      404,
      'not_found',
    );
  }

  if (
    !isValidHumanIdentifier(
      dependencies.authenticatedHumanIdentifier,
    )
  ) {
    return errorResult(
      404,
      'not_found',
    );
  }

  if (
    !isValidRouteSecret(
      dependencies.routeSecret,
    )
  ) {
    return errorResult(
      503,
      'route_unavailable',
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
    Buffer.byteLength(
      invocation.rawBody,
      'utf8',
    ) >
    EXECUTIVE_AGENTS_PREVIEW_UI_MAX_BODY_BYTES
  ) {
    return errorResult(
      413,
      'payload_too_large',
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

  const routeRequest =
    buildRouteRequest(
      request,
      dependencies.authenticatedHumanIdentifier,
    );

  return evaluateExecutiveAgentsPreviewRoute(
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
    },
    {
      authorizationHeader:
        `Bearer ${dependencies.routeSecret}`,
      contentType:
        'application/json',
      rawBody:
        JSON.stringify(
          routeRequest,
        ),
    },
  );
}
