// lib/chat/modelProviderFailure.ts
// Sanitized /api/chat model-provider failure boundary.
//
// Browser contract:
//   - always HTTP 502 with the same generic body;
//   - never return provider, Gateway, authentication, model, status, setup-link,
//     credential, or internal error text.
//
// Server contract:
//   - retain a useful categorical and structural diagnostic;
//   - redact configured credentials, bearer tokens, JWTs, URLs, and secret-like
//     assignments before logging or monitoring;
//   - never silently invoke the legacy REST adapter after an SDK failure.

import {
  APICallError,
  LoadAPIKeyError,
  LoadSettingError,
  NoObjectGeneratedError,
  RetryError,
} from 'ai';
import {
  captureException as captureMonitoringException,
  type CaptureOptions,
} from '@/lib/monitoring';

export type ModelProviderFailureKind =
  | 'authentication'
  | 'provider_or_model'
  | 'structured_output'
  | 'timeout_or_network'
  | 'rate_limit'
  | 'unknown';

export const CHAT_MODEL_UNAVAILABLE_BODY = Object.freeze({
  error: 'assistant unavailable',
} as const);

export interface ModelProviderFailureReport {
  failure_kind: ModelProviderFailureKind;
  error_name: string;
  error_type?: string;
  status_code?: number;
  retryable?: boolean;
  retry_reason?: string;
  generation_id?: string;
  model_id?: string;
  error_chain: string[];
  safe_message: string;
}

export interface ChatModelFailureResult {
  status: 502;
  body: typeof CHAT_MODEL_UNAVAILABLE_BODY;
  report: ModelProviderFailureReport;
}

export interface ChatModelFailureDependencies {
  captureException?: (
    error: unknown,
    options?: CaptureOptions,
  ) => Promise<void>;
  logError?: (line: string) => void;
}

type UnknownRecord = Record<string, unknown>;

const MAX_ERROR_CHAIN = 12;
const MAX_SAFE_MESSAGE_LENGTH = 1200;

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === 'object'
    ? value as UnknownRecord
    : null;
}

function errorName(value: unknown): string | undefined {
  if (value instanceof Error && value.name) return value.name;

  const record = asRecord(value);
  return typeof record?.name === 'string' && record.name.length > 0
    ? record.name
    : undefined;
}

function errorMessage(value: unknown): string | undefined {
  if (value instanceof Error && value.message) return value.message;

  const record = asRecord(value);
  return typeof record?.message === 'string' && record.message.length > 0
    ? record.message
    : undefined;
}

function collectErrorChain(error: unknown): unknown[] {
  const queue: unknown[] = [error];
  const result: unknown[] = [];
  const seen = new Set<unknown>();

  while (queue.length > 0 && result.length < MAX_ERROR_CHAIN) {
    const current = queue.shift();

    if (
      current === null ||
      current === undefined ||
      seen.has(current)
    ) {
      continue;
    }

    if (
      typeof current === 'object' ||
      typeof current === 'function'
    ) {
      seen.add(current);
    }

    result.push(current);

    if (RetryError.isInstance(current)) {
      queue.push(current.lastError, ...current.errors);
    }

    const record = asRecord(current);
    if (record?.cause !== undefined) queue.push(record.cause);

    if (Array.isArray(record?.errors)) {
      queue.push(...record.errors);
    }
  }

  return result;
}

