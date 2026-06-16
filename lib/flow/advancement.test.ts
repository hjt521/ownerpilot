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
import { individualLandlord, entityLandlord } from './landlord.fixture';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; console.log(`  \u2713 ${name}`); }
  else { failed++; console.log(`  \u2717 ${name}${detail ? ` \u2014 ${detail}` : ''}`); }
}

function fullData(): NoticeFlowData {
  return {
    dispute: { tenantFiledComplaint: 'no', tenantWrittenWithholding: 'no', tenantBankruptcy: 'no' },
    propertyAddress: '12 Almond Ln, Fresno, CA 93650',
    propertyCity: 'Fresno',
    tenantNames: ['Jane Tenant'],
    rentPeriods: [{ periodStartDate: '2026-04-01', periodEndDate: '2026-04-30', amount: 2000 }],
    baseRentOnlyConfirmed: true,
    paymentMethods: [], // legacy field still required by the type; unused by the v4 step
    // v4 payment (§ 1161(2) payee trio + branch) — the PaymentInstructions step
    // reads these, not the legacy paymentMethods array.
    landlordContact: { name: 'Owner Name', phone: '(559) 555-0100', streetAddress: '12 Almond Ln, Fresno, CA 93650' },
    mailingAddress: '12 Almond Ln, Fresno, CA 93650',
    paymentBranch: 'mail_only',
    signerName: 'Owner Name',
    // Stage-1 identity slice (canonical signerCapacity; signerRole removed in Defect #3).
    ...individualLandlord('owner', { names: ['Owner Name'] }),
    signingDate: '2026-06-01', // B1: execution date, distinct from service date
    serviceDate: '2026-06-01',
    serviceMethod: 'personal',
  };
}

console.log('\n=== Dispute step: cleared / unanswered / flagged (soft-recommend) ===');

console.log('\n1. All "no" -> can advance');
{
  const v = validateStep(FlowStep.PreflightDispute, fullData());
  check('canAdvance', v.canAdvance === true);
}

console.log('\n2. Unanswered -> cannot advance (incomplete)');
{
  const d = fullData(); d.dispute = { tenantFiledComplaint: 'no' };
  const v = validateStep(FlowStep.PreflightDispute, d);
  check('cannot advance', v.canAdvance === false);
}

console.log('\n3. A "yes" -> CAN advance (soft-recommend; override modal gates at UI layer)');
{
  const d = fullData(); d.dispute = { tenantFiledComplaint: 'yes', tenantWrittenWithholding: 'no', tenantBankruptcy: 'no' };
  const v = validateStep(FlowStep.PreflightDispute, d);
  check('can advance (data-clears)', v.canAdvance === true);
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
  check('Step 2 advances regardless of base-rent confirm (moved to Step 4 attestation)', validateStep(FlowStep.AmountOwed, d1).canAdvance === true);

  const d2 = fullData(); d2.rentPeriods = [{ periodStartDate: '2026-04-30', periodEndDate: '2026-04-01', amount: 2000 }];
  check('end-before-start fails', validateStep(FlowStep.AmountOwed, d2).canAdvance === false);

  const d3 = fullData(); d3.rentPeriods = [{ periodStartDate: '2026-04-01', periodEndDate: '2026-04-30', amount: 0 }];
  check('zero amount fails', validateStep(FlowStep.AmountOwed, d3).canAdvance === false);

  const d4 = fullData(); d4.rentPeriods = [{ periodStartDate: 'bad', periodEndDate: '2026-04-30', amount: 100 }];
  check('bad date fails', validateStep(FlowStep.AmountOwed, d4).canAdvance === false);
}

console.log('\n7. Payment: at least one method chosen (deep validity is at Review)');
{
  const d = fullData(); d.paymentBranch = undefined;
  check('no branch fails', validateStep(FlowStep.PaymentInstructions, d).canAdvance === false);
  // A present, shape-complete branch that is DEEP-invalid (P.O. box on a
  // personal-delivery branch) still advances; deep validity is consolidated at Review.
  const d2 = fullData();
  d2.paymentBranch = 'in_person_and_mail';
  d2.personalDeliveryDays = 'Monday through Friday';
  d2.personalDeliveryHours = '9:00 a.m. to 5:00 p.m.';
  d2.landlordContact = { name: 'Owner Name', phone: '(559) 555-0100', streetAddress: 'P.O. Box 7, Fresno, CA 93701' };
  check('present-but-invalid method still advances (deferred to Review)', validateStep(FlowStep.PaymentInstructions, d2).canAdvance === true);
}

console.log('\n7b. Payment: typed name retired; override name required when override on (Defect #2)');
{
  // Missing typed landlordContact.name no longer blocks the payment step.
  const dNoName = fullData();
  dNoName.landlordContact = { phone: '(559) 555-0100', streetAddress: '12 Almond Ln, Fresno, CA 93650' };
  check('missing typed name advances', validateStep(FlowStep.PaymentInstructions, dNoName).canAdvance === true,
    JSON.stringify(validateStep(FlowStep.PaymentInstructions, dNoName).issues));

  // Override ON with a blank override name blocks.
  const dBlank = fullData(); dBlank.payeeIsNonLandlord = true; dBlank.payeeOverrideName = '  ';
  const vBlank = validateStep(FlowStep.PaymentInstructions, dBlank);
  check('override on + blank name blocks', vBlank.canAdvance === false);
  check('override name issue surfaced', vBlank.issues.some((i) => /payee who receives rent/i.test(i)));

  // Override ON with a name advances.
  const dOk = fullData(); dOk.payeeIsNonLandlord = true; dOk.payeeOverrideName = 'Westside Property Management, Inc.';
  check('override on + name advances', validateStep(FlowStep.PaymentInstructions, dOk).canAdvance === true);
}

