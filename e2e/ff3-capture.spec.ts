// e2e/ff3-capture.spec.ts — FF-3 structured-intake capture (Gate-2 Playwright build; countersign §4 Gate 2).
// Deploy-run against a Preview with FF3_CAPTURE_ENABLED on + migration 043 landed. Seeds an FF-3-ready session
// (all base fields + base scripted categories captured), then drives the deterministic FF-3 walk through /chat:
//   1. happy path — 3-day pay-or-quit: all five fields, the amount conditional fires, confirmation card, → review
//   2. conditional skip — 60-day termination: the amount question is NEVER asked, straight to confirmation
//   3. escalation off-ramp — rule of three on notice_type → broker-review card, session parked (no review route)
// The reconciliation three-way branch (Decision 3) is scaffolded as test.fixme — it activates when the
// reconciliation gate + card (entry 14) land with migration 042. See the block at the bottom.
//
// Note: opening FF-3 uses one LLM turn (the E3 deterministic mock) whose reply the server OVERRIDES with the
// verbatim notice-type first-ask (maybeBeginScripted). Every subsequent turn is server-parsed (no LLM).

import { test, expect, request, type Page, type APIRequestContext } from '@playwright/test';
import {
  FF3_HAPPY_PATH_ANSWERS, FF3_NONFAULT_ANSWERS, FF3_ESCALATION_ANSWERS, FF3_OPENER,
} from '../lib/testing/e2eFf3Fixture';

// Distinctive, markdown-free substrings of each locked prompt (full verbatim emission is proven by unit tests).
const PROMPT = {
  noticeType: 'What kind of notice are you serving on the tenant?',
  justCause: 'What is the reason you are ending the tenancy?',
  bedrooms: 'How many bedrooms does the rental unit have?',
  contractRent: "What is the tenant's current monthly rent",
  amountOwed: 'What is the total dollar amount stated on the notice',
  confirmCard: 'before I generate any forms',
  escalation: 'hold this case for broker review',
} as const;

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

/** Seed an FF-3-ready session and attach its cookie to the page. Respects the seed endpoint's S4 secret lock. */
async function seedFf3Ready(ctx: APIRequestContext, page: Page): Promise<string> {
  const secret = process.env.TEST_SEED_SECRET ?? '';
  const seed = await ctx.post('/api/test/seed-ff3-session', {
    headers: { authorization: `Bearer ${secret}` },
    data: {},
  });
  expect(seed.ok(), 'seed-ff3-session should succeed (check E2E_RUN_ACTIVE + TEST_SEED_SECRET)').toBeTruthy();
  const { cookie } = await seed.json();
  await page.context().addCookies([{ name: 'op_chat_token', value: cookie, url: page.url() || BASE }]);
  return cookie;
}

function makeSend(page: Page) {
  return async (msg: string) => {
    await page.getByLabel('Message').fill(msg);
    await page.getByRole('button', { name: 'Send' }).click();
  };
}

test.describe('FF-3 structured intake capture', () => {
  test('happy path: 3-day pay-or-quit captures all five fields → confirmation → review', async ({ page }) => {
    const ctx = await request.newContext({ baseURL: BASE });
    await seedFf3Ready(ctx, page);
    await page.goto('/chat');

    const send = makeSend(page);

    // Opener turn → server overrides the LLM reply with the notice-type first-ask.
    await send(FF3_OPENER);
    await expect(page.getByText(PROMPT.noticeType)).toBeVisible({ timeout: 30_000 });

    // Each answer advances to the next locked prompt.
    await send(FF3_HAPPY_PATH_ANSWERS[0]); // notice_type → just_cause
    await expect(page.getByText(PROMPT.justCause)).toBeVisible({ timeout: 30_000 });

    await send(FF3_HAPPY_PATH_ANSWERS[1]); // just_cause → bedrooms
    await expect(page.getByText(PROMPT.bedrooms)).toBeVisible({ timeout: 30_000 });

    await send(FF3_HAPPY_PATH_ANSWERS[2]); // bedrooms → contract_rent
    await expect(page.getByText(PROMPT.contractRent)).toBeVisible({ timeout: 30_000 });

    await send(FF3_HAPPY_PATH_ANSWERS[3]); // contract_rent → amount_owed (conditional fires for pay-or-quit)
    await expect(page.getByText(PROMPT.amountOwed)).toBeVisible({ timeout: 30_000 });

    await send(FF3_HAPPY_PATH_ANSWERS[4]); // amount_owed → confirmation card
    const card = page.getByText(PROMPT.confirmCard);
    await expect(card).toBeVisible({ timeout: 30_000 });
    // The card echoes the captured amount owed.
    await expect(page.getByText(/\$6,000/)).toBeVisible();

    await send(FF3_HAPPY_PATH_ANSWERS[5]); // confirm "yes" → complete → route to review
    await page.waitForURL('**/chat/review', { timeout: 30_000 });
    await expect(page.getByText('Review your details')).toBeVisible();
  });

  test('conditional skip: 60-day termination never asks the amount question', async ({ page }) => {
    const ctx = await request.newContext({ baseURL: BASE });
    await seedFf3Ready(ctx, page);
    await page.goto('/chat');
    const send = makeSend(page);

    await send(FF3_OPENER);
    await expect(page.getByText(PROMPT.noticeType)).toBeVisible({ timeout: 30_000 });

    await send(FF3_NONFAULT_ANSWERS[0]); // 60-day → just_cause
    await expect(page.getByText(PROMPT.justCause)).toBeVisible({ timeout: 30_000 });
    await send(FF3_NONFAULT_ANSWERS[1]); // owner move-in → bedrooms
    await expect(page.getByText(PROMPT.bedrooms)).toBeVisible({ timeout: 30_000 });
    await send(FF3_NONFAULT_ANSWERS[2]); // studio → contract_rent
    await expect(page.getByText(PROMPT.contractRent)).toBeVisible({ timeout: 30_000 });

    // After contract rent, a non-fault notice goes STRAIGHT to the confirmation card — no amount question.
    await send(FF3_NONFAULT_ANSWERS[3]);
    await expect(page.getByText(PROMPT.confirmCard)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(PROMPT.amountOwed)).toHaveCount(0);

    await send(FF3_NONFAULT_ANSWERS[4]); // confirm → review
    await page.waitForURL('**/chat/review', { timeout: 30_000 });
  });

  test('escalation off-ramp: rule of three on notice_type parks for broker review', async ({ page }) => {
    const ctx = await request.newContext({ baseURL: BASE });
    await seedFf3Ready(ctx, page);
    await page.goto('/chat');
    const send = makeSend(page);

    await send(FF3_OPENER);
    await expect(page.getByText(PROMPT.noticeType)).toBeVisible({ timeout: 30_000 });

    // Three unparseable answers → escalation card, session held (never routes to review).
    await send(FF3_ESCALATION_ANSWERS[0]);
    await send(FF3_ESCALATION_ANSWERS[1]);
    await send(FF3_ESCALATION_ANSWERS[2]);

    await expect(page.getByText(PROMPT.escalation)).toBeVisible({ timeout: 30_000 });
    await expect(page).not.toHaveURL(/\/chat\/review/);
  });

  // --- Reconciliation three-way branch (Decision 3) — NOW WIRED --------------------------------------------------
  // The reconciliation gate + entry-14 card + the full escalate→broker-resolve→owner-resume flow are exercised
  // end-to-end in ff3-reconciliation-resume.spec.ts (Gate-4 evidence path). The prior test.fixme placeholder is
  // retired there; nothing to scaffold here.
});
