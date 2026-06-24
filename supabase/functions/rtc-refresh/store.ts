/**
 * Supabase-backed RefreshStateStore (Step 3) — Edge-native.
 *
 * Edge-only write store for the rtc-refresh runner. Lives beside index.ts (not in lib/):
 * it is infrastructure glue, not jurisdiction logic, and is NOT in runRefresh's import
 * closure (injected dep), so it is hand-authored Deno code, not build-synced into _core/.
 * Deno-free (injected client) so it runs under the Node test runner too.
 *
 * Mirrors lib/jurisdiction/geocode/supabaseAuditSink.ts: injected client, return=minimal
 * (plain .insert/.upsert, no .select() — respects the no-SELECT wall on 012/013), swallow+
 * log+count on failure so a store hiccup never crashes a run.
 *
 * Writes via the in-Supabase service_role context (RLS bypass; rail intact — service_role
 * never leaves Supabase). Decisions (rtc_refresh_step3_store_decisions_..._2026-06-24.md):
 *   2(i): unblocked upsert OMITS current_hash to preserve prior value (omit is load-bearing
 *         in BOTH upsert branches: UPDATE leaves it untouched; first INSERT defaults it NULL,
 *         which is acceptable — serve path never reads current_hash).
 *   3:    block_reason is a CATEGORY only ('refresh_failure'|'revision_detected'|'manual');
 *         free-text detail lives in rtc_refresh_run_results.outcomes (012), never in state.
 *   §2.5: refresh_failure/staged_revision OMIT last_successful_refresh_at so it ages → the
 *         14-day freshness-fail-closed guard fires.
 */
import type {
  LanguageRefreshState,
  LanguagePin,
  RefreshRunResult,
  RefreshStateStore,
} from './_core/rtcRefreshTypes.ts';
import type { RtcLanguage } from './_core/laRtcRules.ts';

export interface SupabaseWriteResult { error: { message: string } | null; }
export interface SupabaseRefreshClient {
  from(table: string): {
    insert(row: unknown): PromiseLike<SupabaseWriteResult>;
    upsert(row: unknown, opts?: { onConflict?: string }): PromiseLike<SupabaseWriteResult>;
  };
}

const counters = { writeFailures: 0 };
export function rtcRefreshStoreWriteFailureCount(): number { return counters.writeFailures; }

function logStoreFailure(op: string, err: unknown): void {
  counters.writeFailures += 1;
  const errorClass = err instanceof Error ? err.name : 'unknown';
  try {
    // eslint-disable-next-line no-console
    console.error(JSON.stringify({
      event: 'rtc_refresh_store_write_failure',
      op, error_class: errorClass,
      attempted_at: new Date().toISOString(),
      failure_count: counters.writeFailures,
    }));
  } catch { /* logging must never affect the run */ }
}

/** Map a LanguageRefreshState to the rtc_refresh_state (013) upsert row. */
export function toStateRow(language: RtcLanguage, state: LanguageRefreshState): Record<string, unknown> {
  if (state.status === 'unblocked') {
    const nowIso = new Date().toISOString();
    return {
      language,
      current_status: 'unblocked',
      last_attempted_refresh_at: nowIso,
      last_successful_refresh_at: nowIso,
      block_reason: null,
      block_since: null,
      // current_hash: intentionally OMITTED — preserves prior value (decision 2(i)).
    };
  }
  if (state.status === 'refresh_failure') {
    return {
      language,
      current_status: 'refresh_failure',
      last_attempted_refresh_at: state.since,
      // last_successful_refresh_at OMITTED — ages toward §2.5 14-day fail-closed.
      block_reason: 'refresh_failure', // category only (decision 3); detail in outcomes jsonb.
      block_since: state.since,
    };
  }
  return {
    language,
    current_status: 'staged_revision',
    last_attempted_refresh_at: state.since,
    // last_successful_refresh_at OMITTED — ages toward fail-closed.
    current_hash: state.detectedHash,
    block_reason: 'revision_detected', // category only.
    block_since: state.since,
  };
}

export interface SupabaseRefreshStoreDeps { getClient: () => Promise<SupabaseRefreshClient>; }

export function createSupabaseRefreshStore(deps: SupabaseRefreshStoreDeps): RefreshStateStore {
  const notUsed = (m: string): never => {
    throw new Error(`SupabaseRefreshStore.${m} is not used by the refresh runner (serve-path concern)`);
  };
  return {
    async setLanguageState(language, state) {
      const row = toStateRow(language, state);
      try {
        const supabase = await deps.getClient();
        const { error } = await supabase.from('rtc_refresh_state').upsert(row, { onConflict: 'language' });
        if (error) throw new Error(error.message);
      } catch (err) { logStoreFailure('setLanguageState', err); }
    },
    async recordRunResult(result: RefreshRunResult) {
      const row = { run_at: result.runAt, all_failed: result.allFailed, outcomes: result.outcomes };
      try {
        const supabase = await deps.getClient();
        const { error } = await supabase.from('rtc_refresh_run_results').insert(row);
        if (error) throw new Error(error.message);
      } catch (err) { logStoreFailure('recordRunResult', err); }
    },
    async getLanguageState(_l): Promise<LanguageRefreshState> { return notUsed('getLanguageState'); },
    async getPin(_l, _n): Promise<LanguagePin | null> { return notUsed('getPin'); },
    async setPin(_n, _p) { return notUsed('setPin'); },
  };
}
