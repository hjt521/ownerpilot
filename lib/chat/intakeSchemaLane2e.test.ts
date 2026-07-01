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
check('REQUIRED_FIELDS includes rent_periods', REQUIRED_FIELDS.includes('rent_periods'));
check('REQUIRED_FIELDS includes signer_capacity', REQUIRED_FIELDS.includes('signer_capacity'));
check('REQUIRED_FIELDS includes preflight_dispute', REQUIRED_FIELDS.includes('preflight_dispute'));
check('REQUIRED_FIELDS does NOT include personal_delivery (conditional)', !REQUIRED_FIELDS.includes('personal_delivery'));

console.log(`\n${'-'.repeat(40)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(40)}`);
if (failed > 0) process.exit(1);
