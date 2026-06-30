// lib/riskpath/disclaimers.ts
// AI-first /chat rebuild — Resolve & Document locked disclaimers (Tier-B locked-prose).
// Authoritative source: resolve_and_document_layer_broker_ruling_2026-06-28.md §7 (5 LOCKED) + §6.6 UD footer.
// ENGLISH-ONLY V1 (open_items_consolidated_broker_ruling §1): prior PROVISIONAL ES strings removed; v1 ships
// English only. The single shipped ES string is ES_REFUSAL_UNSUPPORTED_LANG_V1 (lib/chat/refusalBank.ts).

export type RDDisclaimerKey =
  | 'general' | 'payment_plan' | 'move_out_agreement' | 'surrender_record' | 'ud_case';

export const RD_DISCLAIMERS: Record<RDDisclaimerKey, string> = {
  general:
    'OwnerPilot helps document the terms you enter for your records. OwnerPilot is not a law ' +
    'firm and does not provide legal advice. If this agreement affects possession, payment ' +
    'rights, or a court case, consult a California licensed attorney.',
  payment_plan:
    'Partial payment and payment-plan agreements can affect next steps after a notice. If you ' +
    'want to preserve any eviction option or are unsure how payment affects your notice, ' +
    'consult independent counsel.',
  move_out_agreement:
    'This agreement draft is for landlord and tenant review and signature. OwnerPilot does not ' +
    'determine whether any agreement is legally valid or sufficient for your specific situation.',
  surrender_record:
    'This record is for owner documentation and organization. It does not determine whether ' +
    'legal possession has been validly restored.',
  ud_case:
    'Because a court case has already been filed, this may involve court stipulation or ' +
    'settlement terms. OwnerPilot can help organize the facts, but you should consult ' +
    'independent counsel before signing or filing any agreement.',
};

/** UD Settlement Intake footer (ruling §6.6) — locked-prose Tier B. */
export const UD_INTAKE_FOOTER =
  'Fact organizer only. Not a settlement agreement. Consult independent counsel before signing ' +
  'or filing any document related to this case.';

/** Counsel-route message shown when any §4 trigger fires (ruling §9) — locked verbatim. */
export const COUNSEL_ROUTE_MESSAGE = {
  body:
    'This may involve legal defenses, court-related terms, or strategic choices that go beyond ' +
    'document preparation. OwnerPilot is pausing self-service for this path and routing you to ' +
    'consult independent counsel.',
  cta: 'Find a California landlord-tenant attorney',
  href: '/route-to-counsel',
};
