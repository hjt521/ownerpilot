/**
 * section8MonitorCore.ts — Slice 8 deliverable 4b, the §8 monitor's ORCHESTRATION
 * core. Pure of I/O: every side effect (the three durable PostgREST reads, the
 * prior-run read, the section8_runs write) is injected as an adapter. The thin
 * CLI `scripts/section8_monitor.ts` supplies the real adapters; the test supplies
 * fixtures.
 *
 * DELIVERABLE 4b REWRITE (durable-vs-durable). Replaces the log-oracle flow:
 *   - GONE: readLogLines (vercel logs), the disposition/failure log projection,
 *     the recovery-hash set, the in-module hash-join. (IF-6 deletes the vercel
 *     path; Fork F-a deletes wfu + recovery.)
 *   - NEW: three count reads — D (geocode_dispositions rows in the banded window),
 *     R_h (geocode_audit_log rows hash-joined to the in-window disposition hashes),
 *     R_t (geocode_audit_log rows raw) — plus the prior non-degraded run's two
 *     orphan quantities for the NF-2 chain. section8Core turns the counts into the
 *     two orphan quantities and the verdict.
 *
 * Ruling baseline: retention-gap (durable-vs-durable, substrate-divergence red);
 * deliverable 4b IF-1 (symmetric orphans) / IF-3-override (the disposition row is
 * written synchronously in route.ts, not here); Fork D (row-writing only; no read-
 * time classification); Fork F-a (no wfu); Fork G (teardown-independent reference);
 * Fork E (independent chains); NF-1 (+5m band, owned by the CLI's SQL); NF-2 (skip-
 * degraded chain); NF-3 (row + stderr + exit; 'monitor_degraded' marker).
 *
 * Type boundary (ruling P-1 §6.1): section8Core's Section8Verdict is three-valued.
 * 'monitor_degraded' is THIS module's out-of-band state — decided here on a read
 * failure, BEFORE any call into section8Core, written straight to the free-text
 * verdict column.
 */
import {
  computeSection8Components,
  computeSection8Verdict,
  type Section8Counts,
  type Section8Components,
  type Section8Verdict,
} from './section8Core';

/** The monitor's verdict vocabulary = section8Core's three values plus the out-of-
 *  band degraded marker (NF-3). Written to the free-text section8_runs.verdict. */
export type MonitorVerdict = Section8Verdict | 'monitor_degraded';

/** Half-open window [start, end). NF-1: the recurring run computes the prior PT
 *  calendar day; the one-shot supplies explicit bounds. monitorCore is agnostic to
 *  how the window was derived. */
export interface Section8Window {
  start: Date;
  end: Date;
}

/** The disposition read result: the count D and the set of in-window disposition
 *  hashes (the IN-list for the R_h hash-join). Every row is row-writing by
 *  construction (Fork D), so there is no classification here. */
export interface DispositionReadResult {
  count: number;
  hashes: ReadonlySet<string>;
}

/**
 * The row written to section8_runs (4b columns). N3
 * (dispositions_with_no_row_by_design, Fork D) and write_failures_unrecovered
 * (Fork F-a) are RETIRED — omitted from the insert, defaulted to 0 DB-side by
 * migration 011. run_id and created_at default DB-side.
 *   rows_written          = R_h (audit rows hash-matched to in-window dispositions)
 *   freeze_loss_suspected = freeze_dispositions_orphaned = D - R_h (name retained
 *                           for migration compatibility; IF-1 §3.4)
 *   freeze_audit_orphaned = R_t - R_h
 */
export interface Section8RunRow {
  window_start: string;
  window_end: string;
  rows_written: number;
  freeze_loss_suspected: number;
  freeze_audit_orphaned: number;
  verdict: MonitorVerdict;
}

/**
 * Injected side effects. The CLI wires real implementations (service_role
 * PostgREST, operator-surface-only rail); tests wire mocks. Any of the four reads
 * THROWING short-circuits the run to 'monitor_degraded' (NF-3 / P-1) before any
 * section8Core call.
 */
export interface Section8MonitorAdapters {
  /** D + the in-window disposition-hash set. Banded window [start, end + 5m). */
  readWindowDispositions: (window: Section8Window) => Promise<DispositionReadResult>;

