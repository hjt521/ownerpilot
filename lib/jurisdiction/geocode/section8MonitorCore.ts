/**
 * section8MonitorCore.ts — Slice 8 deliverable 4, the §8 bounded-anomaly
 * monitor's ORCHESTRATION core. Pure of I/O: every side effect (Vercel log
 * read, Supabase audit reads, section8_runs write) is injected as an adapter,
 * exactly as Slice 4a's exportCore.ts injects its side effects. The thin CLI
 * `scripts/section8_monitor.ts` supplies the real adapters; the test supplies
 * fixtures.
 *
 * Ruling baseline (binding):
 *   - Parent §8 ruling — four-component decomposition (fork 8.B), threshold
 *     table (§3.5), hash-join recovery (fork 8.D), non-gate-bearing (fork 8.E).
 *   - Deliverable-4 engineering-spec ruling — D4-F1..F4.
 *   - Deliverable-4 implementation-plan ruling — NF-1 (calendar-day PT window +
 *     +5m hash-matched grace band), NF-2 (skip-degraded chain), NF-3 (row +
 *     stderr + exit code; verdict vocabulary incl. 'monitor_degraded').
 *
 * The decomposition + threshold logic lives in section8Core (deliverable 3) and
 * is NOT reimplemented here. This module classifies/scopes the inputs, decides
 * the degraded short-circuit, and writes the row.
 *
 * Type boundary (ruling P-1 §6.1): section8Core's Section8Verdict is three-valued
 * ('green' | 'yellow' | 'red'). 'monitor_degraded' is THIS module's out-of-band
 * state — decided here, BEFORE any call into section8Core, and written straight
 * to the free-text `verdict` column. On a degraded read we short-circuit and do
 * NOT call computeSection8Verdict.
 */
import {
  computeSection8Components,
  computeSection8Verdict,
  // Classification sets imported from section8Core to prevent drift — do NOT
  // re-list the disposition members here (ruling P-1 §6.1 drift discipline).
  ROW_WRITING_DISPOSITIONS,
  NO_ROW_BY_DESIGN_DISPOSITIONS,
  type Section8Disposition,
  type Section8DispositionEvent,
  type Section8FailureEvent,
  type Section8RowRef,
  type Section8Input,
  type Section8Components,
  type Section8Verdict,
} from './section8Core';

/** The monitor's verdict vocabulary = section8Core's three values plus the
 *  out-of-band degraded marker (ruling NF-3 / D4-F4). Written to the free-text
 *  `section8_runs.verdict` column; no schema constraint enforces it. */
export type MonitorVerdict = Section8Verdict | 'monitor_degraded';

/** Half-open window [start, end). NF-1: the recurring run computes the prior PT
 *  calendar day; the one-shot supplies explicit bounds. The monitorCore is
 *  agnostic to how the window was derived. */
export interface Section8Window {
  start: Date;
  end: Date;
}

/** A parsed `geocode_disposition` log line (reader adapter output). F-B: keyed
 *  on type === 'geocode_disposition'. decision_input_hash present iff the
 *  disposition is row-writing (section8Core §3.3). */
export interface DispositionLogLine {
  type: 'geocode_disposition';
  disposition: Section8Disposition;
  decision_input_hash?: string;
}

/** A parsed `geocode_audit_write_failure` log line (reader adapter output).
 *  F-A: emitted at error level (console.error); F-B: keyed on
 *  event === 'geocode_audit_write_failure'. Carries only the hash (sink §2.3
 *  privacy posture — never the raw address). */
export interface FailureLogLine {
  event: 'geocode_audit_write_failure';
  decision_input_hash: string;
}

/** The row written to section8_runs (migration 010 data columns; run_id and
 *  created_at default DB-side). verdict is the free-text MonitorVerdict. */
export interface Section8RunRow {
  window_start: string;
  window_end: string;
  rows_written: number;
  write_failures_unrecovered: number;
  dispositions_with_no_row_by_design: number;
  freeze_loss_suspected: number;
  verdict: MonitorVerdict;
}

