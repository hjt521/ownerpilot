/**
 * Supabase-backed ParcelHealthStore (Step 5) — Edge-native.
 *
 * Edge-only I/O store for the parcel-health orchestrator. Lives beside index.ts (not in
 * lib/): infrastructure glue, not jurisdiction logic, and NOT in the _core import closure
 * (it is an injected dep), so it is hand-authored Deno code, not build-synced into _core/.
 * Deno-free (injected client) so it runs under the Node test runner too.
 *
 * Mirrors lib/jurisdiction/geocode/supabaseAuditSink.ts and rtc-refresh/store.ts: injected
 * client, swallow+log+count on failure so a store hiccup never crashes a probe cycle.
 *
 * DIVERGES from rtc-refresh/store.ts in exactly one way (R1, broker-ruled 2026-06-26):
 * parcel-health's roll-up is stateful (rollUpStatus needs the prior state), so this store
 * DOES read — getStatus performs a service_role SELECT on parcel_health_status. rtc's
 * runner is write-only (its reads happen on the serve path with the reader role); the
 * parcel-health roll-up cannot avoid the read, so the no-SELECT wall does not apply here.
 *
 * Reads and writes via the in-Supabase service_role context (RLS bypass; rail intact —
 * service_role never leaves Supabase). The narrow parcel_health_reader role stays reserved
 * for the separate gate-read serve path (a later slice); this orchestrator uses service_role.
 */
import type { Endpoint, ProbeResult, RollUpResult } from './_core/parcelHealthCore.ts';

export interface SupabaseWriteResult {
  error: { message: string } | null;
}
export interface SupabaseReadResult {
  data: StatusRow | null;
  error: { message: string } | null;
}

// Row shape of parcel_health_status (018) for the getStatus read.
interface StatusRow {
  current_status: 'live' | 'not_live';
  consecutive_failures: number;
  last_success_at: string | null;
  last_probe_at: string | null;
}

// Minimal injected client surface. ADDS the select/eq/maybeSingle read chain over rtc's
// insert/upsert-only surface (R1 — the stateful roll-up needs the prior status).
export interface SupabaseParcelHealthClient {
  from(table: string): {
    insert(row: unknown): PromiseLike<SupabaseWriteResult>;
    upsert(row: unknown, opts?: { onConflict?: string }): PromiseLike<SupabaseWriteResult>;
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): PromiseLike<SupabaseReadResult>;
      };
    };
  };
}

// What getStatus returns to the orchestrator: prior rolled-up state plus the two timestamps
// the AlertEvent.context needs. `null` signals a read failure — the orchestrator skips the
// endpoint this cycle rather than fabricate a prior state for the stateful roll-up.
export interface StoredStatus {
  status: 'live' | 'not_live';
  consecutiveFailures: number;
  lastSuccessAt: string | null;
  lastProbeAt: string | null;
}

export interface ParcelHealthStore {
  /** Read prior rolled-up status (R1 SELECT). null = read failed → skip endpoint this cycle. */
  getStatus(endpoint: Endpoint): Promise<StoredStatus | null>;
  /** Append one probe to parcel_health_probe_results (017). */
  recordProbe(endpoint: Endpoint, result: ProbeResult, probedAt: string): Promise<void>;
  /** Upsert the rolled-up status into parcel_health_status (018). */
  setStatus(
    endpoint: Endpoint,
    rolled: RollUpResult,
    probedAt: string,
    lastSuccessAt: string | null,
  ): Promise<void>;
}

const counters = { writeFailures: 0, readFailures: 0 };
export function parcelHealthStoreWriteFailureCount(): number { return counters.writeFailures; }
export function parcelHealthStoreReadFailureCount(): number { return counters.readFailures; }

function logStoreFailure(op: string, kind: 'read' | 'write', err: unknown): void {
  if (kind === 'write') counters.writeFailures += 1;
  else counters.readFailures += 1;
  const errorClass = err instanceof Error ? err.name : 'unknown';
  try {
    // eslint-disable-next-line no-console
    console.error(JSON.stringify({
      event: 'parcel_health_store_failure',
      op,
      kind,
      error_class: errorClass,
      attempted_at: new Date().toISOString(),
      write_failures: counters.writeFailures,
      read_failures: counters.readFailures,
    }));
  } catch { /* logging must never affect the cycle */ }
}

