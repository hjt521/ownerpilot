// lib/chat/perplexityAiSdkClient.test.ts
// Deterministic AI SDK v6 adapter tests. No network or credentials are used.

import { MockLanguageModelV3 } from 'ai/test';
import {
  callPerplexityWithAiSdk,
  PerplexityError,
} from './perplexityClient';
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
  {
    role: 'system',
    content: 'language_preference=es. Unsupported-language notice.',
  },
  { role: 'user', content: 'My tenant is behind on rent.' },
];

async function main(): Promise<void> {
  const validResponse = {
    reply: 'I can help collect the relevant facts.',
    extracted_fields: [],
    intake_complete: false,
    refusal: null,
  };

  const validModel = new MockLanguageModelV3({
    doGenerate: async () =>
      mockGeneration(JSON.stringify(validResponse)),
  });

  const result = await callPerplexityWithAiSdk(messages, {
    model: validModel,
  });

  check('returns the validated structured response', result.reply === validResponse.reply);
  check('preserves intake_complete', result.intake_complete === false);
  check('preserves refusal null', result.refusal === null);
  check('calls the model once', validModel.doGenerateCalls.length === 1);

  const firstCall = validModel.doGenerateCalls[0];
  check('preserves max output tokens at 800', firstCall.maxOutputTokens === 800);
  check('preserves temperature at 0.4', firstCall.temperature === 0.4);
  const serializedPrompt = JSON.stringify(firstCall.prompt);
  const lockedPromptIndex = serializedPrompt.indexOf(
    'Locked OwnerPilot system prompt.',
  );
  const languagePromptIndex = serializedPrompt.indexOf(
    'language_preference=es. Unsupported-language notice.',
  );

  check(
    'passes the locked system prompt',
    lockedPromptIndex >= 0,
  );
  check(
    'preserves the second system message',
    languagePromptIndex >= 0,
  );
  check(
    'preserves system-message ordering',
    lockedPromptIndex >= 0 &&
      languagePromptIndex > lockedPromptIndex,
  );

  const invalidModel = new MockLanguageModelV3({
    doGenerate: async () =>
      mockGeneration(JSON.stringify({
        reply: '',
        extracted_fields: [],
        intake_complete: false,
        refusal: null,
      })),
  });

  let rejectedInvalidShape = false;

  try {
    await callPerplexityWithAiSdk(messages, {
      model: invalidModel,
      retries: 0,
    });
  } catch (error) {
    rejectedInvalidShape =
      error instanceof PerplexityError &&
      error.message.includes('model response failed schema');
  }

  check('rejects output that fails the Zod schema', rejectedInvalidShape);

  console.log(
    `\n${'-'.repeat(48)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(48)}`,
  );

  if (failed > 0) process.exit(1);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
