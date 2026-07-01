// lib/chat/toNoticeFlowData.test.ts — Lane 2E CLOSURE GATE (ruling §4.5 / §4.2).
// Proves the mapper produces valid NoticeFlowData for renderNotice WITHOUT throw across the required cases,
// and that a flagged ('yes') dispute is refused by the produce gate (belt-and-suspenders even if G4 bypassed).
// Plain tsx suite (process.exit on failure), per scripts/run_tests.mjs.

import { toNoticeFlowData, NoticeFlowMapError } from './toNoticeFlowData';
import { renderNotice } from '@/lib/produce/renderNotice';
import { computeCompliancePeriod, type ServiceMethod } from '@/lib/dates/computeCompliancePeriod';
import { getVerifiedHolidaySet } from '@/lib/dates/holidays';
import { evaluateCanProduceV4 } from '@/lib/flow/gates';
import type { IntakeState } from './intakeSchema';

let passed = 0, failed = 0;
const check = (n: string, c: boolean, d = '') => { c ? passed++ : (failed++, console.log(`  ✗ ${n}${d ? ` — ${d}` : ''}`)); if (c) console.log(`  ✓ ${n}`); };

/** Build an IntakeState from a plain {field: value} map. */
function st(obj: Record<string, unknown>): IntakeState {
  const out: Record<string, { value: unknown; confidence: number; updated_at: string }> = {};
  for (const [k, v] of Object.entries(obj)) out[k] = { value: v, confidence: 1, updated_at: '2026-06-30T00:00:00Z' };
  return out as IntakeState;
}
function datesFor(serviceDate: string, method: ServiceMethod) {
  const holidays = getVerifiedHolidaySet(Number(serviceDate.slice(0, 4)));
  const p = computeCompliancePeriod({ serviceDate, serviceMethod: method, holidays });
  return { compliancePeriodStartDate: p.commencementDate, compliancePeriodEndDate: p.expirationDate };
}

const base = {
  property_address: '5537 La Mirada Ave, Los Angeles, CA 90038',
  tenant_names: ['Clifton Alexander'],
  landlord_phone: '(213) 555-0100',
  landlord_mailing_address: '123 Main St, Los Angeles, CA 90012',
  personal_delivery: { days: 'Monday through Friday', hours: '9:00 a.m. to 5:00 p.m.' },
};
const noDispute = { tenantFiledComplaint: 'no', tenantWrittenWithholding: 'no', tenantBankruptcy: 'no' };

// Case 1 — individual / single-period / personal.
{
  const d = toNoticeFlowData(st({
    ...base,
    rent_periods: [{ periodStartDate: '2026-05-01', periodEndDate: '2026-05-31', amount: 6000 }],
    signer_capacity: { capacity: 'owner', landlordIdentity: { type: 'individual', names: ['Maria Lopez'] }, signerName: 'Maria Lopez' },
    preflight_dispute: noDispute,
    payment_methods_accepted: ['in_person'],
    preferred_service_method: 'personal',
  }), '2026-06-30');
  let threw = false;
  try { renderNotice({ data: d, dates: datesFor('2026-06-30', 'personal') }); } catch { threw = true; }
  check('case1 individual/single/personal: renderNotice does not throw', !threw);
  check('case1: Dated=serviceDate=signingDate=2026-06-30', d.serviceDate === '2026-06-30' && d.signingDate === '2026-06-30');
  check('case1: in_person carries personal-delivery days/hours', d.personalDeliveryDays === 'Monday through Friday' && d.personalDeliveryHours === '9:00 a.m. to 5:00 p.m.');
}

