// lib/riskpath/triggers.ts
// AI-first /chat rebuild — Resolve & Document counsel-route triggers. SINGLE SOURCE OF TRUTH.
// UNIFIED TAXONOMY per section_r_trigger_taxonomy_divergence_broker_ruling_2026-06-29.md:
//   POSTURE_TRIGGERS (procedural state — what the production code must detect; R&D-ruling §4)
//   SUBJECT_TRIGGERS (subject matter — what broker-review triage needs; §R amendment)
//   SHARED_TRIGGERS  (promoted from PROPOSED_ADDITIONS per Lane 4 Fork 2)
// Both lists are canonical for different layers; the union is the SSOT. TRIGGER_COUNT is the union count (22),
// NOT 12. All triggers run as PRE-FLIGHT GATES before path selection (ruling §2).

/** Procedural-posture triggers (10) — state/shape of the matter. Detected by the production chat path. */
export const POSTURE_TRIGGERS = [
  'ud_case_filed',
  'affirmative_defense_claimed',
  'rent_amount_disputed',
  'partial_payment_continue_evict',
  'full_payment_post_deadline_continue_evict',
  'prohibited_agreement_terms',
  'excluded_tenancy_category',
  'entity_landlord',
  'party_represented_by_counsel',
  'strategic_advice_requested',
] as const;

/** Subject-matter triggers (10) — what the tenant's situation is. Drives broker-review triage packet selection. */
export const SUBJECT_TRIGGERS = [
  'protected_class_retaliation',
  'disability_accommodation',
  'domestic_violence_or_vawa',
  'hud_section8_voucher_dispute',
  'mobilehome_or_sro',
  'commercial_tenancy',
  'criminal_activity_alleged',
  'habitability_warranty_breach',
  'partial_payment_acceptance_ambiguity',
  'local_just_cause_overlay_conflict',
] as const;

/** Shared triggers (2) — promoted 2026-06-29 (Lane 4 Fork 2). Already pre-flight gates. */
export const SHARED_TRIGGERS = [
  'bankruptcy_automatic_stay',
  'tenant_death_or_successor',
] as const;

/** Unified SSOT. riskpath_records.counsel_route_trigger stores one or more of these (text column; no migration). */
export const COUNSEL_ROUTE_TRIGGERS = [
  ...POSTURE_TRIGGERS,
  ...SUBJECT_TRIGGERS,
  ...SHARED_TRIGGERS,
] as const;

export type CounselRouteTrigger = (typeof COUNSEL_ROUTE_TRIGGERS)[number];

/** Union count = 10 + 10 + 2 = 22 (ruling supersedes the old `=== 12`). */
export const TRIGGER_COUNT = COUNSEL_ROUTE_TRIGGERS.length;

export function isCounselRouteTrigger(x: string): x is CounselRouteTrigger {
  return (COUNSEL_ROUTE_TRIGGERS as readonly string[]).includes(x);
}

/** Ruling §2: ALL counsel-route triggers (posture + subject + shared) run as pre-flight gates before path selection. */
export function isPreFlightGate(x: string): boolean {
  return isCounselRouteTrigger(x);
}

/** Lane 4 §0 Fork 2 — both proposals promoted into SHARED_TRIGGERS; none pending. */
export const PROPOSED_ADDITIONS_PENDING_RULING = [] as const;

/** Lane 4 §0 Fork 4 — reconcile lane-3 provisional IDs to the canonical posture members. */
export const LANE3_TRIGGER_ID_RECONCILIATION: Record<string, CounselRouteTrigger> = {
  ud_filed:                      'ud_case_filed',
  affirmative_defense_asserted:  'affirmative_defense_claimed',
  release_or_settlement_language:'prohibited_agreement_terms',
  active_dispute:                'rent_amount_disputed',
  out_of_scope_regime:          'excluded_tenancy_category',
};