function firstNumber(
  chain: unknown[],
  key: string,
): number | undefined {
  for (const item of chain) {
    const value = asRecord(item)?.[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }

  return undefined;
}

function firstBoolean(
  chain: unknown[],
  key: string,
): boolean | undefined {
  for (const item of chain) {
    const value = asRecord(item)?.[key];
    if (typeof value === 'boolean') return value;
  }

  return undefined;
}

function firstString(
  chain: unknown[],
  key: string,
): string | undefined {
  for (const item of chain) {
    const value = asRecord(item)?.[key];
    if (typeof value === 'string' && value.length > 0) {
      return value.slice(0, 240);
    }
  }

  return undefined;
}

function hasName(chain: unknown[], names: Set<string>): boolean {
  return chain.some(item => {
    const name = errorName(item);
    return name !== undefined && names.has(name);
  });
}

function messagesOf(chain: unknown[]): string[] {
  return chain
    .map(errorMessage)
    .filter((message): message is string => Boolean(message));
}

export function classifyModelProviderFailure(
  error: unknown,
): ModelProviderFailureKind {
  const chain = collectErrorChain(error);
  const messages = messagesOf(chain);
  const joinedMessage = messages.join(' | ');
  const statusCode = firstNumber(chain, 'statusCode');

  if (
    chain.some(item => NoObjectGeneratedError.isInstance(item)) ||
    hasName(chain, new Set([
      'NoObjectGeneratedError',
      'AI_NoObjectGeneratedError',
    ])) ||
    /model response failed schema|structured output|schema validation/i.test(
      joinedMessage,
    )
  ) {
    return 'structured_output';
  }

  if (
    chain.some(item =>
      LoadAPIKeyError.isInstance(item) ||
      LoadSettingError.isInstance(item)
    ) ||
    hasName(chain, new Set([
      'GatewayAuthenticationError',
      'LoadAPIKeyError',
      'AI_LoadAPIKeyError',
      'LoadSettingError',
      'AI_LoadSettingError',
    ])) ||
    statusCode === 401
  ) {
    return 'authentication';
  }

  if (
    hasName(chain, new Set([
      'GatewayRateLimitError',
      'RateLimitError',
    ])) ||
    statusCode === 429 ||
    /rate[\s_-]*limit|too many requests|quota exceeded/i.test(joinedMessage)
  ) {
    return 'rate_limit';
  }

  if (
    hasName(chain, new Set([
      'AbortError',
      'TimeoutError',
      'NetworkError',
      'FetchError',
    ])) ||
    statusCode === 408 ||
    statusCode === 504 ||
    /\btimeout\b|\btimed out\b|\bnetwork\b|\bfetch failed\b|\bconnection\b/i.test(
      joinedMessage,
    )
  ) {
    return 'timeout_or_network';
  }

  if (
    hasName(chain, new Set([
      'GatewayError',
      'GatewayFailedDependencyError',
      'GatewayForbiddenError',
      'GatewayInternalServerError',
      'GatewayInvalidRequestError',
      'GatewayModelNotFoundError',
      'GatewayResponseError',
      'NoSuchModelError',
      'AI_NoSuchModelError',
    ])) ||
    chain.some(item => APICallError.isInstance(item)) ||
    (
      statusCode !== undefined &&
      statusCode >= 400
    )
  ) {
    return 'provider_or_model';
  }

  return 'unknown';
}

function replaceConfiguredSecrets(text: string): string {
  let result = text;

  for (const name of [
    'AI_GATEWAY_API_KEY',
    'VERCEL_OIDC_TOKEN',
    'PERPLEXITY_API_KEY',
    'ANTHROPIC_API_KEY',
  ]) {
    const secret = process.env[name];

    if (typeof secret === 'string' && secret.length >= 8) {
      result = result.split(secret).join('[redacted-credential]');
    }
  }

  return result;
}

export function sanitizeProviderErrorText(value: unknown): string {
  const raw = typeof value === 'string'
    ? value
    : errorMessage(value) ?? String(value ?? 'model provider request failed');

  let result = replaceConfiguredSecrets(raw);

  result = result
    .replace(
      /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi,
      'Bearer [redacted-credential]',
    )
    .replace(
      /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
      '[redacted-token]',
    )
    .replace(
      /\b(?:sk|pplx|vci|vercel|gateway)[-_][A-Za-z0-9_-]{12,}\b/gi,
      '[redacted-credential]',
    )
    .replace(
      /\b((?:api[_-]?key|token|secret|password|authorization|credential)[A-Za-z0-9_-]*)\s*[:=]\s*["']?[^,\s"'}]+/gi,
      '$1=[redacted-credential]',
    )
    .replace(
      /https?:\/\/[^\s"'<>]+/gi,
      '[redacted-url]',
    );

  result = result.replace(/\s+/g, ' ').trim();

  return (
    result.slice(0, MAX_SAFE_MESSAGE_LENGTH) ||
    'model provider request failed'
  );
}

function sanitizeOptionalProviderMetadata(
  value: string | undefined,
): string | undefined {
  if (value === undefined) return undefined;

  const sanitized = sanitizeProviderErrorText(value);
  return sanitized.length > 0 ? sanitized : undefined;
}

export function buildModelProviderFailureReport(
  error: unknown,
): ModelProviderFailureReport {
  const chain = collectErrorChain(error);
  const messages = messagesOf(chain);
  const retry = chain.find(item => RetryError.isInstance(item));
  const retryReason = RetryError.isInstance(retry)
    ? retry.reason
    : firstString(chain, 'reason');

  return {
    failure_kind: classifyModelProviderFailure(error),
    error_name: sanitizeProviderErrorText(
      errorName(chain[0]) ?? 'UnknownError',
    ),
    error_type: sanitizeOptionalProviderMetadata(
      firstString(chain, 'type'),
    ),
    status_code: firstNumber(chain, 'statusCode'),
    retryable: firstBoolean(chain, 'isRetryable'),
    retry_reason: sanitizeOptionalProviderMetadata(retryReason),
    generation_id: sanitizeOptionalProviderMetadata(
      firstString(chain, 'generationId'),
    ),
    model_id: sanitizeOptionalProviderMetadata(
      firstString(chain, 'modelId'),
    ),
    error_chain: chain
      .map(item =>
        sanitizeProviderErrorText(errorName(item) ?? typeof item)
      )
      .slice(0, MAX_ERROR_CHAIN),
    safe_message: sanitizeProviderErrorText(
      messages.find(Boolean) ?? 'model provider request failed',
    ),
  };
}

export async function handleChatModelFailure(
  error: unknown,
  sessionId: string,
  dependencies: ChatModelFailureDependencies = {},
): Promise<ChatModelFailureResult> {
  const report = buildModelProviderFailureReport(error);
  const logError = dependencies.logError ??
    ((line: string) => console.error(line));
  const captureException = dependencies.captureException ??
    captureMonitoringException;

  const logLine = JSON.stringify({
    evt: 'chat.model_provider_failure',
    session_id: sessionId,
    ...report,
  });

  try {
    logError(logLine);
  } catch {
    // Reporting is best-effort and must never change the browser response.
  }

  const monitoredError = new Error(
    `[${report.failure_kind}] ${report.safe_message}`,
  );
  monitoredError.name = 'ChatModelProviderFailure';

  try {
    await captureException(monitoredError, {
      tags: {
        area: 'chat',
        op: 'perplexity',
        failure_kind: report.failure_kind,
      },
      fingerprint: [
        'chat-model-provider',
        report.failure_kind,
        report.error_name,
      ],
      extra: {
        session_id: sessionId,
        ...report,
      },
    });
  } catch {
    // Do not expose or recursively report monitoring-provider failure text.
  }

  return {
    status: 502,
    body: CHAT_MODEL_UNAVAILABLE_BODY,
    report,
  };
}
