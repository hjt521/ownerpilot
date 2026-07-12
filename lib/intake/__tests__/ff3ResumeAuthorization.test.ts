// lib/intake/__tests__/ff3ResumeAuthorization.test.ts
// FF-3 Block C server-resume — pure authorization core. Covers: object assembly, note hashing, and the
// fail-closed scope check on every bound field (session, amount, ledger total, ledger period, note hash).

import {
  buildResumeAuthorization,
  checkResumeScope,
  resolutionNoteHash,
  ledgerPeriodKey,
  FF3_RESUME_SCOPE_MISMATCH,
  type ResumeAuthorization,
  type ResumeLiveState,
} from '../ff3ResumeAuthorization';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok -', name); }
}

const NOTE = 'The amount you entered matches your ledger for the June 2026 period. You can continue with the notice as drafted.';
const auth: ResumeAuthorization = buildResumeAuthorization({
  sessionId: '11111111-1111-1111-1111-111111111111',
  noticeAmount: 6300,
  ledgerTotal: 6000,
  ledgerPeriod: '2026-05-01/2026-06-30',
  brokerEmail: 'jack@ownerpilot.ai',
  resolutionNote: NOTE,
  authorizedAt: '2026-07-12T09:00:00.000Z',
});

// --- assembly ---
check('object binds the session id', auth.session_id === '11111111-1111-1111-1111-111111111111');
check('note hash is sha256 of exact bytes', auth.resolution_note_hash === resolutionNoteHash(NOTE));
check('authorized_at preserved', auth.authorized_at === '2026-07-12T09:00:00.000Z');
check('broker email captured', auth.broker_email === 'jack@ownerpilot.ai');

const liveMatch: ResumeLiveState = {
  session_id: auth.session_id,
  notice_amount: 6300,
  ledger_total: 6000,
  ledger_period: '2026-05-01/2026-06-30',
  resolution_note_hash: auth.resolution_note_hash,
};

// --- scope match ---
check('scope check passes when live state is identical', checkResumeScope(auth, liveMatch).ok === true);
check('money compare is 2-dp exact (6300.00 == 6300)', checkResumeScope(auth, { ...liveMatch, notice_amount: 6300.0 }).ok === true);

// --- scope mismatch, fail-closed, one field at a time ---
const amtChanged = checkResumeScope(auth, { ...liveMatch, notice_amount: 6301 });
check('amount drift → mismatch', !amtChanged.ok && amtChanged.reason === FF3_RESUME_SCOPE_MISMATCH && amtChanged.divergedField === 'notice_amount');

const ledgerChanged = checkResumeScope(auth, { ...liveMatch, ledger_total: 5999.99 });
check('ledger total drift → mismatch', !ledgerChanged.ok && ledgerChanged.divergedField === 'ledger_total');

const periodChanged = checkResumeScope(auth, { ...liveMatch, ledger_period: '2026-05-01/2026-07-31' });
check('ledger period drift → mismatch', !periodChanged.ok && periodChanged.divergedField === 'ledger_period');

const sessionChanged = checkResumeScope(auth, { ...liveMatch, session_id: '22222222-2222-2222-2222-222222222222' });
check('session id drift → mismatch', !sessionChanged.ok && sessionChanged.divergedField === 'session_id');

const noteTampered = checkResumeScope(auth, { ...liveMatch, resolution_note_hash: resolutionNoteHash(NOTE + ' extra') });
check('note tamper → mismatch (defense-in-depth)', !noteTampered.ok && noteTampered.divergedField === 'resolution_note_hash');

const nulledAmount = checkResumeScope(auth, { ...liveMatch, notice_amount: null });
check('null live amount → mismatch (fail-closed)', !nulledAmount.ok && nulledAmount.divergedField === 'notice_amount');

// --- ledgerPeriodKey: stable + order-independent (dates only) ---
const p1 = [{ periodStartDate: '2026-05-01', periodEndDate: '2026-05-31' }, { periodStartDate: '2026-06-01', periodEndDate: '2026-06-30' }];
const p2 = [{ periodStartDate: '2026-06-01', periodEndDate: '2026-06-30' }, { periodStartDate: '2026-05-01', periodEndDate: '2026-05-31' }];
check('ledgerPeriodKey is order-independent', ledgerPeriodKey(p1) === ledgerPeriodKey(p2));
check('ledgerPeriodKey changes when a period is added', ledgerPeriodKey(p1) !== ledgerPeriodKey([...p1, { periodStartDate: '2026-07-01', periodEndDate: '2026-07-31' }]));
check('ledgerPeriodKey empty for no periods', ledgerPeriodKey([]) === '' && ledgerPeriodKey(null) === '');
// A re-scoped ledger with the SAME total but different dates invalidates the authorization.
const authPeriod = buildResumeAuthorization({ sessionId: 'sid-2', noticeAmount: 6000, ledgerTotal: 6000, ledgerPeriod: ledgerPeriodKey(p1), brokerEmail: 'b@x', resolutionNote: 'n' });
const rescoped = checkResumeScope(authPeriod, { session_id: 'sid-2', notice_amount: 6000, ledger_total: 6000, ledger_period: ledgerPeriodKey([{ periodStartDate: '2026-05-01', periodEndDate: '2026-06-30' }]), resolution_note_hash: authPeriod.resolution_note_hash });
check('same total, different period scope → mismatch', !rescoped.ok && rescoped.divergedField === 'ledger_period');

if (failed > 0) { console.error(`\n${failed} ff3ResumeAuthorization check(s) FAILED`); process.exit(1); }
else { console.log('\nAll ff3ResumeAuthorization checks passed.'); }
