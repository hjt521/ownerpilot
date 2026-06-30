// lib/chat/refusalBank.ts
// AI-first /chat rebuild — refusal bank + taxonomy mapping.
// Broker-ratified 2026-06-29 (Lane 3 Rulings 2 & 4) + ENGLISH-ONLY V1 per open_items_consolidated_broker_ruling §1.
//
// ENGLISH-ONLY V1: the refusal bank ships English strings ONLY. All prior PROVISIONAL ES translations are removed.
// If a session is ES-preferring (language_preference === 'es'), the system serves the single canonical Spanish
// notice ES_REFUSAL_UNSUPPORTED_LANG_V1 (English-only + route-to-counsel handoff), then proceeds in English.
// ES native review is a backlogged Lane 3 follow-up (no schedule).

import type { Refusal } from './intakeSchema';
import type { CounselRouteTrigger } from '../riskpath/triggers';
import { lockedProse } from '@/lib/compliance/lockedProse';

export type RefusalCategory =
  | 'legal_advice_general'
  | 'contract_dispute'
  | 'eviction_defense_question'
  | 'security_deposit_question'
  | 'ud_filing_court'
  | 'settlement_negotiation'
  | 'non_la_jurisdiction'
  | 'account_number_security'
  | 'out_of_scope_regime'
  | 'amount_or_payment_dispute';

/** 10 -> 5 mapping. last_refusal (DB) is always one of these 5 (do not widen). */
export const REFUSAL_CATEGORY_TO_ENUM: Record<RefusalCategory, Refusal> = {
  legal_advice_general:       'legal_advice',
  contract_dispute:           'legal_advice',
  eviction_defense_question:  'legal_advice',
  security_deposit_question:  'legal_advice',
  ud_filing_court:            'ud_filing',
  settlement_negotiation:     'settlement',
  non_la_jurisdiction:        'non_la_city',
  account_number_security:    'security_concern',
  out_of_scope_regime:        'legal_advice',
  amount_or_payment_dispute:  'legal_advice',
};

/** Categories that correspond to an EXISTING counsel-route trigger (SSOT: lib/riskpath/triggers.ts). */
export const CATEGORY_TO_RR_TRIGGER: Partial<Record<RefusalCategory, CounselRouteTrigger>> = {
  eviction_defense_question: 'affirmative_defense_claimed',
  ud_filing_court:           'ud_case_filed',
  settlement_negotiation:    'prohibited_agreement_terms',
  out_of_scope_regime:       'excluded_tenancy_category',
  amount_or_payment_dispute: 'rent_amount_disputed',
};

// Subject-priority per §R taxonomy-divergence ruling §2: route excluded/complex tenancies to the SPECIFIC
// subject trigger, not the generic `excluded_tenancy_category` posture trigger. Order matters (most specific first).
const OUT_OF_SCOPE_KEYWORD_MAP: Array<{ test: RegExp; trigger: CounselRouteTrigger }> = [
  { test: /bankrupt|automatic stay|chapter\s?(7|11|13)/i, trigger: 'bankruptcy_automatic_stay' },
  { test: /\b(died|death|deceased|passed away|estate|successor|heir|inherit)/i, trigger: 'tenant_death_or_successor' },
  { test: /section\s?8|HUD|HACLA|voucher|subsidiz/i, trigger: 'hud_section8_voucher_dispute' },
  { test: /mobile\s?home|\bSRO\b|single[-\s]?room/i, trigger: 'mobilehome_or_sro' },
  { test: /commercial/i, trigger: 'commercial_tenancy' },
];

export function resolveOutOfScopeTrigger(ownerText: string): CounselRouteTrigger {
  for (const { test, trigger } of OUT_OF_SCOPE_KEYWORD_MAP) {
    if (test.test(ownerText)) return trigger;
  }
  return 'excluded_tenancy_category'; // generic posture fallback when no specific subject keyword matches
}

