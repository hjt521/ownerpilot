// lib/riskpath/lahdFilingRecord.test.ts — PR-C §6 filing-record body validation.

import { lahdFilingRecordBodySchema, COVER_SHEET_REVISION } from './lahdFilingRecord';

let passed = 0, failed = 0;
const check = (n: string, c: boolean) => { c ? passed++ : (failed++, console.log(`  ✗ ${n}`)); if (c) console.log(`  ✓ ${n}`); };
const ok = (r: { success: boolean }) => r.success;
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

check('valid online_portal', ok(lahdFilingRecordBodySchema.safeParse({ filing_date: yesterday, filing_channel: 'online_portal' })));
check('valid mail_with_cover_sheet', ok(lahdFilingRecordBodySchema.safeParse({ filing_date: yesterday, filing_channel: 'mail_with_cover_sheet' })));
check('valid other', ok(lahdFilingRecordBodySchema.safeParse({ filing_date: yesterday, filing_channel: 'other' })));
check('future filing_date rejected', !ok(lahdFilingRecordBodySchema.safeParse({ filing_date: tomorrow, filing_channel: 'online_portal' })));
check('non-ISO date rejected', !ok(lahdFilingRecordBodySchema.safeParse({ filing_date: '07/01/2026', filing_channel: 'online_portal' })));
check('unknown channel rejected', !ok(lahdFilingRecordBodySchema.safeParse({ filing_date: yesterday, filing_channel: 'fax' })));
check('missing filing_date rejected', !ok(lahdFilingRecordBodySchema.safeParse({ filing_channel: 'other' })));
check('COVER_SHEET_REVISION is the ratified baseline', COVER_SHEET_REVISION === 'Rev 2.6.2026');

console.log(`\n${'-'.repeat(44)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(44)}`);
if (failed > 0) process.exit(1);
