// lib/automation/queueDrain.test.ts
// F1 isolation regression: proves the run-uuid scope is actually applied to the drain selection (the
// harness's safety claim) and that drainSyntheticOnly refuses to run without a run-uuid. Plus a
// nextQueueState sanity check. Plain tsx suite (process.exit on failure), per scripts/run_tests.mjs.

import { drainOnce, drainSyntheticOnly, selectDueRows, nextQueueState } from './queueDrain';
import type { RunRecord } from './types';
import type { MirrorResult } from './notion';

let pass = 0,
  fail = 0;
const ck = (n: string, c: boolean) => {
  c ? pass++ : (fail++, console.error('FAIL:', n));
};

// Minimal chainable Supabase stub that records .filter() calls and resolves the select to `rows`.
function fakeSb(rows: unknown[]) {
  const filterCalls: Array<[string, string, unknown]> = [];
  const updates: Array<Record<string, unknown>> = [];
  const builder: Record<string, unknown> = {};
  Object.assign(builder, {
    from: () => builder,
    select: () => builder,
    is: () => builder,
    lte: () => builder,
    order: () => builder,
    filter: (col: string, op: string, val: unknown) => {
      filterCalls.push([col, op, val]);
      return builder;
    },
    // .limit() terminates the select chain → thenable returning the rows
    limit: () => Promise.resolve({ data: rows }),
    update: (u: Record<string, unknown>) => {
      updates.push(u);
      return { eq: () => Promise.resolve({ data: null, error: null }) };
    },
  });
  return { sb: builder as never, filterCalls, updates };
}

const sampleRow = { id: 'r1', payload_jsonb: {} as RunRecord, attempts: 0, max_attempts: 8 };
const ok: (p: RunRecord) => Promise<MirrorResult> = async () => ({ written: true });

async function main() {
  // 1. selectDueRows WITH a run id applies the json-path filter exactly once, with the right args.
  {
    const { sb, filterCalls } = fakeSb([]);
    await selectDueRows(sb, Date.now(), 50, 'SYN-A14-503-X');
    ck('selectDueRows(runId) applies one filter', filterCalls.length === 1);
    ck(
      'filter targets payload_jsonb->>synthetic_run_id eq runId',
      filterCalls[0]?.[0] === 'payload_jsonb->>synthetic_run_id' &&
        filterCalls[0]?.[1] === 'eq' &&
        filterCalls[0]?.[2] === 'SYN-A14-503-X',
    );
  }

  // 2. selectDueRows WITHOUT a run id applies NO filter (real cron path unchanged).
  {
    const { sb, filterCalls } = fakeSb([]);
    await selectDueRows(sb, Date.now(), 50);
    ck('selectDueRows() real-cron path applies no synthetic filter', filterCalls.length === 0);
  }

  // 3. drainOnce passes its syntheticRunId through to the filtered selection.
  {
    const { sb, filterCalls } = fakeSb([sampleRow]);
    await drainOnce(sb, ok, { syntheticRunId: 'SYN-RUN-7' });
    ck('drainOnce(syntheticRunId) filters the selection', filterCalls.some((c) => c[2] === 'SYN-RUN-7'));
  }

  // 4. drainSyntheticOnly REFUSES an empty run id (F1 abort-if-missing).
  {
    let threw = false;
    try {
      await drainSyntheticOnly(fakeSb([]).sb, ok, '');
    } catch {
      threw = true;
    }
    ck('drainSyntheticOnly aborts without a runId', threw);
  }

  // 5. drainSyntheticOnly with a run id does filter the selection.
  {
    const { sb, filterCalls } = fakeSb([sampleRow]);
    await drainSyntheticOnly(sb, ok, 'SYN-RUN-8');
    ck('drainSyntheticOnly(runId) filters the selection', filterCalls.some((c) => c[2] === 'SYN-RUN-8'));
  }

  // 6. nextQueueState sanity: a transient failure at attempt 7 requeues; the 8th exhausts.
  {
    const requeue = nextQueueState({ attempts: 6, max_attempts: 8 }, { written: false }, 0);
    ck('attempt 7 requeues', requeue.action === 'requeued');
    const exhaust = nextQueueState({ attempts: 7, max_attempts: 8 }, { written: false }, 0);
    ck('attempt 8 exhausts', exhaust.action === 'exhausted');
  }

  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
