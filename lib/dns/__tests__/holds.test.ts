// lib/dns/__tests__/holds.test.ts
// Lane W7 — DO NOT SERVE hold helpers: active detection, gate summary, and locked banner interpolation.

import { isHoldActive, summarizeGates, activeHoldBannerMessage, type DnsHold } from '../holds';
import { lockedProseEntry } from '@/lib/compliance/lockedProse';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok -', name); }
}

// isHoldActive
check('null hold not active', isHoldActive(null) === false);
check('unlifted hold active', isHoldActive({ lifted_at: null }) === true);
check('lifted hold not active', isHoldActive({ lifted_at: '2026-07-02T00:00:00Z' }) === false);

// summarizeGates — outstanding required gates listed; falls back sensibly
check('summarize: outstanding required only',
  summarizeGates([
    { id: 'g1', description: 'Day-count engine correctness', required: true, satisfied_at: null },
    { id: 'g2', description: 'Cover sheet revision alignment', required: true, satisfied_at: '2026-07-02T00:00:00Z' },
    { id: 'g3', description: 'optional note', required: false },
  ]) === 'Day-count engine correctness');
check('summarize: all satisfied → lists required', summarizeGates([{ id: 'g', description: 'X', required: true, satisfied_at: '2026-07-02' }]) === 'X');
check('summarize: empty → fallback', summarizeGates([]) === 'see basis document');

// activeHoldBannerMessage — locked template with all placeholders interpolated, none left over
const hold: DnsHold = {
  id: 'h1', case_id: 'c1',
  imposed_at: '2026-06-29T18:00:00Z', imposed_by: 'Jack Taglyan CalDRE B9445457',
  basis_document_path: 'lahd_eviction_filing_cover_sheet_and_3day_count_defect_broker_ruling_2026-06-30.md',
  basis_section: '§3.6',
  gates: [{ id: 'g1', description: 'Day-count engine correctness', required: true, satisfied_at: null }],
  lifted_at: null, lifted_by: null, countersign_path: null,
};
const msg = activeHoldBannerMessage(hold);
check('banner starts with locked lead', msg.startsWith('This case has an active DO NOT SERVE hold, imposed 2026-06-29T18:00:00Z by Jack Taglyan'));
check('banner interpolates basis', msg.includes('§3.6') && msg.includes('broker_ruling_2026-06-30.md'));
check('banner interpolates gates_summary', msg.includes('Day-count engine correctness'));
check('banner leaves no ${} placeholder', !/\$\{[a-z_]+\}/.test(msg));
check('banner uses the locked prose verbatim template', lockedProseEntry('DNS_ACTIVE_HOLD_BANNER_EN').value.includes('Contact your broker of record to review and lift the hold.'));

if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log('\ndo-not-serve holds: all passed');
