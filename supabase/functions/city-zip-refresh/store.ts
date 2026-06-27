/**
 * Supabase-backed RefreshStore — Edge-native I/O glue for city-zip-refresh.
 *
 * Deno-free (injected client) so it runs under the Node test runner too. Reads/writes via
 * the in-Supabase service_role context (RLS bypass; service_role never leaves Supabase).
 * Mirrors parcel-health/store.ts: injected client, swallow+log on failure so a store hiccup
 * never crashes a poll cycle (the cron retries next day; the prior snapshot keeps serving).
 */
import type { RefreshState, RefreshStore, RefreshOutcome } from './handler.ts';

interface StateRow {
  snapshot_sha256: string;
  baseline_data_last_edit: string;
  broker_attested_at: string;
  consecutive_fetch_failures: number;
}

export interface SupabaseRefreshClient {
  from(table: string): {
    insert(row: unknown): PromiseLike<{ error: { message: string } | null }>;
    update(row: unknown): {
      eq(column: string, value: string): PromiseLike<{ error: { message: string } | null }>;
    };
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): PromiseLike<{ data: StateRow | null; error: { message: string } | null }>;
      };
    };
  };
}

function log(event: string, fields: Record<string, unknown>): void {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ event, ...fields }));
}

export function createSupabaseRefreshStore(opts: {
  getClient: () => Promise<SupabaseRefreshClient>;
}): RefreshStore {
  return {
    async loadState(): Promise<RefreshState | null> {
      try {
        const client = await opts.getClient();
        const { data, error } = await client
          .from('city_zip_refresh_state')
          .select('snapshot_sha256, baseline_data_last_edit, broker_attested_at, consecutive_fetch_failures')
          .eq('id', 'singleton')
          .maybeSingle();
        if (error || !data) {
          log('city_zip_refresh_state_read_failed', { error: error?.message ?? 'no_row' });
          return null;
        }
        return {
          snapshotSha256: data.snapshot_sha256,
          baselineDataLastEdit: data.baseline_data_last_edit,
          brokerAttestedAt: data.broker_attested_at,
          consecutiveFetchFailures: data.consecutive_fetch_failures,
        };
      } catch (e) {
        log('city_zip_refresh_state_read_threw', { error: String(e) });
        return null;
      }
    },

    async recordRun(run): Promise<void> {
      try {
        const client = await opts.getClient();
        const { error } = await client.from('city_zip_refresh_runs').insert({
          observed_data_last_edit: run.observedDataLastEdit,
          baseline_data_last_edit: run.baselineDataLastEdit,
          outcome: run.outcome,
          alert_sent: run.alertSent,
          detail: run.detail,
        });
        if (error) log('city_zip_refresh_run_write_failed', { error: error.message });
      } catch (e) {
        log('city_zip_refresh_run_write_threw', { error: String(e) });
      }
    },

    async updateState(update): Promise<void> {
      try {
        const client = await opts.getClient();
        const { error } = await client
          .from('city_zip_refresh_state')
          .update({
            consecutive_fetch_failures: update.consecutiveFetchFailures,
            last_observed_data_last_edit: update.lastObservedDataLastEdit,
            last_outcome: update.lastOutcome as RefreshOutcome,
            last_polled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', 'singleton');
        if (error) log('city_zip_refresh_state_update_failed', { error: error.message });
      } catch (e) {
        log('city_zip_refresh_state_update_threw', { error: String(e) });
      }
    },
  };
}
