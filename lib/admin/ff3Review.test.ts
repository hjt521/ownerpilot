// lib/admin/ff3Review.test.ts
// Regression guard for the silent-error-swallow fix (#178). loadAwaitingReview / loadSessionTranscript must FAIL
// LOUD on a query error (throw) rather than swallow it and return an empty list / null — the exact failure mode
// that let the migration-050 schema-before-flag drift present as "no sessions awaiting review" during the
// 2026-07-18 rollback drill. Plain tsx suite (no framework), mirrors the repo test pattern.

import { loadAwaitingReview, loadSessionTranscript } from './ff3Review';
import type { SupabaseClient } from '@supabase/supabase-js';

let passed = 0, failed = 0;
const check = (n: string, c: boolean, d = '') => { c ? passed++ : (failed++, console.log(`  ✗ ${n}${d ? ` — ${d}` : ''}`)); if (c) console.log(`  ✓ ${n}`); };

type Result = { data: unknown; error: { message: string } | null };

/** A chainable, awaitable stand-in for the supabase query builder: every method returns the same thenable, which
 *  resolves to the per-table result configured below. `maybeSingle` returns the result directly. */
function makeClient(byTable: Record<string, Result>): SupabaseClient {
  const chain = (result: Result): any => {
    const p: any = {
      select: () => p, eq: () => p, not: () => p, is: () => p, in: () => p, order: () => p,
      maybeSingle: () => Promise.resolve(result),
      then: (res: (v: Result) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej),
    };
    return p;
  };
  return { from: (t: string) => chain(byTable[t] ?? { data: [], error: null }) } as unknown as SupabaseClient;
}

async function throwsAsync(fn: () => Promise<unknown>): Promise<boolean> {
  try { await fn(); return false; } catch { return true; }
}

(async () => {
  // 1. sessions query error → THROW (not empty list). This is the core regression.
  const errClient = makeClient({ chat_sessions: { data: null, error: { message: 'column chat_sessions.broker_reply_thread does not exist' } } });
  check('loadAwaitingReview throws on sessions query error (does NOT return [])', await throwsAsync(() => loadAwaitingReview(errClient)));

  // 2. empty result (no error) → returns [] (genuine empty queue, distinct from the error case).
  const emptyClient = makeClient({ chat_sessions: { data: [], error: null } });
  const emptyRes = await loadAwaitingReview(emptyClient);
  check('loadAwaitingReview returns [] on genuine empty queue', Array.isArray(emptyRes) && emptyRes.length === 0);

  // 3. happy path → maps fields; gap context from compliance_gates.
  const okClient = makeClient({
    chat_sessions: { data: [{ id: 's1', reconciliation_resolved_at: '2026-07-01T00:00:00Z', broker_reply_thread: [] }], error: null },
    compliance_gates: { data: [{ chat_session_id: 's1', context_json: { noticeAmount: 6000, ledgerTotal: 5700 }, evaluated_at: '2026-07-01T00:00:00Z' }], error: null },
  });
  const rows = await loadAwaitingReview(okClient);
  check('loadAwaitingReview maps one row with gap context', rows.length === 1 && rows[0].session_id === 's1' && rows[0].notice_amount === 6000 && rows[0].ledger_total === 5700 && Array.isArray(rows[0].reply_thread));

  // 4. gap-context query error → DEGRADES (row still lists, amounts null), does NOT throw.
  const gapErrClient = makeClient({
    chat_sessions: { data: [{ id: 's2', reconciliation_resolved_at: '2026-07-02T00:00:00Z', broker_reply_thread: [] }], error: null },
    compliance_gates: { data: null, error: { message: 'transient' } },
  });
  const degraded = await loadAwaitingReview(gapErrClient);
  check('loadAwaitingReview degrades gracefully on gap-context error (row lists, amounts null)', degraded.length === 1 && degraded[0].session_id === 's2' && degraded[0].notice_amount === null && degraded[0].ledger_total === null);

  // 5. loadSessionTranscript: query error → THROW; not-found → null.
  const tErrClient = makeClient({ chat_sessions: { data: null, error: { message: 'boom' } } });
  check('loadSessionTranscript throws on query error', await throwsAsync(() => loadSessionTranscript(tErrClient, 's1')));
  const tNullClient = makeClient({ chat_sessions: { data: null, error: null } });
  check('loadSessionTranscript returns null on genuine not-found', (await loadSessionTranscript(tNullClient, 's1')) === null);

  console.log(`\nff3Review: ${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
})();
