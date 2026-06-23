/* eslint-disable no-console */
/**
 * scripts/section8_monitor.ts — Slice 8 deliverable 4b, the §8 monitor CLI.
 *
 * Thin I/O shell. Decomposition/threshold logic lives in section8Core
 * (deliverable 3, 4b-rewritten); orchestration/degraded logic in
 * section8MonitorCore; the pure window/arg/exit helpers in section8MonitorCli.
 * This file only: parses argv, resolves the window, builds the LIVE adapters,
 * runs the monitor, prints a stderr summary, exits with the NF-3 code.
 *
 * DELIVERABLE 4b (durable-vs-durable). The `vercel logs` oracle is GONE
 * (parseVercelLogLine / partitionLogLines / buildVercelLogArgs / the vercel spawn
 * / readLogLines — all deleted; IF-6). VERCEL_TOKEN is no longer read (IF-6); the
 * monitor's only credential is SUPABASE_SERVICE_ROLE_KEY (operator-surface-only
 * rail). The monitor now issues three durable PostgREST reads:
 *   - D   : geocode_dispositions rows in the banded window (+ their hashes)
 *   - R_h : geocode_audit_log rows in the banded window hash-matched to those hashes
 *   - R_t : geocode_audit_log rows in the banded window, raw
 * plus the prior non-degraded run's two orphan quantities for the NF-2 chain.
 *
 * Run modes:
 *   tsx scripts/section8_monitor.ts                                  recurring: prior PT calendar day
 *   tsx scripts/section8_monitor.ts --one-shot                       pre-go-live one-shot (no chain)
 *   tsx scripts/section8_monitor.ts --window-start ISO --window-end ISO   explicit window (verbatim)
 *   add --dry-run to compute + print WITHOUT writing a section8_runs row
 *
 * Credentials — operator-surface-only rail (NEVER app/Vercel-app/git/CI):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (PostgREST reads/write)
 * Loaded from the broker-local .env by the launchd shell wrapper:
 *   zsh -lc 'cd <repo> && set -a && source .env.local && set +a && npx tsx scripts/section8_monitor.ts'
 *
 * Data path (ruling-bound):
 *   - REST-via-fetch, NOT supabase-js (which throws on Node 20 without native
 *     WebSocket). Proven path: HTTP 200/206.
 *   - NF-1: window = prior PT calendar day (recurring); ALL THREE count reads carry
 *     the +5m band (decided_at insert-time straddle; the band cancels symmetrically
 *     on both orphan quantities — IF-1 §3.2).
 *   - NF-2: prior = last non-degraded section8_runs row's orphan quantities (null
 *     in one-shot). Fork E: the two quantities chain independently.
 *   - NF-3: exit 0 green / 0 yellow / 10 red / 20 monitor_degraded / 1 hard error.
 */
import {
  runSection8Monitor,
  type Section8MonitorAdapters,
  type Section8Window,
  type Section8RunRow,
} from '../lib/jurisdiction/geocode/section8MonitorCore';
import type { Section8Components } from '../lib/jurisdiction/geocode/section8Core';
import {
  parseArgs,
  resolveWindow,
  verdictToExitCode,
  type MonitorArgs,
} from '../lib/jurisdiction/geocode/section8MonitorCli';

/** +5m grace band (NF-1 sub-decision), in ms. Applied to ALL THREE count reads. */
const GRACE_BAND_MS = 5 * 60 * 1000;
/** Supabase PostgREST page cap (disposition-hash collection). */
const PAGE = 1000;

// --------------------------------------------------------------------------
// Env
// --------------------------------------------------------------------------

function requireEnv(name: string): string {
  const v = process.env[name];
  if (v === undefined || v.length === 0) {
    throw new Error(
      `missing required env ${name} — load it from the broker-local .env (set -a; source .env.local). NEVER commit it.`,
    );
  }
  return v;
}

// --------------------------------------------------------------------------
// PostgREST query builders (PURE — exported for in-container validation)
// --------------------------------------------------------------------------

function bandedRange(window: Section8Window): { startISO: string; endPlusISO: string } {
  return {
    startISO: window.start.toISOString(),
    endPlusISO: new Date(window.end.getTime() + GRACE_BAND_MS).toISOString(),
  };
}

/** D query: geocode_dispositions rows whose decided_at ∈ [start, end + 5m).
 *  Selects the hash so the caller can both count rows (D) and build the IN-list
 *  for the R_h join. */
