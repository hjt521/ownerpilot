/**
 * Slice 8 -- section8 monitor (deliverable 4) tests.
 *
 * Covers section8MonitorCore (the orchestration: window scoping, hash-join via
 * the injected adapters, degraded short-circuit) and section8MonitorCli (pure
 * helpers: arg parsing, DST-correct PT-calendar-day window derivation, exit
 * codes, Vercel log-payload routing). No live Vercel, no DB -- every side effect
 * is injected. The decomposition/threshold arithmetic itself is proven in
 * section8Core.test.ts; this proves the monitor wires inputs to it correctly and
 * honors the deliverable-4 ruling (NF-1 window + grace band, NF-2 skip-degraded
 * chain, NF-3 exit codes, P-1 degraded short-circuit before any core call).
 */
import {
  runSection8Monitor,
  type Section8MonitorAdapters,
  type Section8Window,
  type DispositionLogLine,
  type FailureLogLine,
} from './section8MonitorCore';
import type { Section8RowRef, Section8Verdict } from './section8Core';
import {
  parseArgs,
  tzOffsetMinutes,
  ptMidnightUtcMs,
  derivePriorPtCalendarDayWindow,
  resolveWindow,
  verdictToExitCode,
  routeLogPayload,
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

const disp = (disposition: DispositionLogLine['disposition'], hash?: string): DispositionLogLine =>
  hash === undefined ? { type: 'geocode_disposition', disposition } : { type: 'geocode_disposition', disposition, decision_input_hash: hash };
const fail = (hash: string): FailureLogLine => ({ event: 'geocode_audit_write_failure', decision_input_hash: hash });
const rref = (hash: string): Section8RowRef => ({ decision_input_hash: hash });

interface ScenarioOver {
  dispositions?: DispositionLogLine[];
  failures?: FailureLogLine[];
  rows?: Section8RowRef[];
  recovery?: ReadonlySet<string>;
  prior?: Section8Verdict | null;
  readLogLines?: Section8MonitorAdapters['readLogLines'];
  readWindowRows?: Section8MonitorAdapters['readWindowRows'];
}
function makeAdapters(over: ScenarioOver): { a: Section8MonitorAdapters; writes: any[] } {
  const writes: any[] = [];
  const a: Section8MonitorAdapters = {
    readLogLines: over.readLogLines ?? (async () => ({ dispositions: over.dispositions ?? [], failures: over.failures ?? [] })),
    readWindowRows: over.readWindowRows ?? (async () => over.rows ?? []),
    readRecoveryHashes: async () => over.recovery ?? new Set<string>(),
    readPriorVerdict: async () => over.prior ?? null,
    writeRun: async (r) => { writes.push(r); },
  };
  return { a, writes };
}

async function main() {
  // ---- section8MonitorCore: threshold classes ----

  {
    const { a, writes } = makeAdapters({
      dispositions: [disp('confirmed_la', 'h1'), disp('not_la', 'h2'), disp('invalid_json')],
      rows: [rref('h1'), rref('h2')], recovery: new Set(['h1', 'h2']),
    });
    const r = await runSection8Monitor({ window: W, adapters: a, dryRun: false });
    check('core: green verdict', r.verdict === 'green');
    check('core: green N1=2', r.row.rows_written === 2);
    check('core: green N3=1', r.row.dispositions_with_no_row_by_design === 1);
    check('core: green freeze=0', r.row.freeze_loss_suspected === 0);
    check('core: green writes one row', writes.length === 1);
  }

  {
    const { a } = makeAdapters({
      dispositions: [disp('confirmed_la', 'h1')], rows: [rref('h1')],
      failures: [fail('hX')], recovery: new Set(['h1']),
    });
    const r = await runSection8Monitor({ window: W, adapters: a, dryRun: false });
    check('core: red via unrecovered write-failure', r.verdict === 'red');
    check('core: wfu=1', r.row.write_failures_unrecovered === 1);
  }

  {
    const { a } = makeAdapters({
      dispositions: [disp('confirmed_la', 'h1')], rows: [rref('h1')],
      failures: [fail('h1')], recovery: new Set(['h1']), // failure for h1, but h1's row exists -> recovered
    });
    const r = await runSection8Monitor({ window: W, adapters: a, dryRun: false });
    check('core: recovered failure -> wfu=0', r.row.write_failures_unrecovered === 0);
    check('core: recovered failure -> green', r.verdict === 'green');
  }

  {
    const { a } = makeAdapters({ dispositions: [disp('confirmed_la', 'h1')], rows: [], prior: null });
    const r = await runSection8Monitor({ window: W, adapters: a, dryRun: false });
    check('core: freeze==1 yellow on first occurrence', r.verdict === 'yellow');
    check('core: freeze value 1', r.row.freeze_loss_suspected === 1);
  }

  {
    const { a } = makeAdapters({ dispositions: [disp('gate_closed', 'h9')], rows: [], prior: 'yellow' });
    const r = await runSection8Monitor({ window: W, adapters: a, dryRun: false });
    check('core: freeze==1 red when prior was yellow (consecutive)', r.verdict === 'red');
  }

  {
    const { a } = makeAdapters({
      dispositions: [disp('confirmed_la', 'h1')], rows: [rref('h1'), rref('h2')], recovery: new Set(['h1', 'h2']),
    });
    const r = await runSection8Monitor({ window: W, adapters: a, dryRun: false });
    check('core: negative residual -> red (substrate bug)', r.verdict === 'red');
    check('core: freeze value -1', r.row.freeze_loss_suspected === -1);
  }

  // ---- Ruling fixture A: midnight straddle (NF-1 +5m hash-matched band) ----
  {
    let straddleHashSeen = false;
    const a: Section8MonitorAdapters = {
      readLogLines: async () => ({ dispositions: [disp('confirmed_la', 'straddle')], failures: [] }),
      readWindowRows: async (_w, hashes) => { straddleHashSeen = hashes.has('straddle'); return straddleHashSeen ? [rref('straddle')] : []; },
      readRecoveryHashes: async () => new Set(['straddle']),
      readPriorVerdict: async () => null,
      writeRun: async () => {},
    };
    const r = await runSection8Monitor({ window: W, adapters: a, dryRun: false });
    check('fixture A: in-window hash passed to band query', straddleHashSeen);
    check('fixture A: straddled row counted in N1', r.row.rows_written === 1);
    check('fixture A: no phantom freeze', r.row.freeze_loss_suspected === 0);
    check('fixture A: green', r.verdict === 'green');
  }

  // ---- Ruling fixture B: chain walk-back across a degraded gap (NF-2) ----
  // readPriorVerdict simulates `WHERE verdict != 'monitor_degraded' ORDER BY
  // window_end DESC LIMIT 1` over [yellow, degraded, degraded] -> yellow.
  {
    const { a } = makeAdapters({ dispositions: [disp('not_la', 'hb')], rows: [], prior: 'yellow' });
    const r = await runSection8Monitor({ window: W, adapters: a, dryRun: false });
    check('fixture B: red across degraded gap (chain preserved)', r.verdict === 'red');
  }

  // ---- Ruling fixture C: degraded short-circuit, no core call (NF-3 / P-1) ----
  {
    let rowsRead = false, recoveryRead = false, priorRead = false;
    const writes: any[] = [];
    const a: Section8MonitorAdapters = {
      readLogLines: async () => { throw new Error('vercel 503 partial read'); },
      readWindowRows: async () => { rowsRead = true; return []; },
      readRecoveryHashes: async () => { recoveryRead = true; return new Set<string>(); },
      readPriorVerdict: async () => { priorRead = true; return null; },
      writeRun: async (r) => { writes.push(r); },
    };
    const r = await runSection8Monitor({ window: W, adapters: a, dryRun: false });
    check('fixture C: verdict monitor_degraded', r.verdict === 'monitor_degraded');
    check('fixture C: degraded flag set', r.degraded === true);
    check('fixture C: components null (computeSection8Verdict NOT called)', r.components === null);
    check('fixture C: degraded reason captured', /503/.test(r.degradedReason ?? ''));
    check('fixture C: marker row written with zero counts', writes.length === 1 && writes[0].verdict === 'monitor_degraded' && writes[0].rows_written === 0);
    check('fixture C: downstream reads short-circuited', !rowsRead && !recoveryRead && !priorRead);
  }

  // ---- dry-run + window echo ----
  {
    const { a, writes } = makeAdapters({ dispositions: [disp('invalid_json')] });
    const r = await runSection8Monitor({ window: W, adapters: a, dryRun: true });
    check('core: dry-run writes nothing', writes.length === 0);
    check('core: dry-run still returns a verdict', ['green', 'yellow', 'red', 'monitor_degraded'].includes(r.verdict));
    check('core: row window_start echoed as ISO', r.row.window_start === W.start.toISOString());
    check('core: row window_end echoed as ISO', r.row.window_end === W.end.toISOString());
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

  // ---- section8MonitorCli: log-payload routing (F-B) ----
  {
    const dr = routeLogPayload({ type: 'geocode_disposition', disposition: 'confirmed_la', decision_input_hash: 'abc' });
    check('cli: routes row-writing disposition w/ hash', dr !== null && 'type' in dr && (dr as any).decision_input_hash === 'abc');
    const dn = routeLogPayload({ type: 'geocode_disposition', disposition: 'invalid_json' });
    check('cli: routes by-design disposition w/o hash', dn !== null && 'type' in dn && (dn as any).decision_input_hash === undefined);
    const fl = routeLogPayload({ event: 'geocode_audit_write_failure', decision_input_hash: 'h9', error_class: 'Error' });
    check('cli: routes failure line', fl !== null && 'event' in fl && (fl as any).decision_input_hash === 'h9');
    check('cli: unknown disposition -> null', routeLogPayload({ type: 'geocode_disposition', disposition: 'bogus' }) === null);
    check('cli: failure missing hash -> null', routeLogPayload({ event: 'geocode_audit_write_failure' }) === null);
    check('cli: foreign payload -> null', routeLogPayload({ level: 'info', message: 'GET /api 200' }) === null);
    check('cli: non-object -> null', routeLogPayload('a string') === null);
  }
}

main()
  .then(() => { console.log(`\n  ${passed} passed, ${failed} failed`); process.exit(failed ? 1 : 0); })
  .catch((e) => { console.error(e); process.exit(1); });
