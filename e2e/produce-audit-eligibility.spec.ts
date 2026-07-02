// e2e/produce-audit-eligibility.spec.ts — §5.2 produce-audit → LAHD eligibility (Gate-3 Slice 2, Seam 4).
// Deploy-run, Preview-only. produce_audit presence is the durable LA-produce signal that GET /api/riskpath maps
// to lahd.eligible (app/api/riskpath/route.ts: `eligible: r.produce_audit != null`). Asserts:
//   1. seeded WITH audit → lahd.eligible true + dashboard renders the LAHD filing section
//   2. baseline WITHOUT audit → lahd.eligible false (produce_audit presence is load-bearing)
//   3. the produce-audit write endpoint is owner-scoped → foreign riskpath returns 404

import { test, expect, request } from '@playwright/test';

const SEED_SECRET = process.env.TEST_SEED_SECRET ?? '';
const RUN_ID = process.env.E2E_RUN_ID ?? '';
const authHeaders = { authorization: `Bearer ${SEED_SECRET}`, 'x-e2e-run-id': RUN_ID };

test('produce_audit presence drives LAHD eligibility + renders the filing section', async ({ page }) => {
  const ctx = await request.newContext();
  const seed = await ctx.post('/api/test/seed-produced-session', { headers: authHeaders, data: { withProduceAudit: true } });
  expect(seed.ok()).toBeTruthy();
  const { cookie, riskpathId } = await seed.json();
  const cookieHeader = { cookie: `op_chat_token=${cookie}` };

  const rp = await ctx.get('/api/riskpath', { headers: cookieHeader });
  expect(rp.ok()).toBeTruthy();
  const { records } = await rp.json();
  const row = records.find((r: { id: string }) => r.id === riskpathId);
  expect(row).toBeTruthy();
  expect(row.lahd.eligible).toBe(true);

  // Dashboard renders the LAHD filing section for the eligible row.
  await page.goto('/');
  await page.context().addCookies([{ name: 'op_chat_token', value: cookie, url: page.url() }]);
  await page.goto('/riskpath');
  await expect(page.getByTestId('lahd-filing-section').first()).toBeVisible();
});

test('baseline row without produce_audit is NOT LAHD-eligible', async () => {
  const ctx = await request.newContext();
  const seed = await ctx.post('/api/test/seed-produced-session', { headers: authHeaders, data: {} });
  expect(seed.ok()).toBeTruthy();
  const { cookie, riskpathId } = await seed.json();

  const rp = await ctx.get('/api/riskpath', { headers: { cookie: `op_chat_token=${cookie}` } });
  const { records } = await rp.json();
  const row = records.find((r: { id: string }) => r.id === riskpathId);
  expect(row).toBeTruthy();
  expect(row.lahd.eligible).toBe(false);
});

test('produce-audit write is owner-scoped (foreign riskpath → 404)', async () => {
  const ctx = await request.newContext();
  const seed = await ctx.post('/api/test/seed-produced-session', { headers: authHeaders, data: {} });
  expect(seed.ok()).toBeTruthy();
  const { cookie } = await seed.json();

  const laProduceAudit = {
    rtcFormHashes: null,
    rtcFormLastModified: null,
    rtcRefreshRunAt: null,
    lahdFilingPromptCopyVersion: 'Rev 2.6.2026',
    lahdFilingPromptAcknowledgedAt: new Date().toISOString(),
    isLaProductionUnblockedAtProduce: true,
    cachedResolverVerdictSource: 'e2e',
  };
  const foreign = await ctx.post('/api/notices/00000000-0000-4000-8000-000000000000/produce-audit', {
    headers: { cookie: `op_chat_token=${cookie}` },
    data: { laProduceAudit },
  });
  expect(foreign.status()).toBe(404);
});
