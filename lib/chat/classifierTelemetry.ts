/**
 * Classifier telemetry — the §4.1 in-code substrate. Emits one structured JSON line
 * per classifier call (captured by Vercel stdout) and bumps in-process counters.
 *
 * COUNTS ONLY — never the target text, never a transcript (persistence lock
 * 2026-06-06). The live rolling error rate, daily count, token tracking and the ~5%
 * alert run in Vercel AI Gateway (Jack's §4.1 = Option B). The signal this log adds
 * over the Gateway's own metrics is the one the Gateway can't see: a JSON-parse or
 * schema failure returns HTTP 200 from the Gateway but is a classifier ERROR to us
 * (we fail open), so it must be surfaced explicitly here as ok:false.
 *
 * In-process counters reset per serverless instance — they are a convenience/debug
 * read, not the source of truth. The Gateway dashboard + these log lines are.
 */

export type ClassifierSideName = 'input' | 'output';

export type ClassifierCallRecord = {
  side: ClassifierSideName;
  ok: boolean;
  unsure?: boolean;
  reason?: string;
};

type SideCounter = { total: number; errors: number; unsure: number };

const counters: Record<ClassifierSideName, SideCounter> = {
  input: { total: 0, errors: 0, unsure: 0 },
  output: { total: 0, errors: 0, unsure: 0 },
};

/** Record one classifier call: bump counters + emit a structured telemetry line.
 *  `unsure` is logged distinctly (ruling §6) so the harness can see where the
 *  classifier sits on the edge. Never throws. */
export function recordClassifierCall(rec: ClassifierCallRecord): void {
  const c = counters[rec.side];
  c.total += 1;
  if (!rec.ok) c.errors += 1;
  if (rec.unsure) c.unsure += 1;
  try {
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        event: 'classifier_call',
        side: rec.side,
        ok: rec.ok,
        unsure: rec.unsure ?? false,
        reason: rec.ok ? undefined : rec.reason ?? 'error',
        ts: new Date().toISOString(),
      })
    );
  } catch {
    /* logging must never affect the request */
  }
}

/** Snapshot of the per-instance counters (debug/health read). */
export function getClassifierCounters(): Record<ClassifierSideName, SideCounter> {
  return {
    input: { ...counters.input },
    output: { ...counters.output },
  };
}
