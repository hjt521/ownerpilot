// lib/chat/__tests__/ff3Wiring.test.ts
// Lane FF-3 activation wiring (ruling §8). Proves two things:
//   1. Flag OFF (the default everywhere, incl. prod) → the FF-3 category is invisible and the base flow is a
//      strict no-op: scriptedCategories() == the base four, FF-3 is never selected, no ff3Persist is emitted.
//   2. Flag ON → FF-3 registers LAST, chains after the base block, round-trips the state machine, persists the
//      typed columns on completion, and holds the session out of review while pending or parked for broker review.
// The flag is read live from process.env, so we toggle it per-section and always restore.

import { applyTurn, type TurnResult } from '../orchestrate';
import { runScriptedActiveTurn, maybeBeginScripted, scriptedBeginCategory } from '../scriptedOrchestrate';
import {
  scriptedCategories, nextScriptedCategory, beginCapture, SCRIPTED_CATEGORIES,
  type CaptureCursor,
} from '../scriptedCapture';
import { chatFf3CaptureNoticeType } from '../persona';
import { activeCursorOf } from '../scriptedOrchestrate';
import type { IntakeState, ModelResponse } from '../intakeSchema';

let passed = 0, failed = 0;
const check = (n: string, c: boolean) => { c ? passed++ : (failed++, console.log(`  ✗ ${n}`)); if (c) console.log(`  ✓ ${n}`); };
const NOW = '2026-07-03T00:00:00Z';

const withFlag = (on: boolean, fn: () => void) => {
  const prev = process.env.FF3_CAPTURE_ENABLED;
  if (on) process.env.FF3_CAPTURE_ENABLED = '1'; else delete process.env.FF3_CAPTURE_ENABLED;
  try { fn(); } finally {
    if (prev === undefined) delete process.env.FF3_CAPTURE_ENABLED; else process.env.FF3_CAPTURE_ENABLED = prev;
  }
};

const mk = (obj: Record<string, unknown>): IntakeState => {
  const out: Record<string, { value: unknown; confidence: number; updated_at: string }> = {};
  for (const [k, v] of Object.entries(obj)) out[k] = { value: v, confidence: 1, updated_at: NOW };
  return out as IntakeState;
};
const lastCursor = (t: TurnResult): CaptureCursor | null => activeCursorOf(t.transcriptAdditions);
const noop: ModelResponse = { reply: 'ok', extracted_fields: [], intake_complete: false, refusal: null };

// Every required field present, INCLUDING the four base scripted categories — so the only thing FF-3 could add.
const allCaptured = mk({
  property_address: '5537 La Mirada Ave, Los Angeles, CA 90038',
  tenant_names: ['Clifton Alexander'],
  landlord_or_owner_name: 'Maria Lopez',
  landlord_mailing_address: '123 Main St, Los Angeles, CA 90012',
  rent_period: 'monthly',
  rent_amount_due: 6000,
  payment_methods_accepted: ['in_person'],
  preferred_service_method: 'personal',
  language_preference: 'en',
  signer_capacity: { capacity: 'owner', landlordIdentity: { type: 'individual', names: ['Maria Lopez'] }, signerName: 'Maria Lopez' },
  rent_periods: [{ periodStartDate: '2026-05-01', periodEndDate: '2026-05-31', amount: 6000 }],
  personal_delivery: { days: 'Mon-Fri', hours: '9:00 AM to 5:00 PM' },
  preflight_dispute: { tenantFiledComplaint: 'no', tenantWrittenWithholding: 'no', tenantBankruptcy: 'no' },
});

// ===================================================================================================
// Section A — flag OFF: strict no-op
// ===================================================================================================
withFlag(false, () => {
  check('OFF: scriptedCategories() == base four', JSON.stringify(scriptedCategories()) === JSON.stringify(SCRIPTED_CATEGORIES));
  check('OFF: ff3_intake absent from the list', !scriptedCategories().includes('ff3_intake'));
  check('OFF: nextScriptedCategory never returns ff3 (all base captured)', nextScriptedCategory(allCaptured, null) === null);
  check('OFF: scriptedBeginCategory null when everything base-captured', scriptedBeginCategory(allCaptured, null) === null);

  // With the flag off, FF-3 never hijacks the base turn: the LLM reply survives and no cursor / ff3Persist is set.
  const base = maybeBeginScripted(applyTurn(allCaptured, 'ok', noop), NOW, null);
  check('OFF: no ff3Persist on a base turn', base.ff3Persist === undefined);
  check('OFF: base turn not hijacked by FF-3', base.reply === 'ok' && activeCursorOf(base.transcriptAdditions) == null);
});

