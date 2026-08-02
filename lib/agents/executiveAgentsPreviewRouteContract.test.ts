import {
  CAO_PREVIEW_APPROVAL_REFERENCE,
} from './caoPreviewRegistry';

import {
  EXECUTIVE_AGENTS_PREVIEW_ROUTE_LABELS,
  EXECUTIVE_AGENTS_PREVIEW_ROUTE_MAX_BODY_BYTES,
  EXECUTIVE_AGENTS_PREVIEW_ROUTE_REQUEST_VERSION,
  evaluateExecutiveAgentsPreviewRoute,
  type ExecutiveAgentsPreviewRouteDependencies,
  type ExecutiveAgentsPreviewRouteInvocation,
  type ExecutiveAgentsPreviewRouteRequest,
} from './executiveAgentsPreviewRouteContract';

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

function validRequest():
ExecutiveAgentsPreviewRouteRequest {
  return {
    requestVersion:
      EXECUTIVE_AGENTS_PREVIEW_ROUTE_REQUEST_VERSION,
    roleId:
      'executive.chief_architecture_officer',
    taskClass:
      'architecture_analysis',
    modelSlot: 'primary',
    explicitHumanInitiation: true,
    approvalReference:
      CAO_PREVIEW_APPROVAL_REFERENCE,
    humanClass: 'founder',
    humanIdentifier:
      'synthetic-founder',
    runId:
      'synthetic-cao-route-run-0001',
    instructions:
      'Analyze the synthetic architecture dependency and preserve all unknowns and dissent.',
    sensitiveContentPresent: false,
    evidence: [
      {
        reference:
          'synthetic-evidence-001',
        classification:
          'synthetic',
        content:
          'Synthetic service A depends on synthetic service B.',
      },
    ],
  };
}

function dependencies():
ExecutiveAgentsPreviewRouteDependencies {
  return {
    deploymentEnvironment: 'preview',
    previewEnabledValue: 'true',
    routeSecret:
      'synthetic-preview-route-secret',
    sourceCommitSha:
      '1111111111111111111111111111111111111111',
    nowIso:
      '2026-08-02T17:00:00.000Z',
  };
}

function invocation(
  request: unknown =
    validRequest(),
): ExecutiveAgentsPreviewRouteInvocation {
  return {
    authorizationHeader:
      'Bearer synthetic-preview-route-secret',
    contentType:
      'application/json',
    rawBody:
      JSON.stringify(request),
  };
}

function evaluate(
  deps:
    ExecutiveAgentsPreviewRouteDependencies =
      dependencies(),
  call:
    ExecutiveAgentsPreviewRouteInvocation =
      invocation(),
) {
  return evaluateExecutiveAgentsPreviewRoute(
    deps,
    call,
  );
}

function errorIs(
  value: ReturnType<typeof evaluate>,
  status: number,
  error: string,
): boolean {
  return (
    value.status === status &&
    value.body.ok === false &&
    value.body.error === error
  );
}

function clone<T>(
  value: T,
): T {
  return JSON.parse(
    JSON.stringify(value),
  ) as T;
}

console.log(
  '\nRestricted executive-agent Preview route contract',
);

