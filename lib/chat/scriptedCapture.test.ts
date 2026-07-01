// lib/chat/scriptedCapture.test.ts — Lane 2E Fork-A deterministic capture suite.
// Proves: (1) each guardrail parser classifies deterministically incl. 'unknown' NEVER collapsing to 'no';
// (2) server-emitted bytes equal the manifest-hashed verbatim constants; (3) completed values validate against
// the same wizard zod schemas the closure gate uses. Plain tsx suite (process.exit on failure).

import {
  parseFullDate, parseAmount, parseTriState, parseContinuation, parseIndividualOrEntity,
  parseTitleToCapacity, parseEntityType, parseConfirm, parseDays, parseHours,
  beginCapture, stepCapture, fillSlots, type CaptureCursor,
} from './scriptedCapture';
import {
  chatIntakeRentPeriodsPrompt, chatIntakeRentPeriodsEndDateAsk, chatIntakeRentPeriodsReAskStartAfterEnd,
  chatIntakeRentPeriodsReAskLabel, chatIntakeSignerCapacityPrompt, chatIntakeSignerReAskAmbiguous,
  chatIntakeSignerEntityTypeReAsk,
  chatIntakePersonalDeliveryPrompt, chatIntakePersonalDeliveryReAskZeroDays, chatIntakePersonalDeliveryReAskHours,
  chatIntakePreflightDisputePrompt, chatIntakePreflightDisputeQ1, chatIntakePreflightDisputeQ2,
  chatIntakePreflightDisputeQ3, chatIntakePreflightDisputeReAsk, chatIntakeCaptureEscalation,
} from './persona';
import { rentPeriodSchema, signerCaptureSchema, personalDeliverySchema, preflightDisputeSchema } from './intakeSchema';
import type { IntakeState } from './intakeSchema';

let passed = 0, failed = 0;
const check = (n: string, c: boolean, d = '') => { c ? passed++ : (failed++, console.log(`  ✗ ${n}${d ? ` — ${d}` : ''}`)); if (c) console.log(`  ✓ ${n}`); };

const state = (obj: Record<string, unknown>): IntakeState => {
  const out: Record<string, { value: unknown; confidence: number; updated_at: string }> = {};
  for (const [k, v] of Object.entries(obj)) out[k] = { value: v, confidence: 1, updated_at: '2026-06-30T00:00:00Z' };
  return out as IntakeState;
};
const EMPTY = state({});
const OWNER = state({ landlord_or_owner_name: 'Maria Lopez' });

// --- Parsers ---------------------------------------------------------------
check('date: ISO accepted', parseFullDate('2026-05-01') === '2026-05-01');
check('date: slash normalized', parseFullDate('5/1/2026') === '2026-05-01');
check('date: month-name normalized', parseFullDate('May 1, 2026') === '2026-05-01');
check('date: month-only rejected (label-substitution)', parseFullDate('May 2026') === null);
check('date: "monthly" rejected', parseFullDate('monthly') === null);
check('date: invalid day rejected', parseFullDate('2026-02-30') === null);

check('amount: $6,000 -> 6000', parseAmount('$6,000') === 6000);
check('amount: zero rejected', parseAmount('0') === null);
check('amount: negative rejected', parseAmount('-50') === null);
check('amount: non-numeric rejected', parseAmount('a lot') === null);

check("tri-state: 'not sure' -> unknown (NOT no)", parseTriState('not sure') === 'unknown');
check("tri-state: \"I don't know\" -> unknown", parseTriState("I don't know") === 'unknown');
check("tri-state: 'maybe' -> unknown", parseTriState('maybe') === 'unknown');
check("tri-state: 'yes' -> yes", parseTriState('yes') === 'yes');
check("tri-state: 'nope' -> no", parseTriState('nope') === 'no');
check("tri-state: 'sometimes' (fourth type) -> null", parseTriState('sometimes') === null);
check("tri-state: 'yeah they did' -> yes", parseTriState('yeah they did') === 'yes');

check('continuation: "add another" -> more', parseContinuation('add another') === 'more');
check("continuation: \"that's everything\" -> done", parseContinuation("that's everything") === 'done');
check('continuation: ambiguous -> null', parseContinuation('hmm well') === null);

check('signer: "myself" -> individual', parseIndividualOrEntity('just myself') === 'individual');
check('signer: "an LLC" -> entity', parseIndividualOrEntity('on behalf of an LLC') === 'entity');
check('signer: "I own it but under an LLC" -> ambiguous', parseIndividualOrEntity("I own it but it's under an LLC") === 'ambiguous');

