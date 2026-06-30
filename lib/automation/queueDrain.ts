// lib/automation/queueDrain.ts
// Lane 7 A14 — shared drain logic for the mirror retry queue. Pure decision (nextQueueState) + I/O loop
// (drainOnce with an INJECTABLE mirror fn, so cron #10 and the synthetic test scripts exercise the SAME code).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { RunRecord } from './types';
import type { MirrorResult } from './notion';

export type DrainAction = 'resolved' | 'denylist_resolved' | 'exhausted' | 'requeued';

export interface QueueRow {
  id: string;
  payload_jsonb: RunRecord;
  attempts: number;
  max_attempts: number;
}

/** Backoff for the Nth attempt (1-indexed): 1,2,4,8,16,32,60,60… capped at 60 min (ruling §5.3 cadence). */
export function backoffMinutes(newAttempts: number): number {
  return Math.min(2 ** (newAttempts - 1), 60);
}

export interface QueueDecision {
  action: DrainAction;
  update: Record<string, unknown>;
}

/** Pure: given a row + the mirror outcome + now, decide the DB update. No I/O. */
export function nextQueueState(
  row: Pick<QueueRow, 'attempts' | 'max_attempts'>,
  result: Pick<MirrorResult, 'written'> & { reason?: string },
  nowMs: number,
): QueueDecision {
  const nowIso = new Date(nowMs).toISOString();

  if (result.written) {
    return { action: 'resolved', update: { resolved_at: nowIso } };
  }
  // denylist block is a code defect — resolve it out so it never loops (notify already fired upstream).
  if (result.reason === 'denylist_block') {
    return { action: 'denylist_resolved', update: { resolved_at: nowIso, last_error: 'denylist_block (code defect)' } };
  }
  // Any other non-write = a retryable failure.
  const newAttempts = row.attempts + 1;
  if (newAttempts >= row.max_attempts) {
    return { action: 'exhausted', update: { attempts: newAttempts, resolved_at: nowIso, last_error: 'max_attempts exhausted' } };
  }
  const delayMin = backoffMinutes(newAttempts);
  return { action: 'requeued', update: { attempts: newAttempts, next_retry_at: new Date(nowMs + delayMin * 60_000).toISOString() } };
}

export interface DrainSummary { processed: number; resolved: number; requeued: number; exhausted: number; }

/** One drain tick: retry up to `limit` due rows using the injected `mirror` fn. nowMs injectable for tests. */
export async function drainOnce(
  sb: SupabaseClient,
  mirror: (payload: RunRecord) => Promise<MirrorResult>,
  opts: { nowMs?: number; limit?: number } = {},
): Promise<DrainSummary> {
  const nowMs = opts.nowMs ?? Date.now();
  const limit = opts.limit ?? 50;
  const { data: rows } = await sb
    .from('automation_mirror_queue')
    .select('id, payload_jsonb, attempts, max_attempts')
    .is('resolved_at', null)
    .lte('next_retry_at', new Date(nowMs).toISOString())
    .order('created_at', { ascending: true })
    .limit(limit);

  const out: DrainSummary = { processed: 0, resolved: 0, requeued: 0, exhausted: 0 };
  for (const row of (rows ?? []) as QueueRow[]) {
    out.processed++;
    const result = await mirror(row.payload_jsonb);
    const { action, update } = nextQueueState(row, result, nowMs);
    await sb.from('automation_mirror_queue').update(update).eq('id', row.id);
    if (action === 'resolved') out.resolved++;
    else if (action === 'requeued') out.requeued++;
    else out.exhausted++; // exhausted | denylist_resolved
    if (action === 'exhausted') {
      console.error(`[broker-notify] Lane 7 mirror queue exhausted retries for queue row ${row.id}`);
    }
  }
  return out;
}
