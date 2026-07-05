// lib/riskpath/__tests__/lahdFilingRecordConfirmationRef.test.ts
// B-1 coverage for p1_email_trigger_dependencies_broker_ruling_2026-07-05 B1: the optional confirmation_ref
// must trim, cap at 64, normalize empty→undefined, and NEVER block the filing record.

import { lahdFilingRecordBodySchema } from '../lahdFilingRecord';

let failed = 0;
const check = (n: string, c: boolean) => { c ? 0 : (failed++, console.error('FAIL:', n)); console.log((c ? 'ok - ' : 'XX - ') + n); };

const base = { filing_date: '2026-07-01', filing_channel: 'online_portal' as const };

// Omitted → valid, undefined.
const omitted = lahdFilingRecordBodySchema.safeParse({ ...base });
check('omitted confirmation_ref → valid', omitted.success);
check('omitted → undefined', omitted.success && omitted.data.confirmation_ref === undefined);

// Empty / whitespace → undefined (not empty string).
const blank = lahdFilingRecordBodySchema.safeParse({ ...base, confirmation_ref: '   ' });
check('whitespace-only → valid + undefined', blank.success && blank.data.confirmation_ref === undefined);

// Trimmed.
const padded = lahdFilingRecordBodySchema.safeParse({ ...base, confirmation_ref: '  LAHD-12345  ' });
check('trims surrounding whitespace', padded.success && padded.data.confirmation_ref === 'LAHD-12345');

// Over-length → truncated to 64, NOT rejected (never blocks the record).
const long = 'X'.repeat(200);
const over = lahdFilingRecordBodySchema.safeParse({ ...base, confirmation_ref: long });
check('over-length accepted (not rejected)', over.success);
check('over-length truncated to 64', over.success && over.data.confirmation_ref?.length === 64);

// A bad filing_date still fails — confirmation_ref does not weaken core validation.
const badDate = lahdFilingRecordBodySchema.safeParse({ ...base, filing_date: 'nope', confirmation_ref: 'A1' });
check('core validation still enforced', !badDate.success);

if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log('\nlahd confirmation_ref (B-1): all passed');
