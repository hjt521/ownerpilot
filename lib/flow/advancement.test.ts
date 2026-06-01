import {
  validateStep,
  advance,
  goBack,
  STEP_ORDER,
} from './advancement';
import {
  FlowStep,
  NoticeFlowState,
  NoticeFlowData,
  createFlowState,
} from './noticeFlowState';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; console.log(`  \u2713 ${name}`); }
  else { failed++; console.log(`  \u2717 ${name}${detail ? ` \u2014 ${detail}` : ''}`); }
}

function fullData(): NoticeFlowData {
  return {
    dispute: { tenantFiledComplaint: false, tenantWrittenWithholding: false, tenantBankruptcy: false },
    propertyAddress: '12 Almond Ln, Fresno, CA 93650',
    propertyCity: 'Fresno',
    tenantNames: ['Jane Tenant'],
    rentPeriods: [{ periodStartDate: '2026-04-01', periodEndDate: '2026-04-30', amount: 2000 }],
    baseRentOnlyConfirmed: true,
    paymentMethods: [{ kind: 'mail', mailAddress: 'PO Box 1' }],
    signerName: 'Owner Name',
    signerRole: 'owner',
    serviceDate: '2026-06-01',
    serviceMethod: 'personal',
  };
}

console.log('\n=== Dispute step: cleared / unanswered / hard-blocked ===');

console.log('\n1. All "no" -> can advance, not hard-blocked');
{
  const v = validateStep(FlowStep.PreflightDispute, fullData());
  check('canAdvance', v.canAdvance === true);
  check('not hardBlocked', v.hardBlocked === false);
}

console.log('\n2. Unanswered -> cannot advance, NOT hard-blocked (just incomplete)');
{
  const d = fullData(); d.dispute = { tenantFiledComplaint: false };
  const v = validateStep(FlowStep.PreflightDispute, d);
  check('cannot advance', v.canAdvance === false);
  check('not hardBlocked (incomplete)', v.hardBlocked === false);
}

console.log('\n3. A "yes" -> cannot advance AND hard-blocked (attorney handoff)');
{
  const d = fullData(); d.dispute = { tenantFiledComplaint: true, tenantWrittenWithholding: false, tenantBankruptcy: false };
  const v = validateStep(FlowStep.PreflightDispute, d);
  check('cannot advance', v.canAdvance === false);
  check('hardBlocked', v.hardBlocked === true);
  check('has reason', v.issues.length > 0);
}

console.log('\n=== Per-step field validation ===');

console.log('\n4. Property: address required');
{
  const d = fullData(); d.propertyAddress = '';
  check('blank address fails', validateStep(FlowStep.PropertyIdentification, d).canAdvance === false);
  check('present address ok', validateStep(FlowStep.PropertyIdentification, fullData()).canAdvance === true);
}

console.log('\n5. Tenants: at least one non-blank');
{
  const d = fullData(); d.tenantNames = ['  '];
  check('blank-only fails', validateStep(FlowStep.Tenants, d).canAdvance === false);
  check('one name ok', validateStep(FlowStep.Tenants, fullData()).canAdvance === true);
}

console.log('\n6. Amount: period shape + base-rent confirm');
{
  const ok = validateStep(FlowStep.AmountOwed, fullData());
  check('valid period ok', ok.canAdvance === true, JSON.stringify(ok.issues));

  const d1 = fullData(); d1.baseRentOnlyConfirmed = false;
  check('unconfirmed base rent fails', validateStep(FlowStep.AmountOwed, d1).canAdvance === false);

  const d2 = fullData(); d2.rentPeriods = [{ periodStartDate: '2026-04-30', periodEndDate: '2026-04-01', amount: 2000 }];
  check('end-before-start fails', validateStep(FlowStep.AmountOwed, d2).canAdvance === false);

  const d3 = fullData(); d3.rentPeriods = [{ periodStartDate: '2026-04-01', periodEndDate: '2026-04-30', amount: 0 }];
  check('zero amount fails', validateStep(FlowStep.AmountOwed, d3).canAdvance === false);

  const d4 = fullData(); d4.rentPeriods = [{ periodStartDate: 'bad', periodEndDate: '2026-04-30', amount: 100 }];
  check('bad date fails', validateStep(FlowStep.AmountOwed, d4).canAdvance === false);
}