/**
 * Injected side effects. The CLI wires real implementations; tests wire mocks.
 *
 * readWindowRows / readRecoveryHashes / readPriorVerdict / writeRun all use the
 * broker-local service_role client (operator-surface-only rail). readLogLines
 * shells `vercel logs --json` with the broker-local VERCEL_TOKEN.
 */
export interface Section8MonitorAdapters {
  /**
   * Pull the window's disposition + failure log lines from Vercel (F-A: BOTH
   * info and error levels). Disposition events are bounded by the STRICT window
   * (log-time). On any read failure (unreachable / rate-limited / partial) this
   * adapter THROWS — the monitor catches it and short-circuits to
   * 'monitor_degraded' (D4-F4 / NF-3).
   */
  readLogLines: (
    window: Section8Window,
  ) => Promise<{ dispositions: DispositionLogLine[]; failures: FailureLogLine[] }>;

  /**
   * Rows counted toward N1. NF-1 sub-decision: the SQL is
   *   decided_at >= window_start
   *   AND decided_at < window_end + interval '5 minutes'   (the +5m grace band)
   *   AND decision_input_hash IN (<inWindowRowHashes>)      (hash-match keeps it safe)
   * The +5m tail absorbs the midnight straddle (decided_at is insert-time,
   * `default now()`, per P-2); the hash filter rejects unrelated next-day rows.
   * Returns one Section8RowRef per matched row; the core counts `.length`.
   */
  readWindowRows: (
    window: Section8Window,
    inWindowRowHashes: ReadonlySet<string>,
  ) => Promise<Section8RowRef[]>;

  /**
   * The N2 recovery membership set (section8Core §2.4): the hashes against which
   * a write-failure is judged "recovered." Recurring monitor passes the
   * FULL-TABLE hash set (a failure recovered in any later window counts as
   * recovered); the pre-go-live one-shot passes only its run's row hashes (no
   * later window exists yet). The mode difference is wired in the CLI; the core
   * is agnostic.
   */
  readRecoveryHashes: () => Promise<ReadonlySet<string>>;

  /**
   * The prior NON-DEGRADED run's verdict for the consecutive-chain predicate
   * (NF-2): SQL `WHERE verdict != 'monitor_degraded' ORDER BY window_end DESC
   * LIMIT 1`, mapped to Section8Verdict | null (null = no prior real run).
   * monitor_degraded rows are transparent to the chain.
   */
  readPriorVerdict: () => Promise<Section8Verdict | null>;

  /** Insert the section8_runs row. No-op in dry-run (the CLI injects a no-op).
   *  A throw here is a HARD error (CLI exit 1) — the row is the durable ticket. */
  writeRun: (row: Section8RunRow) => Promise<void>;
}

export interface Section8MonitorResult {
  verdict: MonitorVerdict;
  /** null iff the run degraded before the decomposition ran. */
  components: Section8Components | null;
  row: Section8RunRow;
  priorVerdict: Section8Verdict | null;
  degraded: boolean;
  degradedReason?: string;
}

/** Build the section8_runs row for a degraded run: counts are 0 (un-retrievable),
 *  verdict is the out-of-band marker. computeSection8Verdict is NEVER called on
 *  this path (ruling MUST-FIX / P-1 §6.1). */
function degradedRow(window: Section8Window): Section8RunRow {
  return {
    window_start: window.start.toISOString(),
    window_end: window.end.toISOString(),
    rows_written: 0,
    write_failures_unrecovered: 0,
    dispositions_with_no_row_by_design: 0,
    freeze_loss_suspected: 0,
    verdict: 'monitor_degraded',
  };
}

