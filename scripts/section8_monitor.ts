/* eslint-disable no-console */
/**
 * scripts/section8_monitor.ts — Slice 8 deliverable 4, the §8 monitor CLI.
 *
 * Thin I/O shell. All decomposition/threshold logic lives in section8Core
 * (deliverable 3); all orchestration/scoping/degraded-decision logic lives in
 * section8MonitorCore; the pure window/arg/exit/route helpers live in
 * section8MonitorCli. This file only: parses argv, resolves the window, builds
 * the LIVE adapters, runs the monitor, prints a stderr summary, and exits with
 * the NF-3 code.
 *
 * Run modes:
 *   tsx scripts/section8_monitor.ts                                  recurring: prior PT calendar day
 *   tsx scripts/section8_monitor.ts --one-shot                       pre-go-live one-shot semantics
 *   tsx scripts/section8_monitor.ts --window-start ISO --window-end ISO   explicit window (verbatim)
 *   add --dry-run to compute + print WITHOUT writing a section8_runs row
 *
 * Credentials — operator-surface-only rail (NEVER app/Vercel-app/git/CI):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (PostgREST reads/write)
 *   VERCEL_TOKEN (optional; omit to use the `vercel login` session)
 * Loaded from the broker-local .env by the launchd shell wrapper:
 *   zsh -lc 'cd <repo> && set -a && source .env.local && set +a && npx tsx scripts/section8_monitor.ts'
 *
 * Data path (ruling-bound):
 *   - REST-via-fetch, NOT supabase-js (which throws on Node 20 without native
 *     WebSocket). Proven path: the §rotation count check returned HTTP 206.
 *   - NF-1: window = prior PT calendar day (recurring); N1 row query carries the
 *     +5m hash-matched grace band. Disposition/failure log lines use the STRICT
 *     window by log-time.
 *   - NF-2: prior verdict = last non-degraded section8_runs row (null in one-shot).
 *   - NF-3: exit 0 green / 0 yellow / 10 red / 20 monitor_degraded / 1 hard error.
 */
import { spawn } from 'node:child_process';
import {
  runSection8Monitor,
  type Section8MonitorAdapters,
  type Section8Window,
  type DispositionLogLine,
  type FailureLogLine,
  type Section8RunRow,
} from '../lib/jurisdiction/geocode/section8MonitorCore';
import type { Section8RowRef, Section8Verdict } from '../lib/jurisdiction/geocode/section8Core';
import {
  parseArgs,
  resolveWindow,
  verdictToExitCode,
  routeLogPayload,
  type MonitorArgs,
} from '../lib/jurisdiction/geocode/section8MonitorCli';

/** +5m grace band (NF-1 sub-decision), in ms. Applied ONLY to the N1 row query. */
const GRACE_BAND_MS = 5 * 60 * 1000;
/** Supabase PostgREST page cap. */
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

/** N1 row query: rows whose decided_at ∈ [start, end + 5m) AND whose hash is one
 *  of the in-window row-writing disposition hashes. The +5m band absorbs the
 *  insert-time `decided_at` midnight straddle (P-2); the hash IN-filter keeps the
 *  band safe (unrelated next-day rows don't match an in-window hash). */
export function buildWindowRowsQuery(
  window: Section8Window,
  hashes: ReadonlyArray<string>,
): string {
  const startISO = window.start.toISOString();
  const endPlusISO = new Date(window.end.getTime() + GRACE_BAND_MS).toISOString();
  const inList = hashes.map((h) => encodeURIComponent(h)).join(',');
  return (
    `geocode_audit_log?select=decision_input_hash` +
    `&decided_at=gte.${encodeURIComponent(startISO)}` +
    `&decided_at=lt.${encodeURIComponent(endPlusISO)}` +
    `&decision_input_hash=in.(${inList})`
  );
}

/** Recovery set, recurring mode: all hashes in the table (a failure recovered in
 *  ANY later window counts as recovered — section8Core §2.4). Paginated. */
export function buildRecoveryQueryAll(): string {
  return `geocode_audit_log?select=decision_input_hash`;
}

