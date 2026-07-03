// lib/chat/scriptedCapture.ts
// Lane 2E — deterministic scripted capture sub-flow (Fork A).
// Source: lane2e_persona_render_mechanism_broker_ruling_2026-07-01.md (§§2-3) + the ratified prose in
// lane2e_persona_prose_broker_ruling_2026-07-01.md (§§2-5).
//
// The server (NOT the LLM) emits the four ratified capture blocks verbatim and parses the owner's replies
// deterministically. No model-mediated fallback: if a parser cannot classify, the server emits the verbatim
// re-ask; after two failed attempts on the same field it escalates to save-and-resume. The cursor lives in
// the emitted assistant turn's transcript metadata (no new column; intake_state stays clean).
//
// Every owner-facing string returned here is one of the exported verbatim constants from persona.ts, with
// {{owner_slot}} interpolation only (never runtime paraphrase). See scriptedCapture.test.ts for the wire-level
// proof that emitted bytes equal the manifest-hashed constants.

import type { IntakeState, IntakeField } from './intakeSchema';
import {
  chatIntakeRentPeriodsPrompt,
  chatIntakeRentPeriodsEndDateAsk,
  chatIntakeRentPeriodsAmountAsk,
  chatIntakeRentPeriodsContinuation,
  chatIntakeRentPeriodsNextPeriodAsk,
  chatIntakeRentPeriodsReAskStartAfterEnd,
  chatIntakeRentPeriodsReAskLabel,
  chatIntakeRentPeriodsReAskAmount,
  chatIntakeRentPeriodsReAskContinuation,
  chatIntakeSignerCapacityPrompt,
  chatIntakeSignerIndividualAck,
  chatIntakeSignerEntityNameAsk,
  chatIntakeSignerEntityTypePrompt,
  chatIntakeSignerEntityTypeReAsk,
  chatIntakeSignerEntityTitleAsk,
  chatIntakeSignerEntityConfirm,
  chatIntakeSignerReAskDontKnowTitle,
  chatIntakeSignerReAskAmbiguous,
  chatIntakePersonalDeliveryPrompt,
  chatIntakePersonalDeliveryHoursAsk,
  chatIntakePersonalDeliveryConfirm,
  chatIntakePersonalDeliveryReAskZeroDays,
  chatIntakePersonalDeliveryReAskHours,
  chatIntakePreflightDisputePrompt,
  chatIntakePreflightDisputeQ1,
  chatIntakePreflightDisputeQ2,
  chatIntakePreflightDisputeQ3,
  chatIntakePreflightDisputeReAsk,
  chatIntakeCaptureEscalation,
} from './persona';
import { ff3CaptureEnabled } from './ff3Flag';
import {
  ff3Begin, stepFf3,
  type Ff3Cursor, type Ff3Scratch, type Ff3Step, type Ff3Turn, type Ff3PersistPayload,
} from './ff3ScriptedCategory';

// ---------------------------------------------------------------------------
// Cursor + result types
// ---------------------------------------------------------------------------

export type CaptureCategory =
  | 'rent_periods'
  | 'signer_capacity'
  | 'personal_delivery'
  | 'preflight_dispute'
  | 'ff3_intake';                       // Lane FF-3 structured intake — flag-gated (ruling §8), dark until countersign

export interface CaptureCursor {
  category: CaptureCategory;
  step: string;
  attempts: number;                    // failed-parse attempts on the CURRENT field (escalate at 2)
  scratch: Record<string, unknown>;    // partial accumulator carried across turns
}

export type ScriptedKind = 'prompt' | 'reask' | 'complete' | 'escalate';

export interface ScriptedTurn {
  reply: string;                       // server-owned verbatim string (+ owner-slot interpolation)
  kind: ScriptedKind;
  nextCursor: CaptureCursor | null;    // null => sub-flow done for this category; hand back to the LLM
  extracted?: { field: IntakeField; value: unknown };
  // Fork-A capture-completeness gap surfaced at runtime (entity signer entityType — see §note in beginCapture).
  gap?: string;
  // Lane FF-3: typed columns to merge into the chat_sessions row (NOT intake_state). Present only for the
  // 'ff3_intake' category; the route spreads it into the session update. Carries ff3_capture_status on every
  // turn (in_progress / complete / awaiting_broker_review) and the five intake columns on completion.
  ff3Persist?: Partial<Ff3PersistPayload>;
}

