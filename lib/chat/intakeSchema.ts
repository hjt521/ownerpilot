// lib/chat/intakeSchema.ts
// AI-first /chat rebuild — Zod intake schema. Mirrors master prompt §E exactly.
// 14 intake fields, per-turn extracted_fields[], full model-response validator, merged intake_state shape.

import { z } from 'zod';

/** The captured intake fields (master prompt §E enum + Lane 2E produce-completeness additions). */
export const INTAKE_FIELD = z.enum([
  'property_address', 'tenant_names', 'landlord_or_owner_name',
  'landlord_phone', 'landlord_mailing_address', 'rent_period',
  'rent_amount_due', 'payment_methods_accepted', 'payee_bank_name',
  'payee_bank_address', 'payee_account_number', 'preferred_service_method',
  'language_preference', 'courtesy_reminder_first',
  // Lane 2E (produce-completeness, pr_a3_intake_produce_completeness_broker_ruling_2026-07-01.md §4):
  // four additive categories the wizard's renderNotice + produce gate require. Stored in intake_state
  // jsonb; no new columns; no Phase 2d file touches.
  'rent_periods', 'signer_capacity', 'personal_delivery', 'preflight_dispute',
]);
export type IntakeField = z.infer<typeof INTAKE_FIELD>;

// --- Lane 2E produce-completeness sub-schemas (target shapes = lib/flow/noticeFlowState.ts, wizard-parity) ---

/** Dated rent period — matches NoticeFlowState.RentPeriod byte-for-byte (renderNotice L519–528). */
export const rentPeriodSchema = z.object({
  periodStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEndDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount:          z.number().positive(),
});

/** Signer capacity — reuses SignerCapacity (corporate-landlord rulings 2026-06-04/05); entity branches. */
export const SIGNER_CAPACITY = z.enum(['owner', 'officer_member_trustee', 'broker_or_manager', 'authorized_agent']);
export const ENTITY_TYPE = z.enum(['llc', 'corporation', 'lp', 'gp', 'trust', 'other']);
export const signerCaptureSchema = z.object({
  capacity: SIGNER_CAPACITY,
  landlordIdentity: z.discriminatedUnion('type', [
    z.object({ type: z.literal('individual'), names: z.array(z.string().min(1)).min(1) }),
    z.object({
      type: z.literal('entity'),
      entityLegalName: z.string().min(1),
      entityType: ENTITY_TYPE,
      managementType: z.enum(['member-managed', 'manager-managed', 'not-sure']).optional(),
    }),
  ]),
  signerName:  z.string().min(1),
  signerTitle: z.string().optional(), // required at render only for entity signatures
});

/** Personal-delivery days/hours — required only when preferred_service_method === 'personal'. */
export const personalDeliverySchema = z.object({
  days:  z.string().min(1),
  hours: z.string().min(1),
});

/** Preflight dispute answers — tri-state per wizard (DisputeAnswer). 'unknown' is FIRST-CLASS and must
 *  never collapse to 'no' (feeds both G4 and the wizard produce gate). Refines ruling §4.4 "booleans"
 *  to the tri-state the wizard's gate requires (wizard-parity, ruling §4.6). */
export const DISPUTE_ANSWER = z.enum(['yes', 'no', 'unknown']);
export const preflightDisputeSchema = z.object({
  tenantFiledComplaint:     DISPUTE_ANSWER,
  tenantWrittenWithholding: DISPUTE_ANSWER,
  tenantBankruptcy:         DISPUTE_ANSWER,
});

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
  // Lane 2E produce-completeness additions:
  rent_periods:      z.array(rentPeriodSchema).min(1),
  signer_capacity:   signerCaptureSchema,
  personal_delivery: personalDeliverySchema,
  preflight_dispute: preflightDisputeSchema,
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
  // Lane 2E: required for produce-completeness (renderNotice + produce gate).
  'rent_periods', 'signer_capacity', 'preflight_dispute',
];
// payee_bank_name / payee_account_number are conditionally required only when 'eft' is an accepted method.
// personal_delivery is conditionally required only when preferred_service_method === 'personal'.
// (Both enforced in lib/chat/intakeMerge.ts -> missingRequiredFields.)
