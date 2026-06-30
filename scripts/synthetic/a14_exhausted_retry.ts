// scripts/synthetic/a14_exhausted_retry.ts
// A14 synthetic test — 8 consecutive transient failures → backoff cadence → exhaust. Real queue + drainOnce
// against PROD under the §0 carve-out (synthetic_a14_target_preview_vs_prod_broker_ruling_2026-06-30) with
// D1–D8 isolation: run-uuid-scoped drain (F1) + quiescence preflight (F1) + SYNTHETIC_RUN_ACTIVE cron pause (Q3).
//
//   SYNTHETIC_RUN_ACTIVE=true (Vercel)  →  set by JT before the run, unset after D4 + D8
//   npm run synthetic:a14:exhaust -- --prod-synthetic
//   env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (shell or .env.synthetic)
//
// Cadence note: backoffMinutes(n)=min(2**(n-1),60) → 1,2,4,8,16,32,60 across attempts 1–7; attempt 8 reaches
// max_attempts(8) and EXHAUSTS (resolved + last_error). The ruling's "(…,60,60)" describes the formula at n=8;
// exhaust supersedes scheduling an 8th wait. Surfaced for broker confirm if a literal 8th wait is wanted.

import { drainSyntheticOnly, backoffMinutes } from '../../lib/automation/queueDrain';
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

const runId = makeRunId('A14-EXHAUST');
let pass = 0,
  fail = 0;
const ck = (n: string, c: boolean) => {
  c ? pass++ : (fail++, console.error('FAIL:', n));
};

const payload = (): RunRecord & { synthetic_run_id: string } => ({
  cron_id: 'cron_9_mirror_health_check',
  cron_name: 'Geocode audit-log integrity check',
  cron_category: 'in_app_health',
  status: 'failure',
  run_date: new Date().toISOString(),
  changes_found: 0,
  summary: `${runId} forced failure`,
  report_link: '',
  synthetic_run_id: runId,
});

async function main() {
  const sb = guardProdSyntheticTarget(); // B1 + D5
  const startedAt = logRunStart(runId); // D7
  let cleanupRemaining = -1;
  const alwaysFail: (p: RunRecord) => Promise<MirrorResult> = async () => ({ written: false, reason: 'queued_for_retry' });
  try {
    await preflightQueueQuiescent(sb); // F1 preflight

    const { data: ins } = await sb
      .from(QUEUE_TABLE)
      .insert({ payload_jsonb: payload(), next_retry_at: new Date(Date.now() - 1000).toISOString() })
      .select('id')
      .single();
    ck('row enqueued', !!ins?.id);

    let clock = Date.now();
    const observedDelays: number[] = [];
    for (let tick = 1; tick <= 8; tick++) {
      await drainSyntheticOnly(sb, alwaysFail, runId, { nowMs: clock });
      const { data: row } = await sb
        .from(QUEUE_TABLE)
        .select('attempts, resolved_at, next_retry_at, last_error')
        .eq('id', ins!.id)
        .single();
      if (row!.resolved_at === null) {
        observedDelays.push(Math.round((new Date(row!.next_retry_at).getTime() - clock) / 60_000));
        clock = new Date(row!.next_retry_at).getTime(); // advance past the scheduled backoff
      } else {
        ck(`exhausted at attempt ${tick} (=8)`, tick === 8 && row!.attempts === 8 && !!row!.last_error);
        break;
      }
    }
    const expected = [1, 2, 4, 8, 16, 32, 60].map((m, i) => backoffMinutes(i + 1));
    ck('backoff cadence 1,2,4,8,16,32,60 across attempts 1–7', JSON.stringify(observedDelays) === JSON.stringify(expected));
  } finally {
    await cleanupByRunId(sb, runId); // D3
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
