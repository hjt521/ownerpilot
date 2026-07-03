// lib/filing/__tests__/lateFiling.test.ts
// Lane W6 — LAHD filing deadline = service_date + 3 LA business days (skip weekends + LA city holidays);
// lateness = today past that deadline; and the locked escape-hatch message interpolates the service date.

import { lahdFilingDeadline, isLateForFiling, lateFilingMessage } from '../lateFiling';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok -', name); }
}

// Founding case: serve Mon 2026-06-29 → 6/30, 7/1, 7/2 → deadline 2026-07-02 (matches the founding filing).
check('deadline: Mon 06-29 → Thu 07-02', lahdFilingDeadline('2026-06-29') === '2026-07-02');
check('on-deadline (07-02) is NOT late', isLateForFiling('2026-06-29', '2026-07-02') === false);
check('day after deadline (07-03) IS late', isLateForFiling('2026-06-29', '2026-07-03') === true);
check('same-day filing not late', isLateForFiling('2026-06-29', '2026-06-30') === false);

// Weekend spanning: serve Fri 2026-07-03 (Fri) — 7/3 is not counted (service day excluded); 7/4 Sat, 7/5 Sun
// skipped; business days 7/6, 7/7, 7/8 → deadline 2026-07-08. (No LA holiday assumed in that window.)
check('deadline spans a weekend', lahdFilingDeadline('2026-07-03') === '2026-07-08');

// Locked message interpolation.
const msg = lateFilingMessage('2026-06-29');
check('message interpolates service date', msg.startsWith('Your notice was served on 2026-06-29, more than three business days ago.'));
check('message no leftover placeholder', !/\$\{[a-z_]+\}/.test(msg));
check('message cites re-serve recovery + CCP §1162(a)(3)', msg.includes('re-serve') && msg.includes('§ 1162(a)(3)'));

if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log('\nlate-filing escape hatch: all passed');
