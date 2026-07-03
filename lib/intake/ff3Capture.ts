// lib/intake/ff3Capture.ts
// Lane FF-3 capture slice — deterministic matchers that promote raw chat-captured values (free-text/number) into
// the locked FF-3 enums + validated Ff3Intake, mirroring the scriptedCapture parsers (parseAmount etc.). The
// scripted orchestrator calls buildFf3FromRaw at the confirmation step; on success it persists the typed columns
// and shows ff3ConfirmationCard. Pure — the orchestrator prompt flow + persistence are the wiring.

import {
  JUST_CAUSE_VALUES, NOTICE_TYPE_VALUES, ff3IntakeSchema, type JustCause, type NoticeType, type Ff3Intake,
} from './ff3Fields';

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Map free-text/owner phrasing → just_cause enum (null if no confident match). Exact enum values pass through. */
export function matchJustCause(input: string | null | undefined): JustCause | null {
  if (!input) return null;
  const raw = input.trim();
  if ((JUST_CAUSE_VALUES as readonly string[]).includes(raw)) return raw as JustCause;
  const s = norm(raw);
  if (/non ?payment|failure to pay|didn t pay|owes? rent|unpaid rent|back rent/.test(s)) return 'nonpayment';
  if (/breach|lease violation|violat.*lease|covenant/.test(s)) return 'breach_of_lease';
  if (/nuisance/.test(s)) return 'nuisance';
  if (/illegal|unlawful use|criminal/.test(s)) return 'illegal_use';
  if (/refus.*entry|denied entry|won t let/.test(s)) return 'refusal_of_entry';
  if (/subtenant|sublet|unauthorized occupant/.test(s)) return 'unapproved_subtenant';
  if (/owner move|move in|relative move/.test(s)) return 'owner_move_in';
  if (/ellis|withdraw.*market|going off the market/.test(s)) return 'withdrawal_ellis';
  if (/demolish|demolition|tear down/.test(s)) return 'demolition';
  if (/capital improvement|major repair|renovat/.test(s)) return 'capital_improvement';
  if (/government order|gov.*order|agency order/.test(s)) return 'government_order';
  if (/end of term|sro|covered/.test(s)) return 'end_of_term_sro_or_covered';
  return null;
}

/** Map free-text/owner phrasing → notice_type enum (null if no confident match). Exact enum values pass through. */
export function matchNoticeType(input: string | null | undefined): NoticeType | null {
  if (!input) return null;
  const raw = input.trim();
  if ((NOTICE_TYPE_VALUES as readonly string[]).includes(raw)) return raw as NoticeType;
  const s = norm(raw);
  if (/90|ninety/.test(s)) return 'ninety_day_termination_section8';
  if (/60|sixty/.test(s)) return 'sixty_day_termination';
  if (/30|thirty/.test(s)) return 'thirty_day_termination';
  if (/3|three/.test(s)) {
    if (/pay|rent/.test(s)) return 'three_day_pay_or_quit';
    if (/cure|perform|covenant/.test(s)) return 'three_day_cure_or_quit';
    if (/uncondition|just quit|quit only/.test(s)) return 'three_day_unconditional_quit';
    return 'three_day_pay_or_quit'; // most common 3-day default when unspecified
  }
  return null;
}

/** Parse a bedroom count (0–6) from a number or free text ("2 bedroom", "studio" = 0). null if unparseable. */
export function parseBedrooms(input: string | number | null | undefined): number | null {
  if (input == null) return null;
  if (typeof input === 'number') return Number.isInteger(input) && input >= 0 && input <= 6 ? input : null;
  const s = input.toLowerCase();
  if (/studio|bachelor/.test(s)) return 0;
  const m = s.match(/\b([0-6])\b/);
  return m ? Number(m[1]) : null;
}

export interface Ff3RawInput {
  bedrooms?: string | number | null;
  contract_monthly_rent?: number | null;
  amount_of_rent_owed?: number | null;
  just_cause?: string | null;
  notice_type?: string | null;
}
export type Ff3BuildResult =
  | { ok: true; value: Ff3Intake }
  | { ok: false; missing: string[]; error?: string };

/** Promote raw captured values into a validated Ff3Intake, or report what's missing/invalid. */
export function buildFf3FromRaw(raw: Ff3RawInput): Ff3BuildResult {
  const candidate = {
    bedrooms: parseBedrooms(raw.bedrooms),
    contract_monthly_rent: raw.contract_monthly_rent ?? null,
    amount_of_rent_owed: raw.amount_of_rent_owed ?? null,
    just_cause: matchJustCause(raw.just_cause),
    notice_type: matchNoticeType(raw.notice_type),
  };
  const missing: string[] = [];
  if (candidate.bedrooms == null) missing.push('bedrooms');
  if (candidate.contract_monthly_rent == null) missing.push('contract_monthly_rent');
  if (candidate.just_cause == null) missing.push('just_cause');
  if (candidate.notice_type == null) missing.push('notice_type');
  if (missing.length) return { ok: false, missing };

  const parsed = ff3IntakeSchema.safeParse(candidate);
  if (!parsed.success) {
    const paths = parsed.error.issues.map((i) => String(i.path[0]));
    return { ok: false, missing: paths, error: parsed.error.issues[0]?.message };
  }
  return { ok: true, value: parsed.data };
}
