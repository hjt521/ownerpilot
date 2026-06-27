/**
 * Supabase-backed ParcelHealthReader — the gate-read adapter for isLaProductionLive.
 *
 * Reads the rolled-up status (018 parcel_health_status) on the produce/gate path. Per the
 * determination §6 + sub-fork 2 (migration 019), the production read uses the narrow
 * `parcel_health_reader` role (SELECT on parcel_health_status only). The client is injected
 * so this stays Deno/Node-agnostic and unit-testable; the role-scoped client is constructed
 * at the produce-path wiring (the predicate-6 signing commit).
 *
 * Deno-free; reads only. A read failure is surfaced by throwing, which isLaProductionLive
 * catches and treats as fail-closed (determination §3 uniform stale-not-live).
 */
import type { ParcelHealthReader, ParcelHealthStatusRow, ParcelHealthEndpoint } from './parcelHealthGate';

interface StatusRow {
  endpoint: string;
  current_status: string;
  last_probe_at: string | null;
}

export interface SupabaseParcelHealthReadClient {
  from(table: string): {
    select(columns: string): PromiseLike<{ data: StatusRow[] | null; error: { message: string } | null }>;
  };
}

export function createSupabaseParcelHealthReader(opts: {
  getClient: () => Promise<SupabaseParcelHealthReadClient>;
}): ParcelHealthReader {
  return {
    async read(): Promise<ParcelHealthStatusRow[]> {
      const client = await opts.getClient();
      const { data, error } = await client
        .from('parcel_health_status')
        .select('endpoint, current_status, last_probe_at');
      if (error) throw new Error(`parcel_health_status read failed: ${error.message}`);
      return (data ?? []).map((r) => ({
        endpoint: r.endpoint as ParcelHealthEndpoint,
        currentStatus: r.current_status === 'live' ? 'live' : 'not_live',
        lastProbeAt: r.last_probe_at,
      }));
    },
  };
}
