/**
 * Slice 8 -- section8 monitor (deliverable 4b) tests.
 *
 * Covers section8MonitorCore (orchestration: the three durable reads wired to the
 * decomposition, degraded short-circuit) and section8MonitorCli (pure helpers: arg
 * parsing, DST-correct PT-calendar-day window derivation, exit codes). No live DB --
 * every read/write is injected. The decomposition/threshold arithmetic is proven in
 * section8Core.test.ts; this proves the monitor wires the counts to it correctly and
 * honors the 4b rulings: durable-vs-durable (D / R_h / R_t), two symmetric orphan
 * quantities, substrate-divergence red, NF-2 INDEPENDENT chains (Fork E), Fork G
 * teardown detection, Fork F-a (no wfu), Fork D (no read-time classification),
 * NF-3 degraded short-circuit before any core call.
 */
import {
  runSection8Monitor,
  type Section8MonitorAdapters,
  type Section8Window,
  type Section8RunRow,
} from './section8MonitorCore';
import type { Section8Components } from './section8Core';
import {
  parseArgs,
  tzOffsetMinutes,
  ptMidnightUtcMs,
  derivePriorPtCalendarDayWindow,
  resolveWindow,
  verdictToExitCode,
} from './section8MonitorCli';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  \u2713 ' + name); } else { failed++; console.log('  \u2717 ' + name); }
}

const H = 3600000;
const W: Section8Window = {
  start: new Date('2026-06-21T07:00:00.000Z'), // 2026-06-21 00:00 PT
  end: new Date('2026-06-22T07:00:00.000Z'),   // 2026-06-22 00:00 PT
};

interface ScenarioOver {
  /** D, the disposition-row count, and the in-window disposition-hash set. */
  D?: number;
  hashes?: Set<string>;
  /** R_h (hash-matched audit rows) and R_t (raw audit rows). */
  Rh?: number;
  Rt?: number;
  /** Prior non-degraded run's two orphan quantities (NF-2 chain). */
  prior?: Section8Components | null;
  /** Force a read failure at one stage (degraded short-circuit). */
  throwOn?: 'disp' | 'rh' | 'rt' | 'prior';
}
function makeAdapters(over: ScenarioOver): { a: Section8MonitorAdapters; writes: Section8RunRow[] } {
  const writes: Section8RunRow[] = [];
  const a: Section8MonitorAdapters = {
    readWindowDispositions: async () => {
      if (over.throwOn === 'disp') throw new Error('dispositions read 503');
      return { count: over.D ?? 0, hashes: over.hashes ?? new Set<string>() };
    },
    readAuditRowsHashMatched: async () => {
      if (over.throwOn === 'rh') throw new Error('R_h read 503');
      return over.Rh ?? 0;
    },
    readAuditRowsTotal: async () => {
      if (over.throwOn === 'rt') throw new Error('R_t read 503');
      return over.Rt ?? 0;
    },
    readPriorComponents: async () => {
      if (over.throwOn === 'prior') throw new Error('prior read 503');
      return over.prior ?? null;
    },
    writeRun: async (r) => { writes.push(r); },
  };
  return { a, writes };
}
const comp = (fd: number, fa: number): Section8Components => ({
  freeze_dispositions_orphaned: fd,
  freeze_audit_orphaned: fa,
});

