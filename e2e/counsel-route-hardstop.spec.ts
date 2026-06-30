// e2e/counsel-route-hardstop.spec.ts — G4: a counsel-route trigger blocks produce server-side and routes to counsel.
// Deploy-run. Seeds a session whose counsel_route_trigger is set, then asserts produce is refused (409) and the
// owner is sent to /route-to-counsel — never a PDF.

import { test, expect, request } from '@playwright/test';

// Representative triggers across the three groups (posture / subject / shared).
const TRIGGERS = ['ud_case_filed', 'disability_accommodation', 'bankruptcy_automatic_stay'];

for (const trigger of TRIGGERS) {
  test(`produce is hard-stopped when counsel trigger = ${trigger}`, async ({ page }) => {
    // Test harness endpoint (preview-only) seeds a complete session with the trigger set.
    const ctx = await request.newContext();
    const seed = await ctx.post('/api/test/seed-session', { data: { complete: true, counselTrigger: trigger } });
    expect(seed.ok()).toBeTruthy();
    const { cookie } = await seed.json();
    await page.context().addCookies([{ name: 'op_chat_token', value: cookie, url: page.url() || 'http://localhost:3000' }]);

    // Attempt produce → must be refused 409 with route-to-counsel, no PDF.
    const res = await ctx.post('/api/notice/produce/from-chat', { headers: { cookie: `op_chat_token=${cookie}` } });
    expect(res.status()).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('routed_to_counsel');
    expect(body.href).toBe('/route-to-counsel');

    // The route-to-counsel page renders the locked referral copy
    await page.goto('/route-to-counsel');
    await expect(page.getByText(/Time to talk to a California licensed attorney/i)).toBeVisible();
    await expect(page.getByText(/does not sell, bundle, or take referral fees/i)).toBeVisible();
  });
}
