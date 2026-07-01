// lib/chat/scriptedOrchestrate.test.ts — Lane 2E Fork-A integration (turn-level glue).
// Proves the transition override (LLM reply replaced by verbatim first-ask), cross-category chaining, and
// review routing — all with the LLM never authoring a scripted prompt or classifying a scripted answer.

import { applyTurn, type TurnResult } from './orchestrate';
import { activeCursorOf, runScriptedActiveTurn, maybeBeginScripted, scriptedBeginCategory } from './scriptedOrchestrate';
import {
  chatIntakeSignerCapacityPrompt, chatIntakeRentPeriodsPrompt, chatIntakePersonalDeliveryPrompt,
  chatIntakePreflightDisputePrompt, chatIntakePreflightDisputeQ1,
} from './persona';
import type { IntakeState, ModelResponse } from './intakeSchema';
import type { CaptureCursor } from './scriptedCapture';

let passed = 0, failed = 0;
const check = (n: string, c: boolean, d = '') => { c ? passed++ : (failed++, console.log(`  ✗ ${n}${d ? ` — ${d}` : ''}`)); if (c) console.log(`  ✓ ${n}`); };
const NOW = '2026-06-30T00:00:00Z';

const state = (obj: Record<string, unknown>): IntakeState => {
  const out: Record<string, { value: unknown; confidence: number; updated_at: string }> = {};
  for (const [k, v] of Object.entries(obj)) out[k] = { value: v, confidence: 1, updated_at: NOW };
  return out as IntakeState;
};
const lastCursor = (t: TurnResult): CaptureCursor | null =>
  activeCursorOf(t.transcriptAdditions);
const noop: ModelResponse = { reply: 'ok', extracted_fields: [], intake_complete: false, refusal: null };

// All NON-scripted required fields present; service = personal (so personal_delivery is in the chain).
const fullNonScripted = state({
  property_address: '5537 La Mirada Ave, Los Angeles, CA 90038',
  tenant_names: ['Clifton Alexander'],
  landlord_or_owner_name: 'Maria Lopez',
  landlord_mailing_address: '123 Main St, Los Angeles, CA 90012',
  rent_period: 'monthly',
  rent_amount_due: 6000,
  payment_methods_accepted: ['in_person'],
  preferred_service_method: 'personal',
  language_preference: 'en',
});

// --- Transition override ----------------------------------------------------
{
  const base = applyTurn(fullNonScripted, 'in person', noop);
  const t = maybeBeginScripted(base, NOW);
  check('transition: LLM reply overridden with verbatim signer first-ask', t.reply === chatIntakeSignerCapacityPrompt);
  check('transition: cursor opened on assistant turn', lastCursor(t)?.category === 'signer_capacity');
  check('transition: not complete / not routed', t.intakeComplete === false && t.routeToReview === false);
  check('activeCursorOf reads last assistant metadata', activeCursorOf(t.transcriptAdditions)?.step === 'awaiting_capacity');
}

// --- No override when a non-scripted field is still missing ------------------
{
  const partial = state({ landlord_or_owner_name: 'Maria Lopez' }); // address etc. missing
  check('scriptedBeginCategory null while non-scripted fields missing', scriptedBeginCategory(partial) === null);
  const base = applyTurn(partial, 'hi', noop);
  const t = maybeBeginScripted(base, NOW);
  check('no override: base LLM reply preserved', t.reply === 'ok' && lastCursor(t) == null);
}

// --- Full chain: signer -> rent_periods -> personal_delivery -> dispute -> review ---
{
  let t = maybeBeginScripted(applyTurn(fullNonScripted, 'in person', noop), NOW);
  let st = t.intakeState; let cur = lastCursor(t) as CaptureCursor;
  const step = (msg: string) => { t = runScriptedActiveTurn(st, msg, cur, NOW); st = t.intakeState; cur = lastCursor(t) as CaptureCursor; };

  // signer (individual) -> chains to rent_periods first-ask
  step('just myself as the owner');
  check('chain: signer complete -> rent-periods first-ask emitted', t.reply.includes(chatIntakeRentPeriodsPrompt) && cur?.category === 'rent_periods');

  // rent periods: one period
  step('2026-05-01'); step('2026-05-31'); step('$6,000');
  step("that's everything");
  check('chain: rent-periods complete -> personal-delivery first-ask emitted', t.reply.includes(chatIntakePersonalDeliveryPrompt) && cur?.category === 'personal_delivery');

  // personal delivery
  step('Monday through Friday'); step('9:00 AM to 5:00 PM'); step('yes');
  check('chain: personal-delivery complete -> dispute framing+Q1 emitted', t.reply.includes(chatIntakePreflightDisputePrompt) && t.reply.includes(chatIntakePreflightDisputeQ1) && cur?.category === 'preflight_dispute');

  // dispute (all no) -> review
  step('no'); step('no'); step('no');
  check('chain: all captured -> intakeComplete + routeToReview', t.intakeComplete === true && t.routeToReview === true);
  check('chain: cursor cleared at review', lastCursor(t) == null);
  check('chain: rent_periods persisted as array', Array.isArray(st['rent_periods']?.value));
  check('chain: dispute persisted tri-state', (st['preflight_dispute']?.value as Record<string, string>).tenantFiledComplaint === 'no');
}

console.log(`\n${'-'.repeat(44)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(44)}`);
if (failed > 0) process.exit(1);