// ===================================================================================================
// Section B — flag ON: FF-3 registers, chains, persists, gates review
// ===================================================================================================
withFlag(true, () => {
  const cats = scriptedCategories();
  check('ON: ff3_intake appended last', cats.length === 5 && cats[4] === 'ff3_intake');
  check('ON: base order unchanged', JSON.stringify(cats.slice(0, 4)) === JSON.stringify(SCRIPTED_CATEGORIES));
  check('ON: nextScriptedCategory selects ff3 when pending', nextScriptedCategory(allCaptured, null) === 'ff3_intake');
  check('ON: ff3 skipped when complete', nextScriptedCategory(allCaptured, 'complete') === null);
  check('ON: ff3 skipped (parked) when awaiting_broker_review', nextScriptedCategory(allCaptured, 'awaiting_broker_review') === null);
  check('ON: scriptedBeginCategory returns ff3 after base block', scriptedBeginCategory(allCaptured, null) === 'ff3_intake');

  // beginCapture adapter
  const begin = beginCapture('ff3_intake');
  check('ON: begin emits the locked notice-type prompt', begin.reply === chatFf3CaptureNoticeType);
  check('ON: begin cursor is ff3_intake/notice_type', begin.nextCursor?.category === 'ff3_intake' && begin.nextCursor?.step === 'notice_type');
  check('ON: begin marks status in_progress', (begin.ff3Persist as { ff3_capture_status?: string })?.ff3_capture_status === 'in_progress');

  // Happy path through runScriptedActiveTurn (starting from the begin cursor)
  {
    let cur = begin.nextCursor as CaptureCursor;
    let t!: TurnResult;
    const step = (msg: string) => { t = runScriptedActiveTurn(allCaptured, msg, cur, NOW, 'in_progress'); cur = lastCursor(t) as CaptureCursor; };
    step('3-day pay or quit');
    check('ON: mid-capture holds review (in_progress)', t.routeToReview === false && (t.ff3Persist as { ff3_capture_status?: string }).ff3_capture_status === 'in_progress');
    step('non-payment of rent'); step('2 bed'); step('$3,000'); step('$6,000');
    step('yes that is correct');
    const cols = t.ff3Persist as Record<string, unknown>;
    check('ON: completion persists status complete', cols.ff3_capture_status === 'complete');
    check('ON: completion persists the 5 typed columns', cols.notice_type === 'three_day_pay_or_quit' && cols.just_cause === 'nonpayment' && cols.bedrooms === 2 && cols.amount_of_rent_owed === 6000 && cols.contract_monthly_rent === 3000);
    check('ON: completion routes to review (intake complete + ff3 complete)', t.routeToReview === true && t.intakeComplete === true);
    check('ON: cursor cleared at completion', lastCursor(t) === null);
  }

  // Escalation path — rule of three on notice_type parks for broker review, holds review
  {
    let cur = begin.nextCursor as CaptureCursor;
    let t!: TurnResult;
    const step = (msg: string) => { t = runScriptedActiveTurn(allCaptured, msg, cur, NOW, 'in_progress'); cur = lastCursor(t) as CaptureCursor; };
    step('purple monkey dishwasher'); step('total nonsense here'); step('still not an answer');
    check('ON: escalation parks status awaiting_broker_review', (t.ff3Persist as { ff3_capture_status?: string }).ff3_capture_status === 'awaiting_broker_review');
    check('ON: parked session does NOT route to review', t.routeToReview === false && t.status === 'active');
    check('ON: escalation clears the cursor', lastCursor(t) === null);
  }
});

console.log(`\n${'-'.repeat(44)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(44)}`);
if (failed > 0) process.exit(1);
