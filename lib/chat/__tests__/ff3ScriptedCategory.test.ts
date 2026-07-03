// lib/chat/__tests__/ff3ScriptedCategory.test.ts
// Lane FF-3 capture state machine — the reducer's happy path, the conditional amount-owed branch, rule-of-three
// escalation, reask-then-recover, and the confirm gate. Pure/deterministic; no LLM or DB.

import {
  ff3Begin, stepFf3, shouldCaptureAmountOwed, ff3PersistPayload, FF3_MAX_ATTEMPTS,
  type Ff3Cursor, type Ff3Turn,
} from '../ff3ScriptedCategory';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok -', name); }
}

/** Drive the machine from a starting turn through a list of owner messages, returning every turn produced. */
function drive(start: Ff3Turn, messages: string[]): Ff3Turn[] {
  const turns: Ff3Turn[] = [];
  let cursor: Ff3Cursor | null = start.nextCursor;
  for (const msg of messages) {
    if (!cursor) throw new Error('machine terminated before consuming all messages');
    const turn = stepFf3(cursor, msg);
    turns.push(turn);
    cursor = turn.nextCursor;
  }
  return turns;
}

// --- begin --------------------------------------------------------------------------------------------------------
const begin = ff3Begin();
check('begin asks notice_type first', begin.kind === 'prompt' && begin.nextCursor?.step === 'notice_type');
check('begin attempts reset to 0', begin.nextCursor?.attempts === 0);
check('begin status in_progress', begin.captureStatus === 'in_progress');

// --- happy path: 3-day pay-or-quit (captures amount) --------------------------------------------------------------
{
  const turns = drive(begin, [
    '3-day pay or quit',      // notice_type -> just_cause
    'non-payment of rent',    // just_cause  -> bedrooms
    '2 bedrooms',             // bedrooms    -> contract_rent
    '$3,000',                 // contract    -> amount_owed (pay-or-quit)
    '$6,000',                 // amount      -> confirm (card)
    'yes that is correct',    // confirm     -> complete
  ]);
  check('pay-or-quit reaches amount_owed step', turns[3].nextCursor?.step === 'amount_owed');
  check('pay-or-quit shows confirm card after amount', turns[4].nextCursor?.step === 'confirm' && turns[4].kind === 'prompt');
  const done = turns[5];
  check('pay-or-quit completes', done.kind === 'complete' && done.nextCursor === null);
  check('pay-or-quit status complete', done.captureStatus === 'complete');
  check('pay-or-quit persists amount 6000', done.persist?.amount_of_rent_owed === 6000);
  check('pay-or-quit persists notice_type', done.persist?.notice_type === 'three_day_pay_or_quit');
  check('pay-or-quit persists just_cause', done.persist?.just_cause === 'nonpayment');
  check('pay-or-quit persists bedrooms 2', done.persist?.bedrooms === 2);
  check('pay-or-quit persists contract rent 3000', done.persist?.contract_monthly_rent === 3000);
}

// --- non-fault path: 60-day termination skips amount_owed ---------------------------------------------------------
{
  const turns = drive(begin, [
    '60-day termination',   // notice_type -> just_cause
    'owner move-in',        // just_cause  -> bedrooms
    'studio',               // bedrooms=0  -> contract_rent
    '$2,400',               // contract    -> confirm (no amount)
    'looks right',          // confirm     -> complete
  ]);
  check('non-fault skips straight to confirm after rent', turns[3].nextCursor?.step === 'confirm');
  const done = turns[4];
  check('non-fault completes', done.kind === 'complete');
  check('non-fault amount is null', done.persist?.amount_of_rent_owed === null);
  check('non-fault bedrooms studio = 0', done.persist?.bedrooms === 0);
  check('non-fault notice_type sixty_day', done.persist?.notice_type === 'sixty_day_termination');
}

// --- rule of three: three failed asks on notice_type escalates ----------------------------------------------------
{
  const t1 = stepFf3(begin.nextCursor!, 'purple monkey dishwasher');
  check('1st fail -> reask', t1.kind === 'reask' && t1.nextCursor?.attempts === 1);
  const t2 = stepFf3(t1.nextCursor!, 'still nonsense');
  check('2nd fail -> reask', t2.kind === 'reask' && t2.nextCursor?.attempts === 2);
  const t3 = stepFf3(t2.nextCursor!, 'more nonsense');
  check('3rd fail -> escalate', t3.kind === 'escalate' && t3.nextCursor === null);
  check('escalate status awaiting_broker_review', t3.captureStatus === 'awaiting_broker_review');
  check('escalate marks the step', t3.escalatedAt === 'notice_type');
  check('escalate carries no persist payload', t3.persist === undefined);
  check('FF3_MAX_ATTEMPTS is three', FF3_MAX_ATTEMPTS === 3);
}

// --- reask then recover: a fail then a good answer advances (attempts reset) ---------------------------------------
{
  const t1 = stepFf3(begin.nextCursor!, 'no idea');
  check('recover: first is reask', t1.kind === 'reask' && t1.nextCursor?.attempts === 1);
  const t2 = stepFf3(t1.nextCursor!, '3 day pay or quit');
  check('recover: good answer advances to just_cause', t2.nextCursor?.step === 'just_cause');
  check('recover: attempts reset on advance', t2.nextCursor?.attempts === 0);
}

// --- confirm gate: a non-affirmative confirm holds for broker review -----------------------------------------------
{
  const turns = drive(begin, [
    '3-day pay or quit', 'non-payment', '2 bed', '$3,000', '$6,000',
  ]);
  const confirmCursor = turns[4].nextCursor!;
  const no = stepFf3(confirmCursor, "no, the amount is wrong");
  check('confirm "no" -> escalate (hold for broker)', no.kind === 'escalate' && no.captureStatus === 'awaiting_broker_review');
  const yes = stepFf3(confirmCursor, 'yes');
  check('confirm "yes" -> complete', yes.kind === 'complete');
}

// --- shouldCaptureAmountOwed helper -------------------------------------------------------------------------------
check('amount required for pay-or-quit', shouldCaptureAmountOwed({ notice_type: 'three_day_pay_or_quit' }) === true);
check('amount required for nonpayment cause', shouldCaptureAmountOwed({ just_cause: 'nonpayment' }) === true);
check('amount required if candidate present', shouldCaptureAmountOwed({ amount_of_rent_owed: 500 }) === true);
check('amount not required for owner move-in 60-day', shouldCaptureAmountOwed({ notice_type: 'sixty_day_termination', just_cause: 'owner_move_in' }) === false);

// --- ff3PersistPayload ---------------------------------------------------------------------------------------------
{
  const payload = ff3PersistPayload({
    bedrooms: 1, contract_monthly_rent: 2000, amount_of_rent_owed: 4000,
    just_cause: 'nonpayment', notice_type: 'three_day_pay_or_quit',
  });
  check('persist payload defaults status complete', payload.ff3_capture_status === 'complete');
  check('persist payload passes an explicit status', ff3PersistPayload({
    bedrooms: 1, contract_monthly_rent: 2000, amount_of_rent_owed: null,
    just_cause: 'owner_move_in', notice_type: 'sixty_day_termination',
  }, 'awaiting_broker_review').ff3_capture_status === 'awaiting_broker_review');
}

if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log('\nFF-3 scripted capture state machine: all passed');
