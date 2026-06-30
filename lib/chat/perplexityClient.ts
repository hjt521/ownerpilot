// lib/chat/perplexityClient.ts
// AI-first /chat — Perplexity sonar-pro client. stream:false (§E), response_format json_schema, retry on transient.
// Every response is Zod-validated against modelResponseSchema before the orchestrator touches it.

import { buildPerplexityRequest, PERPLEXITY_ENDPOINT, PERPLEXITY_MODEL, type ChatMessage } from './responseFormat';
import { modelResponseSchema, type ModelResponse } from './intakeSchema';

export class PerplexityError extends Error {}

/** Parse + Zod-validate the model's JSON content string into a ModelResponse. Throws PerplexityError on bad JSON/shape. */
export function parseModelResponse(content: string): ModelResponse {
  let obj: unknown;
  try { obj = JSON.parse(content); }
  catch { throw new PerplexityError('model returned non-JSON content'); }
  const parsed = modelResponseSchema.safeParse(obj);
  if (!parsed.success) throw new PerplexityError(`model response failed schema: ${parsed.error.message}`);
  return parsed.data;
}

function isTransient(status: number): boolean {
  return status === 429 || status >= 500;
}

/** Call sonar-pro with the conversation; return a validated ModelResponse. Retries transient failures. */
export async function callPerplexity(
  messages: ChatMessage[],
  opts: { apiKey?: string; model?: string; retries?: number } = {},
): Promise<ModelResponse> {
  const apiKey = opts.apiKey ?? process.env.PERPLEXITY_API_KEY;
  if (!apiKey) throw new PerplexityError('PERPLEXITY_API_KEY not set');
  const body = buildPerplexityRequest(messages, opts.model ?? PERPLEXITY_MODEL);
  const retries = opts.retries ?? 2;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(PERPLEXITY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        if (isTransient(res.status) && attempt < retries) { lastErr = new PerplexityError(`HTTP ${res.status}`); continue; }
        throw new PerplexityError(`Perplexity HTTP ${res.status}`);
      }
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const content = json.choices?.[0]?.message?.content;
      if (!content) throw new PerplexityError('no content in Perplexity response');
      return parseModelResponse(content);
    } catch (e) {
      lastErr = e;
      if (e instanceof PerplexityError && /HTTP 5|HTTP 429/.test(e.message) && attempt < retries) continue;
      if (attempt >= retries) break;
    }
  }
  throw lastErr instanceof Error ? lastErr : new PerplexityError('Perplexity call failed');
}