{
  const result = evaluate();

  check(
    'valid human-initiated CAO request is accepted without execution',
    result.status === 200 &&
      result.body.ok === true &&
      result.body.accepted === true &&
      result.body.executionPerformed ===
        false &&
      result.executionPerformed ===
        false &&
      result.providerCallPerformed ===
        false &&
      result.persistencePerformed ===
        false &&
      result.toolExecutionPerformed ===
        false &&
      result.productionActionPerformed ===
        false,
    JSON.stringify(result),
  );

  check(
    'accepted response carries every mandatory warning label',
    result.body.ok === true &&
      EXECUTIVE_AGENTS_PREVIEW_ROUTE_LABELS.every(
        label =>
          result.body.ok &&
          result.body.labels.includes(
            label,
          ),
      ),
  );

  check(
    'accepted response is tool-free and non-autonomous',
    result.body.ok === true &&
      result.body.requestedTools.length ===
        0 &&
      result.body.effectiveTools.length ===
        0 &&
      result.body.toolCalls.length ===
        0 &&
      result.body.automaticApproval ===
        false &&
      result.body.automaticDispatch ===
        false &&
      result.body
        .automaticContinuation ===
        false &&
      result.body.fallbackAllowed ===
        false &&
      result.body
        .providerSubstitutionAllowed ===
        false &&
      result.body.persistencePerformed ===
        false &&
      result.body.productionEligible ===
        false,
  );

  check(
    'accepted response contains references but not evidence bodies or instructions',
    result.body.ok === true &&
      result.body.evidenceReferences
        .includes(
          'synthetic-evidence-001',
        ) &&
      !JSON.stringify(result.body).includes(
        'Synthetic service A depends',
      ) &&
      !JSON.stringify(result.body).includes(
        'Analyze the synthetic',
      ),
  );
}

for (const environment of [
  undefined,
  '',
  'development',
  'test',
  'local',
  'unknown',
  'production',
] as const) {
  const deps = dependencies();
  deps.deploymentEnvironment =
    environment;

  check(
    `environment ${String(environment)} is concealed as not found`,
    errorIs(
      evaluate(deps),
      404,
      'not_found',
    ),
  );
}

for (const flag of [
  undefined,
  '',
  'false',
  'TRUE',
  true,
] as const) {
  const deps = dependencies();
  deps.previewEnabledValue = flag;

  check(
    `flag ${String(flag)} fails closed`,
    errorIs(
      evaluate(deps),
      404,
      'not_found',
    ),
  );
}

{
  const deps = dependencies();
  deps.routeSecret = undefined;

  check(
    'missing route secret conceals the route',
    errorIs(
      evaluate(deps),
      404,
      'not_found',
    ),
  );
}

for (const authorizationHeader of [
  undefined,
  '',
  'synthetic-preview-route-secret',
  'Bearer',
  'Bearer wrong-secret',
  'Basic synthetic-preview-route-secret',
] as const) {
  const call = invocation();
  call.authorizationHeader =
    authorizationHeader;

  check(
    `authorization ${String(authorizationHeader)} is rejected`,
    errorIs(
      evaluate(
        dependencies(),
        call,
      ),
      401,
      'unauthorized',
    ),
  );
}

for (const contentType of [
  undefined,
  '',
  'text/plain',
  'application/x-www-form-urlencoded',
] as const) {
  const call = invocation();
  call.contentType = contentType;

  check(
    `content type ${String(contentType)} is rejected`,
    errorIs(
      evaluate(
        dependencies(),
        call,
      ),
      415,
      'unsupported_media_type',
    ),
  );
}

{
  const call = invocation();
  call.contentType =
    'application/json; charset=utf-8';

  check(
    'UTF-8 JSON content type is accepted',
    evaluate(
      dependencies(),
      call,
    ).status === 200,
  );
}

{
  const call = invocation();
  call.rawBody = '{';

  check(
    'malformed JSON is rejected',
    errorIs(
      evaluate(
        dependencies(),
        call,
      ),
      400,
      'invalid_request',
    ),
  );
}

{
  const call = invocation();
  call.rawBody =
    'x'.repeat(
      EXECUTIVE_AGENTS_PREVIEW_ROUTE_MAX_BODY_BYTES +
        1,
    );

  check(
    'oversized body is rejected before parsing',
    errorIs(
      evaluate(
        dependencies(),
        call,
      ),
      413,
      'payload_too_large',
    ),
  );
}

{
  const deps = dependencies();
  deps.sourceCommitSha =
    'not-a-commit';

  check(
    'malformed source commit fails closed',
    errorIs(
      evaluate(deps),
      503,
      'route_unavailable',
    ),
  );
}