// Case 2 — entity / multi-period / substituted (by_mail).
{
  const d = toNoticeFlowData(st({
    ...base,
    rent_periods: [
      { periodStartDate: '2026-04-01', periodEndDate: '2026-04-30', amount: 6000 },
      { periodStartDate: '2026-05-01', periodEndDate: '2026-05-31', amount: 6000 },
    ],
    signer_capacity: { capacity: 'officer_member_trustee', landlordIdentity: { type: 'entity', entityLegalName: 'PTAG L LLC', entityType: 'llc', managementType: 'manager-managed' }, signerName: 'C. Alexander', signerTitle: 'Manager' },
    preflight_dispute: noDispute,
    payment_methods_accepted: ['by_mail'],
    preferred_service_method: 'substituted',
  }), '2026-06-30');
  let threw = false;
  try { renderNotice({ data: d, dates: datesFor('2026-06-30', 'substituted') }); } catch { threw = true; }
  check('case2 entity/multi/substituted: renderNotice does not throw', !threw);
  check('case2: entity landlordIdentity mapped', d.landlordIdentity?.type === 'entity');
}

// Case 3 — 'unknown' dispute variant: mapper carries it faithfully; renderNotice (face) still renders.
{
  const d = toNoticeFlowData(st({
    ...base,
    rent_periods: [{ periodStartDate: '2026-05-01', periodEndDate: '2026-05-31', amount: 6000 }],
    signer_capacity: { capacity: 'owner', landlordIdentity: { type: 'individual', names: ['Maria Lopez'] }, signerName: 'Maria Lopez' },
    preflight_dispute: { tenantFiledComplaint: 'no', tenantWrittenWithholding: 'unknown', tenantBankruptcy: 'no' },
    payment_methods_accepted: ['in_person'],
    preferred_service_method: 'personal',
  }), '2026-06-30');
  check("case3: 'unknown' carried, not collapsed to 'no'", d.dispute.tenantWrittenWithholding === 'unknown');
  let threw = false;
  try { renderNotice({ data: d, dates: datesFor('2026-06-30', 'personal') }); } catch { threw = true; }
  check('case3: renderNotice does not throw on unknown-dispute face', !threw);
}

// Case 4 — 'yes' dispute: mapper maps it; the produce gate REFUSES (DISPUTE_NOT_CLEARED) even without G4.
{
  const d = toNoticeFlowData(st({
    ...base,
    rent_periods: [{ periodStartDate: '2026-05-01', periodEndDate: '2026-05-31', amount: 6000 }],
    signer_capacity: { capacity: 'owner', landlordIdentity: { type: 'individual', names: ['Maria Lopez'] }, signerName: 'Maria Lopez' },
    preflight_dispute: { tenantFiledComplaint: 'yes', tenantWrittenWithholding: 'no', tenantBankruptcy: 'no' },
    payment_methods_accepted: ['in_person'],
    preferred_service_method: 'personal',
  }), '2026-06-30');
  check("case4: 'yes' carried faithfully", d.dispute.tenantFiledComplaint === 'yes');
  const gate = evaluateCanProduceV4(d);
  check('case4: gate refuses produce (canProduce false)', gate.canProduce === false);
  check('case4: gate blocker is DISPUTE_NOT_CLEARED', gate.blockers.some((b) => b.code === 'DISPUTE_NOT_CLEARED'));
}

// Anti-defaulting — a missing required field throws with a category-specific message (no silent default).
{
  let err: Error | null = null;
  try {
    toNoticeFlowData(st({
      ...base,
      // rent_periods MISSING
      signer_capacity: { capacity: 'owner', landlordIdentity: { type: 'individual', names: ['Maria Lopez'] }, signerName: 'Maria Lopez' },
      preflight_dispute: noDispute,
      payment_methods_accepted: ['in_person'],
      preferred_service_method: 'personal',
    }), '2026-06-30');
  } catch (e) { err = e as Error; }
  check('missing rent_periods throws NoticeFlowMapError', err instanceof NoticeFlowMapError);
  check('throw message is category-specific (rent periods)', !!err && /rent periods/i.test(err.message));
}

console.log(`\n${'-'.repeat(40)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(40)}`);
if (failed > 0) process.exit(1);
