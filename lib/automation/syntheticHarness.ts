// lib/automation/syntheticHarness.ts
// Shared isolation discipline (D1–D8) for prod-targeting synthetic harnesses, per
// synthetic_a14_harness_conformance_broker_ruling_2026-06-30.
//
//   B1  guardProdSyntheticTarget — explicit --prod-synthetic flag + prod creds + D5 preflight
//   D1  makeRunId                — SYN-<label>-<ts>-<uuid> tagged id
//   D2  (run-uuid embedded in payload_jsonb.synthetic_run_id by the caller)
//   D3  cleanupByRunId           — delete only THIS run's rows
//   D4  verifyCleanupZero        — assert zero rows remain for the run-uuid
//   D5  assertFlagsOff           — abort if any Lane-2 gate flag is ON in shell env
//   D7  logRunStart / logRunEnd  — declared window stamps + teardown reminder
//
// D6 (outbound suppression) is per-harness (A14 mocks Notion; exhaust is console-only) and D8
// (advisor delta) is procedural (run by JT around the harness), so neither lives here.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Flags whose ON state would alter the behavior of the Gate-2 walk surfaces, and which must therefore be
 * confirmed unset/false before a synthetic run. Per gate2_flag_state_deviation_broker_ruling_2026-06-30 §3,
 * the classifier flags (`CLASSIFIER_LIVE`, `CLASSIFIER_AUDIT_LIVE`, `CLASSIFIER_FAIL_CLOSED`) are EXPLICITLY
 * EXCLUDED: the help-chatbox H1 classifier surface (lib/chat/classifierConfig.ts) is not traversed by the
 * E2E notice walk (Perplexity is mocked) or the A14 automation-queue walk, so their ON state cannot affect
 * Gate-2 walk-surface behavior. `CLASSIFIER_LIVE` is authorized-live since 2026-06-08; `CLASSIFIER_AUDIT_LIVE`
 * provenance is reconciled separately (ruling §4). Do NOT re-add classifier flags here without a broker ruling.
 *
 * The members below are the test-infra toggles that must never be unexpectedly ON outside a controlled window
 * (they enable mock/tag/seed and cron-pause). Every entry must justify inclusion against the §2 compliance
 * purpose: "would its ON state alter Gate-2 walk-surface behavior?"
 */
export const SYNTHETIC_BLOCKING_FLAGS = ['E2E_RUN_ACTIVE', 'SYNTHETIC_RUN_ACTIVE'] as const;

export const QUEUE_TABLE = 'automation_mirror_queue';

/** D1+D2: dated, uuid-bearing run id, e.g. `SYN-A14-503-20260630T141501-<uuid>`. */
export function makeRunId(label: string): string {
  const ts = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const uuid = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `SYN-${label}-${ts}-${uuid}`;
}

/**
 * D5: throw if any walk-surface-blocking flag (SYNTHETIC_BLOCKING_FLAGS) is ON in the shell env. Scoped to the
 * compliance purpose per ruling §3.2 — classifier flags are intentionally NOT read here (off the Gate-2 walk
 * path). Manual Vercel confirm of the same constant is JT's half (runbook P4 / F2).
 */
export function assertFlagsOff(): void {
  const on = SYNTHETIC_BLOCKING_FLAGS.filter((f) => process.env[f] === 'true');
  if (on.length) {
    throw new Error(
      `D5 preflight failed — walk-surface flag(s) ON in shell env: ${on.join(', ')}. ` +
        `These must be unset/false outside a controlled run window. Aborting.`,
    );
  }
}

/**
 * B1: prod-target guard. Refuses to run without the explicit `--prod-synthetic` confirmation flag,
 * runs the D5 flag preflight, then connects with the prod service-role creds (SUPABASE_URL /
 * SUPABASE_SERVICE_ROLE_KEY, sourced from JT's shell or .env.synthetic).
 */
export function guardProdSyntheticTarget(): SupabaseClient {
  if (!process.argv.includes('--prod-synthetic')) {
    throw new Error('refusing to run without --prod-synthetic (explicit prod confirmation, ruling B1)');
  }
  assertFlagsOff(); // D5 before we open a connection
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required (shell or .env.synthetic)');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * F1 preflight: abort unless the real queue has zero unresolved DUE rows at run start. No auto-skip —
 * logs the count and throws, so a real backlog is investigated rather than silently driven by mocks.
 */
export async function preflightQueueQuiescent(sb: SupabaseClient, nowMs: number = Date.now()): Promise<void> {
  const { count } = await sb
    .from(QUEUE_TABLE)
    .select('*', { count: 'exact', head: true })
    .is('resolved_at', null)
    .lte('next_retry_at', new Date(nowMs).toISOString());
  const due = count ?? 0;
  if (due > 0) {
    throw new Error(
      `F1 preflight failed — ${due} real unresolved DUE row(s) in ${QUEUE_TABLE}. ` +
        `Confirm SYNTHETIC_RUN_ACTIVE cron pause is set and the real backlog has drained, then retry. Aborting (no auto-skip).`,
    );
  }
}

/** D3: delete only the rows this run created (scoped by run-uuid). */
export async function cleanupByRunId(sb: SupabaseClient, runId: string): Promise<void> {
  await sb.from(QUEUE_TABLE).delete().filter('payload_jsonb->>synthetic_run_id', 'eq', runId);
}

/** D4: count rows still tagged with the run-uuid after cleanup (caller asserts === 0). */
export async function verifyCleanupZero(sb: SupabaseClient, runId: string): Promise<number> {
  const { count } = await sb
    .from(QUEUE_TABLE)
    .select('*', { count: 'exact', head: true })
    .filter('payload_jsonb->>synthetic_run_id', 'eq', runId);
  return count ?? 0;
}

/** D7: declared run-window start stamp. Returns startedAt ms for the end stamp. */
export function logRunStart(runId: string): number {
  const startedAt = Date.now();
  console.log(`[run-window] START ${new Date(startedAt).toISOString()} runId=${runId}`);
  return startedAt;
}

/** D7: end stamp + cleanup result + teardown reminder (the SYNTHETIC_RUN_ACTIVE unset is JT's step). */
export function logRunEnd(runId: string, startedAt: number, pass: number, fail: number, cleanupRemaining: number): void {
  const durMs = Date.now() - startedAt;
  console.log(
    `[run-window] END ${new Date().toISOString()} runId=${runId} ` +
      `pass=${pass} fail=${fail} cleanup_remaining=${cleanupRemaining} duration_ms=${durMs}`,
  );
  console.warn('[teardown reminder] Unset SYNTHETIC_RUN_ACTIVE in Vercel (production + preview) now that the window is closed.');
}
