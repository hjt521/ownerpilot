// lib/chat/responseFormat.ts
// AI-first /chat rebuild — Perplexity request payload (Lane 3 §2; matches master prompt §E).
// Broker-ratified 2026-06-29: model sonar-pro locked for v1; envelope locked to §E.

export const PERPLEXITY_ENDPOINT = 'https://api.perplexity.ai/chat/completions';

/** Locked for v1 (Ruling §7). No per-request model switching. */
export const PERPLEXITY_MODEL = 'sonar-pro';
/** Contingency only — escalate on measured JSON-adherence failure under load, not preemptively. */
export const PERPLEXITY_FALLBACK_MODEL = 'sonar-reasoning-pro';

/** The §E response envelope — keep in lockstep with lib/chat/intakeSchema.ts modelResponseSchema. */
export const RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    schema: {
      type: 'object',
      required: ['reply', 'extracted_fields', 'intake_complete'],
      properties: {
        reply: { type: 'string' },
        extracted_fields: {
          type: 'array',
          items: {
            type: 'object',
            required: ['field', 'value'],
            properties: {
              field: {
                type: 'string',
                enum: [
                  'property_address', 'tenant_names', 'landlord_or_owner_name', 'landlord_phone',
                  'landlord_mailing_address', 'rent_period', 'rent_amount_due', 'payment_methods_accepted',
                  'payee_bank_name', 'payee_bank_address', 'payee_account_number', 'preferred_service_method',
                  'language_preference', 'courtesy_reminder_first',
                ],
              },
              value: {},
              confidence: { type: 'number', minimum: 0, maximum: 1 },
            },
          },
        },
        intake_complete: { type: 'boolean' },
        refusal: {
          type: ['string', 'null'],
          enum: ['legal_advice', 'ud_filing', 'settlement', 'non_la_city', 'security_concern', null],
        },
      },
    },
  },
} as const;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Build the sonar-pro request body. stream:false per §E (JSON cannot stream validly mid-object). */
export function buildPerplexityRequest(messages: ChatMessage[], model: string = PERPLEXITY_MODEL) {
  return {
    model,
    messages,
    stream: false as const,
    response_format: RESPONSE_FORMAT,
    temperature: 0.4,
    max_tokens: 800,
  };
}