export function buildDispositionsQuery(window: Section8Window): string {
  const { startISO, endPlusISO } = bandedRange(window);
  return (
    `geocode_dispositions?select=decision_input_hash` +
    `&decided_at=gte.${encodeURIComponent(startISO)}` +
    `&decided_at=lt.${encodeURIComponent(endPlusISO)}`
  );
}

/** R_h query: geocode_audit_log rows whose decided_at ∈ [start, end + 5m) AND whose
 *  decision_input_hash is one of the in-window disposition hashes. Counted, not
 *  collected. (Empty hash set is handled by the caller → R_h = 0.) */
export function buildAuditHashMatchedQuery(
  window: Section8Window,
  hashes: ReadonlyArray<string>,
): string {
  const { startISO, endPlusISO } = bandedRange(window);
  const inList = hashes.map((h) => encodeURIComponent(h)).join(',');
  return (
    `geocode_audit_log?select=decision_input_hash` +
    `&decided_at=gte.${encodeURIComponent(startISO)}` +
    `&decided_at=lt.${encodeURIComponent(endPlusISO)}` +
    `&decision_input_hash=in.(${inList})`
  );
}

/** R_t query: geocode_audit_log rows whose decided_at ∈ [start, end + 5m), raw
 *  (no hash filter). Counted. */
export function buildAuditTotalQuery(window: Section8Window): string {
  const { startISO, endPlusISO } = bandedRange(window);
  return (
    `geocode_audit_log?select=decision_input_hash` +
    `&decided_at=gte.${encodeURIComponent(startISO)}` +
    `&decided_at=lt.${encodeURIComponent(endPlusISO)}`
  );
}

/** Prior non-degraded run's two orphan quantities for the NF-2 chain (Fork E). */
export function buildPriorComponentsQuery(): string {
  return (
    `section8_runs?select=freeze_loss_suspected,freeze_audit_orphaned` +
    `&verdict=neq.monitor_degraded&order=window_end.desc&limit=1`
  );
}

// --------------------------------------------------------------------------
// PostgREST primitives
// --------------------------------------------------------------------------

function restHeaders(serviceKey: string, extra?: Record<string, string>): Record<string, string> {
  return { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, ...(extra ?? {}) };
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 300);
  } catch {
    return '<no body>';
  }
}

/** GET a PostgREST collection (optionally one Range page). Throws on non-2xx. */
async function pgGet(
  base: string,
  key: string,
  pathAndQuery: string,
  range?: { from: number; to: number },
): Promise<{ rows: Array<Record<string, unknown>>; contentRange: string | null }> {
  const headers = restHeaders(key);
  if (range) {
    headers['Range-Unit'] = 'items';
    headers['Range'] = `${range.from}-${range.to}`;
  }
  const res = await fetch(`${base}/rest/v1/${pathAndQuery}`, { headers });
  if (res.status !== 200 && res.status !== 206) {
    throw new Error(`PostgREST ${res.status} on ${pathAndQuery}: ${await safeText(res)}`);
  }
  const rows = (await res.json()) as Array<Record<string, unknown>>;
  return { rows, contentRange: res.headers.get('content-range') };
}

/** Exact row count via PostgREST `Prefer: count=exact`. Reads the total from the
 *  Content-Range header (`0-0/N` or `* /0`) without pulling the rows. Throws on
 *  non-2xx. */
async function pgCount(base: string, key: string, pathAndQuery: string): Promise<number> {
  const headers = restHeaders(key, {
    Prefer: 'count=exact',
    'Range-Unit': 'items',
    Range: '0-0',
  });
  const res = await fetch(`${base}/rest/v1/${pathAndQuery}`, { headers });
  if (res.status !== 200 && res.status !== 206) {
    throw new Error(`PostgREST ${res.status} on ${pathAndQuery}: ${await safeText(res)}`);
  }
  const cr = res.headers.get('content-range');
  if (cr && cr.includes('/')) {
    const total = cr.split('/')[1];
    if (total === '*') return 0;
    const n = Number(total);
    if (Number.isFinite(n)) return n;
  }
  throw new Error(`PostgREST count missing/!parseable Content-Range '${cr}' on ${pathAndQuery}`);
}

/** Read all decision_input_hash for a (possibly paginated) query into both a row
 *  count and a distinct-hash Set. The count is D (one entry per row); the Set is
 *  the IN-list for the R_h join (distinct hashes). */
