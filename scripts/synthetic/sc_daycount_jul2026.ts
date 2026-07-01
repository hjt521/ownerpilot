#!/usr/bin/env tsx
/**
 * Synthetic SC-DAYCOUNT-JUL2026 — end-to-end produce-face day-count assertion.
 *
 * Source: lahd_eviction_filing_cover_sheet_and_3day_count_defect_broker_ruling_2026-06-30.md §4 + §6 [MUST FIX].
 * Guards the exact regression that shipped a facially-defective notice: a 3-day notice SERVED Tuesday
 * 2026-06-30 must EXPIRE end of day Monday 2026-07-06 (Fri Jul 3 is the observed Independence Day judicial
 * holiday; Jul 4-5 weekend). The prior defect stated "July 2, 2026".
 *
 * Unlike the A14 retry synthetics, this needs NO database — it exercises the production day-count engine
 * (computeCompliancePeriod + the verified holiday set), the notice model (renderNotice), AND the rendered
 * document (buildNoticeDocumentHtml). It therefore catches all three defect classes the ruling named:
 * (1) day-count engine logic, (2) the holiday table, (3) the notice-template renderer. Runs on every CI commit
 * (dedicated workflow) — process.exit(1) on any failure.
 *
 * Run: npm run synthetic:daycount:jul2026   (or: npx tsx scripts/synthetic/sc_daycount_jul2026.ts)
 */

import { computeCompliancePeriod, type ServiceMethod } from '@/lib/dates/computeCompliancePeriod';
import { getVerifiedHolidaySet } from '@/lib/dates/holidays';
import { renderNotice, formatNoticeDate } from '@/lib/produce/renderNotice';
import { buildNoticeDocumentHtml } from '@/lib/produce/buildNoticeHtml';
import { toNoticeFlowData } from '@/lib/chat/toNoticeFlowData';
import type { IntakeState } from '@/lib/chat/intakeSchema';

const SERVICE_DATE = '2026-06-30';        // Tuesday
const EXPECTED_EXPIRATION = '2026-07-06'; // Monday (Fri Jul 3 = Independence Day observed; Sat/Sun skip)
const DEFECT_EXPIRATION = '2026-07-02';   // the wrong date the defective notice printed

let passed = 0, failed = 0;
const check = (n: string, c: boolean, d = '') => { c ? passed++ : (failed++, console.log(`  ✗ ${n}${d ? ` — ${d}` : ''}`)); if (c) console.log(`  ✓ ${n}`); };

const state = (obj: Record<string, unknown>): IntakeState => {
  const out: Record<string, { value: unknown; confidence: number; updated_at: string }> = {};
  for (const [k, v] of Object.entries(obj)) out[k] = { value: v, confidence: 1, updated_at: '' };
  return out as IntakeState;
};

// The exact Clifton Alexander shape from the defect ruling (5537 La Mirada Ave, $6,000, personal service).
const intake = state({
  property_address: '5537 La Mirada Ave, Unit 202, Los Angeles, CA 90038',
  tenant_names: ['Clifton Alexander'],
  landlord_phone: '(213) 555-0100',
  landlord_mailing_address: '123 Main St, Los Angeles, CA 90012',
  rent_periods: [{ periodStartDate: '2026-05-01', periodEndDate: '2026-05-31', amount: 6000 }],
  signer_capacity: { capacity: 'owner', landlordIdentity: { type: 'individual', names: ['Maria Lopez'] }, signerName: 'Maria Lopez' },
  preflight_dispute: { tenantFiledComplaint: 'no', tenantWrittenWithholding: 'no', tenantBankruptcy: 'no' },
  payment_methods_accepted: ['in_person'],
  preferred_service_method: 'personal',
  personal_delivery: { days: 'Monday through Friday', hours: '9:00 a.m. to 5:00 p.m.' },
});

// (1) Engine layer.
const holidays = getVerifiedHolidaySet(2026);
const period = computeCompliancePeriod({ serviceDate: SERVICE_DATE, serviceMethod: 'personal' as ServiceMethod, holidays });
check('engine: 2026-06-30 personal -> expiration 2026-07-06', period.expirationDate === EXPECTED_EXPIRATION, period.expirationDate);
check('engine: NOT the defect date 2026-07-02', period.expirationDate !== DEFECT_EXPIRATION);

// (2) Model + (3) rendered-face layer.
const data = toNoticeFlowData(intake, SERVICE_DATE);
const { model } = renderNotice({ data, dates: { compliancePeriodStartDate: period.commencementDate, compliancePeriodEndDate: period.expirationDate } });
const expectedFace = formatNoticeDate(EXPECTED_EXPIRATION);
const defectFace = formatNoticeDate(DEFECT_EXPIRATION);
check('model: expirationFormatted is the correct face date', model.compliance.expirationFormatted === expectedFace, model.compliance.expirationFormatted);

const html = buildNoticeDocumentHtml(model);
check('face: rendered notice shows the correct expiration', html.includes(expectedFace), expectedFace);
check('face: rendered notice does NOT show the defect date', !html.includes(defectFace), defectFace);

console.log(`\n${'-'.repeat(52)}\n  SC-DAYCOUNT-JUL2026: ${passed} passed, ${failed} failed\n${'-'.repeat(52)}`);
if (failed > 0) process.exit(1);