check('title: "Manager" -> officer_member_trustee', parseTitleToCapacity('Manager') === 'officer_member_trustee');
check('title: "authorized agent" -> authorized_agent', parseTitleToCapacity('authorized agent') === 'authorized_agent');
check('title: "property manager" -> broker_or_manager', parseTitleToCapacity('property manager') === 'broker_or_manager');
check("title: \"I don't know\" -> dont_know", parseTitleToCapacity("I don't know my title") === 'dont_know');
check('title: unrecognized -> null', parseTitleToCapacity('grand poobah') === null);

check('entityType: llc', parseEntityType("it's an LLC") === 'llc');
check('entityType: corporation', parseEntityType('a corporation') === 'corporation');
check('entityType: incorporated -> corporation', parseEntityType('we are incorporated') === 'corporation');
check('entityType: limited partnership -> lp (before gp)', parseEntityType('a limited partnership') === 'lp');
check('entityType: general partnership -> gp', parseEntityType('general partnership') === 'gp');
check('entityType: trust', parseEntityType('a family trust') === 'trust');
check('entityType: "something else" -> other', parseEntityType('something else') === 'other');
check('entityType: llc wins over corp when both present', parseEntityType('LLC — well, kind of a corp') === 'llc');
check('entityType: unclassifiable -> null', parseEntityType('a widget') === null);

check('days: real days preserved', parseDays('Monday through Friday') === 'Monday through Friday');
check('days: zero-day -> null', parseDays('no days') === null);
check("days: \"I'm not available\" -> null", parseDays("I'm not available") === null);

const goodHours = parseHours('9:00 AM to 5:00 PM');
check('hours: valid range parsed', !!goodHours && goodHours.startMin < goodHours.endMin);
check('hours: format preserved (start "9:00 AM")', !!goodHours && goodHours.start === '9:00 AM');
check('hours: inverted range rejected', parseHours('5:00 PM to 9:00 AM') === null);

check('fillSlots replaces owner slots only', fillSlots('a {{x}} b {{y}}', { x: '1', y: '2' }) === 'a 1 b 2');

// --- Verbatim emission (server-owned bytes == manifest-hashed constants) ----
check('emit: rent-periods first-ask verbatim', beginCapture('rent_periods').reply === chatIntakeRentPeriodsPrompt);
check('emit: signer first-ask verbatim', beginCapture('signer_capacity').reply === chatIntakeSignerCapacityPrompt);
check('emit: personal-delivery first-ask verbatim', beginCapture('personal_delivery').reply === chatIntakePersonalDeliveryPrompt);
check('emit: dispute framing+Q1 verbatim', beginCapture('preflight_dispute').reply === `${chatIntakePreflightDisputePrompt}\n\n${chatIntakePreflightDisputeQ1}`);

// --- Rent periods walk (single period, personal) ---------------------------
{
  let t = beginCapture('rent_periods');
  let c = t.nextCursor as CaptureCursor;
  t = stepCapture(c, '2026-05-01', EMPTY); check('rent: start accepted -> end ask verbatim', t.reply === chatIntakeRentPeriodsEndDateAsk); c = t.nextCursor as CaptureCursor;
  // guardrail: end before start
  const g = stepCapture(c, '2026-04-01', EMPTY); check('rent: end<start -> §2.4 re-ask verbatim', g.reply === chatIntakeRentPeriodsReAskStartAfterEnd);
  t = stepCapture(c, '2026-05-31', EMPTY); c = t.nextCursor as CaptureCursor;
  // guardrail: non-positive amount
  const ga = stepCapture(c, '$0', EMPTY); check('rent: amount<=0 -> re-ask (slots filled)', ga.reply.includes('2026-05-01') && ga.reply.includes('actual amount'));
  t = stepCapture(c, '$6,000', EMPTY); c = t.nextCursor as CaptureCursor;
  t = stepCapture(c, "that's everything", EMPTY);
  const val = t.extracted?.value as unknown[];
  check('rent: completes with valid rent_periods array', t.kind === 'complete' && Array.isArray(val) && val.length === 1 && rentPeriodSchema.safeParse(val[0]).success);
  check('rent: label-substitution re-ask verbatim', stepCapture((beginCapture('rent_periods').nextCursor as CaptureCursor), 'May 2026', EMPTY).reply === chatIntakeRentPeriodsReAskLabel);
}