/**
 * Run one §8 monitor pass over `window`.
 *
 * Flow:
 *   1. Read the log lines. Any failure → short-circuit to 'monitor_degraded'
 *      (before any section8Core call).
 *   2. Project disposition/failure events; derive the in-window row-writing
 *      hashes for the N1 band query.
 *   3. Read window rows (banded + hash-matched), the recovery set, and the
 *      prior non-degraded verdict. Any failure → 'monitor_degraded'.
 *   4. section8Core: components + verdict.
 *   5. Write one row (unless dryRun).
 *
 * A degraded short-circuit still WRITES a row (the marker is the signal), unless
 * dryRun. If even the degraded write throws, it propagates → CLI hard error.
 */
export async function runSection8Monitor(args: {
  window: Section8Window;
  adapters: Section8MonitorAdapters;
  dryRun: boolean;
}): Promise<Section8MonitorResult> {
  const { window, adapters, dryRun } = args;

  // --- Step 1: logs (degraded short-circuit on failure) ---
  let dispositions: DispositionLogLine[];
  let failures: FailureLogLine[];
  try {
    const logs = await adapters.readLogLines(window);
    dispositions = logs.dispositions;
    failures = logs.failures;
  } catch (err) {
    return degraded(window, adapters, dryRun, err);
  }

  // --- Step 2: project events + in-window row-writing hashes ---
  const dispositionEvents: Section8DispositionEvent[] = dispositions.map((d) => ({
    disposition: d.disposition,
    decision_input_hash: d.decision_input_hash,
  }));
  const failureEvents: Section8FailureEvent[] = failures.map((f) => ({
    decision_input_hash: f.decision_input_hash,
  }));

  // The hash IN-set for the N1 band query: row-writing dispositions (classified
  // against the imported set, never a re-list) that carry a hash.
  const inWindowRowHashes = new Set<string>();
  for (const d of dispositions) {
    if (ROW_WRITING_DISPOSITIONS.has(d.disposition) && d.decision_input_hash) {
      inWindowRowHashes.add(d.decision_input_hash);
    }
  }

  // --- Step 3: rows + recovery set + prior verdict (degraded on failure) ---
  let windowRows: Section8RowRef[];
  let recoveryRowHashes: ReadonlySet<string>;
  let priorVerdict: Section8Verdict | null;
  try {
    windowRows = await adapters.readWindowRows(window, inWindowRowHashes);
    recoveryRowHashes = await adapters.readRecoveryHashes();
    priorVerdict = await adapters.readPriorVerdict();
  } catch (err) {
    return degraded(window, adapters, dryRun, err);
  }

  // --- Step 4: decomposition + verdict (section8Core; the ONLY core calls) ---
  const input: Section8Input = {
    windowRows,
    dispositionEvents,
    failureEvents,
    recoveryRowHashes,
  };
  const components = computeSection8Components(input);
  const verdict = computeSection8Verdict(components, priorVerdict);

  // --- Step 5: build + write the row ---
  const row: Section8RunRow = {
    window_start: window.start.toISOString(),
    window_end: window.end.toISOString(),
    rows_written: components.rows_written,
    write_failures_unrecovered: components.write_failures_unrecovered,
    dispositions_with_no_row_by_design: components.dispositions_with_no_row_by_design,
    freeze_loss_suspected: components.freeze_loss_suspected,
    verdict,
  };
  if (!dryRun) await adapters.writeRun(row);

  return { verdict, components, row, priorVerdict, degraded: false };
}

/** Degraded short-circuit: write the marker row (unless dryRun) and return.
 *  computeSection8Verdict is intentionally NOT reached on this path. */
async function degraded(
  window: Section8Window,
  adapters: Section8MonitorAdapters,
  dryRun: boolean,
  err: unknown,
): Promise<Section8MonitorResult> {
  const row = degradedRow(window);
  if (!dryRun) await adapters.writeRun(row);
  return {
    verdict: 'monitor_degraded',
    components: null,
    row,
    priorVerdict: null,
    degraded: true,
    degradedReason: err instanceof Error ? err.message : String(err),
  };
}