// ---- English-only refusal strings (V1). One string per fine category. ----
const LEGAL_ADVICE_BASE_EN =
  "I'm not able to give legal advice on that — those decisions are best made with a " +
  "California licensed attorney. The LACBA Lawyer Referral Service is one option, or " +
  "any attorney you already work with. What I CAN help with is preparing the documents " +
  "and tracking the steps under California statutes. Want to continue with that?";

export const REFUSAL_BANK: Record<RefusalCategory, string> = {
  legal_advice_general:      LEGAL_ADVICE_BASE_EN,
  contract_dispute:          LEGAL_ADVICE_BASE_EN,
  security_deposit_question: LEGAL_ADVICE_BASE_EN,
  eviction_defense_question:
    "Questions about how a tenant's defense would play out are legal-strategy questions, " +
    "and those are best worked through with a California licensed attorney — the LACBA " +
    "Lawyer Referral Service is one place to start. What I CAN do is help you prepare and " +
    "organize your records so you're ready either way. Want to keep going on the notice?",
  ud_filing_court:
    "OwnerPilot doesn't file cases, serve court papers, or appear in court. We help prepare " +
    "the documents and organize records. If you reach that stage, you'll want to consult " +
    "independent counsel. In the meantime, I can help you get the notice and your records in " +
    "order — want to do that?",
  settlement_negotiation:
    "Settlement terms — like cash-for-keys, releases, or anything that resolves the dispute " +
    "by agreement — are best handled with a California licensed attorney; the LACBA Lawyer " +
    "Referral Service is one option. OwnerPilot doesn't draft settlement documents. What I CAN " +
    "do is prepare your 3-day notice and keep your records organized. Want to continue?",
  non_la_jurisdiction:
    "We're starting with Los Angeles and expanding to San Francisco, Oakland, San Jose, " +
    "San Diego, Long Beach, Berkeley, Santa Monica, and West Hollywood next. Want me to add " +
    "you to the city expansion list?",
  account_number_security:
    "For your security, I won't share, display, or send a bank account number outside this " +
    "private workflow, and I'll only ever show it back to you in masked form. If someone is " +
    "asking you to send an account number, that's worth pausing on. I can keep going on your " +
    "notice — where were we?",
  out_of_scope_regime:
    "Your situation involves rules that sit outside what OwnerPilot prepares in this flow, so " +
    "the right next step is a California licensed attorney — the LACBA Lawyer Referral Service " +
    "can help you find one. I don't want to hand you a document that doesn't fit your " +
    "situation. Would you like the referral information?",
  amount_or_payment_dispute:
    "It sounds like there's a disagreement about what's owed or what's been paid. When the " +
    "amount itself is in dispute, that's best sorted out with a California licensed attorney " +
    "before serving a notice — the LACBA Lawyer Referral Service is one option. I can hold " +
    "your draft here so nothing's lost while you check. Want me to do that?",
};

/** The ONLY ES-language string the v1 site ships (open_items_consolidated_broker_ruling §1, byte-exact).
 *  Sourced from the shape-B assembly manifest — byte-identical to the prior inline literal (verified
 *  2026-06-29 during the schema-reconciliation PR; no prose drift). */
// LockedKey: ES_REFUSAL_UNSUPPORTED_LANG_V1
export const ES_REFUSAL_UNSUPPORTED_LANG_V1 = lockedProse('ES_REFUSAL_UNSUPPORTED_LANG_V1');

export type ChatLanguage = 'en' | 'es';

/** Resolve a refusal. V1 is English-only: `reply` is always English. For ES-preferring sessions the caller
 *  serves ES_REFUSAL_UNSUPPORTED_LANG_V1 once (with route-to-counsel handoff), then proceeds in English. */
export function resolveRefusal(category: RefusalCategory, _lang: ChatLanguage = 'en'): {
  reply: string;
  refusal: Refusal;
  refusal_category: RefusalCategory;
} {
  return {
    reply: REFUSAL_BANK[category],
    refusal: REFUSAL_CATEGORY_TO_ENUM[category],
    refusal_category: category,
  };
}

/** ES handoff notice for ES-preferring sessions (English-only v1). */
export function unsupportedLanguageNotice(): string {
  return ES_REFUSAL_UNSUPPORTED_LANG_V1;
}