// --- Signer: individual path completes; entity path surfaces entityType gap -
{
  let t = beginCapture('signer_capacity'); let c = t.nextCursor as CaptureCursor;
  // ambiguous first
  check('signer: ambiguous capacity -> §3.4 re-ask verbatim', stepCapture(c, "I own it but it's under an LLC", OWNER).reply === chatIntakeSignerReAskAmbiguous);
  const ind = stepCapture(c, 'just myself as the owner', OWNER);
  check('signer: individual completes with valid signer_capacity', ind.kind === 'complete' && signerCaptureSchema.safeParse(ind.extracted?.value).success);

  // entity path: capacity -> name -> entityType -> title -> confirm (omnibus §4)
  t = stepCapture(c, 'on behalf of my LLC', OWNER); c = t.nextCursor as CaptureCursor;   // -> entity name ask
  t = stepCapture(c, 'PTAG L LLC', OWNER);                                               // -> entityType ask
  check('signer: entityType prompt emitted after name (slot filled)', t.reply.includes('PTAG L LLC') && t.reply.includes('a general partnership'));
  c = t.nextCursor as CaptureCursor;
  check('signer: entityType unclassifiable -> re-ask verbatim', stepCapture(c, 'a widget', OWNER).reply === fillSlots(chatIntakeSignerEntityTypeReAsk, { entityName: 'PTAG L LLC' }));
  t = stepCapture(c, "it's an LLC", OWNER); c = t.nextCursor as CaptureCursor;            // -> title ask
  t = stepCapture(c, 'Manager', OWNER); c = t.nextCursor as CaptureCursor;               // -> confirm
  t = stepCapture(c, 'yes', OWNER);
  const ev = t.extracted?.value as Record<string, unknown>;
  const ident = ev.landlordIdentity as Record<string, unknown>;
  check('signer: entity completes with capacity + entityType captured', t.kind === 'complete' && ev.capacity === 'officer_member_trustee' && ident.entityLegalName === 'PTAG L LLC' && ident.entityType === 'llc');
  check('signer: entity value now PASSES signerCaptureSchema (gap closed)', signerCaptureSchema.safeParse(ev).success === true);
}

// --- Personal delivery walk ------------------------------------------------
{
  let t = beginCapture('personal_delivery'); let c = t.nextCursor as CaptureCursor;
  check('pd: zero-day -> §4.4 re-ask verbatim', stepCapture(c, "I'm not available", EMPTY).reply === chatIntakePersonalDeliveryReAskZeroDays);
  t = stepCapture(c, 'Monday through Friday', EMPTY); c = t.nextCursor as CaptureCursor;
  check('pd: inverted hours -> §4.4 re-ask verbatim', stepCapture(c, '5:00 PM to 9:00 AM', EMPTY).reply === chatIntakePersonalDeliveryReAskHours);
  t = stepCapture(c, '9:00 AM to 5:00 PM', EMPTY);
  check('pd: confirm echoes owner format', t.reply.includes('9:00 AM') && t.reply.includes('5:00 PM') && t.reply.includes('Monday through Friday'));
  c = t.nextCursor as CaptureCursor;
  t = stepCapture(c, 'yes', EMPTY);
  check('pd: completes with valid personal_delivery', t.kind === 'complete' && personalDeliverySchema.safeParse(t.extracted?.value).success);
}

// --- Dispute walk: unknown NOT collapsed; 'yes' carried faithfully ---------
{
  let t = beginCapture('preflight_dispute'); let c = t.nextCursor as CaptureCursor;
  // ambiguous answer -> verbatim re-ask
  check('dispute: ambiguous -> §5.3 re-ask verbatim', stepCapture(c, 'sometimes', EMPTY).reply === chatIntakePreflightDisputeReAsk);
  t = stepCapture(c, 'not sure', EMPTY); check('dispute: Q2 emitted verbatim', t.reply === chatIntakePreflightDisputeQ2); c = t.nextCursor as CaptureCursor;
  t = stepCapture(c, 'no', EMPTY); check('dispute: Q3 emitted verbatim', t.reply === chatIntakePreflightDisputeQ3); c = t.nextCursor as CaptureCursor;
  t = stepCapture(c, 'yes they did', EMPTY);
  const dv = t.extracted?.value as Record<string, string>;
  check('dispute: completes with valid tri-state value', t.kind === 'complete' && preflightDisputeSchema.safeParse(dv).success);
  check("dispute: 'unknown' preserved (NOT collapsed to 'no')", dv.tenantFiledComplaint === 'unknown');
  check("dispute: 'yes' carried faithfully", dv.tenantBankruptcy === 'yes');
  check("dispute: 'no' carried faithfully", dv.tenantWrittenWithholding === 'no');
}

// --- Escalation after two failed attempts ----------------------------------
{
  let t = beginCapture('preflight_dispute'); const c0 = t.nextCursor as CaptureCursor;
  const r1 = stepCapture(c0, 'sometimes', EMPTY);                    // fail 1 -> re-ask
  const r2 = stepCapture(r1.nextCursor as CaptureCursor, 'eh', EMPTY); // fail 2 -> escalate
  check('escalate: 2 failed attempts -> save-and-resume', r2.kind === 'escalate' && r2.nextCursor === null && r2.reply === chatIntakeCaptureEscalation);
}

console.log(`\n${'-'.repeat(44)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(44)}`);
if (failed > 0) process.exit(1);
