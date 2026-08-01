// lib/chat/perplexityClient.ts
// AI-first /chat — Perplexity clients.
// The legacy REST adapter remains the default runtime path.
// The AI SDK adapter is available only behind the default-off CHAT_AI_SDK_ENABLED gate.

import {
  generateText,
  gateway,
  NoObjectGeneratedError,
  Output,
  type LanguageModel,
} from 'ai';
import {
  buildPerplexityRequest,
  PERPLEXITY_ENDPOINT,
  PERPLEXITY_MAX_OUTPUT_TOKENS,
  PERPLEXITY_MODEL,
  PERPLEXITY_TEMPERATURE,
  type ChatMessage,
} from './responseFormat';
import { modelResponseSchema, type ModelResponse } from './intakeSchema';
import { chatAiSdkEnabled } from './aiSdkFlag';
import { isE2EActive } from '../testing/e2eRunTag';

export class PerplexityError extends Error {}

/** Parse + Zod-validate the model's JSON content string into a ModelResponse. */
export function parseModelResponse(content: string): ModelResponse {
  let obj: unknown;
  try {
    obj = JSON.parse(content);
  } catch {
    throw new PerplexityError('model returned non-JSON content');
  }

  const parsed = modelResponseSchema.safeParse(obj);
  if (!parsed.success) {
    throw new PerplexityError(
      `model response failed schema: ${parsed.error.message}`,
    );
  }

  return parsed.data;
}

function isTransient(status: number): boolean {
  return status === 429 || status >= 500;
}

/**
 * Current production adapter: direct Perplexity REST call.
 * Retries transient failures and returns a validated ModelResponse.
 */
export async function callPerplexity(
  messages: ChatMessage[],
  opts: {
    apiKey?: string;
    model?: string;
    retries?: number;
    /** Deterministic AI SDK model injection for tests and isolated validation. */
    aiSdkModel?: LanguageModel;
  } = {},
): Promise<ModelResponse> {
  // Deterministic Preview E2E mock. Production never takes this branch.
  if (isE2EActive()) {
    const { mockPerplexityResponse } = await import(
      '../testing/e2ePerplexityMock'
    );
    return mockPerplexityResponse(messages);
  }

  // Dark migration seam. Default OFF in every environment: the existing REST
  // implementation remains active until CHAT_AI_SDK_ENABLED is explicitly set.
  if (chatAiSdkEnabled()) {
    return callPerplexityWithAiSdk(messages, {
      model: opts.aiSdkModel,
      gatewayModelId: `perplexity/${opts.model ?? PERPLEXITY_MODEL}`,
      retries: opts.retries,
    });
  }

  const apiKey = opts.apiKey ?? process.env.PERPLEXITY_API_KEY;
  if (!apiKey) throw new PerplexityError('PERPLEXITY_API_KEY not set');

  const body = buildPerplexityRequest(
    messages,
    opts.model ?? PERPLEXITY_MODEL,
  );
  const retries = opts.retries ?? 2;

  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(PERPLEXITY_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        if (isTransient(res.status) && attempt < retries) {
          lastErr = new PerplexityError(`HTTP ${res.status}`);
          continue;
        }

        throw new PerplexityError(`Perplexity HTTP ${res.status}`);
      }

      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = json.choices?.[0]?.message?.content;

      if (!content) {
        throw new PerplexityError('no content in Perplexity response');
      }

      return parseModelResponse(content);
    } catch (error) {
      lastErr = error;

      if (
        error instanceof PerplexityError &&
        /HTTP 5|HTTP 429/.test(error.message) &&
        attempt < retries
      ) {
        continue;
      }

      if (attempt >= retries) break;
    }
  }

  throw lastErr instanceof Error
    ? lastErr
    : new PerplexityError('Perplexity call failed');
}

/**
 * AI SDK v6 adapter selected only when CHAT_AI_SDK_ENABLED is explicitly on.
 *
 * A LanguageModel can be injected for deterministic tests; otherwise it uses
 * Perplexity Sonar Pro through Vercel AI Gateway.
 */
export async function callPerplexityWithAiSdk(
  messages: ChatMessage[],
  opts: {
    model?: LanguageModel;
    gatewayModelId?: string;
    retries?: number;
  } = {},
): Promise<ModelResponse> {
  const firstMessage = messages[0];
  const hasLeadingSystemMessage = firstMessage?.role === 'system';

  const system = hasLeadingSystemMessage
    ? firstMessage.content
    : undefined;

  const conversationMessages = hasLeadingSystemMessage
    ? messages.slice(1)
    : messages;

  try {
    const result = await generateText({
      model:
        opts.model ??
        gateway(opts.gatewayModelId ?? `perplexity/${PERPLEXITY_MODEL}`),
      system,
      messages: conversationMessages,
      // Spanish sessions currently include a second system-role message after
      // the locked persona. Preserve that ordering rather than merging prose.
      allowSystemInMessages: conversationMessages.some(
        message => message.role === 'system',
      ),
      output: Output.object({
        schema: modelResponseSchema,
      }),
      temperature: PERPLEXITY_TEMPERATURE,
      maxOutputTokens: PERPLEXITY_MAX_OUTPUT_TOKENS,
      maxRetries: opts.retries ?? 2,
    });

    return result.output;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      const detail =
        error.cause instanceof Error
          ? error.cause.message
          : error.message;

      throw new PerplexityError(
        `model response failed schema: ${detail}`,
      );
    }

    throw error;
  }
}
