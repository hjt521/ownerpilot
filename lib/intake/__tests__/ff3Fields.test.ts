// lib/intake/__tests__/ff3Fields.test.ts
// Lane FF-3 — the five structured fields: enum + range validation, the conditional amount-owed rule, and the
// locked recapture confirmation card (with $-safe money interpolation).

import {
  ff3IntakeSchema, isFf3Complete, ff3ConfirmationCard,
  JUST_CAUSE_VALUES, NOTICE_TYPE_VALUES, type Ff3Intake,
} from '../ff3Fields';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok -', name); }
}

const CLIFTON: Ff3Intake = {
  bedrooms: 2, contract_monthly_rent: 3000, amount_of_rent_owed: 6000,
  just_cause: 'nonpayment', notice_type: 'three_day_pay_or_quit',
};

// enum sets
check('13 just_cause values', JUST_CAUSE_VALUES.length === 13);
check('6 notice_type values', NOTICE_TYPE_VALUES.length === 6);

// valid Clifton-like case
check('valid FF-3 intake passes', isFf3Complete(CLIFTON));

// enum enforcement
check('unknown just_cause rejected', !ff3IntakeSchema.safeParse({ ...CLIFTON, just_cause: 'made_up' }).success);
check('unknown notice_type rejected', !ff3IntakeSchema.safeParse({ ...CLIFTON, notice_type: '3day' }).success);

// bedrooms range
check('bedrooms 7 rejected', !ff3IntakeSchema.safeParse({ ...CLIFTON, bedrooms: 7 }).success);
check('bedrooms 0 allowed', ff3IntakeSchema.safeParse({ ...CLIFTON, bedrooms: 0 }).success);

// conditional amount-owed rule
check('pay-or-quit with amount 0 rejected', !ff3IntakeSchema.safeParse({ ...CLIFTON, amount_of_rent_owed: 0 }).success);
check('pay-or-quit with null amount rejected', !ff3IntakeSchema.safeParse({ ...CLIFTON, amount_of_rent_owed: null }).success);
check('non-payquit type may omit amount', ff3IntakeSchema.safeParse({
  ...CLIFTON, notice_type: 'thirty_day_termination', just_cause: 'owner_move_in', amount_of_rent_owed: null,
}).success);

// negative money rejected
check('negative contract rent rejected', !ff3IntakeSchema.safeParse({ ...CLIFTON, contract_monthly_rent: -5 }).success);

// confirmation card — $-safe interpolation, no leftover placeholders
const card = ff3ConfirmationCard(CLIFTON);
check('card shows bedrooms', card.includes('**2** bedroom(s)'));
check('card shows amount owed with $', card.includes('$6,000.00'));
check('card shows contract rent with $', card.includes('$3,000.00'));
check('card shows just cause display', card.includes('Non-payment of rent'));
check('card shows notice type display', card.includes('3-Day Notice to Pay Rent or Quit'));
check('card no leftover {placeholder}', !/\{[a-z_]+\}/.test(card) && !/\$\{[a-z_]+\}/.test(card));

if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log('\nFF-3 structured intake: all passed');
