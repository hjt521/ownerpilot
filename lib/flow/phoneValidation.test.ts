/**
 * Pins the field-level US-phone validation added to the PaymentInstructions
 * advancement step (Review Go-to patch, 2026-06-11), and the isUsPhone
 * helper it delegates to. The field-level message mirrors the gate-side
 * CONTACT_PHONE_FORMAT message verbatim so the two layers never disagree.
 */
import { validateStep } from './advancement';
import { FlowStep, createFlowState, NoticeFlowData } from './noticeFlowState';
import { isUsPhone } from '../payments/validatePaymentBranch';

let passed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean) {
  if (cond) {
    passed += 1;
  } else {
    failures.push(name);
    console.error(`FAIL: ${name}`);
  }
}

const PHONE_FORMAT_MSG = 'Enter a valid US telephone number (10 digits).';

function paymentData(phone: string): NoticeFlowData {
  const base = createFlowState().data;
  return {
    ...base,
    landlordContact: {
      ...(base.landlordContact ?? {}),
      phone,
      streetAddress: '123 Main St, City, CA 90000',
    },
    paymentBranch: 'mail_only',
  };
}

check('isUsPhone: 10 digits plain', isUsPhone('5555555555') === true);
check('isUsPhone: formatted (555) 555-5555', isUsPhone('(555) 555-5555') === true);
check('isUsPhone: 11 digits with leading 1', isUsPhone('1 (555) 555-5555') === true);
check('isUsPhone: 9 digits rejected', isUsPhone('555555555') === false);
check('isUsPhone: 8 digits rejected', isUsPhone('55555555') === false);
check('isUsPhone: 11 digits without leading 1 rejected', isUsPhone('25555555555') === false);

const nine = validateStep(FlowStep.PaymentInstructions, paymentData('234523445'));
check('PaymentInstructions: 9-digit phone blocks advancement', nine.canAdvance === false);
check(
  'PaymentInstructions: 9-digit phone surfaces the format message',
  nine.issues.includes(PHONE_FORMAT_MSG),
);

const eight = validateStep(FlowStep.PaymentInstructions, paymentData('23452344'));
check('PaymentInstructions: 8-digit phone blocks advancement', eight.canAdvance === false);

const ten = validateStep(FlowStep.PaymentInstructions, paymentData('(234) 523-4455'));
check('PaymentInstructions: formatted 10-digit phone advances', ten.canAdvance === true);
check(
  'PaymentInstructions: no format message on a valid phone',
  !ten.issues.includes(PHONE_FORMAT_MSG),
);

const blank = validateStep(FlowStep.PaymentInstructions, paymentData(''));
check(
  'PaymentInstructions: blank phone reports required, not format',
  blank.canAdvance === false && !blank.issues.includes(PHONE_FORMAT_MSG),
);

if (failures.length > 0) {
  throw new Error(`phoneValidation.test.ts: ${failures.length} check(s) failed, ${passed} passed`);
}
console.log(`phoneValidation.test.ts: all ${passed} checks passed`);
