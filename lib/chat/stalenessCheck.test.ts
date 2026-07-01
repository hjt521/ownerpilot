// lib/chat/stalenessCheck.test.ts — PR-B serve-time staleness guard (pure comparison).
// Proves the wizard evaluateStaleness engine is reused unchanged, the reason→copy branch is deterministic, and
// {{changedFields}} is filled from evaluateStaleness's own labels. Plain tsx suite.

import { checkStaleness, fillChangedFields } from './stalenessCheck';
import { chatStalenessWarningAmountChanged, chatStalenessWarningFaceChanged } from './stalenessCopy';
import { toNoticeFlowData } from './toNoticeFlowData';
import { captureProductionSnapshot } from '@/lib/flow/escalation';
import type { IntakeState } from './intakeSchema';
import type { NoticeFlowData } from '@/lib/flow/noticeFlowState';

let passed = 0, failed = 0;
const check = (n: string, c: boolean, d = '') => { c ? passed++ : (failed++, console.log(`  ✗ ${n}${d ? ` — ${d}` : ''}`)); if (c) console.log(`  ✓ ${n}`); };

const state = (obj: Record<string, unknown>): IntakeState => {
  const out: Record<string, { value: unknown; confidence: number; updated_at: string }> = {};
  for (const [k, v] of Object.entries(obj)) out[k] = { value: v, confidence: 1, updated_at: '' };
  return out as IntakeState;
};
const base = state({
  property_address: '5537 La Mirada Ave, Los Angeles, CA 90038',
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

const data = toNoticeFlowData(base, '2026-06-30');
const prior = captureProductionSnapshot(data);

// fresh (identical) — not stale
check('identical data → not stale, no warning', (() => { const o = checkStaleness(data, prior); return !o.stale && o.warning === null && o.reason === null; })());

// no prior snapshot → fallback (not stale)
check('no prior snapshot → not stale (Surface-2 fallback path)', (() => { const o = checkStaleness(data, null); return !o.stale && o.warning === null; })());

// amount changed → AMOUNT_CHANGED + amount-branch copy
{
  const amountDrift: NoticeFlowData = { ...data, rentPeriods: data.rentPeriods.map((p) => ({ ...p, amount: 7000 })) };
  const o = checkStaleness(amountDrift, prior);
  check('amount drift → stale + AMOUNT_CHANGED', o.stale && o.reason === 'AMOUNT_CHANGED');
  check('amount drift → amount-branch copy, {{changedFields}} filled', o.warning === fillChangedFields(chatStalenessWarningAmountChanged, o.changedFields) && o.warning!.includes('Amount demanded') && !o.warning!.includes('{{changedFields}}'));
}

// face field changed (tenant name) → FACE_FIELD_CHANGED + face-branch copy
{
  const faceDrift: NoticeFlowData = { ...data, tenantNames: ['Someone Else'] };
  const o = checkStaleness(faceDrift, prior);
  check('tenant drift → stale + FACE_FIELD_CHANGED', o.stale && o.reason === 'FACE_FIELD_CHANGED');
  check('face drift → face-branch copy with tenant label', o.warning === fillChangedFields(chatStalenessWarningFaceChanged, o.changedFields) && o.warning!.includes('Tenant names'));
}

// serviceDate/serviceMethod change is NOT staleness (normal re-serve path)
{
  const dateDrift: NoticeFlowData = { ...data, serviceDate: '2026-07-05' };
  check('serviceDate change alone → NOT stale (normal re-serve)', checkStaleness(dateDrift, prior).stale === false);
}

check('fillChangedFields replaces the slot', fillChangedFields('x {{changedFields}} y', ['A', 'B']) === 'x A, B y');

console.log(`\n${'-'.repeat(44)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(44)}`);
if (failed > 0) process.exit(1);
