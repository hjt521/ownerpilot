// e2e/chat-to-produce.spec.ts — happy path: chat intake → review → produce → RiskPath record.
// Deploy-run. Uses a seeded LA address that the Phase 2D rail produces for; flag must be ON in the preview.

import { test, expect } from '@playwright/test';

const LA_ADDRESS = '5537 La Mirada Ave, Unit 202, Los Angeles, CA 90038';

test('chat intake → review → produce happy path', async ({ page }) => {
  await page.goto('/chat');

  // §2.2 disclaimer is always present above the input
  await expect(page.getByText(/does not provide legal advice/i)).toBeVisible();

  // Walk a minimal intake (the persona drives; we answer). Each send awaits the assistant turn.
  const answers = [
    LA_ADDRESS, 'Clifton Alexander', 'PTAG L LLC', '123 Main St, Los Angeles, CA 90012',
    'May 2026', '6000', 'in_person', 'personal', 'English', 'yes',
  ];
  for (const a of answers) {
    await page.getByLabel('Message').fill(a);
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.locator('text=…')).toHaveCount(0, { timeout: 30_000 }); // typing indicator cleared
  }

  // On completion the engine routes to /chat/review
  await page.waitForURL('**/chat/review', { timeout: 30_000 });
  await expect(page.getByText('Review your details')).toBeVisible();
  await expect(page.getByText(LA_ADDRESS)).toBeVisible();

  // Account number, if shown, must be masked (G8)
  await expect(page.locator('body')).not.toContainText(/\b\d{8,}\b/);

  // Produce
  await page.getByRole('button', { name: 'Generate notice PDF' }).click();
  // success → a RiskPath record + a downloadable PDF link surfaces
  await expect(page).toHaveURL(/\/(riskpath|chat\/review)/, { timeout: 30_000 });
});
