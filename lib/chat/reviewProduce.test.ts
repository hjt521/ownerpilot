// lib/chat/reviewProduce.test.ts — PR-A3 §5.2 core.
// Proves: envelope → wizard-parity NoticeFlowData (renderNotice no-throw); facial dates computed; and the
// jurisdiction verdict routes correctly — LA green path → la_overlay; non-LA / manual-review / unresolved /
// gate-closed → the stubbed surface. Client verdict resolution is injected (no browser). Plain tsx suite.

import {
  buildNoticeDataFromEnvelope, computeDatesForData, routeForVerdict, planProduce,
  type ProduceEnvelope,
} from './reviewProduce';
import { renderNotice } from '@/lib/produce/renderNotice';
import type { BridgeRunResult } from '@/lib/flow/jurisdictionBridge';

let passed = 0, failed = 0;
const check = (n: string, c: boolean, d = '') => { c ? passed++ : (failed++, console.log(`  ✗ ${n}${d ? ` — ${d}` : ''}`)); if (c) console.log(`  ✓ ${n}`); };

const envelope = (): ProduceEnvelope => ({
  ok: true, riskpathId: 'rp_1', lahdCopyVersion: 'v1', baseName: 'notice',
  payload: {
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
    serviceDate: '2026-06-30',
  },
});

/** A fetch stub that returns a geocode 200 with the given disposition. */
const geocodeFetch = (disposition: string): typeof fetch =>
  (async () => ({ status: 200, json: async () => ({ disposition, reviewReason: null }) })) as unknown as typeof fetch;
const openGate = () => true;
const closedGate = () => false;

// --- envelope → data + dates ------------------------------------------------
{
  const data = buildNoticeDataFromEnvelope(envelope());
  check('envelope → NoticeFlowData (serviceDate carried)', data.serviceDate === '2026-06-30' && data.signingDate === '2026-06-30');
  const dates = computeDatesForData(data);
  check('dates computed (2026-06-30 personal → 2026-07-06 expiration)', dates.compliancePeriodEndDate === '2026-07-06');
  let threw = false;
  try { renderNotice({ data, dates }); } catch { threw = true; }
  check('renderNotice does not throw on the chat-assembled model (wizard parity)', !threw);
}

// missing serviceDate throws
{
  const env = envelope(); delete (env.payload as Record<string, unknown>).serviceDate;
  let threw = false;
  try { buildNoticeDataFromEnvelope(env); } catch { threw = true; }
  check('missing serviceDate throws (no defaulting)', threw);
}

// --- routeForVerdict (pure) -------------------------------------------------
const v = (verdict: string): BridgeRunResult => ({ kind: 'verdict', verdict: verdict as 'confirmed_la', addressKey: 'k' });
check('route: confirmed_la → la_overlay', routeForVerdict(v('confirmed_la')).kind === 'la_overlay');
check('route: not_la → stub/non_la', JSON.stringify(routeForVerdict(v('not_la'))) === JSON.stringify({ kind: 'stub', reason: 'non_la' }));
check('route: manual_review → stub/broker_confirm', JSON.stringify(routeForVerdict(v('manual_review'))) === JSON.stringify({ kind: 'stub', reason: 'broker_confirm' }));
check('route: resolution_failed → stub/unresolved', JSON.stringify(routeForVerdict(v('resolution_failed'))) === JSON.stringify({ kind: 'stub', reason: 'unresolved' }));
check('route: skipped_gate_closed → stub/gate_closed', (routeForVerdict({ kind: 'skipped_gate_closed' }) as { reason?: string }).reason === 'gate_closed');
check('route: skipped_no_address → stub/unresolved', (routeForVerdict({ kind: 'skipped_no_address' }) as { reason?: string }).reason === 'unresolved');

// --- planProduce (async, injected fetch + gate) -----------------------------
async function main() {
  const laPlan = await planProduce(envelope(), { isGateOpen: openGate, fetchImpl: geocodeFetch('confirmed_la') });
  check('plan: confirmed_la → la_overlay green path', laPlan.route.kind === 'la_overlay' && laPlan.baseName === 'notice');
  check('plan: carries data + dates', laPlan.data.serviceDate === '2026-06-30' && laPlan.dates.compliancePeriodEndDate === '2026-07-06');

  const notLaPlan = await planProduce(envelope(), { isGateOpen: openGate, fetchImpl: geocodeFetch('not_la') });
  check('plan: not_la → stub/non_la', notLaPlan.route.kind === 'stub' && (notLaPlan.route as { reason: string }).reason === 'non_la');

  let fetchCalled = false;
  const spyFetch: typeof fetch = (async () => { fetchCalled = true; return { status: 200, json: async () => ({}) }; }) as unknown as typeof fetch;
  const gatedPlan = await planProduce(envelope(), { isGateOpen: closedGate, fetchImpl: spyFetch });
  check('plan: gate closed → stub/gate_closed, no geocode fetch', gatedPlan.route.kind === 'stub' && (gatedPlan.route as { reason: string }).reason === 'gate_closed' && fetchCalled === false);

  console.log(`\n${'-'.repeat(44)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(44)}`);
  if (failed > 0) process.exit(1);
}
main();