async function pgCollectDispositions(
  base: string,
  key: string,
  query: string,
): Promise<{ count: number; hashes: Set<string> }> {
  const hashes = new Set<string>();
  let count = 0;
  let from = 0;
  for (;;) {
    const { rows } = await pgGet(base, key, query, { from, to: from + PAGE - 1 });
    for (const r of rows) {
      count += 1;
      const h = r.decision_input_hash;
      if (typeof h === 'string') hashes.add(h);
    }
    if (rows.length < PAGE) break;
    from += PAGE;
    if (from > 50_000_000) break; // hard safety bound
  }
  return { count, hashes };
}

// --------------------------------------------------------------------------
// Live adapters
// --------------------------------------------------------------------------

function buildLiveAdapters(opts: {
  supabaseUrl: string;
  serviceKey: string;
  oneShot: boolean;
}): Section8MonitorAdapters {
  const { supabaseUrl, serviceKey, oneShot } = opts;

  const readWindowDispositions: Section8MonitorAdapters['readWindowDispositions'] = async (window) =>
    pgCollectDispositions(supabaseUrl, serviceKey, buildDispositionsQuery(window));

  const readAuditRowsHashMatched: Section8MonitorAdapters['readAuditRowsHashMatched'] = async (
    window,
    hashes,
  ) => {
    if (hashes.size === 0) return 0;
    return pgCount(supabaseUrl, serviceKey, buildAuditHashMatchedQuery(window, [...hashes]));
  };

  const readAuditRowsTotal: Section8MonitorAdapters['readAuditRowsTotal'] = async (window) =>
    pgCount(supabaseUrl, serviceKey, buildAuditTotalQuery(window));

  const readPriorComponents: Section8MonitorAdapters['readPriorComponents'] = async () => {
    if (oneShot) return null; // pre-go-live one-shot has no chain
    const { rows } = await pgGet(supabaseUrl, serviceKey, buildPriorComponentsQuery());
    if (rows.length === 0) return null;
    const fl = rows[0].freeze_loss_suspected;
    const fa = rows[0].freeze_audit_orphaned;
    const components: Section8Components = {
      freeze_dispositions_orphaned: typeof fl === 'number' ? fl : 0,
      freeze_audit_orphaned: typeof fa === 'number' ? fa : 0,
    };
    return components;
  };

  const writeRun: Section8MonitorAdapters['writeRun'] = async (row: Section8RunRow) => {
    const res = await fetch(`${supabaseUrl}/rest/v1/section8_runs`, {
      method: 'POST',
      headers: restHeaders(serviceKey, { 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
      body: JSON.stringify(row),
    });
    if (!res.ok) {
      throw new Error(`section8_runs insert failed: ${res.status} ${await safeText(res)}`);
    }
  };

  return {
    readWindowDispositions,
    readAuditRowsHashMatched,
    readAuditRowsTotal,
    readPriorComponents,
    writeRun,
  };
}

// --------------------------------------------------------------------------
// Summary (NF-3 alert surface: structured stderr; the row is the durable ticket)
// --------------------------------------------------------------------------

function printSummary(
  result: Awaited<ReturnType<typeof runSection8Monitor>>,
  ctx: { label: string; explicit: boolean; args: MonitorArgs },
): void {
  const { row, counts, verdict, degraded, degradedReason } = result;
  const tag =
    verdict === 'green' ? 'OK' : verdict === 'yellow' ? 'WARN' : verdict === 'red' ? 'ALERT' : 'DEGRADED';
  const mode = ctx.args.oneShot ? 'one-shot' : ctx.explicit ? 'explicit-window' : 'recurring';
  const dry = ctx.args.dryRun ? ' (dry-run, no row written)' : '';
  console.error(
    `[section8_monitor] ${tag} verdict=${verdict} window=${ctx.label} mode=${mode}${dry}`,
  );
  if (counts) {
    console.error(
      `[section8_monitor] D=${counts.D} R_h=${counts.R_h} R_t=${counts.R_t} ` +
        `freeze_dispositions_orphaned=${row.freeze_loss_suspected} ` +
        `freeze_audit_orphaned=${row.freeze_audit_orphaned}`,
    );
  }
  if (degraded) {
    console.error(`[section8_monitor] degraded: ${degradedReason ?? 'unknown'}`);
  }
}

// --------------------------------------------------------------------------
// main
// --------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const { window, label, explicit } = resolveWindow(args, new Date());

  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL').replace(/\/+$/, '');
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const adapters = buildLiveAdapters({ supabaseUrl, serviceKey, oneShot: args.oneShot });

  const result = await runSection8Monitor({ window, adapters, dryRun: args.dryRun });
  printSummary(result, { label, explicit, args });
  process.exit(verdictToExitCode(result.verdict));
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[section8_monitor] HARD ERROR: ${msg}`);
  process.exit(1); // NF-3: hard error
});
