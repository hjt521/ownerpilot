// e2e/ff3-telemetry-flag-off.spec.ts
// Omnibus §3 row 2 — flag-off proof for the FF-3 telemetry seam. Drives the three existing FF-3 branches
// (reconciliation card, held, pause) with FF3_TELEMETRY_ENABLED at its default (OFF) and asserts NO telemetry
// line surfaces on the client during any of them.
//
// SCOPE NOTE: emitFf3Event runs server-side, so its structured lines land in the server log, which Playwright
// cannot read. This spec guards the CLIENT surface (no telemetry leaks to the browser); the server-side flag-off
// no-op is proven by lib/analytics/__tests__/ff3Telemetry.test.ts (flag off → zero emissions). Runs only when
// FF3_CAPTURE_ENABLED is on (Preview) so the branches are reachable.

import { test, expect, request, type Page, type APIRequestContext, type ConsoleMessage } from '@playwright/test';
import { FF3_OPENER, FF3_RECONCILE_MISMATCH_ANSWERS } from '../lib/testing/e2eFf3Fixture';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const SECRET = process.env.TEST_SEED_SECRET ?? '';
const CAPTURE_ON = (process.env.FF3_CAPTURE_ENABLED ?? '').toLowerCase();
const RUN = CAPTURE_ON === '1' || CAPTURE_ON === 'true';

test.skip(!RUN, 'FF3_CAPTURE_ENABLED is off — the FF-3 branches are not reachable in this deployment.');

async function seedClaimedFf3(ctx: APIRequestContext, page: Page): Promise<void> {
  const seed = await ctx.post('/api/test/seed-ff3-session', {
    headers: { authorization: `Bearer ${SECRET}` },
    data: { claimed: true },
  });
  expect(seed.ok(), 'seed-ff3-session (claimed) should succeed').toBeTruthy();
  const { cookie } = await seed.json();
  await page.context().addCookies([{ name: 'op_chat_token', value: cookie, url: BASE }]);
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

async function driveToReconcileCard(page: Page): Promise<void> {
  await page.goto('/chat');
  const send = makeSend(page);
  await send(FF3_OPENER);
  await expect(page.getByText('What kind of notice are you serving on the tenant?')).toBeVisible({ timeout: 30_000 });
  for (const a of FF3_RECONCILE_MISMATCH_ANSWERS) await send(a);
  await page.waitForURL('**/chat/review', { timeout: 30_000 });
  await page.getByRole('button', { name: 'Generate notice PDF' }).click();
  await expect(page.getByTestId('ff3-reconcile-card')).toBeVisible({ timeout: 30_000 });
}

test('flag OFF (default): no ff3.telemetry line on the client across the three FF-3 branches', async ({ page }) => {
  const telemetry: string[] = [];
  page.on('console', (m: ConsoleMessage) => { if (m.text().includes('ff3.telemetry')) telemetry.push(m.text()); });

  const ctx = await request.newContext({ baseURL: BASE });

  // Branch 1: reconciliation card.
  await seedClaimedFf3(ctx, page);
  await driveToReconcileCard(page);

  // Branch 2: (2) notice-wrong → pause.
  await driveToReconcileCard(page);
  await page.getByTestId('ff3-reconcile-option-2').click();
  await expect(page.getByTestId('ff3-pause-card')).toBeVisible({ timeout: 30_000 });

  // Branch 3: (3) → held.
  await driveToReconcileCard(page);
  await page.getByTestId('ff3-reconcile-option-3').click();
  await expect(page.getByTestId('ff3-held-card')).toBeVisible({ timeout: 30_000 });

  expect(telemetry, 'no FF-3 telemetry should reach the client at flag-off').toHaveLength(0);
});
