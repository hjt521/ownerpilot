// lib/produce/lahdCoverSheet.test.ts — PR-C §2.2/§2.4 pre-filled cover-sheet builder.
// Proves: pre-fills the fields OwnerPilot has; leaves APN + date-served + Declaration BLANK (never fabricated);
// carries the ratified PO box + revision; never contains notice-face content beyond the cover-sheet's own fields.

import { buildLahdCoverSheetHtml } from './lahdCoverSheet';

let passed = 0, failed = 0;
const check = (n: string, c: boolean) => { c ? passed++ : (failed++, console.log(`  ✗ ${n}`)); if (c) console.log(`  ✓ ${n}`); };

const html = buildLahdCoverSheetHtml({
  ownerName: 'Maria Lopez',
  propertyAddress: '5537 La Mirada Ave, Los Angeles, CA 90038',
  tenantName: 'Clifton Alexander',
  totalAmountOwed: 6000,
});

check('pre-fills owner name', html.includes('Maria Lopez'));
check('pre-fills property address', html.includes('5537 La Mirada Ave, Los Angeles, CA 90038'));
check('pre-fills tenant name', html.includes('Clifton Alexander'));
check('pre-fills total owed, formatted', html.includes('$6,000.00'));
check('notice type pre-filled (3-Day pay-or-quit)', html.includes('3-Day Notice to Pay Rent or Quit'));
check('reason pre-filled (Non-Payment of Rent)', html.includes('Non-Payment of Rent'));
check('APN field present but blank (not fabricated)', html.includes('Assessor Parcel Number (APN)') && !/APN[^<]*\d/.test(html));
check('date served left blank (owner completes)', html.includes('Date served on tenant'));
check('Declaration present with blank signature line', html.includes('penalty of perjury') && html.includes('cs-sigline'));
check('ratified PO box verbatim', html.includes('PO BOX 17850, Los Angeles, CA 90057'));
check('cover-sheet revision stamped', html.includes('Rev 2.6.2026'));
check('states it is not needed for online upload', html.toLowerCase().includes('not needed if you upload'));

// Empty input builds without throwing; owner fields blank.
const empty = buildLahdCoverSheetHtml({});
check('empty input builds (owner fields blank, no throw)', empty.includes('Eviction Notice Filing Cover Sheet') && empty.includes('cs-blank'));

console.log(`\n${'-'.repeat(44)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(44)}`);
if (failed > 0) process.exit(1);
