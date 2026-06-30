// e2e/consent-analytics.spec.ts — Lane 6: NO analytics fire before Cookiebot consent (Guard G + consent gate).
// Deploy-run. Asserts zero GA4 network calls pre-consent, then calls after accepting.

import { test, expect } from '@playwright/test';

const GA_HIT = /google-analytics\.com\/g\/collect|googletagmanager\.com\/gtag\/js/;

test('no GA4 requests before consent; GA4 fires after accept', async ({ page }) => {
  const hits: string[] = [];
  page.on('request', (r) => { if (GA_HIT.test(r.url())) hits.push(r.url()); });

  await page.goto('/');                 // fresh session, no consent yet
  await page.waitForTimeout(2000);
  expect(hits, 'no GA4 before consent').toHaveLength(0);

  // Accept Cookiebot statistics consent
  const accept = page.getByRole('button', { name: /accept all/i });
  if (await accept.count()) {
    await accept.click();
    await page.waitForTimeout(2000);
    expect(hits.length, 'GA4 fires after consent').toBeGreaterThan(0);
  }
});

test('declining consent fires zero GA4', async ({ page }) => {
  const hits: string[] = [];
  page.on('request', (r) => { if (GA_HIT.test(r.url())) hits.push(r.url()); });
  await page.goto('/');
  const decline = page.getByRole('button', { name: /reject non-essential/i });
  if (await decline.count()) { await decline.click(); await page.waitForTimeout(2000); }
  expect(hits, 'no GA4 after decline').toHaveLength(0);
});
