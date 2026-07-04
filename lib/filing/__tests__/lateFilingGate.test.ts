// lib/filing/__tests__/lateFilingGate.test.ts
// Lane W6 gate — ordinance-verbatim discipline (Fork-1), hard-code assertion, drift detection, and the three
// Wave-4 synthetics (SC-W6-ORDINANCE-TEXT-VERBATIM-DRIFT-01 / -BOUNDARY-EQUAL-01 / -HOLIDAY-STRADDLE-01).

import { createHash } from 'node:crypto';
import {
  evaluateLateFilingGate, parseWindowFromVerbatim,
  LAMC_LATE_FILING_ORDINANCE_VERBATIM, LAMC_LATE_FILING_SOURCE_AUTHORITY,
  LAMC_LATE_FILING_VERBATIM_HASH, LATE_FILING_WINDOW_BUSINESS_DAYS,
} from '../lateFilingGate';
import { lahdFilingDeadline } from '../lateFiling';
import { CA_JURISDICTION_MATRIX } from '@/lib/jurisdiction/caJurisdictionMatrix';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok -', name); }
}

const la = CA_JURISDICTION_MATRIX.find((r) => r.jurisdictionId === 'ca-los-angeles-city')!;

// --- Ordinance-verbatim discipline (Fork-1) ---------------------------------------------------------------------
check('verbatim byte-matches caJurisdictionMatrix.postServiceFiling (sync-source drift guard)',
  LAMC_LATE_FILING_ORDINANCE_VERBATIM === la.postServiceFiling);
check('source_authority byte-matches matrix authority',
  LAMC_LATE_FILING_SOURCE_AUTHORITY === la.authority);
check('verbatim_hash const == sha256(verbatim) (edit breaks build)',
  LAMC_LATE_FILING_VERBATIM_HASH === createHash('sha256').update(LAMC_LATE_FILING_ORDINANCE_VERBATIM, 'utf8').digest('hex'));

// --- Hard-code assertion: window integer == number parsed from the verbatim (Fork-1 ratification) ----------------
check('parseWindowFromVerbatim(verbatim) == 3', parseWindowFromVerbatim(LAMC_LATE_FILING_ORDINANCE_VERBATIM) === 3);
check('hard-coded window equals parsed window (no silent drift)',
  LATE_FILING_WINDOW_BUSINESS_DAYS === parseWindowFromVerbatim(LAMC_LATE_FILING_ORDINANCE_VERBATIM));

// --- SC-W6-ORDINANCE-TEXT-VERBATIM-DRIFT-01 ---------------------------------------------------------------------
// If the ordinance number drifts, the parse diverges from the hard-coded window → the assertion above would fail.
{
  const drifted = LAMC_LATE_FILING_ORDINANCE_VERBATIM.replace('3 business days', '5 business days');
  check('SC-W6-ORDINANCE-TEXT-VERBATIM-DRIFT-01: drifted verbatim parses to a different window (5 != 3)',
    parseWindowFromVerbatim(drifted) === 5 && parseWindowFromVerbatim(drifted) !== LATE_FILING_WINDOW_BUSINESS_DAYS);
  const driftedHash = createHash('sha256').update(drifted, 'utf8').digest('hex');
  check('SC-W6-ORDINANCE-TEXT-VERBATIM-DRIFT-01: drifted hash != pinned hash (build-break signal)',
    driftedHash !== LAMC_LATE_FILING_VERBATIM_HASH);
}

// --- SC-W6-BOUNDARY-EQUAL-01: "within 3 business days" is a <= edge --------------------------------------------
// Serve Mon 2026-06-29 → business days 6/30, 7/1, 7/2 → deadline 2026-07-02 (no holiday in window).
{
  const input = { notice_type: 'three_day_pay_or_quit', service_date: '2026-06-29', evaluatedAt: '2026-07-02T12:00:00Z' };
  check('deadline for 2026-06-29 is 2026-07-02', lahdFilingDeadline('2026-06-29') === '2026-07-02');
  const onDeadline = evaluateLateFilingGate({ ...input, today: '2026-07-02' });
  check('SC-W6-BOUNDARY-EQUAL-01: filing ON the deadline (day 3) → pass', onDeadline.result === 'pass');
  check('boundary field is <=', onDeadline.context.boundary === '<=');
  check('SC-W6-BOUNDARY-EQUAL-01: the day after the deadline → block',
    evaluateLateFilingGate({ ...input, today: '2026-07-03' }).result === 'block');
}

// --- SC-W6-HOLIDAY-STRADDLE-01: window crosses the observed July 4 holiday ---------------------------------------
// Serve Wed 2026-07-01 → 7/2(1), skip 7/3 (observed July 4 holiday) + weekend, 7/6(2), 7/7(3) → deadline 2026-07-07.
// Without the holiday skip the deadline would be 2026-07-06; asserting 07-07 proves the holiday was skipped.
{
  check('SC-W6-HOLIDAY-STRADDLE-01: deadline skips the July-4 holiday (07-01 → 07-07)',
    lahdFilingDeadline('2026-07-01') === '2026-07-07');
  const g = evaluateLateFilingGate({ notice_type: 'three_day_pay_or_quit', service_date: '2026-07-01', today: '2026-07-07', evaluatedAt: '2026-07-07T12:00:00Z' });
  check('SC-W6-HOLIDAY-STRADDLE-01: filing on the holiday-adjusted deadline → pass', g.result === 'pass');
  check('SC-W6-HOLIDAY-STRADDLE-01: context carries the adjusted deadline', g.context.filing_deadline === '2026-07-07');
}

// --- Fail-closed: missing prerequisite (W6 §4) ------------------------------------------------------------------
check('null notice_type → prerequisite_incomplete (fail-closed, not pass)',
  evaluateLateFilingGate({ notice_type: null, service_date: '2026-06-29', today: '2026-07-02' }).result === 'prerequisite_incomplete');
check('null service_date → prerequisite_incomplete',
  evaluateLateFilingGate({ notice_type: 'thirty_day_termination', service_date: null, today: '2026-07-02' }).result === 'prerequisite_incomplete');
{
  const g = evaluateLateFilingGate({ notice_type: null, service_date: null, today: '2026-07-02' });
  check('prerequisite_incomplete still stamps verbatim_hash + authority + evaluated_at',
    g.context.verbatim_hash === LAMC_LATE_FILING_VERBATIM_HASH && g.context.source_authority === LAMC_LATE_FILING_SOURCE_AUTHORITY && typeof g.context.evaluated_at === 'string');
  check('prerequisite_incomplete has null filing_deadline', g.context.filing_deadline === null);
}

// --- gate identity ---------------------------------------------------------------------------------------------
check('gate id is w6_late_filing',
  evaluateLateFilingGate({ notice_type: 'three_day_pay_or_quit', service_date: '2026-06-29', today: '2026-07-02' }).gate === 'w6_late_filing');

if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log('\nW6 late-filing gate: all passed');
