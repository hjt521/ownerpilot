/**
 * parcel_health_status reader — narrow-read of the rolled-up health verdict for the dynamic
 * gate (isLaProductionLive). Modeled on lib/jurisdiction/rtcRefresh/readBlockState.ts and the
 * rtc_block_state_reader precedent.
 *
 * Authorized by:
 *   - parcel_endpoint_health_check_live_determination_broker_2026-06-25.md §6 + sub-fork 2
 *       (in-process gate-read; narrow SELECT on parcel_health_status only; reader role, NOT
 *       service_role — a produce-path compromise must not get DB write).
 *   - migration 019 (parcel_health_reader role + scoped SELECT policy).
 *   - predicate-6 ruling 2026-06-27 (Option B: behavior-neutral wiring slice).
 *
 * NO Supabase client, NO auto-refresh (mirrors readBlockState §3.1): the pre-signed reader JWT
 * travels as a static `Authorization: Bearer` header over an injected `fetch`. The reader role
 * (parcel_health_reader) can SELECT parcel_health_status and nothing else (migration 019), so a
 * leak of this JWT exposes only rolled-up health rows — never write, never other tables.
 *
 * FAIL-CLOSED: every error path THROWS. isLaProductionLive catches the throw and treats it as
 * not-live (determination §3 uniform stale-not-live). Missing env, fetch throw, non-200 (incl.
 * RLS denial → 401/403), malformed/non-array body → throw.
 */
import type { ParcelHealthReader, ParcelHealthStatusRow, ParcelHealthEndpoint } from './parcelHealthGate';

/** Env injected by the route (kept out of the core for testability). */
export interface ParcelHealthReaderEnv {
  baseUrl: string | undefined;
  anonKey: string | undefined;
  readerJwt: string | undefined;
}

export interface FetchResponseLike {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}
export interface FetchInit {
  method: string;
  headers: Record<string, string>;
  cache: 'no-store';
}
export type FetchLike = (url: string, init: FetchInit) => Promise<FetchResponseLike>;

// Narrow column projection — role boundary: only the three columns the gate needs, only this table.
const SELECT_COLUMNS = 'endpoint,current_status,last_probe_at';

interface StatusRow {
  endpoint: string;
  current_status: string;
  last_probe_at: string | null;
}

/**
 * Read the rolled-up parcel_health_status rows via PostgREST under the reader JWT. Throws on
 * every failure (fail-closed). Returns the rows mapped to ParcelHealthStatusRow (camelCase).
 */
export async function readParcelHealthStatus(
  env: ParcelHealthReaderEnv,
  fetchImpl: FetchLike,
): Promise<ParcelHealthStatusRow[]> {
  const { baseUrl, anonKey, readerJwt } = env;
  if (!baseUrl || !anonKey || !readerJwt) {
    throw new Error('parcel_health_status reader env missing (baseUrl/anonKey/readerJwt)');
  }

  const url = `${baseUrl}/rest/v1/parcel_health_status?select=${SELECT_COLUMNS}`;

  let resp: FetchResponseLike;
  try {
    resp = await fetchImpl(url, {
      method: 'GET',
      headers: { apikey: anonKey, Authorization: `Bearer ${readerJwt}`, Accept: 'application/json' },
      cache: 'no-store',
    });
  } catch (e) {
    throw new Error(`parcel_health_status reader fetch threw: ${String(e)}`);
  }

  if (!resp.ok) {
    // Covers RLS denial (401/403) and any PostgREST non-200 — fail closed.
    throw new Error(`parcel_health_status reader non-200: ${resp.status}`);
  }

  let parsed: unknown;
  try {
    parsed = await resp.json();
  } catch (e) {
    throw new Error(`parcel_health_status reader body malformed: ${String(e)}`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error('parcel_health_status reader body not an array');
  }

  return (parsed as StatusRow[]).map((r) => ({
    endpoint: r.endpoint as ParcelHealthEndpoint,
    currentStatus: r.current_status === 'live' ? 'live' : 'not_live',
    lastProbeAt: r.last_probe_at ?? null,
  }));
}

/** Build a ParcelHealthReader (the isLaProductionLive dep) over the injected env + fetch. */
export function createParcelHealthStatusReader(
  env: ParcelHealthReaderEnv,
  fetchImpl: FetchLike,
): ParcelHealthReader {
  return { read: () => readParcelHealthStatus(env, fetchImpl) };
}
