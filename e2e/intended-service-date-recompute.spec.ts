// e2e/intended-service-date-recompute.spec.ts — PR-A2 req 5 (real-time facial-date recompute).
// Changing the Review-step service-date picker updates the displayed 3-day expiration in the same render
// cycle (no server round-trip). Deploy-run against Preview (E2E_BASE_URL). The service-date section renders
// independently of the session load, so no seeded session is required for this behavior.

import { test, expect } from '@playwright/test';

function isoDay(offset: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

test('Review-step date picker drives real-time expiration recompute', async ({ page }) => {
  await page.goto('/chat/review');

  const picker = page.locator('#intended-service-date');
  await expect(picker).toBeVisible();
  const display = page.getByTestId('expiration-display');
  await expect(display).toContainText(/expires:/i);

  // Pick a date within [today, today+30]; expiration renders a real formatted date (not the em-dash placeholder).
  await picker.fill(isoDay(3));
  const first = (await display.innerText()).trim();
  expect(first).not.toContain('—');
  expect(first).toMatch(/\w+day, \w+ \d{1,2}, \d{4}/);

  // Change the date → the displayed expiration updates in the same render cycle (no reload, no submit).
  await picker.fill(isoDay(10));
  await expect(display).not.toHaveText(first);
  const second = (await display.innerText()).trim();
  expect(second).not.toContain('—');
  expect(second).not.toEqual(first);
});