{
  const deps = dependencies();
  deps.nowIso =
    'not-a-time';

  check(
    'malformed route clock fails closed',
    errorIs(
      evaluate(deps),
      503,
      'route_unavailable',
    ),
  );
}

{
  const request =
    clone(validRequest()) as
      unknown as Record<
        string,
        unknown
      >;

  request.unexpectedField = true;

  check(
    'unknown request field is rejected',
    errorIs(
      evaluate(
        dependencies(),
        invocation(request),
      ),
      400,
      'invalid_request',
    ),
  );
}

{
  const request =
    clone(validRequest());

  (
    request as unknown as {
      roleId: string;
    }
  ).roleId =
    'executive.ceo';

  check(
    'unauthorized role is rejected',
    errorIs(
      evaluate(
        dependencies(),
        invocation(request),
      ),
      400,
      'invalid_request',
    ),
  );
}

{
  const request =
    clone(validRequest());

  (
    request as unknown as {
      taskClass: string;
    }
  ).taskClass =
    'risk_register_draft';

  check(
    'unauthorized task is rejected',
    errorIs(
      evaluate(
        dependencies(),
        invocation(request),
      ),
      400,
      'invalid_request',
    ),
  );
}

{
  const request =
    clone(validRequest());

  (
    request as unknown as {
      modelSlot: string;
    }
  ).modelSlot =
    'challenger';

  check(
    'challenger slot is rejected',
    errorIs(
      evaluate(
        dependencies(),
        invocation(request),
      ),
      400,
      'invalid_request',
    ),
  );
}

{
  const request =
    clone(validRequest());

  (
    request as unknown as {
      explicitHumanInitiation:
        boolean;
    }
  ).explicitHumanInitiation =
    false;

  check(
    'missing explicit human initiation is rejected',
    errorIs(
      evaluate(
        dependencies(),
        invocation(request),
      ),
      400,
      'invalid_request',
    ),
  );
}

{
  const request =
    clone(validRequest());

  (
    request as unknown as {
      approvalReference: string;
    }
  ).approvalReference =
    'stale-approval-reference';

  check(
    'stale approval reference is rejected',
    errorIs(
      evaluate(
        dependencies(),
        invocation(request),
      ),
      400,
      'invalid_request',
    ),
  );
}

{
  const request =
    clone(validRequest());

  (
    request as unknown as {
      sensitiveContentPresent:
        boolean;
    }
  ).sensitiveContentPresent =
    true;

  check(
    'sensitive-content declaration is rejected',
    errorIs(
      evaluate(
        dependencies(),
        invocation(request),
      ),
      400,
      'invalid_request',
    ),
  );
}

{
  const request =
    clone(validRequest());

  request.evidence = [];

  check(
    'empty evidence packet is rejected',
    errorIs(
      evaluate(
        dependencies(),
        invocation(request),
      ),
      400,
      'invalid_request',
    ),
  );
}

{
  const request =
    clone(validRequest());

  request.evidence = [
    request.evidence[0],
    request.evidence[0],
  ];

  check(
    'duplicate evidence references are rejected',
    errorIs(
      evaluate(
        dependencies(),
        invocation(request),
      ),
      400,
      'invalid_request',
    ),
  );
}

{
  const request =
    clone(validRequest());

  (
    request.evidence[0] as {
      classification: string;
    }
  ).classification =
    'customer_data';

  check(
    'unapproved evidence classification is rejected',
    errorIs(
      evaluate(
        dependencies(),
        invocation(request),
      ),
      400,
      'invalid_request',
    ),
  );
}

{
  const secret =
    'synthetic-preview-route-secret';

  const result = evaluate(
    {
      ...dependencies(),
      routeSecret: secret,
    },
    {
      ...invocation(),
      authorizationHeader:
        `Bearer ${secret}`,
    },
  );

  check(
    'route secret is never returned',
    !JSON.stringify(result).includes(
      secret,
    ),
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
