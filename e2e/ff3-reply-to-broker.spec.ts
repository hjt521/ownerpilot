// e2e/ff3-reply-to-broker.spec.ts
// Omnibus §3 row 1 — reply-to-broker seam (pre-staged behind FF3_REPLY_TO_BROKER_ENABLED). The "fourth branch"
// beyond the three ff3-reconciliation-resume flows: owner escalates to the held state → submits a reply → the
// broker-side /admin/ff3-review surface renders it read-only.
//
// Runs ONLY when both FF3_CAPTURE_ENABLED and FF3_REPLY_TO_BROKER_ENABLED are on in the Preview env (deploy-run).
// When the reply flag is off (the default), the whole file skips — the seam is dark and there is nothing to assert.

import { test, expect, request, type Page, type APIRequestContext, type Browser } from '@playwright/test';
import { FF3_OPENER, FF3_RECONCILE_MISMATCH_ANSWERS } from '../lib/testing/e2eFf3Fixture';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const SECRET = process.env.TEST_SEED_SECRET ?? '';
const REPLY_ON = (process.env.FF3_REPLY_TO_BROKER_ENABLED ?? '').toLowerCase();
const RUN = REPLY_ON === '1' || REPLY_ON === 'true';

test.skip(!RUN, 'FF3_REPLY_TO_BROKER_ENABLED is off — reply seam is dark, nothing to exercise.');

async function seedClaimedFf3(ctx: APIRequestContext, page: Page): Promise<string> {
  const seed = await ctx.post('/api/test/seed-ff3-session', {
    headers: { authorization: `Bearer ${SECRET}` },
    data: { claimed: true },
  });
  expect(seed.ok(), 'seed-ff3-session (claimed) should succeed').toBeTruthy();
  const { cookie, sessionId } = await seed.json();
  await page.context().addCookies([{ name: 'op_chat_token', value: cookie, url: BASE }]);
  return sessionId as string;
}

function makeSend(page: Page) {
  return async (msg: string) => {
    await page.getByLabel('Message').fill(msg);
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/chat') && r.request().method() === 'POST'),
      page.getByRole('button', { name: 'Send' }).click(),
    ]);
  };
}

/** Drive the FF-3 mismatch walk → Generate → select (3) → awaiting-review held state. */
async function ownerEscalateToHeld(page: Page): Promise<void> {
  await page.goto('/chat');
  const send = makeSend(page);
  await send(FF3_OPENER);
  await expect(page.getByText('What kind of notice are you serving on the tenant?')).toBeVisible({ timeout: 30_000 });
  for (const a of FF3_RECONCILE_MISMATCH_ANSWERS) await send(a);
  await page.waitForURL('**/chat/review', { timeout: 30_000 });
  await page.getByRole('button', { name: 'Generate notice PDF' }).click();
  await expect(page.getByTestId('ff3-reconcile-card')).toBeVisible({ timeout: 30_000 });
  await page.getByTestId('ff3-reconcile-option-3').click();
  await expect(page.getByTestId('ff3-held-card')).toBeVisible({ timeout: 30_000 });
}

test('flag ON: owner reply from held state surfaces read-only on the broker review surface', async ({ page, browser }) => {
  const ctx = await request.newContext({ baseURL: BASE });
  const sessionId = await seedClaimedFf3(ctx, page);
  const replyText = `Owner reply under E2E ${Date.now()}`;

  await ownerEscalateToHeld(page);

  // The reply widget renders inside the held card when the flag is on.
  await expect(page.getByTestId('ff3-broker-reply')).toBeVisible({ timeout: 30_000 });
  await page.getByTestId('ff3-reply-input').fill(replyText);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/chat/ff3/reply-to-broker') && r.request().method() === 'POST'),
    page.getByTestId('ff3-reply-submit').click(),
  ]);
  // Persisted reply echoes back into the thread.
  await expect(page.getByText(replyText)).toBeVisible({ timeout: 30_000 });

  // Broker-side: the reply renders read-only on /admin/ff3-review (admin-authed context).
  const adminCtx = await browser.newContext({ baseURL: BASE });
  const adminPage = await adminCtx.newPage();
  const auth = await adminPage.request.post('/api/test/admin-session', { headers: { authorization: `Bearer ${SECRET}` }, data: {} });
  expect(auth.ok(), 'admin-session should mint').toBeTruthy();
  await adminPage.goto('/admin/ff3-review');
  await expect(adminPage.getByRole('heading', { name: 'FF-3 broker review' })).toBeVisible({ timeout: 30_000 });
  await expect(adminPage.getByText(replyText)).toBeVisible({ timeout: 30_000 });
  await adminCtx.close();

  expect(sessionId).toBeTruthy();
});
