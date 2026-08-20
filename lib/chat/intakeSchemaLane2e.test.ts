// lib/chat/intakeSchemaLane2e.test.ts — Lane 2E produce-completeness schema additions.
// Plain tsx suite (process.exit on failure), per scripts/run_tests.mjs.

import {
  rentPeriodSchema,
  signerCaptureSchema,
  personalDeliverySchema,
  preflightDisputeSchema,
  intakeFieldValueSchema,
  REQUIRED_FIELDS,
} from './intakeSchema';
import { missingRequiredFields } from './intakeMerge';
import { NoticeFlowMapError, toNoticeFlowData } from './toNoticeFlowData';
import { completeIntakeState } from '../testing/e2eIntakeFixture';

let passed = 0, failed = 0;
const check = (n: string, c: boolean, d = '') => { c ? passed++ : (failed++, console.log(`  ✗ ${n}${d ? ` — ${d}` : ''}`)); if (c) console.log(`  ✓ ${n}`); };
const ok = (r: { success: boolean }) => r.success;

// rent_periods
check('rentPeriod: valid dated period', ok(rentPeriodSchema.safeParse({ periodStartDate: '2026-05-01', periodEndDate: '2026-05-31', amount: 6000 })));
check('rentPeriod: rejects non-ISO date', !ok(rentPeriodSchema.safeParse({ periodStartDate: '05/01/2026', periodEndDate: '2026-05-31', amount: 6000 })));
check('rentPeriod: rejects non-positive amount', !ok(rentPeriodSchema.safeParse({ periodStartDate: '2026-05-01', periodEndDate: '2026-05-31', amount: 0 })));

// signer_capacity (individual + entity branches)
check('signer: individual owner', ok(signerCaptureSchema.safeParse({ capacity: 'owner', landlordIdentity: { type: 'individual', names: ['Maria Lopez'] }, signerName: 'Maria Lopez' })));
check('signer: entity officer', ok(signerCaptureSchema.safeParse({ capacity: 'officer_member_trustee', landlordIdentity: { type: 'entity', entityLegalName: 'PTAG L LLC', entityType: 'llc', managementType: 'manager-managed' }, signerName: 'C. Alexander', signerTitle: 'Manager' })));
check('signer: rejects entity missing legal name', !ok(signerCaptureSchema.safeParse({ capacity: 'officer_member_trustee', landlordIdentity: { type: 'entity', entityLegalName: '', entityType: 'llc' }, signerName: 'x' })));
check('signer: rejects unknown capacity', !ok(signerCaptureSchema.safeParse({ capacity: 'ceo', landlordIdentity: { type: 'individual', names: ['x'] }, signerName: 'x' })));

// personal_delivery
check('personalDelivery: valid', ok(personalDeliverySchema.safeParse({ days: 'Mon–Fri', hours: '9am–5pm' })));

// preflight_dispute (tri-state; unknown first-class)
check('dispute: all tri-state answers', ok(preflightDisputeSchema.safeParse({ tenantFiledComplaint: 'no', tenantWrittenWithholding: 'unknown', tenantBankruptcy: 'no' })));
check('dispute: rejects boolean (tri-state required)', !ok(preflightDisputeSchema.safeParse({ tenantFiledComplaint: false, tenantWrittenWithholding: 'no', tenantBankruptcy: 'no' })));
check('dispute: rejects out-of-enum', !ok(preflightDisputeSchema.safeParse({ tenantFiledComplaint: 'maybe', tenantWrittenWithholding: 'no', tenantBankruptcy: 'no' })));

// intakeFieldValueSchema (partial) accepts the 4 new fields together
check('intakeFieldValueSchema parses the 4 Lane 2E fields', ok(intakeFieldValueSchema.safeParse({
  rent_periods: [{ periodStartDate: '2026-05-01', periodEndDate: '2026-05-31', amount: 6000 }],
  signer_capacity: { capacity: 'owner', landlordIdentity: { type: 'individual', names: ['Maria Lopez'] }, signerName: 'Maria Lopez' },
  personal_delivery: { days: 'Mon–Fri', hours: '9am–5pm' },
  preflight_dispute: { tenantFiledComplaint: 'no', tenantWrittenWithholding: 'no', tenantBankruptcy: 'no' },
})));

// REQUIRED_FIELDS gate
check('REQUIRED_FIELDS includes landlord_phone', REQUIRED_FIELDS.includes('landlord_phone'));
check('REQUIRED_FIELDS includes rent_periods', REQUIRED_FIELDS.includes('rent_periods'));
check('REQUIRED_FIELDS includes signer_capacity', REQUIRED_FIELDS.includes('signer_capacity'));
check('REQUIRED_FIELDS includes preflight_dispute', REQUIRED_FIELDS.includes('preflight_dispute'));
check('REQUIRED_FIELDS does NOT include personal_delivery (conditional)', !REQUIRED_FIELDS.includes('personal_delivery'));

// Shared E2E fixture is explicitly complete under the current Lane 2E contract; no defaults or inferred face data.
const fixture = completeIntakeState('2026-07-01T00:00:00.000Z');
const fixtureMissing = missingRequiredFields(fixture);
check('E2E fixture has no missing required/conditional fields', fixtureMissing.length === 0, fixtureMissing.join(', '));
check('E2E fixture explicitly contains landlord_phone', fixture.landlord_phone?.value === '(213) 555-0100');
const fixtureRentPeriods = fixture.rent_periods?.value;
check('E2E fixture explicitly contains canonical rent_periods', Array.isArray(fixtureRentPeriods) && fixtureRentPeriods.length === 1);
check('E2E fixture explicitly contains signer_capacity', (fixture.signer_capacity?.value as { capacity?: string } | undefined)?.capacity === 'officer_member_trustee');
check('E2E fixture explicitly contains preflight_dispute', (fixture.preflight_dispute?.value as { tenantFiledComplaint?: string } | undefined)?.tenantFiledComplaint === 'no');
check('E2E fixture explicitly contains conditional personal_delivery', (fixture.personal_delivery?.value as { days?: string } | undefined)?.days === 'Monday through Friday');

let mapperTraversed = false;
let mappedPhone = '';
let mappedRentAmount = 0;
try {
  const mapped = toNoticeFlowData(fixture, '2026-07-10');
  mapperTraversed = true;
  mappedPhone = mapped.landlordContact?.phone ?? '';
  mappedRentAmount = mapped.rentPeriods?.[0]?.amount ?? 0;
} catch {
  mapperTraversed = false;
}
check('E2E fixture traverses unchanged mapper without defaulting', mapperTraversed);
check('mapper preserves explicit fixture landlord_phone', mappedPhone === '(213) 555-0100');
check('mapper preserves explicit fixture rent_periods', mappedRentAmount === 6000);

const fixtureWithoutPhone = { ...fixture };
delete fixtureWithoutPhone.landlord_phone;
check('missingRequiredFields reports landlord_phone when absent', missingRequiredFields(fixtureWithoutPhone).includes('landlord_phone'));
let missingPhoneRejected = false;
try {
  toNoticeFlowData(fixtureWithoutPhone, '2026-07-10');
} catch (err) {
  missingPhoneRejected = err instanceof NoticeFlowMapError && /landlord phone/i.test(err.message);
}
check('unchanged mapper still fail-closes on missing landlord_phone', missingPhoneRejected);

console.log(`\n${'-'.repeat(40)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(40)}`);
if (failed > 0) process.exit(1);
