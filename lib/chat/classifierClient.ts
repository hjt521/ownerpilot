/**
 * Builds the classifier's model call (the CompleteFn that classifier.ts injects),
 * routed through Vercel AI Gateway (Jack's §4.1 = Option B). The Gateway gives token
 * + error-rate + cost tracking and the ~5% alert with only a baseURL change; tokens
 * carry zero markup. Auth is the AI Gateway API key, or the Vercel OIDC token when no
 * key is set (per Vercel's Anthropic Messages API docs).
 *
 * Non-streaming, tiny max_tokens. Throws on any failure — runClassifier catches it
 * and the route fail-opens to the regex floor (unless ops has set CLASSIFIER_FAIL_CLOSED).
 *
 * Slice 3b: surfaces msg.id as modelCallId for the §1.2 audit field. Latency is
 * timed by runClassifier (the §2.5 boundary), not here.
 */

import Anthropic from '@anthropic-ai/sdk';
import { CLASSIFIER_MODEL, CLASSIFIER_MAX_TOKENS } from './classifierConfig';
import type { CompleteFn } from './classifier';

const GATEWAY_BASE_URL = 'https://ai-gateway.vercel.sh';

export function makeGatewayComplete(): CompleteFn {
  const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
  const client = new Anthropic({ apiKey, baseURL: GATEWAY_BASE_URL });
  return async (system: string, user: string) => {
    const msg = await client.messages.create({
      model: CLASSIFIER_MODEL,
      max_tokens: CLASSIFIER_MAX_TOKENS,
      system,
      messages: [{ role: 'user', content: user }],
    });
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');
    const tokens = (msg.usage?.input_tokens ?? 0) + (msg.usage?.output_tokens ?? 0);
    return { text, tokens, modelCallId: msg.id ?? null };
  };
}