const MAX_ATTEMPTS = 2;

/** Fill {{slot}} markers with owner-supplied values only. Never used to paraphrase the ratified prose. */
export function fillSlots(template: string, slots: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (whole, key) =>
    Object.prototype.hasOwnProperty.call(slots, key) ? slots[key] : whole,
  );
}

// ---------------------------------------------------------------------------
// Deterministic parsers (pure, exported for unit tests)
// ---------------------------------------------------------------------------

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7,
  august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

function pad2(n: number): string { return String(n).padStart(2, '0'); }
function validYmd(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * Parse a full calendar date (must have day + month + year) to ISO YYYY-MM-DD, or null.
 * Month-only inputs ("May 2026", "monthly", "last month") return null → triggers the §2.4 label re-ask.
 * Accepts: 2026-05-01 | 05/01/2026 | 5/1/26 | "May 1, 2026" | "1 May 2026".
 */
export function parseFullDate(input: string): string | null {
  const s = input.trim().toLowerCase();
  let m: RegExpMatchArray | null;

  // ISO
  m = s.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (m) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return validYmd(y, mo, d) ? `${y}-${pad2(mo)}-${pad2(d)}` : null;
  }
  // MM/DD/YYYY or M/D/YY
  m = s.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
  if (m) {
    let y = Number(m[3]); const mo = Number(m[1]); const d = Number(m[2]);
    if (y < 100) y += 2000;
    return validYmd(y, mo, d) ? `${y}-${pad2(mo)}-${pad2(d)}` : null;
  }
  // Month-name D, YYYY   (e.g. "may 1, 2026" / "may 1 2026")
  m = s.match(/\b([a-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/);
  if (m && MONTHS[m[1]]) {
    const mo = MONTHS[m[1]]; const d = Number(m[2]); const y = Number(m[3]);
    return validYmd(y, mo, d) ? `${y}-${pad2(mo)}-${pad2(d)}` : null;
  }
  // D Month YYYY   (e.g. "1 may 2026")
  m = s.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})\.?,?\s+(\d{4})\b/);
  if (m && MONTHS[m[2]]) {
    const d = Number(m[1]); const mo = MONTHS[m[2]]; const y = Number(m[3]);
    return validYmd(y, mo, d) ? `${y}-${pad2(mo)}-${pad2(d)}` : null;
  }
  return null;
}

/** Parse a strictly positive money amount, or null. Strips $ and thousands separators. */
export function parseAmount(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, '');
  const m = cleaned.match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

const YES = ['yes', 'yeah', 'yep', 'yup', 'correct', 'right', 'they did', 'they have', 'they said so', 'affirmative', 'sure', 'true'];
const NO = ['no', 'nope', 'nah', 'never', "they haven't", 'they have not', "haven't", "hasn't", 'nothing', 'none', 'negative', 'false', "didn't", 'did not'];
const UNKNOWN = ['not sure', 'unsure', "don't know", 'dont know', "do not know", 'no idea', 'maybe', 'might have', 'possibly', "can't remember", 'cant remember', 'not certain', 'unclear', 'i think so but', 'no clue'];

/** Word-boundary containment: a needle matches only as a whole token/phrase, so 'no' never matches
 *  inside 'another' and ' manager' never matches inside 'property manager'. */
