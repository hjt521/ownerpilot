// lib/riskpath/durableService.test.ts
// Focused identity invariants for Durable Service Evidence V1.

import type { IntakeState } from '@/lib/chat/intakeSchema';
import {
  buildPendingCreatedNoticeBinding,
  hasCompleteCreatedNoticeBinding,
  hasFinalizedCreatedNoticeBinding,
  recomputeCreatedNoticeBinding,
} from './durableService';

let passed = 0, failed = 0;
const check = (name: string, condition: boolean) => {
  if (condition) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.error(`  ✗ ${name}`); }
};
function state(obj: Record<string, unknown>): IntakeState {
  return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, { value, confidence: 1, updated_at: '2026-08-17T00:00:00Z' }])) as IntakeState;
}

const intake = state({
  property_address: '5537 La Mirada Ave, Los Angeles, CA 90038',
  tenant_names: ['Clifton Alexander'],
  landlord_phone: '(213) 555-0100',
  landlord_mailing_address: '123 Main St, Los Angeles, CA 90012',
  rent_periods: [{ periodStartDate: '2026-07-01', periodEndDate: '2026-07-31', amount: 6000 }],
  signer_capacity: { capacity: 'owner', landlordIdentity: { type: 'individual', names: ['Maria Lopez'] }, signerName: 'Maria Lopez' },
  preflight_dispute: { tenantFiledComplaint: 'no', tenantWrittenWithholding: 'no', tenantBankruptcy: 'no' },
  payment_methods_accepted: ['in_person'],
  preferred_service_method: 'personal',
  personal_delivery: { days: 'Monday through Friday', hours: '9:00 a.m. to 5:00 p.m.' },
});

const a = buildPendingCreatedNoticeBinding({
  intakeState: intake,
  intendedServiceDate: '2026-08-17',
  artifactId: '49d44a79-8444-4f20-b126-14599e985c67',
});
const b = buildPendingCreatedNoticeBinding({
  intakeState: intake,
  intendedServiceDate: '2026-08-17',
  artifactId: '2e109bd2-4cbe-471e-86c2-aa808ccb09ce',
});

check('pending binding stores exact frozen service date', a.created_notice_service_date === '2026-08-17');
check('pending binding is not finalized before successful client production', a.created_notice_finalized_at === null);
check('complete pending identity is structurally present', hasCompleteCreatedNoticeBinding(a));
check('pending identity is not service-authoritative', !hasFinalizedCreatedNoticeBinding(a));
check('same material Create state deterministically yields same generation', a.created_notice_generation === b.created_notice_generation);
check('same material generation event facts still receive distinct opaque artifact IDs', a.created_notice_artifact_id !== b.created_notice_artifact_id);
check('same generation yields same build-owned semantic binding', a.created_notice_semantic_binding_id === b.created_notice_semantic_binding_id);

const recomputed = recomputeCreatedNoticeBinding({ intakeState: intake, intendedServiceDate: '2026-08-17' });
check('server recomputation matches stored material generation', recomputed.created_notice_generation === a.created_notice_generation);
check('server recomputation matches stored semantic binding', recomputed.created_notice_semantic_binding_id === a.created_notice_semantic_binding_id);

const finalized = { ...a, created_notice_finalized_at: '2026-08-17T07:30:00.000Z' };
check('finalized exact binding becomes service-authoritative', hasFinalizedCreatedNoticeBinding(finalized));

let badUuidRejected = false;
try { buildPendingCreatedNoticeBinding({ intakeState: intake, intendedServiceDate: '2026-08-17', artifactId: 'not-an-id' }); } catch { badUuidRejected = true; }
check('artifact event identity cannot be derived from arbitrary caller text', badUuidRejected);

console.log(`\n${'-'.repeat(48)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(48)}`);
if (failed > 0) process.exit(1);
