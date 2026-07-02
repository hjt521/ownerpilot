// e2e/lahd-cover-sheet.spec.ts — PR-C Surface 6 (Gate-3 Slice 3, Seam 6). Deploy-run, Preview-only.
// The pre-filled LAHD cover sheet: served as printable HTML, stamped with the ratified COVER_SHEET_REVISION,
// pre-fills known fields from the produce_snapshot, and leaves the six unknown fields as BLANK ruled lines —
// never fabricated or defaulted (PR-C §3 deviation 2 anti-defaulting; fabricating any of the six is a defect).
// Foreign riskpath → 404. Reuses the Slice-2 seed unmodified with withProduceAudit:true (snapshot-bearing row).

import { test, expect, request } from '@playwright/test';

const SEED_SECRET = process.env.TEST_SEED_SECRET ?? '';
const RUN_ID = process.env.E2E_RUN_ID ?? '';
const authHeaders = { authorization: `Bearer ${SEED_SECRET}`, 'x-e2e-run-id': RUN_ID };

// The five unknown DATA fields OwnerPilot never has → must render blank (the 6th blank is the signature line).
const BLANK_LABELS = [
  'Assessor Parcel Number (APN)',
  'Number of bedrooms',
  'Tenant phone / email (if known)',
  'Date served on tenant',
  'Current monthly rent',
];

test('cover sheet: revision stamped, known fields pre-filled, six unknowns stay blank; foreign → 404', async () => {
  const ctx = await request.newContext();
  const seed = await ctx.post('/api/test/seed-produced-session', { headers: authHeaders, data: { withProduceAudit: true } });
  expect(seed.ok()).toBeTruthy();
  const { cookie, riskpathId } = await seed.json();
  const ch = { cookie: `op_chat_token=${cookie}` };

  const res = await ctx.get(`/api/notices/${riskpathId}/lahd-cover-sheet`, { headers: ch });
  expect(res.ok()).toBeTruthy();
  expect(res.headers()['content-type']).toContain('text/html');
  const html = await res.text();

  // Ratified revision constant present — never a fabricated newer revision (§7.2 anti-defaulting).
  expect(html).toContain('Rev 2.6.2026');

  // Known fields pre-filled from the seed's snapshot (contrast with the blanks below).
  expect(html).toContain('5537 La Mirada Ave');
  expect(html).toContain('Clifton Alexander');

  // Anti-defaulting: each of the five unknown data fields renders BLANK, never a fabricated value.
  for (const label of BLANK_LABELS) {
    expect(html, `${label} must render blank`).toContain(`class="cs-label">${label}</span><span class="cs-blank">`);
    expect(html, `${label} must not be fabricated`).not.toContain(`class="cs-label">${label}</span><span class="cs-val">`);
  }
  // Sixth blank: the Declaration signature line stays blank (OwnerPilot is not the declarant).
  expect(html).toContain('cs-sigline');

  // Owner-scope: a foreign riskpath → 404.
  const foreign = await ctx.get('/api/notices/00000000-0000-4000-8000-000000000000/lahd-cover-sheet', { headers: ch });
  expect(foreign.status()).toBe(404);
});