function includesAny(hay: string, needles: string[]): boolean {
  return needles.some((n) => {
    const t = n.trim();
    const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`, 'i').test(hay);
  });
}

/** Tri-state dispute parse (ruling §5.3). 'unknown' is FIRST-CLASS; ambiguity → null (verbatim re-ask). */
export function parseTriState(input: string): 'yes' | 'no' | 'unknown' | null {
  const s = ` ${input.trim().toLowerCase()} `;
  const u = includesAny(s, UNKNOWN);
  if (u) return 'unknown';                       // "not sure" etc. checked first (contains "no"/"know")
  const y = includesAny(s, YES);
  const n = includesAny(s, NO);
  if (y && !n) return 'yes';
  if (n && !y) return 'no';
  return null;                                    // ambiguous / fourth-type / both → §5.3 re-ask
}

/** Continuation parse for "another period?" (ruling §2.3). Returns 'more' | 'done' | null (ambiguous). */
export function parseContinuation(input: string): 'more' | 'done' | null {
  const s = ` ${input.trim().toLowerCase()} `;
  const more = ['another', 'add', 'one more', "there's another", 'there is another', 'yes', 'yeah', 'more', 'next'];
  const done = ["that's it", 'thats it', 'done', 'nothing else', 'no more', 'everything', "that's everything", 'thats everything', 'no', 'nope', 'finished', 'complete'];
  const isMore = includesAny(s, more);
  const isDone = includesAny(s, done);
  if (isMore && !isDone) return 'more';
  if (isDone && !isMore) return 'done';
  return null;
}

/** Individual vs entity classification (ruling §3.1/§3.4). 'ambiguous' → §3.4 disambiguation re-ask. */
export function parseIndividualOrEntity(input: string): 'individual' | 'entity' | 'ambiguous' {
  const s = ` ${input.trim().toLowerCase()} `;
  const ind = ['individual', 'myself', ' me ', ' my own', 'personally', 'in my name', 'just me', ' i own', 'personal', 'sole owner', 'my self'];
  const ent = ['company', ' llc', 'l.l.c', 'corporation', ' corp', ' inc', 'trust', 'partnership', ' lp ', ' gp ', 'entity', 'business', 'on behalf', 'the company'];
  const isInd = includesAny(s, ind);
  const isEnt = includesAny(s, ent);
  if (isInd && isEnt) return 'ambiguous';         // "I own it but it's under an LLC"
  if (isEnt) return 'entity';
  if (isInd) return 'individual';
  return 'ambiguous';
}

export type SignerCapacityValue = 'owner' | 'officer_member_trustee' | 'broker_or_manager' | 'authorized_agent';

/** Title/role → wizard 4-value SignerCapacity. Returns 'dont_know' or null (unrecognized → re-ask title). */
export function parseTitleToCapacity(input: string): SignerCapacityValue | 'dont_know' | null {
  const s = ` ${input.trim().toLowerCase()} `;
  if (includesAny(s, ["don't know", 'dont know', 'not sure', 'no idea', 'unsure', "i don't have a title", 'no title'])) return 'dont_know';
  // Broker / property-manager phrases checked BEFORE the generic 'manager' (which is an entity role).
  if (includesAny(s, ['property manager', 'property management', 'broker', 'management company', 'managing agent'])) return 'broker_or_manager';
  if (includesAny(s, ['authorized agent', 'agent', 'power of attorney', 'attorney-in-fact', 'attorney in fact'])) return 'authorized_agent';
  if (includesAny(s, ['managing member', 'manager', 'member', 'officer', 'president', 'ceo', 'cfo', 'coo', 'secretary', 'treasurer', 'vice president', 'trustee', 'partner', 'director'])) return 'officer_member_trustee';
  return null;
}

export type EntityTypeValue = 'llc' | 'corporation' | 'lp' | 'gp' | 'trust' | 'other';

/**
 * Entity-type classification (omnibus ruling §4.3). Ordering matters: 'llc' before 'corporation'; 'lp'
 * (limited partnership) before 'gp' (general partnership) since both contain "partnership"; partnership
 * branches before 'trust'. Owner is the only source — never inferred from the entity name (§3.4/§4).
 */
export function parseEntityType(input: string): EntityTypeValue | null {
  const s = ` ${input.trim().toLowerCase()} `;
  if (includesAny(s, ['llc', 'l.l.c', 'l.l.c.', 'limited liability company'])) return 'llc';
  if (includesAny(s, ['corporation', 'incorporated', 'corp', 'inc'])) return 'corporation';
  if (includesAny(s, ['limited partnership', 'lp', 'l.p', 'l.p.'])) return 'lp';
  if (includesAny(s, ['general partnership', 'gp', 'g.p', 'g.p.'])) return 'gp';
  if (includesAny(s, ['trust'])) return 'trust';
  if (includesAny(s, ['other', 'something else', 'different', 'none of'])) return 'other';
  return null;
}

export function parseConfirm(input: string): 'yes' | 'no' | null {
  const s = ` ${input.trim().toLowerCase()} `;
  if (includesAny(s, ['yes', 'right', 'correct', "that's right", 'thats right', 'yep', 'yeah', 'confirmed', 'exactly', 'true'])) return 'yes';
  if (includesAny(s, ['no', 'wrong', 'not right', 'incorrect', 'actually', 'change', 'nope', 'that is not', "that's not"])) return 'no';
  return null;
}

/** Days-of-week availability parse (ruling §4.4). Returns raw days text, or null for zero-day availability. */
export function parseDays(input: string): string | null {
  const s = input.trim();
  const low = ` ${s.toLowerCase()} `;
  const zero = ['no days', 'none', 'never', 'not available', 'no availability', "i'm not available", 'not around', 'no time', 'anytime? no'];
  if (!s || includesAny(low, zero)) return null;
  return s;                                        // preserve owner's original wording for echo
}

const MIN = (h: number, m: number, ampm?: string): number => {
  let hh = h % 12;
  if (ampm === 'pm') hh += 12;
  if (ampm === 'am') hh = h % 12;
  if (!ampm) hh = h;                               // 24h as-typed
  return hh * 60 + m;
};

interface ParsedHours { start: string; end: string; startMin: number; endMin: number; raw: string; }

/** Parse a start/end time range, preserving the owner's original format (ruling §4.4 — no AM/PM<->24h). */
export function parseHours(input: string): ParsedHours | null {
  const raw = input.trim();
  const re = /(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/gi;
  const toks: { text: string; min: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    if (m[0].trim() === '') continue;
    const h = Number(m[1]);
    const mm = m[2] ? Number(m[2]) : 0;
    const ap = m[3] ? m[3].replace(/\./g, '').toLowerCase() : undefined;
    if (h > 23 || mm > 59) continue;
    toks.push({ text: m[0].trim(), min: MIN(h, mm, ap) });
    if (toks.length === 2) break;
  }
  if (toks.length < 2) return null;
  const [a, b] = toks;
  if (b.min <= a.min) return null;                 // end must be strictly after start
  return { start: a.text, end: b.text, startMin: a.min, endMin: b.min, raw };
}

// ---------------------------------------------------------------------------
// Category ordering + readiness
// ---------------------------------------------------------------------------

/** The four base scripted categories, in capture priority order. FF-3 is NOT here — see scriptedCategories(). */
export const SCRIPTED_CATEGORIES: CaptureCategory[] = [
  'signer_capacity', 'rent_periods', 'personal_delivery', 'preflight_dispute',
];

/**
 * The active scripted categories for this environment: the base four, plus 'ff3_intake' appended ONLY when the
 * FF-3 flag is on (ruling §8). With the flag off — the default everywhere including prod — this returns exactly
 * SCRIPTED_CATEGORIES, so the FF-3 wiring is inert. FF-3 runs LAST (after the base block) by design.
 */
export function scriptedCategories(): CaptureCategory[] {
  return ff3CaptureEnabled() ? [...SCRIPTED_CATEGORIES, 'ff3_intake'] : [...SCRIPTED_CATEGORIES];
}

function fieldPresent(state: IntakeState, f: IntakeField): boolean {
  const v = state[f]?.value;
  return !(v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0));
}

/**
 * The next scripted category whose prerequisites are met and whose value is still missing, or null.
 * Prereqs: signer needs landlord_or_owner_name; personal_delivery only when preferred_service_method==='personal'.
 * FF-3 completeness lives in the typed column chat_sessions.ff3_capture_status (passed as ff3Status), not
 * intake_state: 'complete' = captured; 'awaiting_broker_review' = parked (never re-asked); else it's next.
 */
export function nextScriptedCategory(state: IntakeState, ff3Status?: string | null): CaptureCategory | null {
  for (const cat of scriptedCategories()) {
    if (cat === 'ff3_intake') {
      if (ff3Status === 'complete' || ff3Status === 'awaiting_broker_review') continue;
      return cat;
    }
    if (fieldPresent(state, cat as IntakeField)) continue;
    if (cat === 'signer_capacity' && !fieldPresent(state, 'landlord_or_owner_name')) continue;
    if (cat === 'personal_delivery' && state['preferred_service_method']?.value !== 'personal') continue;
    return cat;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Sub-flow entry + step
// ---------------------------------------------------------------------------

/** Begin a scripted category: emit its verbatim first-ask and seed the cursor. LLM is not called. */
export function beginCapture(category: CaptureCategory): ScriptedTurn {
  switch (category) {
    case 'rent_periods':
      return { reply: chatIntakeRentPeriodsPrompt, kind: 'prompt',
        nextCursor: { category, step: 'awaiting_start', attempts: 0, scratch: { completed: [] } } };
    case 'signer_capacity':
      return { reply: chatIntakeSignerCapacityPrompt, kind: 'prompt',
        nextCursor: { category, step: 'awaiting_capacity', attempts: 0, scratch: {} } };
    case 'personal_delivery':
      return { reply: chatIntakePersonalDeliveryPrompt, kind: 'prompt',
        nextCursor: { category, step: 'awaiting_days', attempts: 0, scratch: {} } };
    case 'preflight_dispute':
      // §5.1 framing + §5.2 Q1 in one turn (framing is not itself a question, so §5.5's "don't combine two
      // questions" is not implicated). Q2 and Q3 follow as their own turns. Emitted bytes = the two
      // manifest-hashed constants joined with "\n\n" (ruling §6 concatenation convention).
      return { reply: `${chatIntakePreflightDisputePrompt}\n\n${chatIntakePreflightDisputeQ1}`, kind: 'prompt',
        nextCursor: { category, step: 'awaiting_q1', attempts: 0, scratch: {} } };
    case 'ff3_intake':
      // Lane FF-3 (flag-gated): delegate to the FF-3 state machine (ff3ScriptedCategory). The FF-3 cursor
      // (step/attempts/scratch) maps 1:1 onto CaptureCursor; the typed columns ride out on ff3Persist.
      return ff3ToScripted(ff3Begin());
  }
}

/** Adapt an FF-3 state-machine turn to the ScriptedTurn contract (cursor stored under category 'ff3_intake'). */
function ff3ToScripted(t: Ff3Turn): ScriptedTurn {
  const nextCursor: CaptureCursor | null = t.nextCursor
    ? {
        category: 'ff3_intake',
        step: t.nextCursor.step,
        attempts: t.nextCursor.attempts,
        scratch: t.nextCursor.scratch as Record<string, unknown>,
      }
    : null;
  // On complete: the full five-column payload (status 'complete'). On prompt/reask/escalate: just the status flip.
  const ff3Persist: Partial<Ff3PersistPayload> = t.persist ?? { ff3_capture_status: t.captureStatus };
  return { reply: t.reply, kind: t.kind, nextCursor, ff3Persist };
}

/** Reconstruct an FF-3 cursor from the stored CaptureCursor and step the FF-3 machine. */
function stepFf3Category(cursor: CaptureCursor, ownerMessage: string): ScriptedTurn {
  const ff3Cursor: Ff3Cursor = {
    step: cursor.step as Ff3Step,
    attempts: cursor.attempts,
    scratch: cursor.scratch as Ff3Scratch,
  };
  return ff3ToScripted(stepFf3(ff3Cursor, ownerMessage));
}

function reask(cursor: CaptureCursor, reply: string, step = cursor.step): ScriptedTurn {
  const attempts = cursor.attempts + 1;
  if (attempts >= MAX_ATTEMPTS) {
    // Two failed attempts on the same field → save-and-resume escalation (ruling §3; ratified omnibus §3.2).
    return { reply: chatIntakeCaptureEscalation, kind: 'escalate', nextCursor: null };
  }
  return { reply, kind: 'reask', nextCursor: { ...cursor, step, attempts } };
}

function advance(cursor: CaptureCursor, step: string, scratch: Record<string, unknown>, reply: string): ScriptedTurn {
  return { reply, kind: 'prompt', nextCursor: { ...cursor, step, attempts: 0, scratch } };
}

/** Process one owner message against the active cursor. Fully deterministic — never calls the LLM. */
export function stepCapture(cursor: CaptureCursor, ownerMessage: string, state: IntakeState): ScriptedTurn {
  switch (cursor.category) {
    case 'rent_periods': return stepRentPeriods(cursor, ownerMessage);
    case 'signer_capacity': return stepSigner(cursor, ownerMessage, state);
    case 'personal_delivery': return stepPersonalDelivery(cursor, ownerMessage);
    case 'preflight_dispute': return stepDispute(cursor, ownerMessage);
    case 'ff3_intake': return stepFf3Category(cursor, ownerMessage);
  }
}

// --- §2 rent periods ---
function stepRentPeriods(cursor: CaptureCursor, msg: string): ScriptedTurn {
  const scratch = { ...cursor.scratch };
  const completed = (scratch.completed as { periodStartDate: string; periodEndDate: string; amount: number }[]) ?? [];

  if (cursor.step === 'awaiting_start') {
    const iso = parseFullDate(msg);
    if (!iso) return reask(cursor, chatIntakeRentPeriodsReAskLabel);
    scratch.startDate = iso;
    return advance(cursor, 'awaiting_end', scratch, chatIntakeRentPeriodsEndDateAsk);
  }
  if (cursor.step === 'awaiting_end') {
    const iso = parseFullDate(msg);
    if (!iso) return reask(cursor, chatIntakeRentPeriodsReAskLabel);
    if (iso < (scratch.startDate as string)) return reask(cursor, chatIntakeRentPeriodsReAskStartAfterEnd, 'awaiting_start');
    scratch.endDate = iso;
    const ask = fillSlots(chatIntakeRentPeriodsAmountAsk, {
      period_start_date: scratch.startDate as string, period_end_date: iso,
    });
    return advance(cursor, 'awaiting_amount', scratch, ask);
  }
  if (cursor.step === 'awaiting_amount') {
    const amt = parseAmount(msg);
    if (amt === null) {
      const ask = fillSlots(chatIntakeRentPeriodsReAskAmount, {
        period_start_date: scratch.startDate as string, period_end_date: scratch.endDate as string,
      });
      return reask(cursor, ask);
    }
    completed.push({ periodStartDate: scratch.startDate as string, periodEndDate: scratch.endDate as string, amount: amt });
    const next = { completed, startDate: undefined, endDate: undefined };
    return advance(cursor, 'awaiting_continuation', next, chatIntakeRentPeriodsContinuation);
  }
  // awaiting_continuation
  const cont = parseContinuation(msg);
  if (cont === null) return reask(cursor, chatIntakeRentPeriodsReAskContinuation);
  if (cont === 'more') {
    return advance(cursor, 'awaiting_start', { completed }, chatIntakeRentPeriodsNextPeriodAsk);
  }
  // done → emit the captured array, hand back
  return { reply: '', kind: 'complete', nextCursor: null, extracted: { field: 'rent_periods', value: completed } };
}

// --- §3 signer capacity ---
function stepSigner(cursor: CaptureCursor, msg: string, state: IntakeState): ScriptedTurn {
  const scratch = { ...cursor.scratch };
  const ownerName = String(state['landlord_or_owner_name']?.value ?? '').trim();

  if (cursor.step === 'awaiting_capacity') {
    const kind = parseIndividualOrEntity(msg);
    if (kind === 'ambiguous') return reask(cursor, chatIntakeSignerReAskAmbiguous);
    if (kind === 'individual') {
      const value = {
        capacity: 'owner' as SignerCapacityValue,
        landlordIdentity: { type: 'individual', names: ownerName ? [ownerName] : [] },
        signerName: ownerName,
      };
      return { reply: chatIntakeSignerIndividualAck, kind: 'complete', nextCursor: null,
        extracted: { field: 'signer_capacity', value } };
    }
    // entity
    return advance(cursor, 'awaiting_entity_name', {}, chatIntakeSignerEntityNameAsk);
  }
  if (cursor.step === 'awaiting_entity_name') {
    const name = msg.trim();
    if (!name) return reask(cursor, chatIntakeSignerEntityNameAsk);
    scratch.entityName = name;
    // Omnibus §4: ask entityType directly (after name, before title) — never inferred from the name.
    return advance(cursor, 'awaiting_entity_type', scratch, fillSlots(chatIntakeSignerEntityTypePrompt, { entityName: name }));
  }
  if (cursor.step === 'awaiting_entity_type') {
    const et = parseEntityType(msg);
    if (et === null) return reask(cursor, fillSlots(chatIntakeSignerEntityTypeReAsk, { entityName: String(scratch.entityName) }));
    scratch.entityType = et;
    return advance(cursor, 'awaiting_entity_title', scratch, fillSlots(chatIntakeSignerEntityTitleAsk, { entity_name: String(scratch.entityName) }));
  }
  if (cursor.step === 'awaiting_entity_title') {
    const cap = parseTitleToCapacity(msg);
    if (cap === 'dont_know') {
      // §3.4a pause → save-and-resume (verbatim). Route out of the sub-flow without a partial write.
      return { reply: fillSlots(chatIntakeSignerReAskDontKnowTitle, { entity_type_owner_used: 'entity' }),
        kind: 'escalate', nextCursor: null };
    }
    if (cap === null) return reask(cursor, fillSlots(chatIntakeSignerEntityTitleAsk, { entity_name: String(scratch.entityName) }));
    scratch.capacity = cap;
    scratch.title = msg.trim();
    const confirm = fillSlots(chatIntakeSignerEntityConfirm, { entity_name: String(scratch.entityName), title: msg.trim() });
    return advance(cursor, 'awaiting_entity_confirm', scratch, confirm);
  }
  // awaiting_entity_confirm
  const c = parseConfirm(msg);
  if (c === null) {
    const confirm = fillSlots(chatIntakeSignerEntityConfirm, { entity_name: String(scratch.entityName), title: String(scratch.title) });
    return reask(cursor, confirm);
  }
  if (c === 'no') return advance(cursor, 'awaiting_entity_title', { entityName: scratch.entityName, entityType: scratch.entityType }, fillSlots(chatIntakeSignerEntityTitleAsk, { entity_name: String(scratch.entityName) }));
  // confirmed — entityType is captured (omnibus §4), so the entity value is now schema-valid.
  const value = {
    capacity: scratch.capacity as SignerCapacityValue,
    landlordIdentity: { type: 'entity', entityLegalName: String(scratch.entityName), entityType: scratch.entityType as EntityTypeValue },
    signerName: ownerName,
    signerTitle: String(scratch.title),
  };
  return { reply: chatIntakeSignerIndividualAck, kind: 'complete', nextCursor: null,
    extracted: { field: 'signer_capacity', value } };
}

// --- §4 personal delivery ---
function stepPersonalDelivery(cursor: CaptureCursor, msg: string): ScriptedTurn {
  const scratch = { ...cursor.scratch };
  if (cursor.step === 'awaiting_days') {
    const days = parseDays(msg);
    if (days === null) return reask(cursor, chatIntakePersonalDeliveryReAskZeroDays);
    scratch.days = days;
    return advance(cursor, 'awaiting_hours', scratch, chatIntakePersonalDeliveryHoursAsk);
  }
  if (cursor.step === 'awaiting_hours') {
    const hours = parseHours(msg);
    if (hours === null) return reask(cursor, chatIntakePersonalDeliveryReAskHours);
    scratch.hours = hours.raw;
    scratch.hoursStart = hours.start;
    scratch.hoursEnd = hours.end;
    const confirm = fillSlots(chatIntakePersonalDeliveryConfirm, {
      days_summary: String(scratch.days), hours_start: hours.start, hours_end: hours.end,
    });
    return advance(cursor, 'awaiting_confirm', scratch, confirm);
  }
  // awaiting_confirm
  const c = parseConfirm(msg);
  if (c === null) {
    const confirm = fillSlots(chatIntakePersonalDeliveryConfirm, {
      days_summary: String(scratch.days), hours_start: String(scratch.hoursStart), hours_end: String(scratch.hoursEnd),
    });
    return reask(cursor, confirm);
  }
  if (c === 'no') return advance(cursor, 'awaiting_days', {}, chatIntakePersonalDeliveryPrompt);
  const value = { days: String(scratch.days), hours: String(scratch.hours) };
  return { reply: '', kind: 'complete', nextCursor: null, extracted: { field: 'personal_delivery', value } };
}

// --- §5 preflight dispute ---
const DISPUTE_STEPS: Record<string, { q: string; key: string; next: string | null }> = {
  awaiting_q1: { q: chatIntakePreflightDisputeQ1, key: 'tenantFiledComplaint', next: 'awaiting_q2' },
  awaiting_q2: { q: chatIntakePreflightDisputeQ2, key: 'tenantWrittenWithholding', next: 'awaiting_q3' },
  awaiting_q3: { q: chatIntakePreflightDisputeQ3, key: 'tenantBankruptcy', next: null },
};

function stepDispute(cursor: CaptureCursor, msg: string): ScriptedTurn {
  const spec = DISPUTE_STEPS[cursor.step];
  const answer = parseTriState(msg);
  if (answer === null) return reask(cursor, chatIntakePreflightDisputeReAsk);
  const scratch = { ...cursor.scratch, [spec.key]: answer };
  if (spec.next) {
    return advance(cursor, spec.next, scratch, DISPUTE_STEPS[spec.next].q);
  }
  const value = {
    tenantFiledComplaint: scratch.tenantFiledComplaint,
    tenantWrittenWithholding: scratch.tenantWrittenWithholding,
    tenantBankruptcy: scratch.tenantBankruptcy,
  };
  return { reply: '', kind: 'complete', nextCursor: null, extracted: { field: 'preflight_dispute', value } };
}
