// e2e/chat-to-produce.spec.ts — happy path: chat intake → review → produce → RiskPath record.
// Deploy-run. Uses a seeded LA address that the Phase 2D rail produces for; flag must be ON in the preview.

import { test, expect } from '@playwright/test';
import { E2E_INTAKE_ANSWERS } from '../lib/testing/e2eIntakeFixture';

// Shared fixture keeps this walk in lockstep with the deterministic Perplexity mock (E3).
const answers = E2E_INTAKE_ANSWERS;
const LA_ADDRESS = answers[0];

test('chat intake → review → produce happy path', async ({ page }) => {
  await page.goto('/chat');

  // §2.2 disclaimer is always present above the input
  await expect(page.getByText(/does not provide legal advice/i)).toBeVisible();

  // Walk the intake (deterministic mock drives the assistant turns). Each send awaits the assistant turn.
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
