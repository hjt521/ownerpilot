// e2e/lahd-filing-record.spec.ts — PR-C Surface 5 (Gate-3 Slice 3, Seam 5). Deploy-run, Preview-only.
// LAHD filing-completion tracking: a produced (eligible) row starts with no filing → POST a filing record →
// GET /api/riskpath reflects lahd.latestFiling → invalid channel + future date rejected 400 → foreign riskpath 404.
// Reuses the Slice-2 seed unmodified with withProduceAudit:true (eligible row; lahd_filing_records starts empty).

import { test, expect, request } from '@playwright/test';

const SEED_SECRET = process.env.TEST_SEED_SECRET ?? '';
const RUN_ID = process.env.E2E_RUN_ID ?? '';
const authHeaders = { authorization: `Bearer ${SEED_SECRET}`, 'x-e2e-run-id': RUN_ID };
const TODAY = new Date().toISOString().slice(0, 10);

test('filing record: empty → POST persists → dashboard reflects filed state; validation + owner-scope enforced', async () => {
  const ctx = await request.newContext();
  const seed = await ctx.post('/api/test/seed-produced-session', { headers: authHeaders, data: { withProduceAudit: true } });
  expect(seed.ok()).toBeTruthy();
  const { cookie, riskpathId } = await seed.json();
  const ch = { cookie: `op_chat_token=${cookie}` };
  const rowFor = async () => (await (await ctx.get('/api/riskpath', { headers: ch })).json()).records
    .find((r: { id: string }) => r.id === riskpathId);

  // Initially no filing recorded.
  expect((await rowFor()).lahd.latestFiling).toBeNull();

  // Record a filing.
  const post = await ctx.post(`/api/notices/${riskpathId}/lahd-filing-record`, {
    headers: ch, data: { filing_date: TODAY, filing_channel: 'online_portal' },
  });
  expect(post.ok()).toBeTruthy();
  expect((await post.json()).ok).toBe(true);

  // Dashboard read reflects the filed state (latest filing).
  const filed = (await rowFor()).lahd.latestFiling;
  expect(filed).toBeTruthy();
  expect(filed.filing_date).toBe(TODAY);
  expect(filed.filing_channel).toBe('online_portal');

  // Invalid channel → 400.
  const badChannel = await ctx.post(`/api/notices/${riskpathId}/lahd-filing-record`, {
    headers: ch, data: { filing_date: TODAY, filing_channel: 'carrier_pigeon' },
  });
  expect(badChannel.status()).toBe(400);

  // Future filing_date → 400.
  const future = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
  const badDate = await ctx.post(`/api/notices/${riskpathId}/lahd-filing-record`, {
    headers: ch, data: { filing_date: future, filing_channel: 'online_portal' },
  });
  expect(badDate.status()).toBe(400);

  // Foreign riskpath → 404.
  const foreign = await ctx.post('/api/notices/00000000-0000-4000-8000-000000000000/lahd-filing-record', {
    headers: ch, data: { filing_date: TODAY, filing_channel: 'other' },
  });
  expect(foreign.status()).toBe(404);
});
