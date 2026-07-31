// e2e/beta-pathway-characterization.spec.ts
// TEST-ONLY characterization suite (2026-07-27), authorized by the Founder/Architect's "Test-only
// characterization PR" instruction following the OwnerPilot Free Limited-Beta Repository Audit and
// its Reconciliation Addendum. This suite documents CURRENT, ACTUAL behavior of the free-beta
// pathway — it does not change production behavior, schemas/migrations, legal controls, eligibility
// consequences, counsel routing, feature flags, public copy, jurisdiction activation, RCO/DECG work,
// ECAP, or application persistence, and it introduces none of those things itself.
//
// Scope covered here: direct-entry/empty-state behavior, wizard draft persistence (localStorage-only)
// and same-browser resume, the Serve & Track lane's factual-capture UI, and RiskPath (non-)linkage for
// the wizard path. Chat's own server-persisted session identity is characterized separately below.
// Cross-device continuity is characterized in the companion spec,
// e2e/beta-pathway-cross-device-characterization.spec.ts. Version-change data loss is characterized at
// the unit level in lib/flow/persistence.test.ts, with only the user-visible symptom (no restore toast)
// re-asserted here, per instruction — the envelope/version logic itself is not duplicated in this file.
//
// Design constraints (per the Founder/Architect's controlling conditions, 2026-07-27):
//  - Selectors are limited to roles, labels, headings, button names, and visible status text. No
//    data-testid or other test-only attribute is added to any production component in this PR. Where no
//    such selector exists for a capability, the assertion is marked untestable below rather than
//    touched around.
//  - The wizard fixture (lib/testing/e2eWizardFixture.ts) uses a synthetic, clearly non-LA California
//    address, injected directly into localStorage rather than typed into the UI, specifically so this
//    suite never invokes the live jurisdiction/geocode resolver or any LA activation path. These tests
//    characterize persistence and continuity only — they do not validate beta eligibility, jurisdiction
//    activation, or the Los Angeles City rule pack.
//  - Network-write assertions are scoped to named persistence destinations (RELEVANT_WRITE_DESTINATIONS
//    below), not to all traffic — analytics, framework, and session/background requests are ignored.
//  - All data is synthetic (no real owner/tenant/property/email/phone). This suite runs only against
//    the established E2E_BASE_URL preview environment, per e2e/playwright.config.ts and README.md, and
//    relies on the existing X-E2E-Run-Id tagging + global-teardown.ts cleanup convention for any
//    chat_sessions/riskpath_records rows it causes to be created — no new seed route or cleanup path is
//    introduced.

import { test, expect } from '@playwright/test';
import { e2eCharacterizationWizardData } from '../lib/testing/e2eWizardFixture';
import { DRAFT_KEY, DRAFT_VERSION } from '../lib/flow/persistence';
import { untracedFetch } from './helpers/untracedHttp';
import { runIdToUuid } from '../lib/testing/e2eRunTag';

// Matches e2e/playwright.config.ts's own baseURL default exactly, so calls made outside the
// Playwright `request` fixture (see e2e/helpers/untracedHttp.ts's header comment for why) still
// target the same Preview deployment as the rest of the test.
const E2E_BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

// Condition #3: relevant persistence destinations only — not a blanket "zero POST/PATCH of every
// kind" assertion. A request is "relevant" if its URL matches one of these; everything else (GA4,
// Cookiebot, Next.js framework requests, the chat session's own read/write traffic when that is the
// system under test, etc.) is ignored by the filter below.
const RELEVANT_WRITE_DESTINATIONS: RegExp[] = [
  /\/api\/notice\/produce\/from-chat/,
  /\/api\/notice\/produce\/sm/,
  /\/api\/riskpath(?:[/?]|$)/,
  /\/api\/documents(?:[/?]|$)/,
  /\/rest\/v1\/(riskpath_records|chat_sessions|documents)(?:[/?]|$)/,
  /\/storage\/v1\/object\//,
];
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isRelevantWrite(url: string, method: string): boolean {
  if (!WRITE_METHODS.has(method)) return false;
  return RELEVANT_WRITE_DESTINATIONS.some((re) => re.test(url));
}

