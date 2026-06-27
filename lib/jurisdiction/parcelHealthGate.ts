/**
 * Dynamic parcel-health gate-read (predicate 6, `parcelEndpointHealthCheckLive`).
 *
 * The READ-side consumer the determination requires (parcel_endpoint_health_check_live
 * _determination_broker_2026-06-25.md §§3/4/6, acceptance criterion §"110".5). The probe
 * cron is the writer (parcel_health_status); this module is the consumer that the produce/
 * gate path consults so the gate dynamically FAILS CLOSED when an endpoint goes stale or
 * not_live after go-live.
 *
 * Broker-ruled properties (predicate-6 ruling, 2026-06-27 — non-negotiable):
 *  - On every gate evaluation where parcelEndpointHealthCheckLive === true, the rolled-up
 *    status is read fresh (no caching beyond the freshness-window semantics here).
 *  - Per endpoint (county + zimas), the gate requires current_status === 'live' AND
 *    last_probe_at within the freshness window.
 *  - Any endpoint row missing, not_live, or stale → gate returns false. FAIL CLOSED.
 *  - Freshness uses the DB row's last_probe_at (not a consumer-maintained clock).
 *  - Freshness window = 75 minutes (§8.3 ruling 2026-06-27): 2.5:1 slack vs the 30-minute
 *    cron, so one missed/late probe does not trip a spurious not-live; fails closed by the
 *    3rd missed cycle. (Do NOT tighten the cron — probe load on ZIMAS stays put.)
 *  - When parcelEndpointHealthCheckLive === false (or any other static predicate is unmet),
 *    evaluation short-circuits on the static gate and the DB is NOT read (no regression of
 *    the static-false path).
 *  - The two-consecutive-failure roll-up is the WRITER's responsibility (rollUpStatus.ts);
 *    this consumer only reads the resulting verdict + the 75-min freshness guard against a
 *    dead writer.
 */
import {
  isLaProductionUnblocked,
  LA_PRODUCTION_DEPENDENCIES,
  type LaProductionDependencies,
} from './laRtcRules';

/** §8.3 broker ruling 2026-06-27: 75-minute freshness window (2.5:1 vs the 30-minute cron). */
export const PARCEL_HEALTH_FRESHNESS_WINDOW_MS = 75 * 60 * 1000;

/** Endpoints that must each be live + fresh for the gate to open (determination §3 list). */
export const PARCEL_HEALTH_GATE_ENDPOINTS = ['county', 'zimas'] as const;
export type ParcelHealthEndpoint = (typeof PARCEL_HEALTH_GATE_ENDPOINTS)[number];

/** A rolled-up status row as read from parcel_health_status (018). */
export interface ParcelHealthStatusRow {
  endpoint: ParcelHealthEndpoint;
  currentStatus: 'live' | 'not_live';
  lastProbeAt: string | null; // ISO-8601 UTC; null until first probe
}

export type GateClosure = {
  endpoint: ParcelHealthEndpoint;
  condition: 'missing' | 'not_live' | 'stale';
};

export type ParcelHealthGateResult =
  | { open: true; closures: [] }
  | { open: false; closures: GateClosure[] };

/**
 * PURE freshness/verdict evaluation. No I/O. Open iff EVERY gated endpoint has a row that is
 * `live` AND whose last_probe_at age ≤ windowMs. The 75-minute mark itself is FRESH
 * (inclusive upper bound): age == windowMs → fresh; age == windowMs + 1ms → stale.
 */
export function evaluateParcelHealthGate(
  rows: ParcelHealthStatusRow[],
  now: Date,
  windowMs: number = PARCEL_HEALTH_FRESHNESS_WINDOW_MS,
): ParcelHealthGateResult {
  const byEndpoint = new Map(rows.map((r) => [r.endpoint, r]));
  const closures: GateClosure[] = [];

  for (const endpoint of PARCEL_HEALTH_GATE_ENDPOINTS) {
    const row = byEndpoint.get(endpoint);
    if (!row || row.lastProbeAt == null) {
      closures.push({ endpoint, condition: 'missing' });
      continue;
    }
    if (row.currentStatus !== 'live') {
      closures.push({ endpoint, condition: 'not_live' });
      continue;
    }
    const age = now.getTime() - Date.parse(row.lastProbeAt);
    if (age > windowMs) {
      closures.push({ endpoint, condition: 'stale' });
    }
  }

  return closures.length === 0
    ? { open: true, closures: [] }
    : { open: false, closures };
}

/** Reads the rolled-up parcel_health_status rows (injected; prod adapter below). */
export interface ParcelHealthReader {
  read(): Promise<ParcelHealthStatusRow[]>;
}

export interface LaProductionLiveOptions {
  /** Static predicate set (defaults to the committed LA_PRODUCTION_DEPENDENCIES). */
  deps?: LaProductionDependencies;
  /** Rolled-up status reader (required once the static gate passes). */
  reader: ParcelHealthReader;
  now?: () => Date;
  windowMs?: number;
  /** Gate-close logger (on-call must identify endpoint + condition in <30s). */
  logClosure?: (info: { reason: 'health_read'; closures: GateClosure[] }) => void;
  logReadError?: (info: { reason: 'health_read_error'; error: string }) => void;
}

function defaultLog(event: string, fields: Record<string, unknown>): void {
  // eslint-disable-next-line no-console
  console.warn(JSON.stringify({ level: 'warn', event, ...fields }));
}

/**
 * The dynamic LA production gate. Returns true ONLY when the static six-predicate gate is
 * satisfied AND every gated parcel endpoint is live + fresh.
 *
 *  - Static gate fails (incl. parcelEndpointHealthCheckLive === false) → false, NO DB read.
 *  - Status read throws/unreachable → false (FAIL CLOSED; determination §3 "stale-because-
 *    DB-unreachable" is uniform not-live).
 *  - Any endpoint missing / not_live / stale → false, with a logged closure reason.
 */
export async function isLaProductionLive(opts: LaProductionLiveOptions): Promise<boolean> {
  const deps = opts.deps ?? LA_PRODUCTION_DEPENDENCIES;

  // Static short-circuit — preserves the pre-flip static-false path; no DB read.
  if (!isLaProductionUnblocked(deps)) return false;

  const now = (opts.now ?? (() => new Date()))();

  let rows: ParcelHealthStatusRow[];
  try {
    rows = await opts.reader.read();
  } catch (e) {
    (opts.logReadError ?? ((i) => defaultLog(i.reason, { error: i.error })))({
      reason: 'health_read_error',
      error: String(e),
    });
    return false; // fail closed on read failure
  }

  const result = evaluateParcelHealthGate(rows, now, opts.windowMs);
  if (!result.open) {
    (opts.logClosure ?? ((i) => defaultLog(i.reason, { closures: i.closures })))({
      reason: 'health_read',
      closures: result.closures,
    });
    return false;
  }
  return true;
}
