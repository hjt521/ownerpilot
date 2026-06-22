/**
 * Slice 8 -- bounded-anomaly monitor core (pure four-component decomposition +
 * verdict). Shared by the three §8 artifacts (verification test, local-CLI
 * monitor, runbook query templates) so the decomposition lives in exactly ONE
 * place (ruling slice8_verification_premise_broker_ruling_response_2026-06-22.md
 * §1.5 "three call sites for the same substrate logic"; §3.2 canonical form;
 * §3.5 threshold table). All side effects (DB reads, log reads, alerting) live
 * in the callers; this module is pure.
 *
 * BUILD FLAG (not in the ruling's explicit three-artifact list): this module is
 * an engineering extraction of the shared decomposition the ruling says all
 * three artifacts use. If the broker prefers the logic inlined per-artifact, it
 * inlines trivially.
 *
 * Not legal advice; operator-facing substrate accounting.
 */

/** The seven disposition labels emitted by app/api/notice/geocode/route.ts as
 *  geocode_disposition events (ruling §3.3). */
export type Section8Disposition =
  | 'invalid_json'
  | 'address_required'
  | 'geocode_unavailable'
  | 'confirmed_la'
  | 'not_la'
  | 'manual_review'
  | 'gate_closed';

/** Dispositions whose branch WRITES an audit row (success verdicts + the
 *  synthetic gate_closed self-assertion). A disposition in this set with no
 *  matching row is a freeze-loss-suspected candidate (ruling §2.3 / §3.2 N4). */
export const ROW_WRITING_DISPOSITIONS: ReadonlySet<Section8Disposition> = new Set<Section8Disposition>([
  'confirmed_la',
  'not_la',
  'manual_review',
  'gate_closed',
]);

/** Dispositions that by design produce NO row (ruling §3.2 N3). */
export const NO_ROW_BY_DESIGN_DISPOSITIONS: ReadonlySet<Section8Disposition> = new Set<Section8Disposition>([
  'invalid_json',
  'address_required',
  'geocode_unavailable',
]);

export interface Section8DispositionEvent {
  disposition: Section8Disposition;
  /** Present iff disposition ∈ ROW_WRITING_DISPOSITIONS (ruling §3.3). */
  decision_input_hash?: string;
}

export interface Section8RowRef {
  decision_input_hash: string;
}

export interface Section8FailureEvent {
  decision_input_hash: string;
}

/**
 * Inputs to the decomposition. The CALLER owns scoping:
 *   - windowRows / dispositionEvents / failureEvents are WINDOW-scoped.
 *   - recoveryRowHashes is the membership set for the N2 recovery check, which
 *     per ruling §2.4 spans the window OR ANY LATER window (a write-failure whose
 *     row arrived late is "recovered"). The monitor passes the full-table hash
 *     set; the one-shot test passes its run's row hashes (no later window).
 */
export interface Section8Input {
  windowRows: ReadonlyArray<Section8RowRef>;
  dispositionEvents: ReadonlyArray<Section8DispositionEvent>;
  failureEvents: ReadonlyArray<Section8FailureEvent>;
  recoveryRowHashes: ReadonlySet<string>;
}

export interface Section8Components {
  rows_written: number;
  write_failures_unrecovered: number;
  dispositions_with_no_row_by_design: number;
  /** May be NEGATIVE -- a negative residual is the substrate-bug signal
   *  (ruling §3.5); never clamped. */
  freeze_loss_suspected: number;
}

export type Section8Verdict = 'green' | 'yellow' | 'red';

/** Canonical four-component decomposition (ruling §3.2). Pure. */
export function computeSection8Components(input: Section8Input): Section8Components {
  const rows_written = input.windowRows.length;

  const write_failures_unrecovered = input.failureEvents.reduce(
    (n, f) => (input.recoveryRowHashes.has(f.decision_input_hash) ? n : n + 1),
    0,
  );

  const dispositions_with_no_row_by_design = input.dispositionEvents.reduce(
    (n, e) => (NO_ROW_BY_DESIGN_DISPOSITIONS.has(e.disposition) ? n + 1 : n),
    0,
  );

  const rowWritingDispositionCount = input.dispositionEvents.reduce(
    (n, e) => (ROW_WRITING_DISPOSITIONS.has(e.disposition) ? n + 1 : n),
    0,
  );

  const freeze_loss_suspected =
    rowWritingDispositionCount - rows_written - write_failures_unrecovered;

  return {
    rows_written,
    write_failures_unrecovered,
    dispositions_with_no_row_by_design,
    freeze_loss_suspected,
  };
}

/**
 * Threshold verdict (ruling §3.5). `priorVerdict` is the previous window's
 * verdict (null for the first-ever run and for the pre-go-live one-shot).
 * Most-severe-wins:
 *   - freeze_loss_suspected < 0          -> red (substrate bug)
 *   - write_failures_unrecovered >= 1    -> red
 *   - freeze_loss_suspected >= 2         -> red
 *   - freeze_loss_suspected == 1         -> yellow on first occurrence;
 *                                           red if prior window was yellow-or-red
 *   - freeze_loss_suspected == 0 & wfu 0 -> green
 */
export function computeSection8Verdict(
  c: Section8Components,
  priorVerdict: Section8Verdict | null,
): Section8Verdict {
  if (c.freeze_loss_suspected < 0) return 'red';
  if (c.write_failures_unrecovered >= 1) return 'red';
  if (c.freeze_loss_suspected >= 2) return 'red';
  if (c.freeze_loss_suspected === 1) {
    return priorVerdict === 'yellow' || priorVerdict === 'red' ? 'red' : 'yellow';
  }
  return 'green';
}
