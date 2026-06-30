// lib/chat/intakeSchema.ts
// AI-first /chat rebuild — Zod intake schema. Mirrors master prompt §E exactly.
// 14 intake fields, per-turn extracted_fields[], full model-response validator, merged intake_state shape.

import { z } from 'zod';

/** The 14 captured intake fields (master prompt §E enum). */
export const INTAKE_FIELD = z.enum([
  'property_address', 'tenant_names', 'landlord_or_owner_name',
  'landlord_phone', 'landlord_mailing_address', 'rent_period',
  'rent_amount_due', 'payment_methods_accepted', 'payee_bank_name',
  'payee_bank_address', 'payee_account_number', 'preferred_service_method',
  'language_preference', 'courtesy_reminder_first',
]);
export type IntakeField = z.infer<typeof INTAKE_FIELD>;

/** Per-field value typing — values arrive loosely from the model and are coerced/validated here. */
export const intakeFieldValueSchema = z.object({
  property_address:         z.string().min(5),
  tenant_names:             z.array(z.string().min(1)).min(1),
  landlord_or_owner_name:   z.string().min(1),
  landlord_phone:           z.string().regex(/^\+?[0-9().\-\s]{7,}$/),
  landlord_mailing_address: z.string().min(5),
  rent_period:              z.string().min(1),              // e.g. "monthly" / period label
  rent_amount_due:          z.number().positive(),
  payment_methods_accepted: z.array(z.enum(['in_person', 'by_mail', 'eft'])).min(1),
  payee_bank_name:          z.string().optional(),
  payee_bank_address:       z.string().optional(),
  payee_account_number:     z.string().optional(),          // SENSITIVE — see lane Q denylist; persona must not echo digits back
  preferred_service_method: z.enum(['personal', 'substituted', 'posting_mailing']),
  language_preference:      z.enum(['en', 'es']),
  courtesy_reminder_first:  z.boolean(),
}).partial();

/** §E extracted_fields[] item: one tagged field captured this turn. */
export const extractedFieldSchema = z.object({
  field: INTAKE_FIELD,
  value: z.unknown(),                                  // validated against intakeFieldValueSchema on merge
  confidence: z.number().min(0).max(1).optional(),
});
export type ExtractedField = z.infer<typeof extractedFieldSchema>;

/** §E refusal enum — 5 values for v1 (broker Call 1, ratified 2026-06-29). Do not pre-widen on speculation. */
export const REFUSAL = z.enum([
  'legal_advice', 'ud_filing', 'settlement', 'non_la_city', 'security_concern',
]);
export type Refusal = z.infer<typeof REFUSAL>;

/** §E full model response (response_format json_schema). Zod-validated before any persistence. */
export const modelResponseSchema = z.object({
  reply: z.string().min(1),
  extracted_fields: z.array(extractedFieldSchema),
  intake_complete: z.boolean(),
  refusal: REFUSAL.nullable().optional().default(null),
});
export type ModelResponse = z.infer<typeof modelResponseSchema>;

/** Stored intake_state: field -> { value, confidence, updated_at }. */
export const intakeStateEntrySchema = z.object({
  value: z.unknown(),
  confidence: z.number().min(0).max(1).default(0),
  updated_at: z.string(),                              // ISO timestamp
});
export const intakeStateSchema = z.record(INTAKE_FIELD, intakeStateEntrySchema);
// Intake fills in over the course of a conversation — the state is always a PARTIAL map of field→entry.
// (Partial<> here; the completion gate in missingRequiredFields enforces which fields must be present.)
export type IntakeState = Partial<z.infer<typeof intakeStateSchema>>;

/** Fields required before intake_complete may be honored (server-side completion gate, §E.4). */
export const REQUIRED_FIELDS: IntakeField[] = [
  'property_address', 'tenant_names', 'landlord_or_owner_name',
  'landlord_mailing_address', 'rent_period', 'rent_amount_due',
  'payment_methods_accepted', 'preferred_service_method', 'language_preference',
];
// payee_bank_name / payee_account_number are conditionally required only when 'eft' is an accepted method
// (enforced in lib/chat/intakeMerge.ts -> missingRequiredFields).
