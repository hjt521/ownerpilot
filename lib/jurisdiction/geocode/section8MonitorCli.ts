/**
 * section8MonitorCli.ts — pure helpers for the §8 monitor CLI
 * (`scripts/section8_monitor.ts`). Factored out of the script so the
 * window-derivation, arg-parsing, exit-mapping, and payload-routing logic is
 * unit-testable through the repo gate without spawning Vercel or opening a
 * Supabase client. The script stays a thin wrapper: parse → resolve window →
 * build live adapters → runSection8Monitor → exit code + stderr summary.
 *
 * Ruling baseline: NF-1 (calendar-day PT window; one-shot uses explicit bounds
 * verbatim), NF-3 (exit-code scheme), F-A/F-B (route disposition vs failure by
 * key), P-1 (classify against the imported sets, no re-list).
 */
import {
  ROW_WRITING_DISPOSITIONS,
  NO_ROW_BY_DESIGN_DISPOSITIONS,
  type Section8Disposition,
} from './section8Core';
import type {
  Section8Window,
  DispositionLogLine,
  FailureLogLine,
  MonitorVerdict,
} from './section8MonitorCore';

const PT_ZONE = 'America/Los_Angeles';

// --------------------------------------------------------------------------
// Args
// --------------------------------------------------------------------------

export interface MonitorArgs {
  /** Explicit window start (ISO). Present → one-shot explicit mode. */
  windowStart?: string;
  /** Explicit window end (ISO). Present → one-shot explicit mode. */
  windowEnd?: string;
  /** Compute + print, do not write. */
  dryRun: boolean;
  /** Pre-go-live one-shot semantics (recovery set = this run's rows only). */
  oneShot: boolean;
}

/** Parse `--window-start ISO --window-end ISO --dry-run --one-shot`.
 *  `--window-start`/`--window-end` must be given together or not at all. */
export function parseArgs(argv: ReadonlyArray<string>): MonitorArgs {
  const out: MonitorArgs = { dryRun: false, oneShot: false };
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i];
    switch (tok) {
      case '--dry-run':
        out.dryRun = true;
        break;
      case '--one-shot':
        out.oneShot = true;
        break;
      case '--window-start':
        out.windowStart = argv[++i];
        break;
      case '--window-end':
        out.windowEnd = argv[++i];
        break;
      default:
        throw new Error(`section8_monitor: unknown argument '${tok}'`);
    }
  }
  const hasStart = out.windowStart !== undefined;
  const hasEnd = out.windowEnd !== undefined;
  if (hasStart !== hasEnd) {
    throw new Error('section8_monitor: --window-start and --window-end must be given together');
  }
  if (hasStart) {
    for (const [name, v] of [['--window-start', out.windowStart], ['--window-end', out.windowEnd]] as const) {
      if (Number.isNaN(Date.parse(v as string))) {
        throw new Error(`section8_monitor: ${name} is not a valid ISO timestamp: '${v}'`);
      }
    }
    if (Date.parse(out.windowEnd as string) <= Date.parse(out.windowStart as string)) {
      throw new Error('section8_monitor: --window-end must be after --window-start');
    }
  }
  return out;
}

// --------------------------------------------------------------------------
// Window derivation (DST-correct, no date library)
// --------------------------------------------------------------------------

/** Minutes that `tz` is offset from UTC at `date` (e.g. PDT = -420, PST = -480).
 *  Computed by formatting the instant in `tz` and differencing the wall clock
 *  from UTC — handles DST without a hardcoded offset. */
export function tzOffsetMinutes(date: Date, tz: string = PT_ZONE): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const f: Record<string, string> = {};
  for (const p of parts) f[p.type] = p.value;
  // Intl can render hour "24" at midnight in some engines; normalize to 0.
  const hour = f.hour === '24' ? 0 : Number(f.hour);
  const asUTC = Date.UTC(
    Number(f.year),
    Number(f.month) - 1,
    Number(f.day),
    hour,
    Number(f.minute),
    Number(f.second),
  );
  return (asUTC - date.getTime()) / 60000;
}

/** UTC instant (ms) of 00:00:00 PT on the given PT calendar date. Robust across
 *  DST because the offset is evaluated at the date's UTC anchor and midnight is
 *  never the transition hour (PT transitions occur at 02:00). */
export function ptMidnightUtcMs(year: number, month1to12: number, day: number): number {
  const anchor = Date.UTC(year, month1to12 - 1, day, 0, 0, 0);
  const off = tzOffsetMinutes(new Date(anchor), PT_ZONE);
  return anchor - off * 60000;
}

