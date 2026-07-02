// e2e/staleness-reproduce.spec.ts — PR-B Surface 1 (Gate-3 Slice 1, Seam 1). Deploy-run, Preview-only.
// Flow: seed a claimed, produced (snapshot-bearing), non-counsel session → drift a face field via the real
// /api/chat/review edit path → re-produce returns 409 stale_notice pointing at the prior row → record the
// acknowledgment (Surface 3 write path) → re-produce WITH acknowledgedStaleness succeeds.
// Preview-only: the seed endpoint 404s in production (E4 S2); this never runs against prod (run-window Amendment A).

import { test, expect, request } from '@playwright/test';

const SEED_SECRET = process.env.TEST_SEED_SECRET ?? '';
const RUN_ID = process.env.E2E_RUN_ID ?? '';
// Near-future intended service date (validated by from-chat's validateIntendedServiceDate).
const SERVICE_DATE = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10);

test('drifted re-produce is warned (409 stale_notice), then succeeds after acknowledgment', async () => {
  const ctx = await request.newContext();
  const authHeaders = { authorization: `Bearer ${SEED_SECRET}`, 'x-e2e-run-id': RUN_ID };

  // Seed a claimed, produced, non-counsel session (prior riskpath row carries produce_snapshot).
  const seed = await ctx.post('/api/test/seed-produced-session', { headers: authHeaders, data: {} });
  expect(seed.ok()).toBeTruthy();
  const { cookie, riskpathId } = await seed.json();
  const cookieHeader = { cookie: `op_chat_token=${cookie}` };

  // Drift a face-determining field (rent amount) through the real owner-edit path.
  const patch = await ctx.patch('/api/chat/review', { headers: cookieHeader, data: { field: 'rent_amount_due', value: '6500' } });
  expect(patch.ok()).toBeTruthy();

  // Re-produce WITHOUT acknowledgment → 409 stale_notice referencing the prior produced row.
  const stale = await ctx.post('/api/notice/produce/from-chat', {
    headers: { ...cookieHeader, 'x-e2e-run-id': RUN_ID },
    data: { intendedServiceDate: SERVICE_DATE },
  });
  expect(stale.status()).toBe(409);
  const body = await stale.json();
  expect(body.error).toBe('stale_notice');
  expect(body.priorRiskpathId).toBe(riskpathId);
  expect(['AMOUNT_CHANGED', 'FACE_FIELD_CHANGED']).toContain(body.staleness.reason);
  expect(body.staleness.changedFields.length).toBeGreaterThan(0);
  expect(body.staleness.warning).toBeTruthy();

  // Record the acknowledgment (Surface 3 endpoint), then re-produce WITH the ack → success.
  const ack = await ctx.post(`/api/notices/${riskpathId}/staleness-ack`, {
    headers: cookieHeader,
    data: { staleness_reason: body.staleness.reason, changed_fields: body.staleness.changedFields, action_taken: 'proceed_to_reproduce' },
  });
  expect(ack.ok()).toBeTruthy();
  expect((await ack.json()).ok).toBe(true);

  const ok = await ctx.post('/api/notice/produce/from-chat', {
    headers: { ...cookieHeader, 'x-e2e-run-id': RUN_ID },
    data: { intendedServiceDate: SERVICE_DATE, acknowledgedStaleness: true },
  });
  expect(ok.ok()).toBeTruthy();
});
