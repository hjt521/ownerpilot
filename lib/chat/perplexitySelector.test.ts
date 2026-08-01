// lib/chat/perplexitySelector.test.ts
// Deterministic routing tests for callPerplexity. No network or credentials.

import { MockLanguageModelV3 } from 'ai/test';
import { callPerplexity } from './perplexityClient';
import type { ChatMessage } from './responseFormat';

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

function mockGeneration(text: string) {
  return {
    content: [{ type: 'text' as const, text }],
    finishReason: { unified: 'stop' as const, raw: undefined },
    usage: {
      inputTokens: {
        total: 10,
        noCache: 10,
        cacheRead: undefined,
        cacheWrite: undefined,
      },
      outputTokens: {
        total: 20,
        text: 20,
        reasoning: undefined,
      },
    },
    warnings: [],
  };
}

const messages: ChatMessage[] = [
  { role: 'system', content: 'Locked OwnerPilot system prompt.' },
  { role: 'user', content: 'Synthetic selector test.' },
];

const validResponse = {
  reply: 'Synthetic validated response.',
  extracted_fields: [],
  intake_complete: false,
  refusal: null,
};

async function main(): Promise<void> {
  const originalFlag = process.env.CHAT_AI_SDK_ENABLED;
  const originalE2e = process.env.E2E_RUN_ACTIVE;
  const originalVercelEnv = process.env.VERCEL_ENV;
  const originalFetch = globalThis.fetch;

  try {
    // Flag OFF: preserve the existing direct REST path.
    delete process.env.CHAT_AI_SDK_ENABLED;
    delete process.env.E2E_RUN_ACTIVE;
    process.env.VERCEL_ENV = 'development';

    let legacyFetchCalls = 0;
    globalThis.fetch = async () => {
      legacyFetchCalls++;
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify(validResponse),
              },
            },
          ],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    };

    const legacyResult = await callPerplexity(messages, {
      apiKey: 'synthetic-test-key',
      retries: 0,
    });

    check(
      'flag off uses the legacy REST adapter',
      legacyFetchCalls === 1,
    );
    check(
      'legacy adapter returns the validated response',
      legacyResult.reply === validResponse.reply,
    );

    // Flag ON: select the AI SDK adapter and do not call legacy fetch.
    process.env.CHAT_AI_SDK_ENABLED = 'true';

    let unexpectedFetchCalls = 0;
    globalThis.fetch = async () => {
      unexpectedFetchCalls++;
      throw new Error('legacy fetch must not run when AI SDK is enabled');
    };

    const sdkModel = new MockLanguageModelV3({
      doGenerate: async () =>
        mockGeneration(JSON.stringify(validResponse)),
    });

    const sdkResult = await callPerplexity(messages, {
      apiKey: 'legacy-key-must-be-ignored',
      aiSdkModel: sdkModel,
      retries: 0,
    });

    check(
      'flag on uses the AI SDK adapter',
      sdkModel.doGenerateCalls.length === 1,
    );
    check(
      'flag on bypasses legacy fetch',
      unexpectedFetchCalls === 0,
    );
    check(
      'AI SDK selector returns the validated response',
      sdkResult.reply === validResponse.reply,
    );

    // Preview E2E remains first in precedence, even when the SDK flag is on.
    process.env.E2E_RUN_ACTIVE = 'true';
    process.env.VERCEL_ENV = 'preview';

    const forbiddenSdkModel = new MockLanguageModelV3({
      doGenerate: async () => {
        throw new Error('AI SDK must not run during the E2E mock path');
      },
    });

    const e2eResult = await callPerplexity(messages, {
      aiSdkModel: forbiddenSdkModel,
      retries: 0,
    });

    check(
      'Preview E2E mock takes precedence over the AI SDK flag',
      forbiddenSdkModel.doGenerateCalls.length === 0,
    );
    check(
      'Preview E2E mock takes precedence over legacy fetch',
      unexpectedFetchCalls === 0,
    );
    check(
      'Preview E2E mock returns a validated response',
      e2eResult.reply.length > 0,
    );
  } finally {
    globalThis.fetch = originalFetch;

    if (originalFlag === undefined) {
      delete process.env.CHAT_AI_SDK_ENABLED;
    } else {
      process.env.CHAT_AI_SDK_ENABLED = originalFlag;
    }

    if (originalE2e === undefined) {
      delete process.env.E2E_RUN_ACTIVE;
    } else {
      process.env.E2E_RUN_ACTIVE = originalE2e;
    }

    if (originalVercelEnv === undefined) {
      delete process.env.VERCEL_ENV;
    } else {
      process.env.VERCEL_ENV = originalVercelEnv;
    }
  }

  console.log(
    `\n${'-'.repeat(48)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(48)}`,
  );

  if (failed > 0) process.exit(1);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
