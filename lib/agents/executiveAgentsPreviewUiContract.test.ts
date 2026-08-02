import {
  EXECUTIVE_AGENTS_PREVIEW_UI_MAX_BODY_BYTES,
  EXECUTIVE_AGENTS_PREVIEW_UI_REQUEST_VERSION,
  evaluateExecutiveAgentsPreviewUi,
  type ExecutiveAgentsPreviewUiDependencies,
  type ExecutiveAgentsPreviewUiInvocation,
  type ExecutiveAgentsPreviewUiRequest,
} from './executiveAgentsPreviewUiContract';

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

function request():
ExecutiveAgentsPreviewUiRequest {
  return {
    requestVersion:
      EXECUTIVE_AGENTS_PREVIEW_UI_REQUEST_VERSION,
    taskClass:
      'architecture_analysis',
    runId:
      'synthetic-cao-ui-run-0001',
    instructions:
      'Analyze the synthetic dependency and preserve unknowns and dissent.',
    evidenceReference:
      'synthetic-ui-evidence-001',
    evidenceClassification:
      'synthetic',
    evidenceContent:
      'Synthetic service A depends on synthetic service B.',
    explicitHumanInitiation: true,
    sensitiveContentPresent: false,
  };
}

function dependencies():
ExecutiveAgentsPreviewUiDependencies {
  return {
    deploymentEnvironment: 'preview',
    previewEnabledValue: 'true',
    routeSecret:
      'synthetic-preview-ui-route-secret',
    sourceCommitSha:
      '1111111111111111111111111111111111111111',
    nowIso:
      '2026-08-02T18:00:00.000Z',
    authenticatedAdmin: true,
    authenticatedHumanIdentifier:
      'admin@example.invalid',
  };
}

function invocation(
  value: unknown =
    request(),
): ExecutiveAgentsPreviewUiInvocation {
  return {
    contentType:
      'application/json',
    rawBody:
      JSON.stringify(value),
  };
}

function evaluate(
  deps:
    ExecutiveAgentsPreviewUiDependencies =
      dependencies(),
  call:
    ExecutiveAgentsPreviewUiInvocation =
      invocation(),
) {
  return evaluateExecutiveAgentsPreviewUi(
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
  '\nRestricted executive-agent Preview UI contract',
);

{
  const result = evaluate();

  check(
    'valid authenticated Preview request is accepted without execution',
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
    'server derives exact CAO role, primary model slot, and evidence reference',
    result.body.ok === true &&
      result.body.roleId ===
        'executive.chief_architecture_officer' &&
      result.body.modelSlot ===
        'primary' &&
      result.body.evidenceReferences
        .includes(
          'synthetic-ui-evidence-001',
        ),
  );

  check(
    'accepted result is tool-free and non-autonomous',
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

  const serialized =
    JSON.stringify(result);

  check(
    'accepted result excludes instructions, evidence content, admin identity, and route secret',
    !serialized.includes(
      'Analyze the synthetic dependency',
    ) &&
      !serialized.includes(
        'Synthetic service A depends',
      ) &&
      !serialized.includes(
        'admin@example.invalid',
      ) &&
      !serialized.includes(
        'synthetic-preview-ui-route-secret',
      ),
  );
}

for (const environment of [
  undefined,
  '',
  'development',
  'test',
  'local',
  'production',
] as const) {
  const deps = dependencies();
  deps.deploymentEnvironment =
    environment;

  check(
    `environment ${String(environment)} is concealed`,
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
  deps.previewEnabledValue =
    flag;

  check(
    `flag ${String(flag)} fails closed`,
    errorIs(
      evaluate(deps),
      404,
      'not_found',
    ),
  );
}

for (const authenticatedAdmin of [
  undefined,
  false,
  'true',
] as const) {
  const deps = dependencies();
  deps.authenticatedAdmin =
    authenticatedAdmin;

  check(
    `administrator state ${String(authenticatedAdmin)} is concealed`,
    errorIs(
      evaluate(deps),
      404,
      'not_found',
    ),
  );
}

{
  const deps = dependencies();
  deps.authenticatedHumanIdentifier =
    '';

  check(
    'missing authenticated human identity is concealed',
    errorIs(
      evaluate(deps),
      404,
      'not_found',
    ),
  );
}

for (const secret of [
  undefined,
  '',
  'too-short',
  'contains whitespace',
] as const) {
  const deps = dependencies();
  deps.routeSecret = secret;

  check(
    `invalid server route secret ${String(secret)} fails unavailable`,
    errorIs(
      evaluate(deps),
      503,
      'route_unavailable',
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
  call.contentType =
    contentType;

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
      EXECUTIVE_AGENTS_PREVIEW_UI_MAX_BODY_BYTES +
        1,
    );

  check(
    'oversized UI request is rejected before parsing',
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
  const value =
    clone(request()) as
      unknown as Record<
        string,
        unknown
      >;

  value.roleId =
    'executive.ceo';

  check(
    'client cannot submit or override a role',
    errorIs(
      evaluate(
        dependencies(),
        invocation(value),
      ),
      400,
      'invalid_request',
    ),
  );
}

{
  const value =
    clone(request()) as
      unknown as Record<
        string,
        unknown
      >;

  value.modelSlot =
    'challenger';

  check(
    'client cannot submit or override a model slot',
    errorIs(
      evaluate(
        dependencies(),
        invocation(value),
      ),
      400,
      'invalid_request',
    ),
  );
}

{
  const value =
    clone(request());

  (
    value as unknown as {
      taskClass: string;
    }
  ).taskClass =
    'risk_register_draft';

  check(
    'unauthorized task is rejected',
    errorIs(
      evaluate(
        dependencies(),
        invocation(value),
      ),
      400,
      'invalid_request',
    ),
  );
}

{
  const value =
    clone(request());

  value.explicitHumanInitiation =
    false as true;

  check(
    'missing explicit human initiation is rejected',
    errorIs(
      evaluate(
        dependencies(),
        invocation(value),
      ),
      400,
      'invalid_request',
    ),
  );
}

{
  const value =
    clone(request());

  value.sensitiveContentPresent =
    true as false;

  check(
    'sensitive-content declaration is rejected',
    errorIs(
      evaluate(
        dependencies(),
        invocation(value),
      ),
      400,
      'invalid_request',
    ),
  );
}

{
  const value =
    clone(request());

  (
    value as unknown as {
      evidenceClassification:
        string;
    }
  ).evidenceClassification =
    'customer_data';

  check(
    'unapproved evidence classification is rejected',
    errorIs(
      evaluate(
        dependencies(),
        invocation(value),
      ),
      400,
      'invalid_request',
    ),
  );
}

{
  const value =
    clone(request());

  value.runId =
    'contains spaces';

  check(
    'malformed run identifier is rejected',
    errorIs(
      evaluate(
        dependencies(),
        invocation(value),
      ),
      400,
      'invalid_request',
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
    'malformed server clock fails closed',
    errorIs(
      evaluate(deps),
      503,
      'route_unavailable',
    ),
  );
}

{
  const secret =
    'another-synthetic-server-secret';

  const result =
    evaluate({
      ...dependencies(),
      routeSecret: secret,
    });

  check(
    'server route secret is never returned',
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
