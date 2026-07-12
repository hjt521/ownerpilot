// e2e/ff3-reconciliation-resume.spec.ts
// FF-3 Gate-4 evidence path (ff3_preview_activation_gate4_evidence_path_broker_ruling_2026-07-11, Option 3):
// ONE session id threading owner reconciliation-mismatch escalation → broker resolve (second, admin-authed browser
// context) → owner resume → produce. Plus the negative scope-mismatch case (omnibus §7 criterion 13 / ruling §4.1).
//
// Deploy-run against a Preview with FF3_CAPTURE_ENABLED on + migrations 041–049 applied + these env vars set
// (Preview scope only): E2E_RUN_ACTIVE, TEST_SEED_SECRET, E2E_TEST_USER_ID, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD,
// FF3_RESUME_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

import { test, expect, request, type Page, type APIRequestContext, type Browser } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { FF3_OPENER, FF3_RECONCILE_MISMATCH_ANSWERS } from '../lib/testing/e2eFf3Fixture';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const SECRET = process.env.TEST_SEED_SECRET ?? '';

function svc() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

/** Seed a CLAIMED, FF-3-ready session (claimed → user_id set, required to reach produce). */
async function seedClaimedFf3(ctx: APIRequestContext, page: Page): Promise<string> {
  const seed = await ctx.post('/api/test/seed-ff3-session', {
    headers: { authorization: `Bearer ${SECRET}` },
    data: { claimed: true },
  });
  expect(seed.ok(), 'seed-ff3-session (claimed) should succeed').toBeTruthy();
  const { cookie, sessionId } = await seed.json();
  await page.context().addCookies([{ name: 'op_chat_token', value: cookie, url: page.url() || BASE }]);
  return sessionId as string;
}

function makeSend(page: Page) {
  return async (msg: string) => {
    await page.getByLabel('Message').fill(msg);
    await page.getByRole('button', { name: 'Send' }).click();
  };
}

/** Drive the FF-3 mismatch walk → /chat/review → Generate → reconciliation card → pick (3) → awaiting-review held. */
async function ownerEscalateToHeld(page: Page): Promise<void> {
  await page.goto('/chat');
  const send = makeSend(page);
  await send(FF3_OPENER);
  await expect(page.getByText('What kind of notice are you serving on the tenant?')).toBeVisible({ timeout: 30_000 });
  for (const a of FF3_RECONCILE_MISMATCH_ANSWERS) await send(a);
  await page.waitForURL('**/chat/review', { timeout: 30_000 });

  await page.getByRole('button', { name: 'Generate notice PDF' }).click();
  await expect(page.getByTestId('ff3-reconcile-card')).toBeVisible({ timeout: 30_000 });
  // The three options render verbatim from the ratified entry-14 card.
  await expect(page.getByTestId('ff3-reconcile-option-1')).toBeVisible();
  await expect(page.getByTestId('ff3-reconcile-option-3')).toBeVisible();

  await page.getByTestId('ff3-reconcile-option-3').click(); // (3) I need help → broker review
  await expect(page.getByTestId('ff3-held-card')).toBeVisible({ timeout: 30_000 });
}

/** Admin-authed browser context resolves the awaiting session via /admin/ff3-review. Returns the admin email. */
async function adminResolve(browser: Browser, note: string): Promise<string> {
  const adminCtx = await browser.newContext({ baseURL: BASE });
  const adminPage = await adminCtx.newPage();
  // Mint the admin session (Preview-only endpoint) — shares the context cookie jar with adminPage.
  const auth = await adminPage.request.post('/api/test/admin-session', { headers: { authorization: `Bearer ${SECRET}` }, data: {} });
  expect(auth.ok(), 'admin-session should mint (check E2E_ADMIN_EMAIL/PASSWORD + ADMIN_EMAILS in Preview)').toBeTruthy();
  const { email } = await auth.json();

  await adminPage.goto('/admin/ff3-review');
  await expect(adminPage.getByRole('heading', { name: 'FF-3 broker review' })).toBeVisible({ timeout: 30_000 });
  await adminPage.getByRole('textbox').first().fill(note);
  await adminPage.getByRole('button', { name: 'Resolve' }).first().click();
  await expect(adminPage.getByText('Note saved. It will surface when the owner next opens their session.')).toBeVisible({ timeout: 30_000 });
  await adminCtx.close();
  return email as string;
}

test('escalate → broker resolve → owner resume → produce (one session)', async ({ page, browser }) => {
  const ctx = await request.newContext({ baseURL: BASE });
  const sessionId = await seedClaimedFf3(ctx, page);
  const note = 'The amount you entered governs the filing; the $300 difference is a late fee I flagged in your case notes. You can continue with the notice as drafted.';

  await ownerEscalateToHeld(page);

  // Admin resolve (second, admin-authed context).
  const adminEmail = await adminResolve(browser, note);

  // DB: migration-048 columns populated + migration-049 authorization written (not yet consumed).
  const sb = svc();
  const afterResolve = await sb
    .from('chat_sessions')
    .select('broker_resolution_note, broker_resolution_reviewer_email, broker_resolution_resolved_at, broker_resume_authorization, broker_resume_consumed_at')
    .eq('id', sessionId)
    .single();
  expect(afterResolve.data?.broker_resolution_note).toBe(note);
  expect(afterResolve.data?.broker_resolution_reviewer_email).toBe(adminEmail);
  expect(afterResolve.data?.broker_resolution_resolved_at).not.toBeNull();
  expect(afterResolve.data?.broker_resume_authorization).not.toBeNull();
  expect(afterResolve.data?.broker_resume_consumed_at).toBeNull();

  // Owner returns to /chat → the continue-only resume card renders with the broker note.
  await page.goto('/chat');
  await expect(page.getByTestId('ff3-resume-card')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(note)).toBeVisible();

  // Continue → /chat/review?resume=1 → resume token minted → produce with it (reconciliation overridden).
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForURL('**/chat/review?resume=1', { timeout: 30_000 });
  // The reconciliation card must NOT reappear — the broker authorization carried the owner past it.
  await expect(page.getByTestId('ff3-reconcile-card')).toHaveCount(0, { timeout: 30_000 });

  // DB: the one-shot authorization is now consumed (stamped at produce-consume).
  await expect(async () => {
    const r = await sb.from('chat_sessions').select('broker_resume_consumed_at').eq('id', sessionId).single();
    expect(r.data?.broker_resume_consumed_at).not.toBeNull();
  }).toPass({ timeout: 30_000 });
});

test('negative: amount mutated between resolve and Continue → scope mismatch, authorization unconsumed', async ({ page, browser }) => {
  const ctx = await request.newContext({ baseURL: BASE });
  const sessionId = await seedClaimedFf3(ctx, page);

  await ownerEscalateToHeld(page);
  await adminResolve(browser, 'Confirmed — continue with the notice as drafted.');

  // Mutate the notice amount AFTER the broker authorized this specific mismatch — invalidates the scoped authorization.
  const sb = svc();
  await sb.from('chat_sessions').update({ amount_of_rent_owed: 6500 }).eq('id', sessionId);

  // The resume endpoint must fail closed and NOT consume the authorization.
  const resume = await page.request.post('/api/chat/ff3/resume');
  expect(resume.status()).toBe(409);
  expect((await resume.json()).error).toBe('ff3_resume_scope_mismatch');

  const r = await sb.from('chat_sessions').select('broker_resume_consumed_at').eq('id', sessionId).single();
  expect(r.data?.broker_resume_consumed_at).toBeNull();
});