async function main() {
  // ---- happy path: D == R_h == R_t ----
  {
    const { a, writes } = makeAdapters({ D: 4, hashes: new Set(['a', 'b', 'c', 'd']), Rh: 4, Rt: 4 });
    const r = await runSection8Monitor({ window: W, adapters: a, dryRun: false });
    check('happy: green', r.verdict === 'green');
    check('happy: rows_written = R_h = 4', r.row.rows_written === 4);
    check('happy: freeze_dispositions_orphaned 0', r.row.freeze_loss_suspected === 0);
    check('happy: freeze_audit_orphaned 0', r.row.freeze_audit_orphaned === 0);
    check('happy: writes one row', writes.length === 1);
    check('happy: row omits retired N3/wfu (default 0 DB-side)',
      !('dispositions_with_no_row_by_design' in r.row) && !('write_failures_unrecovered' in r.row));
  }

  // ---- quiet window: D == 0 AND R_t == 0 -> green ----
  {
    const { a } = makeAdapters({ D: 0, hashes: new Set(), Rh: 0, Rt: 0 });
    const r = await runSection8Monitor({ window: W, adapters: a, dryRun: false });
    check('quiet: green', r.verdict === 'green');
  }

  // ---- Fork G Scenario 2: teardown freeze-loss. sync disposition row landed, the
  //      deferred audit insert never ran -> D=1, R_h=0, R_t=0 -> freeze_dispositions
  //      _orphaned=1 -> yellow first occurrence. (The case the monitor was built for.) ----
  {
    const { a } = makeAdapters({ D: 1, hashes: new Set(['t1']), Rh: 0, Rt: 0, prior: null });
    const r = await runSection8Monitor({ window: W, adapters: a, dryRun: false });
    check('teardown: freeze_dispositions_orphaned 1', r.row.freeze_loss_suspected === 1);
    check('teardown: yellow first occurrence', r.verdict === 'yellow');
  }

  // ---- Scenario 2 consecutive: same quantity == 1 on the prior non-degraded run -> red ----
  {
    const { a } = makeAdapters({ D: 1, hashes: new Set(['t2']), Rh: 0, Rt: 0, prior: comp(1, 0) });
    const r = await runSection8Monitor({ window: W, adapters: a, dryRun: false });
    check('teardown consecutive: red (NF-2 disposition chain)', r.verdict === 'red');
  }

  // ---- Fork F-a subsumption: a deferred audit-write FAILURE looks identical to teardown
  //      under the monitor (audit row absent, disposition row present). No separate wfu. ----
  {
    const { a } = makeAdapters({ D: 1, hashes: new Set(['wf']), Rh: 0, Rt: 0, prior: null });
    const r = await runSection8Monitor({ window: W, adapters: a, dryRun: false });
    check('audit-write-failure (F-a): same freeze_dispositions_orphaned=1 yellow', r.verdict === 'yellow' && r.row.freeze_loss_suspected === 1);
  }

  // ---- Fork G symmetric: sync disposition write failed, audit succeeded, AMID traffic
  //      -> audit row not hash-matched -> freeze_audit_orphaned=1 -> yellow ----
  {
    const { a } = makeAdapters({ D: 4, hashes: new Set(['a', 'b', 'c', 'd']), Rh: 4, Rt: 5, prior: null });
    const r = await runSection8Monitor({ window: W, adapters: a, dryRun: false });
    check('sync-write-fail amid traffic: freeze_audit_orphaned 1', r.row.freeze_audit_orphaned === 1);
    check('sync-write-fail amid traffic: yellow', r.verdict === 'yellow');
  }

  // ---- sync-write-fail consecutive (audit chain) -> red ----
  {
    const { a } = makeAdapters({ D: 4, hashes: new Set(['a', 'b', 'c', 'd']), Rh: 4, Rt: 5, prior: comp(0, 1) });
    const r = await runSection8Monitor({ window: W, adapters: a, dryRun: false });
    check('sync-write-fail consecutive: red (NF-2 audit chain)', r.verdict === 'red');
  }

  // ---- Fork E: the two chains do not cross. disposition_orphaned==1 this run, prior
  //      had audit_orphaned==1 -> NOT consecutive on either side -> stays yellow ----
  {
    const { a } = makeAdapters({ D: 1, hashes: new Set(['x']), Rh: 0, Rt: 0, prior: comp(0, 1) });
    const r = await runSection8Monitor({ window: W, adapters: a, dryRun: false });
    check('Fork E: chains do not cross -> yellow', r.verdict === 'yellow');
  }

  // ---- both orphans == 1 on the same run, no prior -> yellow (neither chain matched) ----
  {
    const { a } = makeAdapters({ D: 5, hashes: new Set(['a', 'b', 'c', 'd', 'e']), Rh: 4, Rt: 5, prior: null });
    const r = await runSection8Monitor({ window: W, adapters: a, dryRun: false });
    check('both orphans 1 same run: freeze_dispositions_orphaned 1', r.row.freeze_loss_suspected === 1);
    check('both orphans 1 same run: freeze_audit_orphaned 1', r.row.freeze_audit_orphaned === 1);
    check('both orphans 1 same run: yellow', r.verdict === 'yellow');
  }

  // ---- Fork G §4.5 residual: sync-write fail AND teardown on one decision, AMID
  //      traffic -> that decision contributes to nothing; window aggregate clean -> green ----
  {
    const { a } = makeAdapters({ D: 4, hashes: new Set(['a', 'b', 'c', 'd']), Rh: 4, Rt: 4, prior: null });
    const r = await runSection8Monitor({ window: W, adapters: a, dryRun: false });
    check('double-loss amid traffic: invisible, window green', r.verdict === 'green');
  }

  // ---- substrate divergence: D == 0 AND R_t > 0 -> red ----
  {
    const { a } = makeAdapters({ D: 0, hashes: new Set(), Rh: 0, Rt: 3 });
    const r = await runSection8Monitor({ window: W, adapters: a, dryRun: false });
    check('divergence: D=0 R_t>0 -> red', r.verdict === 'red');
  }

  // ---- negative residual (substrate bug) -> red ----
  {
    const { a } = makeAdapters({ D: 1, hashes: new Set(['n']), Rh: 3, Rt: 3 });
    const r = await runSection8Monitor({ window: W, adapters: a, dryRun: false });
    check('negative residual: freeze_dispositions_orphaned -2', r.row.freeze_loss_suspected === -2);
    check('negative residual: red', r.verdict === 'red');
  }

  // ---- either orphan >= 2 -> red ----
  {
    const { a } = makeAdapters({ D: 2, hashes: new Set(['p', 'q']), Rh: 0, Rt: 0 });
    const r = await runSection8Monitor({ window: W, adapters: a, dryRun: false });
    check('disposition_orphaned 2 -> red', r.verdict === 'red');
  }

  // ---- band-straddle: a next-day decision whose disposition row AND audit row both
  //      land in the +5m tail -> counted in D, R_h, R_t alike -> net zero orphan.
  //      (The band SQL itself is proven in the script's query-builder tests; here the
  //      monitor-level invariant is "both rows counted -> no phantom orphan".) ----
  {
    const { a } = makeAdapters({ D: 1, hashes: new Set(['straddle']), Rh: 1, Rt: 1 });
    const r = await runSection8Monitor({ window: W, adapters: a, dryRun: false });
    check('band-straddle: no phantom orphan', r.row.freeze_loss_suspected === 0 && r.row.freeze_audit_orphaned === 0);
    check('band-straddle: green', r.verdict === 'green');
  }

  // ---- degraded short-circuit on each of the four reads (NF-3 / P-1) ----
  for (const stage of ['disp', 'rh', 'rt', 'prior'] as const) {
    const { a, writes } = makeAdapters({ D: 2, hashes: new Set(['a', 'b']), Rh: 2, Rt: 2, throwOn: stage });
    const r = await runSection8Monitor({ window: W, adapters: a, dryRun: false });
    check(`degraded(${stage}): verdict monitor_degraded`, r.verdict === 'monitor_degraded');
    check(`degraded(${stage}): degraded flag + components null (no core call)`, r.degraded === true && r.components === null);
    check(`degraded(${stage}): marker row written, zero counts`,
      writes.length === 1 && writes[0].verdict === 'monitor_degraded' && writes[0].rows_written === 0);
  }

  // ---- dry-run writes nothing, still returns a verdict + echoes the window ----
  {
    const { a, writes } = makeAdapters({ D: 1, hashes: new Set(['d']), Rh: 1, Rt: 1 });
    const r = await runSection8Monitor({ window: W, adapters: a, dryRun: true });
    check('dry-run: writes nothing', writes.length === 0);
    check('dry-run: returns a verdict', ['green', 'yellow', 'red', 'monitor_degraded'].includes(r.verdict));
    check('dry-run: window_start echoed as ISO', r.row.window_start === W.start.toISOString());
    check('dry-run: window_end echoed as ISO', r.row.window_end === W.end.toISOString());
  }

  // ---- section8MonitorCli: arg parsing ----
  {
    const a1 = parseArgs(['--dry-run']);
    check('cli: --dry-run parsed', a1.dryRun === true && a1.oneShot === false);
    const a2 = parseArgs(['--one-shot', '--window-start', '2026-06-21T07:00:00Z', '--window-end', '2026-06-22T07:00:00Z']);
    check('cli: one-shot + explicit window parsed', a2.oneShot && a2.windowStart === '2026-06-21T07:00:00Z');
    let threw = false; try { parseArgs(['--window-start', '2026-06-21T07:00:00Z']); } catch { threw = true; }
    check('cli: lone --window-start throws', threw);
    threw = false; try { parseArgs(['--window-start', 'nope', '--window-end', '2026-06-22T07:00:00Z']); } catch { threw = true; }
    check('cli: bad ISO throws', threw);
    threw = false; try { parseArgs(['--window-end', '2026-06-21T07:00:00Z', '--window-start', '2026-06-22T07:00:00Z']); } catch { threw = true; }
    check('cli: end<=start throws', threw);
    threw = false; try { parseArgs(['--nope']); } catch { threw = true; }
    check('cli: unknown flag throws', threw);
  }

  // ---- section8MonitorCli: DST-correct window derivation ----
  {
    check('cli: PDT offset -420', tzOffsetMinutes(new Date('2026-06-15T12:00:00Z')) === -420);
    check('cli: PST offset -480', tzOffsetMinutes(new Date('2026-01-15T12:00:00Z')) === -480);
    check('cli: PT midnight summer = 07:00 UTC', new Date(ptMidnightUtcMs(2026, 6, 21)).toISOString() === '2026-06-21T07:00:00.000Z');
    check('cli: PT midnight winter = 08:00 UTC', new Date(ptMidnightUtcMs(2026, 1, 15)).toISOString() === '2026-01-15T08:00:00.000Z');

    const normal = derivePriorPtCalendarDayWindow(new Date('2026-06-22T10:00:00Z'));
    check('cli: normal prior PT day label', normal.ptDayLabel === '2026-06-21 PT');
    check('cli: normal window 24h', normal.window.end.getTime() - normal.window.start.getTime() === 24 * H);
    check('cli: normal start 07:00 UTC', normal.window.start.toISOString() === '2026-06-21T07:00:00.000Z');

    const spring = derivePriorPtCalendarDayWindow(new Date('2026-03-09T10:00:00Z'));
    check('cli: spring-forward day label 2026-03-08', spring.ptDayLabel === '2026-03-08 PT');
    check('cli: spring-forward day is 23h', spring.window.end.getTime() - spring.window.start.getTime() === 23 * H);

    const fall = derivePriorPtCalendarDayWindow(new Date('2026-11-02T11:00:00Z'));
    check('cli: fall-back day label 2026-11-01', fall.ptDayLabel === '2026-11-01 PT');
    check('cli: fall-back day is 25h', fall.window.end.getTime() - fall.window.start.getTime() === 25 * H);

    const ex = resolveWindow(parseArgs(['--window-start', '2026-05-01T00:00:00Z', '--window-end', '2026-05-02T00:00:00Z']), new Date('2026-06-22T10:00:00Z'));
    check('cli: explicit window verbatim', ex.explicit && ex.window.start.toISOString() === '2026-05-01T00:00:00.000Z');
    const rec = resolveWindow(parseArgs([]), new Date('2026-06-22T10:00:00Z'));
    check('cli: recurring window = prior PT day', !rec.explicit && rec.window.start.toISOString() === '2026-06-21T07:00:00.000Z');
  }

  // ---- section8MonitorCli: exit codes (NF-3) ----
  {
    check('cli: exit green=0', verdictToExitCode('green') === 0);
    check('cli: exit yellow=0', verdictToExitCode('yellow') === 0);
    check('cli: exit red=10', verdictToExitCode('red') === 10);
    check('cli: exit monitor_degraded=20', verdictToExitCode('monitor_degraded') === 20);
  }
}

main()
  .then(() => { console.log(`\n  ${passed} passed, ${failed} failed`); process.exit(failed ? 1 : 0); })
  .catch((e) => { console.error(e); process.exit(1); });