console.log('\n7. Payment: at least one method chosen (deep validity is at Review)');
{
  const d = fullData(); d.paymentMethods = [];
  check('no method fails', validateStep(FlowStep.PaymentInstructions, d).canAdvance === false);
  // Note: an INVALID-but-present method still advances here; validity is consolidated at Review.
  const d2 = fullData(); d2.paymentMethods = [{ kind: 'eft' }]; // invalid for produce, but present
  check('present-but-invalid method still advances (deferred to Review)', validateStep(FlowStep.PaymentInstructions, d2).canAdvance === true);
}

console.log('\n8. Landlord: signer + role + service date/method; agent needs authority');
{
  const ok = validateStep(FlowStep.LandlordAgentInfo, fullData());
  check('owner baseline ok', ok.canAdvance === true, JSON.stringify(ok.issues));

  const d = fullData(); d.signerRole = 'authorized_agent_broker'; d.authorityEvidenceOnFile = undefined;
  check('agent w/o authority fails', validateStep(FlowStep.LandlordAgentInfo, d).canAdvance === false);

  const d2 = fullData(); d2.serviceDate = 'nope';
  check('bad service date fails', validateStep(FlowStep.LandlordAgentInfo, d2).canAdvance === false);

  const d3 = fullData(); d3.serviceMethod = undefined;
  check('missing service method fails', validateStep(FlowStep.LandlordAgentInfo, d3).canAdvance === false);
}

console.log('\n=== advance / goBack ===');

console.log('\n9. advance moves forward when valid, refuses when invalid');
{
  let s: NoticeFlowState = { step: FlowStep.PropertyIdentification, data: fullData() };
  const r = advance(s);
  check('moved', r.moved === true);
  check('now at Tenants', r.state.step === FlowStep.Tenants);

  const bad: NoticeFlowState = { step: FlowStep.PropertyIdentification, data: { ...fullData(), propertyAddress: '' } };
  const r2 = advance(bad);
  check('refused', r2.moved === false);
  check('stayed put', r2.state.step === FlowStep.PropertyIdentification);
}

console.log('\n10. advance is immutable (does not mutate input)');
{
  const s: NoticeFlowState = { step: FlowStep.PropertyIdentification, data: fullData() };
  const before = s.step;
  advance(s);
  check('input step unchanged', s.step === before);
}

console.log('\n11. goBack moves back, never before first step');
{
  const s: NoticeFlowState = { step: FlowStep.Tenants, data: fullData() };
  check('back to Property', goBack(s).step === FlowStep.PropertyIdentification);
  const first: NoticeFlowState = { step: FlowStep.PreflightDispute, data: fullData() };
  check('cannot go before first', goBack(first).step === FlowStep.PreflightDispute);
}

console.log('\n12. Dispute hard-block stops advance into the flow');
{
  const d = fullData(); d.dispute = { tenantBankruptcy: true, tenantFiledComplaint: false, tenantWrittenWithholding: false };
  const s: NoticeFlowState = { step: FlowStep.PreflightDispute, data: d };
  const r = advance(s);
  check('did not move', r.moved === false);
  check('hardBlocked surfaced', r.validation.hardBlocked === true);
  check('still at preflight', r.state.step === FlowStep.PreflightDispute);
}

console.log('\n13. Full walk: preflight -> ... -> Review advances each step');
{
  let s = createFlowState();
  s = { ...s, data: fullData() };
  const visited: FlowStep[] = [s.step];
  for (let k = 0; k < STEP_ORDER.length - 1; k++) {
    const r = advance(s);
    if (!r.moved) break;
    s = r.state;
    visited.push(s.step);
  }
  // Should reach at least Review (Review->ServiceInstructions also allowed since Review has no own-field gate)
  check('reached Review or beyond', visited.includes(FlowStep.Review), visited.join(' -> '));
}

console.log(`\n${'-'.repeat(40)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`${'-'.repeat(40)}\n`);
if (failed > 0) process.exit(1);