/** Recovery set, one-shot mode: only this window's rows (no later window exists
 *  pre-go-live). Same +5m band so a straddled row of this window counts. */
export function buildRecoveryQueryWindow(window: Section8Window): string {
  const startISO = window.start.toISOString();
  const endPlusISO = new Date(window.end.getTime() + GRACE_BAND_MS).toISOString();
  return (
    `geocode_audit_log?select=decision_input_hash` +
    `&decided_at=gte.${encodeURIComponent(startISO)}` +
    `&decided_at=lt.${encodeURIComponent(endPlusISO)}`
  );
}

/** Prior non-degraded verdict for the consecutive chain (NF-2). */
export function buildPriorVerdictQuery(): string {
  return `section8_runs?select=verdict&verdict=neq.monitor_degraded&order=window_end.desc&limit=1`;
}

// --------------------------------------------------------------------------
// Vercel log envelope parse (PURE — exported for in-container validation)
// --------------------------------------------------------------------------

export interface ParsedLogLine {
  id: string;
  timestampMs: number;
  payload: DispositionLogLine | FailureLogLine | null;
}

/** Unwrap one `vercel logs --json` line: the inner structured payload sits in the
 *  envelope's top-level `.message` (a stringified JSON). Returns null for
 *  unparseable lines; payload null for foreign lines. */
export function parseVercelLogLine(rawLine: string): ParsedLogLine | null {
  let env: unknown;
  try {
    env = JSON.parse(rawLine);
  } catch {
    return null;
  }
  if (env === null || typeof env !== 'object') return null;
  const e = env as Record<string, unknown>;
  const id = typeof e.id === 'string' ? e.id : '';
  const timestampMs = typeof e.timestamp === 'number' ? e.timestamp : NaN;
  let inner: unknown = null;
  if (typeof e.message === 'string') {
    try {
      inner = JSON.parse(e.message);
    } catch {
      inner = null;
    }
  }
  return { id, timestampMs, payload: routeLogPayload(inner) };
}

/** Split a `vercel logs --json` stdout buffer into windowed, de-duped, routed
 *  disposition + failure lines. Disposition/failure lines use the STRICT window
 *  by envelope log-time (the +5m band is a row-query concern only, per NF-1). */
export function partitionLogLines(
  stdout: string,
  window: Section8Window,
): { dispositions: DispositionLogLine[]; failures: FailureLogLine[] } {
  const dispositions: DispositionLogLine[] = [];
  const failures: FailureLogLine[] = [];
  const seen = new Set<string>();
  const startMs = window.start.getTime();
  const endMs = window.end.getTime();
  for (const line of stdout.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    const parsed = parseVercelLogLine(trimmed);
    if (parsed === null || parsed.payload === null) continue;
    if (Number.isFinite(parsed.timestampMs)) {
      if (parsed.timestampMs < startMs || parsed.timestampMs >= endMs) continue;
    }
    if (parsed.id.length > 0) {
      if (seen.has(parsed.id)) continue;
      seen.add(parsed.id);
    }
    if ('type' in parsed.payload) dispositions.push(parsed.payload);
    else failures.push(parsed.payload);
  }
  return { dispositions, failures };
}

// --------------------------------------------------------------------------
// Live adapters
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
): Promise<{ rows: Array<Record<string, unknown>> }> {
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
  return { rows };
}

/** Read every decision_input_hash from a (possibly paginated) query into a Set. */
async function pgCollectHashes(base: string, key: string, query: string): Promise<Set<string>> {
  const set = new Set<string>();
  let from = 0;
  for (;;) {
    const { rows } = await pgGet(base, key, query, { from, to: from + PAGE - 1 });
    for (const r of rows) {
      const h = r.decision_input_hash;
      if (typeof h === 'string') set.add(h);
    }
    if (rows.length < PAGE) break;
    from += PAGE;
    if (from > 50_000_000) break; // hard safety bound
  }
  return set;
}

