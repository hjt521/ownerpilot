/**
 * Broker-confirm core unit tests (Decision 2 §6 step 5 coverage).
 * Eligibility (Decision B), token hashing (A §2.3.4), SLA + notification cap
 * (Decision C), status transitions + audit codes (§5), contact purge (A §2.3.5).
 */
import {
  isEscalationEligible,
  BROKER_CONFIRM_ELIGIBLE_REASONS,
  isTerminal,
  canTransition,
  outcomeToStatus,
  BROKER_CONFIRM_AUDIT_CODE,
  slaDueAt,
  isSlaBreached,
  dueNotification,
  shouldNotify,
  generateRequesterToken,
  hashRequesterToken,
  contactPurgeDue,
  SLA_WINDOW_MS,
} from './brokerConfirmCore';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  ✓ ' + name); } else { failed++; console.log('  ✗ ' + name); }
}

// ---- Decision B: eligibility ----
console.log('\n=== eligibility (Decision B) ===');
check('parcel_lookup_inconclusive eligible', isEscalationEligible('manual_review', 'parcel_lookup_inconclusive'));
check('county_situs_gap eligible', isEscalationEligible('manual_review', 'county_situs_gap'));
check('county_ambiguous eligible', isEscalationEligible('manual_review', 'county_ambiguous'));
check('not_la NOT eligible', !isEscalationEligible('not_la', null));
check('confirmed_la NOT eligible', !isEscalationEligible('confirmed_la', null));
check('input_corrected NOT eligible', !isEscalationEligible('manual_review', 'input_corrected'));
check('no_locality NOT eligible', !isEscalationEligible('manual_review', 'no_locality'));
check('coarse_granularity NOT eligible', !isEscalationEligible('manual_review', 'coarse_granularity'));
check('non-manual_review disposition NOT eligible', !isEscalationEligible('confirmed_la', 'parcel_lookup_inconclusive'));
check('eligible set is exactly the three reasons', BROKER_CONFIRM_ELIGIBLE_REASONS.size === 3);

// ---- transitions + audit codes (§5) ----
console.log('\n=== transitions + audit codes ===');
check('pending → confirmed allowed', canTransition('pending', 'confirmed'));
check('pending → denied allowed', canTransition('pending', 'denied'));
check('pending → inconclusive allowed', canTransition('pending', 'inconclusive'));
check('pending → cancelled allowed', canTransition('pending', 'cancelled'));
check('pending → expired allowed', canTransition('pending', 'expired'));
check('confirmed → anything REJECTED (terminal)', !canTransition('confirmed', 'denied'));
check('cancelled → confirmed REJECTED (terminal)', !canTransition('cancelled', 'confirmed'));
check('pending → pending rejected', !canTransition('pending', 'pending'));
check('isTerminal(confirmed)', isTerminal('confirmed') && isTerminal('expired') && isTerminal('cancelled'));
check('isTerminal(pending) false', !isTerminal('pending'));
check('outcome confirmed_la → confirmed', outcomeToStatus('confirmed_la') === 'confirmed');
check('outcome denied_la → denied', outcomeToStatus('denied_la') === 'denied');
check('outcome inconclusive → inconclusive', outcomeToStatus('inconclusive') === 'inconclusive');
check('audit code confirmed = manual_broker_confirmed_la', BROKER_CONFIRM_AUDIT_CODE.confirmed === 'manual_broker_confirmed_la');
check('audit code pending = manual_broker_pending', BROKER_CONFIRM_AUDIT_CODE.pending === 'manual_broker_pending');
check('audit code expired = manual_broker_expired', BROKER_CONFIRM_AUDIT_CODE.expired === 'manual_broker_expired');

// ---- SLA (Decision C) ----
console.log('\n=== SLA window + breach ===');
const created = '2026-06-28T12:00:00.000Z';
const due = slaDueAt(created);
check('sla_due_at = created + 24h', new Date(due).getTime() - new Date(created).getTime() === SLA_WINDOW_MS);
check('not breached 1h before due (pending)', !isSlaBreached('2026-06-29T11:00:00.000Z', due, 'pending'));
check('breached at due (pending)', isSlaBreached('2026-06-29T12:00:00.000Z', due, 'pending'));
check('breached after due (pending)', isSlaBreached('2026-06-29T13:00:00.000Z', due, 'pending'));
check('NOT breached if already confirmed', !isSlaBreached('2026-06-30T00:00:00.000Z', due, 'confirmed'));

// ---- notification schedule + ≤2 cap (§4.2.2) ----
console.log('\n=== notification schedule (≤2 cap) ===');
check('nothing 2h before due', dueNotification('2026-06-29T10:00:00.000Z', due, 'pending', []) === null);
check('warning at due−1h', dueNotification('2026-06-29T11:00:00.000Z', due, 'pending', []) === 'warning');
check('warning suppressed if already sent', dueNotification('2026-06-29T11:30:00.000Z', due, 'pending', ['warning']) === null);
check('breach at due', dueNotification('2026-06-29T12:00:00.000Z', due, 'pending', ['warning']) === 'breach');
check('breach suppressed if already sent', dueNotification('2026-06-29T13:00:00.000Z', due, 'pending', ['warning', 'breach']) === null);
check('no notification once terminal', dueNotification('2026-06-29T13:00:00.000Z', due, 'cancelled', []) === null);
check('shouldNotify false without email', !shouldNotify('breach', null) && !shouldNotify('breach', '  '));
check('shouldNotify true with email', shouldNotify('breach', 'a@b.com'));
check('shouldNotify false when kind null', !shouldNotify(null, 'a@b.com'));

// ---- token (Decision A §2.3.4) ----
console.log('\n=== token generation + hashing ===');
const t1 = generateRequesterToken();
const t2 = generateRequesterToken();
check('token is 64 hex chars (256-bit)', /^[0-9a-f]{64}$/.test(t1));
check('tokens are unique', t1 !== t2);
check('hash is deterministic', hashRequesterToken(t1) === hashRequesterToken(t1));
check('hash differs from raw token (never store raw)', hashRequesterToken(t1) !== t1);
check('different tokens → different hashes', hashRequesterToken(t1) !== hashRequesterToken(t2));

// ---- contact purge (Decision A §2.3.5) ----
console.log('\n=== requester_contact 90-day purge ===');
const resolved = '2026-06-28T00:00:00.000Z';
check('not due before 90d', !contactPurgeDue('2026-08-01T00:00:00.000Z', resolved, null, 'a@b.com'));
check('due at 90d', contactPurgeDue('2026-09-26T00:00:00.000Z', resolved, null, 'a@b.com'));
check('not due if no contact', !contactPurgeDue('2027-01-01T00:00:00.000Z', resolved, null, null));
check('not due if unresolved', !contactPurgeDue('2027-01-01T00:00:00.000Z', null, null, 'a@b.com'));
check('uses cancelled_at anchor when resolved null', contactPurgeDue('2026-09-26T00:00:00.000Z', null, resolved, 'a@b.com'));

console.log('\n----------------------------------------');
console.log(`  ${passed} passed, ${failed} failed`);
console.log('----------------------------------------');
if (failed > 0) process.exit(1);
