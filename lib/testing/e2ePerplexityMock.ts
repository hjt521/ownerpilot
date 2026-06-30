// lib/testing/e2ePerplexityMock.ts
// E3 — deterministic stand-in for callPerplexity during E2E. Maps the owner's last message to a scripted
// ModelResponse from the shared fixture; never makes a network call. Dynamically imported by perplexityClient
// only when isE2EActive(), so it is inert (and tree-shakeable) in production.

import type { ChatMessage } from '../chat/responseFormat';
import type { ModelResponse } from '../chat/intakeSchema';
import { E2E_INTAKE_STEPS } from './e2eIntakeFixture';

export function mockPerplexityResponse(messages: ChatMessage[]): ModelResponse {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const answer = (lastUser?.content ?? '').trim();
  const step = E2E_INTAKE_STEPS.find((s) => s.answer === answer);
  if (!step) {
    // Unknown input → advance nothing; deterministic non-complete reply.
    return { reply: `(e2e-mock) noted`, extracted_fields: [], intake_complete: false, refusal: null };
  }
  return {
    reply: `(e2e-mock) recorded ${step.field}`,
    extracted_fields: [{ field: step.field, value: step.value }],
    intake_complete: step.last === true,
    refusal: null,
  };
}
