// lib/chat/modelProviderFailure.test.ts
// Focused activation-hardening tests. No network, Vercel, Sentry, or Supabase.

import {
  APICallError,
  RetryError,
} from 'ai';
import {
  GatewayAuthenticationError,
  GatewayModelNotFoundError,
  GatewayRateLimitError,
} from '@ai-sdk/gateway';
import { PerplexityError } from './perplexityClient';
import {
  CHAT_MODEL_UNAVAILABLE_BODY,
  buildModelProviderFailureReport,
  handleChatModelFailure,
  sanitizeProviderErrorText,
  type ModelProviderFailureKind,
} from './modelProviderFailure';
import type { CaptureOptions } from '@/lib/monitoring';

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean): void {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}`);
  }
}

function kindOf(error: unknown): ModelProviderFailureKind {
  return buildModelProviderFailureReport(error).failure_kind;
}

async function main(): Promise<void> {
  const originalGatewayKey = process.env.AI_GATEWAY_API_KEY;
  const secret = 'gateway_test_secret_123456789';
  process.env.AI_GATEWAY_API_KEY = secret;

  try {
    const authError = new GatewayAuthenticationError({
      message:
        `Authentication failed. Bearer ${secret}. Configure at ` +
        'https://vercel.com/docs/ai-gateway/setup',
      statusCode: 401,
      generationId: 'gen-auth-safe',
    });

    const wrappedAuthError = new RetryError({
      message: 'AI request failed after authentication rejection',
      reason: 'errorNotRetryable',
      errors: [authError],
    });

    check(
      'Gateway authentication failure is classified',
      kindOf(wrappedAuthError) === 'authentication',
    );

    const modelError = new GatewayModelNotFoundError({
      message: 'Requested provider model is unavailable',
      statusCode: 404,
      modelId: 'perplexity/missing-model',
      generationId: 'gen-model-safe',
    });

    check(
      'provider/model failure is classified',
      kindOf(modelError) === 'provider_or_model',
    );

    const structuredError = new PerplexityError(
      'model response failed schema: reply must not be empty',
    );

    check(
      'structured-output failure is classified',
      kindOf(structuredError) === 'structured_output',
    );

    const abortError = new Error('socket network timeout');
    abortError.name = 'AbortError';

    const networkError = new APICallError({
      message:
        'fetch failed for https://gateway.ai.vercel.com/v1/model ' +
        `with authorization=Bearer ${secret}`,
      url: 'https://gateway.ai.vercel.com/v1/model',
      requestBodyValues: {},
      statusCode: 504,
      cause: abortError,
      isRetryable: true,
    });

    check(
      'timeout or network failure is classified',
      kindOf(networkError) === 'timeout_or_network',
    );

    const rateError = new GatewayRateLimitError({
      message: 'Gateway rate limit exceeded',
      statusCode: 429,
      generationId: 'gen-rate-safe',
    });

    const wrappedRateError = new RetryError({
      message: 'AI request retries exhausted',
      reason: 'maxRetriesExceeded',
      errors: [rateError],
    });

    check(
      'rate-limit failure is classified',
      kindOf(wrappedRateError) === 'rate_limit',
    );

    const captured: Array<{
      error: unknown;
      options?: CaptureOptions;
    }> = [];
    const logged: string[] = [];

    const result = await handleChatModelFailure(
      wrappedAuthError,
      'session-safe-id',
      {
        captureException: async (error, options) => {
          captured.push({ error, options });
        },
        logError: line => {
          logged.push(line);
        },
      },
    );

    check(
      'client response uses generic HTTP 502',
      result.status === 502,
    );
    check(
      'client body is exactly the generic unavailable body',
      result.body === CHAT_MODEL_UNAVAILABLE_BODY &&
      JSON.stringify(result.body) ===
        JSON.stringify({ error: 'assistant unavailable' }),
    );
    check(
      'client body contains no detail field',
      !('detail' in result.body),
    );

    check(
      'detailed server-side monitoring event is emitted once',
      captured.length === 1 &&
      captured[0].options?.tags?.failure_kind === 'authentication' &&
      captured[0].options?.tags?.op === 'perplexity' &&
      captured[0].options?.extra?.status_code === 401 &&
      captured[0].options?.extra?.error_name === 'AI_RetryError' &&
      captured[0].options?.extra?.retry_reason === 'errorNotRetryable',
    );

    const monitoredText = JSON.stringify(captured);
    const loggedText = logged.join('\n');

    for (const [surface, text] of [
      ['monitoring', monitoredText],
      ['logs', loggedText],
    ] as const) {
      check(
        `${surface} does not expose configured credential`,
        !text.includes(secret),
      );
      check(
        `${surface} does not expose Bearer credential`,
        !/Bearer\s+gateway_test_secret/i.test(text),
      );
      check(
        `${surface} does not expose setup URL`,
        !text.includes('https://vercel.com/docs/ai-gateway/setup'),
      );
    }

    check(
      'monitoring preserves useful safe structural detail',
      monitoredText.includes('authentication') &&
      monitoredText.includes('GatewayAuthenticationError') &&
      monitoredText.includes('gen-auth-safe'),
    );

    const sanitized = sanitizeProviderErrorText(
      `token=${secret} Bearer ${secret} ` +
      'https://example.test/provider/setup',
    );

    check(
      'provider text sanitizer redacts secrets and URLs',
      !sanitized.includes(secret) &&
      !sanitized.includes('https://') &&
      sanitized.includes('[redacted-credential]') &&
      sanitized.includes('[redacted-url]'),
    );

    const hostileMetadataError = new GatewayModelNotFoundError({
      message: 'provider metadata sanitization test',
      statusCode: 404,
      modelId:
        `perplexity/${secret}/` +
        'https://example.test/provider/model',
      generationId: `generation-${secret}`,
    });

    const hostileMetadataReport =
      buildModelProviderFailureReport(hostileMetadataError);
    const hostileMetadataText =
      JSON.stringify(hostileMetadataReport);

    check(
      'all string-valued diagnostic metadata is sanitized',
      !hostileMetadataText.includes(secret) &&
      !hostileMetadataText.includes('https://example.test'),
    );

    let reportingFailureStillReturned502 = false;

    try {
      const reportingFailureResult = await handleChatModelFailure(
        modelError,
        'session-reporting-failure',
        {
          logError: () => {
            throw new Error(
              `log transport failed with ${secret}`,
            );
          },
          captureException: async () => {
            throw new Error(
              `monitoring transport failed at ` +
              `https://example.test/setup?token=${secret}`,
            );
          },
        },
      );

      reportingFailureStillReturned502 =
        reportingFailureResult.status === 502 &&
        JSON.stringify(reportingFailureResult.body) ===
          JSON.stringify({ error: 'assistant unavailable' });
    } catch {
      reportingFailureStillReturned502 = false;
    }

    check(
      'logging or monitoring failure cannot replace generic 502',
      reportingFailureStillReturned502,
    );
  } finally {
    if (originalGatewayKey === undefined) {
      delete process.env.AI_GATEWAY_API_KEY;
    } else {
      process.env.AI_GATEWAY_API_KEY = originalGatewayKey;
    }
  }

  console.log(
    `\n${'-'.repeat(48)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(48)}`,
  );

  if (failed > 0) process.exit(1);
}

void main().catch(error => {
  console.error(error);
  process.exit(1);
});