console.log('\n8. Landlord: signer + role + service date/method; agent needs authority');
{
  const ok = validateStep(FlowStep.LandlordAgentInfo, fullData());
  check('owner baseline ok', ok.canAdvance === true, JSON.stringify(ok.issues));

  const d = fullData(); Object.assign(d, individualLandlord('broker_or_manager')); d.authorityEvidenceOnFile = undefined;
  check('agent w/o authority fails', validateStep(FlowStep.LandlordAgentInfo, d).canAdvance === false);

  const d2 = fullData(); d2.serviceDate = 'nope';
  check('bad service date fails', validateStep(FlowStep.LandlordAgentInfo, d2).canAdvance === false);

  const d3 = fullData(); d3.serviceMethod = undefined;
  check('missing service method still advances (captured at serve time, determination 2026-06-12)',
    validateStep(FlowStep.LandlordAgentInfo, d3).canAdvance === true);
}

console.log('\n8b. Entity landlord: signerTitleRequired at intake (Defect #3 §1, LOCKED)');
{
  const okE = fullData();
  Object.assign(okE, entityLandlord('officer_member_trustee')); // sets signerTitle 'Managing Member'
  check('entity WITH title advances', validateStep(FlowStep.LandlordAgentInfo, okE).canAdvance === true,
    JSON.stringify(validateStep(FlowStep.LandlordAgentInfo, okE).issues));

  const noTitle = fullData();
  Object.assign(noTitle, entityLandlord('officer_member_trustee'));
  noTitle.signerTitle = '   '; // whitespace-only -> treated as blank
  const r = validateStep(FlowStep.LandlordAgentInfo, noTitle);
  check('entity with blank title is blocked at intake', r.canAdvance === false);
  check('title issue surfaced', r.issues.some((i) => /title/i.test(i)));
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

console.log('\n12. Dispute "yes" advances at the data layer (override modal is the UI-layer gate)');
{
  const d = fullData(); d.dispute = { tenantBankruptcy: 'yes', tenantFiledComplaint: 'no', tenantWrittenWithholding: 'no' };
  const s: NoticeFlowState = { step: FlowStep.PreflightDispute, data: d };
  const r = advance(s);
  check('moved (flagged but data-clears)', r.moved === true);
  check('advanced past preflight', r.state.step !== FlowStep.PreflightDispute);
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

console.log('\n=== FIX 1: LLC management type gating at LandlordIdentity ===');

type MgmtType = 'member-managed' | 'manager-managed' | 'not-sure';

function llcData(mgmt?: MgmtType): NoticeFlowData {
  const d = fullData();
  Object.assign(d, entityLandlord('officer_member_trustee'));
  if (d.landlordIdentity?.type === 'entity') {
    d.landlordIdentity = { ...d.landlordIdentity, managementType: mgmt };
  }
  return d;
}

console.log('\n14. LLC with no management type is blocked');
{
  const v = validateStep(FlowStep.LandlordIdentity, llcData(undefined));
  check('blocked', v.canAdvance === false);
  check('issue names the field', v.issues.some((i) => /how this LLC is managed/i.test(i)));
}

console.log('\n15. Member-managed LLC advances');
{
  const v = validateStep(FlowStep.LandlordIdentity, llcData('member-managed'));
  check('advances', v.canAdvance === true, JSON.stringify(v.issues));
}

console.log('\n16. Manager-managed LLC advances (warning is non-gating, on the signer step)');
{
  const v = validateStep(FlowStep.LandlordIdentity, llcData('manager-managed'));
  check('advances', v.canAdvance === true, JSON.stringify(v.issues));
}

console.log('\n17. "Not sure" advances (banner 1.3 is non-gating)');
{
  const v = validateStep(FlowStep.LandlordIdentity, llcData('not-sure'));
  check('advances', v.canAdvance === true, JSON.stringify(v.issues));
}

console.log('\n18. Non-LLC entity does not require a management type');
{
  const d = fullData();
  Object.assign(d, entityLandlord('officer_member_trustee', { entityType: 'corporation', entityLegalName: 'PTAG Holdings, Inc.' }));
  const v = validateStep(FlowStep.LandlordIdentity, d);
  check('advances', v.canAdvance === true, JSON.stringify(v.issues));
}

console.log('\n19. Individual landlord does not require a management type');
{
  const v = validateStep(FlowStep.LandlordIdentity, fullData());
  check('advances', v.canAdvance === true, JSON.stringify(v.issues));
}

console.log('\n20. Unconfirmed identity still blocks (regression)');
{
  const d = llcData('member-managed');
  d.landlordIdentityConfirmed = false;
  check('blocked', validateStep(FlowStep.LandlordIdentity, d).canAdvance === false);
}

console.log('\n21. Blank entity legal name still blocks (regression)');
{
  const d = llcData('member-managed');
  if (d.landlordIdentity?.type === 'entity') {
    d.landlordIdentity = { ...d.landlordIdentity, entityLegalName: '   ' };
  }
  check('blocked', validateStep(FlowStep.LandlordIdentity, d).canAdvance === false);
}

console.log('\n22. Blank mailing address blocks advancement (C7b gate)');
{
  const d = fullData();
  d.mailingAddress = '   ';
  const v = validateStep(FlowStep.LandlordIdentity, d);
  check('blocked', v.canAdvance === false);
  check('issue names the field', v.issues.some((i) => /mailing address/i.test(i)));
}
console.log(`\n${'-'.repeat(40)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`${'-'.repeat(40)}\n`);
if (failed > 0) process.exit(1);
