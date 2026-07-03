// lib/filing/__tests__/efsRecord.test.ts
// Lane W4 — EFS record parsing, the 60-day edit window (five tenant fields), and the locked post-filing card.

import {
  parseEfsRecordNumber, isEfsRecordNumber, editableFieldsWindow, postFilingCardMessage, EDITABLE_TENANT_FIELDS,
} from '../efsRecord';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok -', name); }
}

// parse — founding record from confirmation text
check('parses EFS from email body', parseEfsRecordNumber('FILE NUMBER: EFS0317078 — filed 2026-07-02') === 'EFS0317078');
check('parses lowercase + normalizes', parseEfsRecordNumber('confirmation efs0302881 received') === 'EFS0302881');
check('null when absent', parseEfsRecordNumber('no record here') === null);
check('null on empty', parseEfsRecordNumber('') === null && parseEfsRecordNumber(undefined) === null);
check('validator: exact EFS+7', isEfsRecordNumber('EFS0317078') && !isEfsRecordNumber('EFS12345') && !isEfsRecordNumber('ABC0317078'));

// 60-day edit window
{
  const w0 = editableFieldsWindow('2026-07-02', '2026-07-02'); // day of filing
  check('day 0 within window, 60 remaining', w0.withinWindow && w0.daysRemaining === 60);
  check('day 0 editable = the five fields', w0.editableFields.length === 5 && w0.editableFields.join(',') === EDITABLE_TENANT_FIELDS.join(','));

  const w30 = editableFieldsWindow('2026-07-02', '2026-08-01'); // 30 days later
  check('day 30 within window, 30 remaining', w30.withinWindow && w30.daysRemaining === 30);

  const w60 = editableFieldsWindow('2026-07-02', '2026-08-31'); // exactly 60 days later
  check('day 60 still within window (inclusive)', w60.withinWindow && w60.daysRemaining === 0);

  const w61 = editableFieldsWindow('2026-07-02', '2026-09-01'); // 61 days later
  check('day 61 window closed, no editable fields', !w61.withinWindow && w61.editableFields.length === 0);
}

// locked post-filing card
const card = postFilingCardMessage('EFS0317078');
check('card interpolates record number', card.includes('Record number EFS0317078.'));
check('card names the LAHD sender + 5 editable fields', card.includes('donotreplylahd@lahdsystems.lacity.org') && card.includes('unit number, phone, email, and name'));
check('card cites LAHD phone for locked fields', card.includes('(866) 557-7368'));
check('card no leftover placeholder', !/\$\{[a-z_]+\}/.test(card));

if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log('\nW4 EFS capture + edit window: all passed');
