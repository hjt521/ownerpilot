/**
 * Deterministic argument-validation tests for the local live-provider
 * evaluation command. No provider, credential, environment, or network access.
 */

import {
  LIVE_PROVIDER_EVALUATION_ADAPTER_ID,
  LIVE_PROVIDER_EVALUATION_CONFIRMATION_FLAG,
  LIVE_PROVIDER_EVALUATION_PROMPT_VERSION,
  parseLiveProviderEvaluationArguments,
} from './liveProviderEvaluationConfig';

let passed = 0;
let failed = 0;

function check(
  name: string,
  condition: boolean,
): void {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}`);
  }
}

function baseArgs(): string[] {
  return [
    LIVE_PROVIDER_EVALUATION_CONFIRMATION_FLAG,
    '--suite-id',
    'synthetic-live-provider-suite-v1',
    '--source-commit',
    '29725db919dac324914cfb7c272cc46ffc28e505',
    '--approval-reference',
    'founder-omnibus-authorization-2026-08-01',
    '--gateway-api-key-file',
    '/tmp/ownerpilot-live-evaluation-gateway-key',
    '--case-id',
    'synthetic-cao-architecture-dissent-v1',
    '--maximum-output-tokens',
    '1200',
    '--timeout-ms',
    '30000',
    '--primary-provider-id',
    'anthropic',
    '--primary-model-id',
    'anthropic/claude-sonnet-4.5',
    '--primary-pinned-model-version',
    'anthropic/claude-sonnet-4.5',
    '--primary-reasoning-level',
    'standard',
    '--primary-input-micros-per-million-tokens',
    '3000000',
    '--primary-output-micros-per-million-tokens',
    '15000000',
    '--challenger-provider-id',
    'openai',
    '--challenger-model-id',
    'openai/gpt-5.4',
    '--challenger-pinned-model-version',
    'openai/gpt-5.4',
    '--challenger-reasoning-level',
    'deep',
    '--challenger-input-micros-per-million-tokens',
    '2500000',
    '--challenger-output-micros-per-million-tokens',
    '10000000',
  ];
}

function errorFor(args: readonly string[]): string {
  try {
    parseLiveProviderEvaluationArguments(args);
    return '';
  } catch (error) {
    return error instanceof Error
      ? error.message
      : String(error);
  }
}

function removeFlagAndValue(
  args: readonly string[],
  flag: string,
): string[] {
  const index = args.indexOf(flag);

  if (index < 0) return [...args];

  return [
    ...args.slice(0, index),
    ...args.slice(index + 2),
  ];
}

function replaceValue(
  args: readonly string[],
  flag: string,
  value: string,
): string[] {
  const next = [...args];
  const index = next.indexOf(flag);

  if (index < 0) {
    throw new Error(`Missing test flag ${flag}.`);
  }

  next[index + 1] = value;
  return next;
}

function main(): void {
  console.log('\nLive-provider evaluation arguments');

  const parsed =
    parseLiveProviderEvaluationArguments(
      baseArgs(),
    );

  check(
    'accepts one fully explicit bounded configuration',
    parsed.caseIds.length === 1 &&
      parsed.maximumOutputTokens === 1_200 &&
      parsed.timeoutMs === 30_000,
  );

  check(
    'creates pinned primary and challenger candidates',
    parsed.primaryCandidate.modelId ===
      'anthropic/claude-sonnet-4.5' &&
      parsed.primaryCandidate.pinnedModelVersion ===
        parsed.primaryCandidate.modelId &&
      parsed.challengerCandidate.modelId ===
        'openai/gpt-5.4' &&
      parsed.challengerCandidate.pinnedModelVersion ===
        parsed.challengerCandidate.modelId,
  );

  check(
    'uses the fixed evaluation-only adapter and prompt version',
    parsed.primaryCandidate.adapterId ===
      LIVE_PROVIDER_EVALUATION_ADAPTER_ID &&
      parsed.challengerCandidate.adapterId ===
        LIVE_PROVIDER_EVALUATION_ADAPTER_ID &&
      parsed.promptVersion ===
        LIVE_PROVIDER_EVALUATION_PROMPT_VERSION,
  );

  check(
    'creates one exact provider restriction per slot',
    parsed.gatewayProviderRestrictions.primary
      .onlyProviderId === 'anthropic' &&
      parsed.gatewayProviderRestrictions.challenger
        .onlyProviderId === 'openai',
  );

  check(
    'preserves diagnostic pricing as nonnegative integers',
    parsed.pricing.primary
      .inputMicrosPerMillionTokens === 3_000_000 &&
      parsed.pricing.challenger
        .outputMicrosPerMillionTokens === 10_000_000,
  );

  check(
    'requires explicit human confirmation',
    errorFor(
      baseArgs().filter(
        value =>
          value !==
          LIVE_PROVIDER_EVALUATION_CONFIRMATION_FLAG,
      ),
    ).includes('is required'),
  );

  check(
    'rejects duplicate confirmation',
    errorFor([
      ...baseArgs(),
      LIVE_PROVIDER_EVALUATION_CONFIRMATION_FLAG,
    ]).includes('only once'),
  );

  check(
    'rejects unknown arguments',
    errorFor([
      ...baseArgs(),
      '--automatic-provider-selection',
      'true',
    ]).includes('Unknown live-evaluation argument'),
  );

  check(
    'requires every single-value input',
    errorFor(
      removeFlagAndValue(
        baseArgs(),
        '--primary-model-id',
      ),
    ).includes('--primary-model-id'),
  );

  check(
    'requires at least one explicit synthetic case',
    errorFor(
      removeFlagAndValue(
        baseArgs(),
        '--case-id',
      ),
    ).includes('At least one explicit --case-id'),
  );

  check(
    'rejects duplicate case IDs',
    errorFor([
      ...baseArgs(),
      '--case-id',
      'synthetic-cao-architecture-dissent-v1',
    ]).includes('Duplicate --case-id'),
  );

  check(
    'rejects unknown case IDs',
    errorFor(
      replaceValue(
        baseArgs(),
        '--case-id',
        'customer-data-case',
      ),
    ).includes('Unknown synthetic evaluation case'),
  );

  check(
    'requires an absolute credential-file path',
    errorFor(
      replaceValue(
        baseArgs(),
        '--gateway-api-key-file',
        './gateway-key',
      ),
    ).includes('absolute path'),
  );

  check(
    'requires a full lowercase source commit',
    errorFor(
      replaceValue(
        baseArgs(),
        '--source-commit',
        '29725db',
      ),
    ).includes('40-character Git commit SHA'),
  );

  check(
    'requires model ID to use the provider prefix',
    errorFor(
      replaceValue(
        baseArgs(),
        '--primary-model-id',
        'openai/claude-sonnet-4.5',
      ),
    ).includes('provider-id prefix'),
  );

  check(
    'requires model ID and pinned version to match',
    errorFor(
      replaceValue(
        baseArgs(),
        '--primary-pinned-model-version',
        'anthropic/claude-sonnet-4.6',
      ),
    ).includes('must match exactly'),
  );

  check(
    'rejects a moving model alias',
    errorFor(
      replaceValue(
        replaceValue(
          baseArgs(),
          '--primary-model-id',
          'anthropic/claude-latest',
        ),
        '--primary-pinned-model-version',
        'anthropic/claude-latest',
      ),
    ).includes('moving_model_alias'),
  );

  check(
    'rejects an unknown reasoning level',
    errorFor(
      replaceValue(
        baseArgs(),
        '--challenger-reasoning-level',
        'automatic',
      ),
    ).includes('must be one of'),
  );

  check(
    'bounds maximum output tokens',
    errorFor(
      replaceValue(
        baseArgs(),
        '--maximum-output-tokens',
        '8001',
      ),
    ).includes('between 1 and 8000'),
  );

  check(
    'bounds the live-call timeout',
    errorFor(
      replaceValue(
        baseArgs(),
        '--timeout-ms',
        '999',
      ),
    ).includes('between 1000 and 120000'),
  );

  check(
    'rejects noninteger diagnostic pricing',
    errorFor(
      replaceValue(
        baseArgs(),
        '--primary-input-micros-per-million-tokens',
        '3.5',
      ),
    ).includes('base-10 integer'),
  );

  const sameCandidate = [
    ...replaceValue(
      replaceValue(
        replaceValue(
          replaceValue(
            baseArgs(),
            '--challenger-provider-id',
            'anthropic',
          ),
          '--challenger-model-id',
          'anthropic/claude-sonnet-4.5',
        ),
        '--challenger-pinned-model-version',
        'anthropic/claude-sonnet-4.5',
      ),
      '--challenger-reasoning-level',
      'standard',
    ),
  ];

  check(
    'requires distinguishable candidates',
    errorFor(sameCandidate).includes(
      'must be distinguishable',
    ),
  );

  console.log(
    `\n${'-'.repeat(60)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(60)}`,
  );

  if (failed > 0) process.exit(1);
}

main();
