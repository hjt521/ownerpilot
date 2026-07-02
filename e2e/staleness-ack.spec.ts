// e2e/staleness-ack.spec.ts — PR-B Surface 3 (Gate-3 Slice 1, Seam 3). Deploy-run, Preview-only.
// The staleness-ack endpoint (app/api/notices/[riskpathId]/staleness-ack): all three action_taken values persist;
// a foreign (non-owned) riskpath is rejected 404; an invalid action_taken enum is rejected 400.

import { test, expect, request } from '@playwright/test';

const SEED_SECRET = process.env.TEST_SEED_SECRET ?? '';
const RUN_ID = process.env.E2E_RUN_ID ?? '';
const ACTIONS = ['proceed_to_reproduce', 'dismiss_banner', 'cancel_at_generate'] as const;

test('staleness-ack accepts all three actions; rejects foreign row + invalid enum', async () => {
  const ctx = await request.newContext();
  const seed = await ctx.post('/api/test/seed-produced-session', {
    headers: { authorization: `Bearer ${SEED_SECRET}`, 'x-e2e-run-id': RUN_ID },
    data: {},
  });
  expect(seed.ok()).toBeTruthy();
  const { cookie, riskpathId } = await seed.json();
  const cookieHeader = { cookie: `op_chat_token=${cookie}` };

  // All three action_taken values are accepted (insert-only compliance artifact).
  for (const action_taken of ACTIONS) {
    const res = await ctx.post(`/api/notices/${riskpathId}/staleness-ack`, {
      headers: cookieHeader,
      data: { staleness_reason: 'AMOUNT_CHANGED', changed_fields: ['Amount demanded'], action_taken },
    });
    expect(res.ok(), `action_taken=${action_taken}`).toBeTruthy();
    expect((await res.json()).ok).toBe(true);
  }

  // Owner-scope: a riskpath the claimed session does not own → 404 not_found.
  const foreign = await ctx.post('/api/notices/00000000-0000-4000-8000-000000000000/staleness-ack', {
    headers: cookieHeader,
    data: { staleness_reason: 'AMOUNT_CHANGED', changed_fields: [], action_taken: 'dismiss_banner' },
  });
  expect(foreign.status()).toBe(404);

  // Invalid action_taken enum → 400 invalid_ack.
  const bad = await ctx.post(`/api/notices/${riskpathId}/staleness-ack`, {
    headers: cookieHeader,
    data: { staleness_reason: 'AMOUNT_CHANGED', changed_fields: [], action_taken: 'not_a_real_action' },
  });
  expect(bad.status()).toBe(400);
});
