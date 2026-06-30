// scripts/synthetic/a14_503_enqueue_drain_resolve.ts
// A14 synthetic test — 503 → enqueue → drain → resolve. Exercises the REAL queue table + drainOnce logic
// against PROD under the §0 carve-out (synthetic_a14_target_preview_vs_prod_broker_ruling_2026-06-30),
// with D1–D8 isolation discipline. Three queue locks: run-uuid-scoped drain (F1) + quiescence preflight
// (F1) + SYNTHETIC_RUN_ACTIVE cron pause (Q3, set by JT around the window).
//
//   SYNTHETIC_RUN_ACTIVE=true (Vercel)  →  set by JT before the run, unset after D4 + D8
//   npm run synthetic:a14:503 -- --prod-synthetic
//   env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (shell or .env.synthetic)

import { drainSyntheticOnly } from '../../lib/automation/queueDrain';
import {
  guardProdSyntheticTarget,
  makeRunId,
  preflightQueueQuiescent,
  cleanupByRunId,
  verifyCleanupZero,
  logRunStart,
  logRunEnd,
  QUEUE_TABLE,
} from '../../lib/automation/syntheticHarness';
import type { RunRecord } from '../../lib/automation/types';
import type { MirrorResult } from '../../lib/automation/notion';

const runId = makeRunId('A14-503');
let pass = 0,
  fail = 0;
const ck = (n: string, c: boolean) => {
  c ? pass++ : (fail++, console.error('FAIL:', n));
};

// D1/D2: every row carries the run-uuid for scoped drain + scoped cleanup.
function testPayload(): RunRecord & { synthetic_run_id: string } {
  return {
    cron_id: 'cron_9_mirror_health_check',
    cron_name: 'Geocode audit-log integrity check',
    cron_category: 'in_app_health',
    status: 'clean',
    run_date: new Date().toISOString(),
    changes_found: 0,
    summary: `${runId} all integrity checks passed`,
    report_link: '',
    synthetic_run_id: runId,
  };
}

async function main() {
  const sb = guardProdSyntheticTarget(); // B1 + D5
  const startedAt = logRunStart(runId); // D7
  let cleanupRemaining = -1;
  try {
    await preflightQueueQuiescent(sb); // F1 preflight — abort if real due rows exist

    // 1. enqueue (simulates a transient Notion failure having queued the row)
    const { data: ins } = await sb
      .from(QUEUE_TABLE)
      .insert({ payload_jsonb: testPayload(), next_retry_at: new Date(Date.now() - 1000).toISOString() })
      .select('id')
      .single();
    ck('row enqueued', !!ins?.id);

    // 2. drain tick #1 — mock Notion returns transient failure → row should requeue (attempts=1)
    const fail503: (p: RunRecord) => Promise<MirrorResult> = async () => ({ written: false, reason: 'queued_for_retry' });
    await drainSyntheticOnly(sb, fail503, runId, { nowMs: Date.now() });
    const { data: afterFail } = await sb
      .from(QUEUE_TABLE)
      .select('attempts, resolved_at, next_retry_at')
      .eq('id', ins!.id)
      .single();
    ck(
      'after 503: attempts=1, unresolved, backoff scheduled',
      afterFail!.attempts === 1 && afterFail!.resolved_at === null && new Date(afterFail!.next_retry_at).getTime() > Date.now(),
    );

    // 3. drain tick #2 — mock returns success (advance clock past backoff) → row resolves
    const ok200: (p: RunRecord) => Promise<MirrorResult> = async () => ({ written: true });
    await drainSyntheticOnly(sb, ok200, runId, { nowMs: Date.now() + 5 * 60_000 });
    const { data: afterOk } = await sb.from(QUEUE_TABLE).select('resolved_at').eq('id', ins!.id).single();
    ck('after 200: resolved_at set', afterOk!.resolved_at !== null);
  } finally {
    await cleanupByRunId(sb, runId); // D3 — scoped to this run only
    cleanupRemaining = await verifyCleanupZero(sb, runId); // D4
    ck('cleanup verified: zero rows remain for runId', cleanupRemaining === 0);
  }
  logRunEnd(runId, startedAt, pass, fail, cleanupRemaining); // D7
  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