/** The PT calendar date (Y/M/D) that `instant` falls on, in PT. */
function ptDateParts(instant: Date): { year: number; month: number; day: number } {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: PT_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const f: Record<string, string> = {};
  for (const p of dtf.formatToParts(instant)) f[p.type] = p.value;
  return { year: Number(f.year), month: Number(f.month), day: Number(f.day) };
}

/** NF-1: the window = the PT calendar day *before* the one `now` falls in,
 *  `[00:00 PT, 24:00 PT)`, expressed as UTC instants. Returns the window and a
 *  human label naming the PT day (for the stderr summary). DST-safe: a
 *  spring-forward day is 23h, a fall-back day is 25h, derived from the two PT
 *  midnights rather than a fixed 24h. */
export function derivePriorPtCalendarDayWindow(now: Date): { window: Section8Window; ptDayLabel: string } {
  const today = ptDateParts(now);
  // Step back one CALENDAR day (not 24h: a spring-forward prior day is only 23h,
  // so subtracting 24h ms from today's PT midnight overshoots into the wrong
  // date). A UTC Date is used purely as a calendar vehicle for the decrement.
  const cal = new Date(Date.UTC(today.year, today.month - 1, today.day));
  cal.setUTCDate(cal.getUTCDate() - 1);
  const prior = { year: cal.getUTCFullYear(), month: cal.getUTCMonth() + 1, day: cal.getUTCDate() };
  // Each midnight computed with its OWN offset → the window is exactly the PT
  // day's true length (23h / 24h / 25h across DST).
  const startMs = ptMidnightUtcMs(prior.year, prior.month, prior.day);
  const endMs = ptMidnightUtcMs(today.year, today.month, today.day);
  const label = `${prior.year}-${String(prior.month).padStart(2, '0')}-${String(prior.day).padStart(2, '0')} PT`;
  return { window: { start: new Date(startMs), end: new Date(endMs) }, ptDayLabel: label };
}

/** Resolve the run window from args: explicit bounds verbatim (one-shot), else
 *  the prior PT calendar day (recurring). */
export function resolveWindow(
  args: MonitorArgs,
  now: Date,
): { window: Section8Window; label: string; explicit: boolean } {
  if (args.windowStart !== undefined && args.windowEnd !== undefined) {
    return {
      window: { start: new Date(args.windowStart), end: new Date(args.windowEnd) },
      label: `${args.windowStart} … ${args.windowEnd}`,
      explicit: true,
    };
  }
  const { window, ptDayLabel } = derivePriorPtCalendarDayWindow(now);
  return { window, label: ptDayLabel, explicit: false };
}

// --------------------------------------------------------------------------
// Exit codes (NF-3 §5.3)
// --------------------------------------------------------------------------

/** green → 0, yellow → 0 (WARN, not a failure), red → 10, monitor_degraded → 20.
 *  Hard error (exit 1) is handled by the script's top-level try/catch. */
export function verdictToExitCode(verdict: MonitorVerdict): number {
  switch (verdict) {
    case 'green':
      return 0;
    case 'yellow':
      return 0;
    case 'red':
      return 10;
    case 'monitor_degraded':
      return 20;
  }
}

// --------------------------------------------------------------------------
// Log-payload routing (F-A / F-B)
// --------------------------------------------------------------------------

const KNOWN_DISPOSITIONS: ReadonlySet<string> = new Set<string>([
  ...ROW_WRITING_DISPOSITIONS,
  ...NO_ROW_BY_DESIGN_DISPOSITIONS,
]);

/** Route a parsed inner log payload (already unwrapped from the Vercel envelope
 *  by the script) to a disposition line, a failure line, or null (ignore).
 *  F-B: disposition keyed on `type === 'geocode_disposition'`; failure keyed on
 *  `event === 'geocode_audit_write_failure'`. Malformed/foreign payloads → null.
 *  Disposition strings are validated against the imported union (no re-list). */
export function routeLogPayload(obj: unknown): DispositionLogLine | FailureLogLine | null {
  if (obj === null || typeof obj !== 'object') return null;
  const o = obj as Record<string, unknown>;

  if (o.type === 'geocode_disposition') {
    const d = o.disposition;
    if (typeof d !== 'string' || !KNOWN_DISPOSITIONS.has(d)) return null;
    const disposition = d as Section8Disposition;
    const hash = typeof o.decision_input_hash === 'string' ? o.decision_input_hash : undefined;
    const line: DispositionLogLine = { type: 'geocode_disposition', disposition };
    if (hash !== undefined) line.decision_input_hash = hash;
    return line;
  }

  if (o.event === 'geocode_audit_write_failure') {
    if (typeof o.decision_input_hash !== 'string') return null;
    return { event: 'geocode_audit_write_failure', decision_input_hash: o.decision_input_hash };
  }

  return null;
}