function buildLiveAdapters(opts: {
  supabaseUrl: string;
  serviceKey: string;
  vercelToken: string | undefined;
  window: Section8Window;
  oneShot: boolean;
}): Section8MonitorAdapters {
  const { supabaseUrl, serviceKey, vercelToken, window, oneShot } = opts;

  const readLogLines: Section8MonitorAdapters['readLogLines'] = (window) =>
    new Promise((resolve, reject) => {
      const args = ['logs', '--json', '--since', window.start.toISOString()];
      if (vercelToken !== undefined) args.push('--token', vercelToken);
      let stdout = '';
      let stderr = '';
      const child = spawn('vercel', args);
      child.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
      child.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
      child.on('error', (err) => reject(new Error(`vercel spawn failed: ${err.message}`)));
      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`vercel logs exited ${code}: ${stderr.trim().slice(0, 300)}`));
          return;
        }
        resolve(partitionLogLines(stdout, window));
      });
    });

  const readWindowRows: Section8MonitorAdapters['readWindowRows'] = async (window, hashes) => {
    if (hashes.size === 0) return [];
    const { rows } = await pgGet(supabaseUrl, serviceKey, buildWindowRowsQuery(window, [...hashes]));
    return rows
      .map((r) => r.decision_input_hash)
      .filter((h): h is string => typeof h === 'string')
      .map((h): Section8RowRef => ({ decision_input_hash: h }));
  };

  // recurring = full-table recovery set; one-shot = this window only (no later
  // window exists pre-go-live). The window is closed over from opts.
  const readRecoveryHashes: Section8MonitorAdapters['readRecoveryHashes'] = async () =>
    oneShot
      ? pgCollectHashes(supabaseUrl, serviceKey, buildRecoveryQueryWindow(window))
      : pgCollectHashes(supabaseUrl, serviceKey, buildRecoveryQueryAll());

  const readPriorVerdict: Section8MonitorAdapters['readPriorVerdict'] = async () => {
    if (oneShot) return null; // pre-go-live one-shot has no chain
    const { rows } = await pgGet(supabaseUrl, serviceKey, buildPriorVerdictQuery());
    if (rows.length === 0) return null;
    const v = rows[0].verdict;
    return v === 'green' || v === 'yellow' || v === 'red' ? (v as Section8Verdict) : null;
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

  return { readLogLines, readWindowRows, readRecoveryHashes, readPriorVerdict, writeRun };
}

// --------------------------------------------------------------------------
// Summary (NF-3 alert surface: structured stderr; the row is the durable ticket)
// --------------------------------------------------------------------------

function printSummary(
  result: Awaited<ReturnType<typeof runSection8Monitor>>,
  ctx: { label: string; explicit: boolean; args: MonitorArgs },
): void {
  const { row, verdict, degraded, degradedReason } = result;
  const tag =
    verdict === 'green' ? 'OK' : verdict === 'yellow' ? 'WARN' : verdict === 'red' ? 'ALERT' : 'DEGRADED';
  const mode = ctx.args.oneShot ? 'one-shot' : ctx.explicit ? 'explicit-window' : 'recurring';
  const dry = ctx.args.dryRun ? ' (dry-run, no row written)' : '';
  console.error(
    `[section8_monitor] ${tag} verdict=${verdict} window=${ctx.label} mode=${mode}${dry}`,
  );
  console.error(
    `[section8_monitor] N1 rows_written=${row.rows_written} ` +
      `N2 write_failures_unrecovered=${row.write_failures_unrecovered} ` +
      `N3 dispositions_with_no_row_by_design=${row.dispositions_with_no_row_by_design} ` +
      `N4 freeze_loss_suspected=${row.freeze_loss_suspected}`,
  );
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
  const vercelToken = process.env.VERCEL_TOKEN; // optional; falls back to session

  const adapters = buildLiveAdapters({
    supabaseUrl, serviceKey, vercelToken, window, oneShot: args.oneShot,
  });

  const result = await runSection8Monitor({ window, adapters, dryRun: args.dryRun });
  printSummary(result, { label, explicit, args });
  process.exit(verdictToExitCode(result.verdict));
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[section8_monitor] HARD ERROR: ${msg}`);
  process.exit(1); // NF-3: hard error
});
