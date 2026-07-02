// lib/privacy/__tests__/sla.test.ts
// Fork D1 — the 45-day CCPA SLA computes the due date + triage state correctly. Self-executing.

import { slaDueAt, slaStatus, SLA_DAYS } from '../sla';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok -', name); }
}

const submitted = '2026-07-01T00:00:00.000Z';

check('SLA is 45 days', SLA_DAYS === 45);
check('due date = submitted + 45 days', slaDueAt(submitted).slice(0, 10) === '2026-08-15');

check('on_track when far from due', slaStatus(submitted, null, '2026-07-02T00:00:00.000Z').state === 'on_track');
check('due_soon within 7 days', slaStatus(submitted, null, '2026-08-10T00:00:00.000Z').state === 'due_soon');
check('overdue past the deadline', slaStatus(submitted, null, '2026-08-20T00:00:00.000Z').state === 'overdue');
check('daysRemaining negative when overdue', slaStatus(submitted, null, '2026-08-20T00:00:00.000Z').daysRemaining < 0);
check('responded → state responded regardless of clock', slaStatus(submitted, '2026-07-10T00:00:00.000Z', '2026-08-20T00:00:00.000Z').state === 'responded');
check('responded → daysRemaining 0', slaStatus(submitted, '2026-07-10T00:00:00.000Z').daysRemaining === 0);

if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log('\nprivacy SLA: all passed');
