// scripts/synthetic/a14_exhausted_retry.ts
// A14 synthetic test — 8 consecutive transient failures → backoff cadence → exhaust. Real queue + drainOnce
// against a Supabase PREVIEW branch. Idempotent cleanup. NEVER runs without --preview-db.
//
//   npm run synthetic:a14:exhaust -- --preview-db
//   env: SUPABASE_PREVIEW_URL, SUPABASE_PREVIEW_SERVICE_ROLE_KEY
//
// Cadence note: backoffMinutes(n)=min(2**(n-1),60) → 1,2,4,8,16,32,60 across attempts 1–7; attempt 8 reaches
// max_attempts(8) and EXHAUSTS (resolved + last_error + broker notify). The ruling's "(…,60,60)" describes the
// formula at n=8; exhaust supersedes scheduling an 8th wait. Surfaced for broker confirm if a literal 8th wait is wanted.

import { createClient } from '@supabase/supabase-js';
import { drainOnce, backoffMinutes } from '../../lib/automation/queueDrain';
import type { RunRecord } from '../../lib/automation/types';
import type { MirrorResult } from '../../lib/automation/notion';

const MARKER = 'SYNTHETIC_A14_EXHAUST';
let pass = 0, fail = 0;
const ck = (n: string, c: boolean) => { c ? pass++ : (fail++, console.error('FAIL:', n)); };

function guardPreviewDb() {
  if (!process.argv.includes('--preview-db')) throw new Error('refusing to run without --preview-db (never target prod)');
  const url = process.env.SUPABASE_PREVIEW_URL, key = process.env.SUPABASE_PREVIEW_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_PREVIEW_URL + SUPABASE_PREVIEW_SERVICE_ROLE_KEY required');
  if (/(prod|www\.ownerpilot)/i.test(url)) throw new Error('URL looks like production — aborting');
  return createClient(url, key, { auth: { persistSession: false } });
}

const payload = (): RunRecord => ({ cron_id: 'cron_9_mirror_health_check', cron_name: 'Geocode audit-log integrity check',
  cron_category: 'in_app_health', status: 'failure', run_date: new Date().toISOString(),
  changes_found: 0, summary: `${MARKER} forced failure`, report_link: '' });

async function main() {
  const sb = guardPreviewDb();
  const alwaysFail: (p: RunRecord) => Promise<MirrorResult> = async () => ({ written: false, reason: 'queued_for_retry' });
  try {
    const { data: ins } = await sb.from('automation_mirror_queue')
      .insert({ payload_jsonb: payload(), next_retry_at: new Date(Date.now() - 1000).toISOString() })
      .select('id').single();
    ck('row enqueued', !!ins?.id);

    let clock = Date.now();
    const observedDelays: number[] = [];
    for (let tick = 1; tick <= 8; tick++) {
      await drainOnce(sb, alwaysFail, { nowMs: clock });
      const { data: row } = await sb.from('automation_mirror_queue')
        .select('attempts, resolved_at, next_retry_at, last_error').eq('id', ins!.id).single();
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
    const { data: all } = await sb.from('automation_mirror_queue').select('id, payload_jsonb');
    for (const r of all ?? []) {
      if ((r.payload_jsonb as RunRecord)?.summary?.startsWith(MARKER)) {
        await sb.from('automation_mirror_queue').delete().eq('id', r.id);
      }
    }
  }
  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
