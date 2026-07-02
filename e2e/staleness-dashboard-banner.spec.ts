// e2e/staleness-dashboard-banner.spec.ts — PR-B Surface 2 (Gate-3 Slice 1, Seam 2). Deploy-run, Preview-only.
// A drifted claimed row surfaces the staleness banner on the /riskpath dashboard list; Dismiss records a
// dismiss_banner acknowledgment (POST /staleness-ack) and hides the banner.

import { test, expect, request } from '@playwright/test';

const SEED_SECRET = process.env.TEST_SEED_SECRET ?? '';
const RUN_ID = process.env.E2E_RUN_ID ?? '';

test('dashboard row shows staleness banner on drift; Dismiss records ack + hides it', async ({ page }) => {
  const ctx = await request.newContext();
  const seed = await ctx.post('/api/test/seed-produced-session', {
    headers: { authorization: `Bearer ${SEED_SECRET}`, 'x-e2e-run-id': RUN_ID },
    data: {},
  });
  expect(seed.ok()).toBeTruthy();
  const { cookie } = await seed.json();
  const cookieHeader = { cookie: `op_chat_token=${cookie}` };

  // Drift a face field so the current intake diverges from the row's frozen snapshot.
  const patch = await ctx.patch('/api/chat/review', { headers: cookieHeader, data: { field: 'rent_amount_due', value: '6500' } });
  expect(patch.ok()).toBeTruthy();

  // Deterministic API-level assertion: GET /api/riskpath now reports the row as stale.
  const rp = await ctx.get('/api/riskpath', { headers: cookieHeader });
  expect(rp.ok()).toBeTruthy();
  const { records } = await rp.json();
  expect(records.length).toBeGreaterThan(0);
  expect(records.some((r: { staleness?: { stale?: boolean } }) => r.staleness?.stale === true)).toBe(true);

  // UI-level assertion: authenticate the browser with the same claimed cookie, load the dashboard.
  await page.goto('/');
  await page.context().addCookies([{ name: 'op_chat_token', value: cookie, url: page.url() }]);
  await page.goto('/riskpath');

  const dismiss = page.getByRole('button', { name: /dismiss/i }).first();
  await expect(dismiss).toBeVisible();

  // Dismiss records the acknowledgment (dismiss_banner) then hides the banner locally.
  const ackPost = page.waitForResponse((r) => r.url().includes('/staleness-ack') && r.request().method() === 'POST');
  await dismiss.click();
  await ackPost;
  await expect(dismiss).toBeHidden();
});
