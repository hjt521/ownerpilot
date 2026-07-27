// e2e/beta-pathway-cross-device-characterization.spec.ts
// TEST-ONLY characterization (2026-07-27), authorized alongside e2e/beta-pathway-characterization.spec.ts
// under the same Founder/Architect instruction. Kept in its own file because it needs two independent
// Playwright browser contexts (separate storage state) rather than the single-context pattern used by
// the rest of the suite. See that file's header comment for the full set of design constraints
// (accessible-selectors-only, non-LA synthetic fixture injected rather than typed, scoped network-write
// filtering, synthetic-data-only) — they apply identically here and are not repeated in full below.
//
// This suite characterizes CURRENT behavior only: it does not change production behavior, schemas,
// legal controls, eligibility consequences, counsel routing, feature flags, copy, jurisdiction
// activation, RCO/DECG work, ECAP, or persistence.

import { test, expect } from '@playwright/test';
import { e2eCharacterizationWizardData } from '../lib/testing/e2eWizardFixture';
import { DRAFT_KEY, DRAFT_VERSION } from '../lib/flow/persistence';

function noticeDraftEnvelopeJson(pageIndex: number): string {
  return JSON.stringify({
    v: DRAFT_VERSION,
    savedAt: new Date().toISOString(),
    pageIndex,
    data: e2eCharacterizationWizardData(),
  });
}

test('CHARACTERIZATION: a wizard draft created in one browser context is invisible in a second, isolated context (no cross-device continuity)', async ({
  browser,
}) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  try {
    const pageA = await contextA.newPage();
    await pageA.addInitScript(
      ([key, json]) => window.localStorage.setItem(key, json),
      [DRAFT_KEY, noticeDraftEnvelopeJson(4)] as const,
    );
    await pageA.goto('/notice/3-day/serve');
    await expect(pageA.getByRole('heading', { name: 'Serve & track' })).toBeVisible();

    const pageB = await contextB.newPage();
    await pageB.goto('/notice/3-day/serve');
    // CHARACTERIZATION OF KNOWN CURRENT GAP — NOT DESIRED TARGET BEHAVIOR (2026-07-27): a draft
    // created in one browser/device is entirely invisible from another, because persistence is
    // localStorage-only with no server-side or account-linked continuity. This assertion is expected
    // to fail (and must be deliberately updated) once cross-device resume is implemented.
    await expect(pageB.getByText('No notice ready to serve')).toBeVisible();
  } finally {
    await contextA.close();
    await contextB.close();
  }
});