  /** R_h: geocode_audit_log rows in the banded window whose decision_input_hash is
   *  one of `hashes`. With an empty `hashes` set this is 0 (no IN-list members). */
  readAuditRowsHashMatched: (
    window: Section8Window,
    hashes: ReadonlySet<string>,
  ) => Promise<number>;

  /** R_t: geocode_audit_log rows in the banded window, raw (no hash filter). */
  readAuditRowsTotal: (window: Section8Window) => Promise<number>;

  /** The prior NON-DEGRADED run's two orphan quantities for the NF-2 chain (Fork
   *  E: each chains independently). SQL `WHERE verdict != 'monitor_degraded' ORDER
   *  BY window_end DESC LIMIT 1`, mapped to Section8Components | null (null = no
   *  prior real run; also null in the one-shot, which has no chain). */
  readPriorComponents: () => Promise<Section8Components | null>;

  /** Insert the section8_runs row. No-op in dry-run (CLI injects a no-op). A throw
   *  here is a HARD error (CLI exit 1) — the row is the durable ticket. */
  writeRun: (row: Section8RunRow) => Promise<void>;
}

export interface Section8MonitorResult {
  verdict: MonitorVerdict;
  /** null iff the run degraded before the decomposition ran. */
  components: Section8Components | null;
  counts: Section8Counts | null;
  row: Section8RunRow;
  prior: Section8Components | null;
  degraded: boolean;
  degradedReason?: string;
}

/** Build the section8_runs row for a degraded run: counts are 0 (un-retrievable),
 *  verdict is the out-of-band marker. computeSection8Verdict is NEVER called on
 *  this path (P-1 §6.1). */
function degradedRow(window: Section8Window): Section8RunRow {
  return {
    window_start: window.start.toISOString(),
    window_end: window.end.toISOString(),
    rows_written: 0,
    freeze_loss_suspected: 0,
    freeze_audit_orphaned: 0,
    verdict: 'monitor_degraded',
  };
}

/**
 * Run one §8 monitor pass over `window`.
 *
 * Flow:
 *   1. Read D + the in-window disposition-hash set. Failure → 'monitor_degraded'.
 *   2. Read R_h (hash-matched audit rows) and R_t (raw audit rows). Failure → degraded.
 *   3. Read the prior non-degraded run's orphan quantities. Failure → degraded.
 *   4. section8Core: components + verdict.
 *   5. Write one row (unless dryRun).
 *
 * A degraded short-circuit still WRITES a marker row (unless dryRun); if that
 * write throws, it propagates → CLI hard error.
 */
export async function runSection8Monitor(args: {
  window: Section8Window;
  adapters: Section8MonitorAdapters;
  dryRun: boolean;
}): Promise<Section8MonitorResult> {
  const { window, adapters, dryRun } = args;

  // --- Steps 1-3: the durable reads (degraded short-circuit on any failure) ---
  let counts: Section8Counts;
  let prior: Section8Components | null;
  try {
    const disp = await adapters.readWindowDispositions(window);
    const R_h = await adapters.readAuditRowsHashMatched(window, disp.hashes);
    const R_t = await adapters.readAuditRowsTotal(window);
    prior = await adapters.readPriorComponents();
    counts = { D: disp.count, R_h, R_t };
  } catch (err) {
    return degraded(window, adapters, dryRun, err);
  }

  // --- Step 4: decomposition + verdict (section8Core; the ONLY core calls) ---
  const components = computeSection8Components(counts);
  const verdict = computeSection8Verdict(counts, components, prior);

  // --- Step 5: build + write the row ---
  const row: Section8RunRow = {
    window_start: window.start.toISOString(),
    window_end: window.end.toISOString(),
    rows_written: counts.R_h,
    freeze_loss_suspected: components.freeze_dispositions_orphaned,
    freeze_audit_orphaned: components.freeze_audit_orphaned,
    verdict,
  };
  if (!dryRun) await adapters.writeRun(row);

  return { verdict, components, counts, row, prior, degraded: false };
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
    counts: null,
    row,
    prior: null,
    degraded: true,
    degradedReason: err instanceof Error ? err.message : String(err),
  };
}