function noticeDraftEnvelopeJson(pageIndex: number): string {
  return JSON.stringify({
    v: DRAFT_VERSION,
    savedAt: new Date().toISOString(),
    pageIndex,
    data: e2eCharacterizationWizardData(),
  });
}

test.describe('Free-beta pathway characterization — persistence and continuity only (2026-07-27)', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('EXPECTED: direct entry to Serve & Track with no prior draft shows the documented empty state', async ({
    page,
  }) => {
    await page.goto('/notice/3-day/serve');
    await expect(page.getByText('No notice ready to serve')).toBeVisible();
    await expect(page.getByRole('link', { name: /Go to the notice flow/i })).toBeVisible();
  });

  test('EXPECTED: answering the pre-flight dispute questions autosaves and survives a reload (localStorage-only, same-browser resume)', async ({
    page,
  }) => {
    await page.goto('/notice/3-day');
    // Three pre-flight questions, each an accessible Yes/No/"I don't know" button group (button
    // names, per the approved selector list). "No" to all three is a benign, non-triggering answer —
    // this test characterizes persistence, not the dispute/eligibility gate itself.
    const questions = [
      /Has the tenant filed a court case/i,
      /Has the tenant given you anything in writing/i,
      /Has the tenant filed for bankruptcy/i,
    ];
    for (const q of questions) {
      const question = page.getByText(q);
      await expect(question).toBeVisible();
      await question.locator('xpath=following-sibling::div[1]').getByRole('button', { name: 'No', exact: true }).click();
    }
    // Debounced autosave is 500ms (lib/flow/persistence.ts usage in notice-flow.tsx); wait it out
    // before reloading rather than asserting on a timing race.
    await page.waitForTimeout(900);
    await page.reload();
    await expect(page.getByRole('status').filter({ hasText: /We restored your in-progress notice/i })).toBeVisible();
  });

  test('EXPECTED: a version-mismatched draft shows no restore indication on load (user-visible symptom only — envelope/version logic is unit-tested in lib/flow/persistence.test.ts)', async ({
    page,
  }) => {
    const staleEnvelope = JSON.stringify({
      v: DRAFT_VERSION + 1, // simulates a draft saved by a not-yet-deployed future shape
      savedAt: new Date().toISOString(),
      pageIndex: 1,
      data: e2eCharacterizationWizardData(),
    });
    await page.addInitScript(
      ([key, json]) => window.localStorage.setItem(key, json),
      [DRAFT_KEY, staleEnvelope] as const,
    );
    await page.goto('/notice/3-day');
    // CHARACTERIZATION OF KNOWN CURRENT GAP — NOT DESIRED TARGET BEHAVIOR (2026-07-27): a
    // version-mismatched draft is discarded with no visible warning to the user — the page renders
    // as if no draft had ever been saved. This assertion is expected to fail if a future revision
    // adds a visible "we couldn't restore your draft" notice; it must be updated deliberately if so.
    await expect(page.getByRole('status').filter({ hasText: /We restored your in-progress notice/i })).toHaveCount(0);
  });

  test('EXPECTED: Serve & Track reads the same envelope the wizard writes and renders the service form when the draft is produce-ready', async ({
    page,
  }) => {
    await page.addInitScript(
      ([key, json]) => window.localStorage.setItem(key, json),
      [DRAFT_KEY, noticeDraftEnvelopeJson(4)] as const,
    );
    await page.goto('/notice/3-day/serve');
    await expect(page.getByRole('heading', { name: 'Serve & track', exact: true })).toBeVisible();
    await expect(page.getByText('Record what happened when you served')).toBeVisible();
  });

  test('EXPECTED: logging a service attempt (date, outcome, server identity) via the accessible ReServePanel form records it in the visible log', async ({
    page,
  }, testInfo) => {
    const requests: { url: string; method: string }[] = [];
    page.on('request', (req) => requests.push({ url: req.url(), method: req.method() }));

    // DIAGNOSTIC INSTRUMENTATION (2026-07-30) — added under a narrow diagnostic-only authorization
    // to investigate run #30562689654's :137 failure (waiting for "Attempt recorded" after the
    // PR #311 radio-locator fix). Source review alone could not establish a cause since handleAdd()
    // is a synchronous, no-network client state update. These listeners/attachments are diagnostic
    // only — they do not change, weaken, or replace the real assertions below.
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.addInitScript(
      ([key, json]) => window.localStorage.setItem(key, json),
      [DRAFT_KEY, noticeDraftEnvelopeJson(4)] as const,
    );
    await page.goto('/notice/3-day/serve');

    // Repair for run #30599083648's :137 finding: the "Date of this attempt" control (DateField in
    // components/notice-flow.tsx) is a masked, positional-digit text input that expects US-typed
    // MM/DD/YYYY — it is not a native <input type="date">, so it does not accept an ISO value.
    // Filling it with an ISO string here previously misparsed into a corrupted pseudo-ISO value
    // ("0605-20-26") that crashed the page during render. Source/control inspection established the
    // test supplied the wrong format; corrected to the format the control actually renders/accepts.
    await page.getByLabel(/Date of this attempt/i).fill('06/05/2026');
    await page.getByRole('radio', { name: 'Service was completed' }).check();
    await page.getByLabel(/Name of person who served/i).fill('E2E Characterization Server');
    await page.getByLabel(/Address of person who served/i).fill('1 Characterization Way, Fresno, CA 93701');
    await page.getByLabel(/is 18 years of age or older/i).check();
    await page.getByLabel(/not a party to this notice/i).check();

    const addAttemptButton = page.getByRole('button', { name: 'Add attempt' });
    const buttonEnabledBeforeClick = await addAttemptButton.isEnabled();

    let clickCompleted = false;
    let clickError: string | null = null;
    try {
      await addAttemptButton.click();
      clickCompleted = true;
    } catch (err) {
      clickError = String(err);
    }

    // Diagnostic-only: captured immediately after the click so it reflects the DOM at the moment
    // in question; only attached to the report if the real assertion below fails.
    const postClickScreenshot = await page.screenshot({ fullPage: true }).catch(() => null);

    if (clickError) {
      await testInfo.attach('diagnostic-137-click-error', {
        body: JSON.stringify({ buttonEnabledBeforeClick, clickError }, null, 2),
        contentType: 'application/json',
      });
      throw new Error(clickError);
    }

    try {
      await expect(page.getByText(/Attempt recorded/i)).toBeVisible();
      await expect(page.getByText('Service recorded as complete.')).toBeVisible();
      await expect(page.getByText('In person (personal service)')).toBeVisible();
    } catch (assertionError) {
      const [
        dateFieldValue,
        serverNameValue,
        serverAddressValue,
        bodyText,
        containsRecordedWord,
        containsAddedToLog,
        containsValidationPrompt,
      ] = await Promise.all([
        page.getByLabel(/Date of this attempt/i).inputValue().catch(() => null),
        page.getByLabel(/Name of person who served/i).inputValue().catch(() => null),
        page.getByLabel(/Address of person who served/i).inputValue().catch(() => null),
        page.locator('body').innerText().catch(() => null),
        page.getByText(/recorded/i).isVisible().catch(() => false),
        page.getByText(/added to the log/i).isVisible().catch(() => false),
        page.getByText(/enter the|confirm the/i).isVisible().catch(() => false),
      ]);

      if (postClickScreenshot) {
        await testInfo.attach('diagnostic-137-after-click-screenshot', {
          body: postClickScreenshot,
          contentType: 'image/png',
        });
      }
      await testInfo.attach('diagnostic-137-post-click-state', {
        body: JSON.stringify(
          {
            buttonEnabledBeforeClick,
            clickCompleted,
            consoleErrors,
            pageErrors,
            // If the form fields are still populated, handleAdd() returned early (validation
            // failed) before resetForm()/setRecordedFlash() ran — this alone would explain the
            // missing success text without any product defect.
            formStillPopulated: { dateFieldValue, serverNameValue, serverAddressValue },
            alternateSuccessTextVisible: { containsRecordedWord, containsAddedToLog },
            validationPromptVisible: containsValidationPrompt,
          },
          null,
          2,
        ),
        contentType: 'application/json',
      });
      if (bodyText) {
        await testInfo.attach('diagnostic-137-body-text-snapshot', {
          body: bodyText,
          contentType: 'text/plain',
        });
      }

      throw assertionError;
    }

    // CHARACTERIZATION OF KNOWN CURRENT GAP — NOT DESIRED TARGET BEHAVIOR (2026-07-27): logging a
    // service attempt writes only to localStorage; no relevant persistence destination is called.
    // This is expected to fail (and must be deliberately updated) once Serve & Track gains server-side
    // persistence or RiskPath linkage.
    const relevantWrites = requests.filter((r) => isRelevantWrite(r.url, r.method));
    expect(relevantWrites, `unexpected relevant writes: ${JSON.stringify(relevantWrites)}`).toEqual([]);
  });

  test('EXPECTED: a claimed chat session persists across a reload (server-persisted continuity), independent of the wizard/Serve & Track lane above', async ({
    page,
  }) => {
    await page.goto('/chat');
    await expect(page.getByText(/does not provide legal advice/i)).toBeVisible();
    await page.getByLabel('Message').fill('E2E characterization: this is a synthetic, non-substantive message.');

    // Deterministic synchronization: wait for the actual /api/chat response rather than an
    // arbitrary sleep. A hardcoded wait raced against cold-start/response latency and produced
    // intermittent "cookie not yet set" failures (run #30562689654, tests :169 desktop/mobile).
    const [chatResponse] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes('/api/chat') &&
          response.request().method() === 'POST',
      ),
      page.getByRole('button', { name: 'Send' }).click(),
    ]);
    expect(
      chatResponse.ok(),
      `chat request failed with HTTP ${chatResponse.status()}`,
    ).toBeTruthy();

    const cookiesBefore = await page.context().cookies();
    const tokenBefore = cookiesBefore.find((c) => c.name === 'op_chat_token');
    expect(tokenBefore, 'expected the chat session cookie to be set after the first turn').toBeTruthy();

    await page.reload();
    const cookiesAfter = await page.context().cookies();
    const tokenAfter = cookiesAfter.find((c) => c.name === 'op_chat_token');
    expect(tokenAfter?.value, 'the session identity should survive a reload (server-persisted, not localStorage-only)').toBe(
      tokenBefore?.value,
    );

    // RiskPath linkage (absence) for the WIZARD path specifically is characterized in a dedicated
    // test below, tied to a unique synthetic session identifier — a chat session persisting is not
    // itself evidence about the wizard/Serve & Track lane, which this suite does not conflate.
  });

  // TIGHTENED PER FOUNDER/ARCHITECT FINALIZATION (2026-07-27): the wizard and the seeded chat session
  // are disconnected systems. This test proves absence LINKED TO THE SEEDED SESSION specifically — it
  // does not, and must not be read to, prove that no RiskPath record of any kind exists anywhere. A
  // second, broader, best-effort check (scoped by the existing E2E_RUN_ID tag, reusing the exact same
  // service-role read pattern e2e/global-teardown.ts already uses — no new route) runs only when that
  // tagging environment is available, and is reported separately from the primary, always-meaningful
  // claim.
  test('CHARACTERIZATION: wizard and Serve & Track activity creates no RiskPath record linked to the seeded synthetic chat session', async ({
    page,
  }) => {
    const secret = process.env.TEST_SEED_SECRET;
    test.skip(
      !secret,
      'TEST_SEED_SECRET not configured in this environment — the existing preview-only seed harness (app/api/test/seed-session) is unavailable here; see e2e/README.md preview prerequisites. No new seed route is introduced to work around this.',
    );

    // Reuses the EXISTING preview-only seed harness and the EXISTING GET /api/riskpath read API
    // exactly as-is (condition #4) — no new production seed or inspection route is introduced. The
    // seed's required `counselTrigger` field is part of its fixed, locked input shape (S7 in its own
    // header comment); this test never calls produce with the seeded session, so that field has no
    // bearing on what is being characterized here — it is used solely to obtain a unique, claimed
    // session identity to anchor the absence check.
    //
    // Security repair for run #30599083648: this call carries the TEST_SEED_SECRET bearer token, and
    // the later calls below carry the seeded session cookie. Both now go through untracedFetch
    // (e2e/helpers/untracedHttp.ts) instead of the Playwright `request` fixture's APIRequestContext,
    // because that fixture's calls are captured (headers included, unredacted) in the failure trace —
    // that is exactly how TEST_SEED_SECRET ended up exposed in playwright-failure-30599083648-1.
    const seed = await untracedFetch<{ cookie: string; sessionId: string }>(E2E_BASE_URL, '/api/test/seed-session', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${secret}` },
      body: JSON.stringify({ complete: true, counselTrigger: 'bankruptcy_automatic_stay' }),
    });
    expect(seed.ok, 'seed-session must succeed for this characterization to be meaningful').toBeTruthy();
    const { cookie, sessionId } = seed.json;
    expect(sessionId, 'the seed must return a unique session id to anchor the absence check').toBeTruthy();

    const before = await untracedFetch<{ records: unknown[] }>(E2E_BASE_URL, '/api/riskpath', {
      headers: { cookie: `op_chat_token=${cookie}` },
    });
    expect(before.ok).toBeTruthy();
    expect(
      before.json.records,
      `expected zero RiskPath records linked to freshly seeded session ${sessionId} before any wizard activity`,
    ).toEqual([]);

    // Exercise the wizard/Serve & Track lane in a browser context carrying the SAME seeded cookie, so
    // any RiskPath row this activity might produce would be attributable to this unique session.
    await page.context().addCookies([{ name: 'op_chat_token', value: cookie, url: page.url() || 'http://localhost:3000' }]);
    await page.addInitScript(
      ([key, json]) => window.localStorage.setItem(key, json),
      [DRAFT_KEY, noticeDraftEnvelopeJson(4)] as const,
    );
    await page.goto('/notice/3-day/serve');
    await expect(page.getByRole('heading', { name: 'Serve & track', exact: true })).toBeVisible();
    // Repair for run #30599083648's :137 finding — see the identical fix/comment in the test above:
    // this control expects US-typed MM/DD/YYYY, not an ISO string.
    await page.getByLabel(/Date of this attempt/i).fill('06/05/2026');
    await page.getByLabel(/is 18 years of age or older/i).check();
    await page.getByLabel(/not a party to this notice/i).check();
    await page.getByRole('button', { name: 'Add attempt' }).click();
    await expect(page.getByText(/Attempt recorded/i)).toBeVisible();

    const after = await untracedFetch<{ records: unknown[] }>(E2E_BASE_URL, '/api/riskpath', {
      headers: { cookie: `op_chat_token=${cookie}` },
    });
    expect(after.ok).toBeTruthy();
    // CHARACTERIZATION OF KNOWN CURRENT GAP — NOT DESIRED TARGET BEHAVIOR (2026-07-27): the wizard/
    // Serve & Track lane has no write path into riskpath_records LINKED TO THIS SEEDED SESSION, so this
    // stays empty even after a produce-ready draft exists and a service attempt has been logged, tied
    // to the unique sessionId returned above — not inferred from a generic empty response. This proves
    // absence for this session specifically, not absence of any RiskPath record anywhere (see the
    // broader, best-effort tag-scoped check below for that narrower additional claim). Expected to fail
    // (and must be deliberately updated, not silently left red) once the wizard or Serve & Track gain
    // RiskPath linkage.
    expect(
      after.json.records,
      `expected zero RiskPath records linked to session ${sessionId} after wizard/Serve & Track activity`,
    ).toEqual([]);

    // ADDITIONAL, BEST-EFFORT, BROADER CHECK — only runs if the existing E2E_RUN_ID tagging
    // environment is present (the same tag e2e/global-teardown.ts already relies on for cleanup). This
    // does not create a new route: it reuses the identical service-role client construction and
    // e2e_run_id column that lib/testing/e2eCleanup.ts and global-teardown.ts already use for
    // verification. If this environment isn't available, the check is skipped rather than assumed —
    // the primary, session-linked claim above is unaffected either way.
    const runId = process.env.E2E_RUN_ID;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (runId && supabaseUrl && supabaseKey) {
      // Repair for run #30599083648's :304 finding: e2e_run_id is `uuid`-typed, and the raw
      // E2E_RUN_ID string is not UUID-shaped — comparing it directly against the column raised
      // "invalid input syntax for type uuid". Derive the same UUID the seed routes now stamp
      // (runIdToUuid) rather than filtering on the raw string.
      const taggedId = runIdToUuid(runId);
      const { createClient } = await import('@supabase/supabase-js');
      const sb = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
      const { count } = await sb
        .from('riskpath_records')
        .select('*', { count: 'exact', head: true })
        .eq('e2e_run_id', taggedId);
      // CHARACTERIZATION (best-effort, tag-scoped, 2026-07-27): no RiskPath record attributable to this
      // synthetic E2E run exists. Narrower in mechanism (a direct tag-scoped count, not a full-system
      // guarantee) but broader in coverage than the session-linked check above. Not a substitute for
      // it — reported as a distinct, additional finding.
      expect(count ?? 0, `expected zero RiskPath records tagged with e2e_run_id=${runId}`).toBe(0);
    } else {
      console.log(
        '[characterization] E2E_RUN_ID/SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not all present — skipping the additional tag-scoped RiskPath check; the session-linked check above already ran.',
      );
    }
  });
});

/*
 * NOT EXERCISED IN THIS PASS — one genuine capability gap (not a testability gap) and one deliberate
 * scope choice, neither of which required touching any production component:
 *
 * 1. "Notes" on a service attempt (ReServePanel's `notes`/`setNotes` state, components/notice-flow.tsx
 *    ~line 3262). CORRECTED FRAMING (per Founder/Architect finalization, 2026-07-27): this is not a
 *    selector or testability problem. Notes state scaffolding exists, but no user-facing notes input
 *    is rendered or wired. Notes entry is not an implemented factual capability in the current Serve &
 *    Track UI — there is nothing for a selector to find, stable or otherwise, because the capability
 *    itself does not exist in the shipped product today. Adding a labeled textarea bound to the
 *    existing `notes`/`setNotes` state would be a future PRODUCT implementation, not a test change, and
 *    remains explicitly outside this test-only PR. This is a genuine product-capability gap surfaced by
 *    this characterization pass, not previously documented in the 2026-07-27 audit, and is reported as
 *    such rather than framed as a test limitation.
 *
 * 2. Mailing-date capture for substituted/post-and-mail service methods was not exercised in this pass:
 *    reaching it requires selecting a non-default method radio first, and this suite intentionally
 *    keeps the "expected behavior" tests minimal per the authorized scope. The labels involved
 *    ("Substituted service (someone else at the property)", "Post and mail (posted at property +
 *    mailed)", "Date mailing was completed") are already stable accessible names (implicit label
 *    wrapping / FieldLabel), so no production change is required to test this in a future PR — it is a
 *    scope choice here, not a testability gap.
 */