// Map a probe result to the parcel_health_probe_results (017) insert row.
//
// Forensic columns populated per 5a (ZIMAS-diagnosis-driven, ruled 2026-06-27): the probe now
// surfaces http_status / latency_ms / error_detail, so triage is a SQL query instead of a
// diagnostic round. 017 declared all three nullable for exactly this staged enrichment; the
// §2 reason↔outcome CHECK still holds (result.reason is null iff healthy).
export function toProbeRow(
  endpoint: Endpoint, result: ProbeResult, probedAt: string,
): Record<string, unknown> {
  return {
    endpoint,
    outcome: result.outcome,
    reason: result.reason,            // null iff healthy — satisfies the 017 reason↔outcome CHECK
    http_status: result.httpStatus,   // 0 = no HTTP response (timeout/network)
    latency_ms: result.latencyMs,
    error_detail: result.errorDetail, // null on success
    probed_at: probedAt,
  };
}

// Map rolled-up state to the parcel_health_status (018) upsert row.
//
// last_success_at is null-preserving: the orchestrator passes the prior lastSuccessAt on an
// unhealthy probe (so it ages toward the §3 freshness window) or probedAt on a healthy probe.
// updated_at is set explicitly because the 018 `default now()` does NOT re-fire on UPDATE.
export function toStatusRow(
  endpoint: Endpoint, rolled: RollUpResult, probedAt: string, lastSuccessAt: string | null,
): Record<string, unknown> {
  return {
    endpoint,
    current_status: rolled.status,
    consecutive_failures: rolled.consecutiveFailures,
    last_success_at: lastSuccessAt,
    last_probe_at: probedAt,
    updated_at: probedAt,
  };
}

export interface ParcelHealthStoreDeps {
  getClient: () => Promise<SupabaseParcelHealthClient>;
}

export function createSupabaseParcelHealthStore(deps: ParcelHealthStoreDeps): ParcelHealthStore {
  return {
    async getStatus(endpoint) {
      try {
        const supabase = await deps.getClient();
        const { data, error } = await supabase
          .from('parcel_health_status')
          .select('current_status, consecutive_failures, last_success_at, last_probe_at')
          .eq('endpoint', endpoint)
          .maybeSingle();
        if (error) throw new Error(error.message);
        if (!data) {
          // Row missing (should not happen — 018 seeds both endpoints). Treat as the
          // fail-closed seed so a stateful roll-up still proceeds deterministically.
          return { status: 'not_live', consecutiveFailures: 0, lastSuccessAt: null, lastProbeAt: null };
        }
        return {
          status: data.current_status,
          consecutiveFailures: data.consecutive_failures,
          lastSuccessAt: data.last_success_at,
          lastProbeAt: data.last_probe_at,
        };
      } catch (err) {
        // Sub-flag A (broker to confirm): on a READ error (infra), return null so the
        // orchestrator SKIPS this endpoint this cycle rather than fabricate a prior state
        // for the stateful roll-up. The miss is recovered on the next cron tick.
        logStoreFailure('getStatus', 'read', err);
        return null;
      }
    },

    async recordProbe(endpoint, result, probedAt) {
      const row = toProbeRow(endpoint, result, probedAt);
      try {
        const supabase = await deps.getClient();
        const { error } = await supabase.from('parcel_health_probe_results').insert(row);
        if (error) throw new Error(error.message);
      } catch (err) {
        logStoreFailure('recordProbe', 'write', err);
      }
    },

    async setStatus(endpoint, rolled, probedAt, lastSuccessAt) {
      const row = toStatusRow(endpoint, rolled, probedAt, lastSuccessAt);
      try {
        const supabase = await deps.getClient();
        const { error } = await supabase
          .from('parcel_health_status')
          .upsert(row, { onConflict: 'endpoint' });
        if (error) throw new Error(error.message);
      } catch (err) {
        logStoreFailure('setStatus', 'write', err);
      }
    },
  };
}
