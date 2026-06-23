/**
 * Slice 8 -- bounded-anomaly monitor core (pure decomposition + verdict).
 *
 * DELIVERABLE 4b REWRITE (durable-vs-durable). The monitor no longer reconciles
 * an ephemeral `vercel logs` disposition stream against the durable audit log; it
 * reconciles the durable geocode_dispositions table against the durable
 * geocode_audit_log table. The decomposition is therefore pure arithmetic over
 * three counts the caller reads via PostgREST -- no log parsing, no recovery set,
 * no in-module hash-join (the hash-join is the R_h SQL query, owned by the CLI).
 *
 * Ruling baseline (binding):
 *   - Retention-gap ruling (Fork 2/5) -- durable-vs-durable; substrate-divergence red.
 *   - Deliverable 4b IF-1 -- symmetric orphan detection: freeze_dispositions_orphaned
 *     = D - R_h, freeze_audit_orphaned = R_t - R_h; both band-safe under the dual write.
 *   - Fork D -- geocode_dispositions is row-writing ONLY; the monitor does NOT classify
 *     at read time (every disposition row is row-writing by construction). N3 retired.
 *   - Fork F-a -- wfu retired; the audit-write-loss case it caught now surfaces durably as
 *     freeze_dispositions_orphaned (no separate failure-event stream remains).
 *   - Fork G (G-b) -- the disposition row is a teardown-INDEPENDENT synchronous record, so
 *     "audit row lost" (teardown or partial) is detectable as freeze_dispositions_orphaned.
 *   - Fork E -- the two orphan quantities chain INDEPENDENTLY (the chains do not cross).
 *
 * Shared by the §8 artifacts (verification test, local-CLI monitor, runbook query
 * templates) so the decomposition lives in exactly ONE place. All side effects
 * (DB reads, the section8_runs write) live in the callers; this module is pure.
 *
 * Not legal advice; operator-facing substrate accounting.
 */

/** The seven disposition labels emitted by app/api/notice/geocode/route.ts as
 *  geocode_disposition events. The classification sets below remain the canonical
 *  reference for which dispositions write a row -- consumed by route.ts (Fork G:
 *  it writes a synchronous geocode_dispositions row ONLY at row-writing returns).
 *  The MONITOR does not classify at read time (Fork D): every row in
 *  geocode_dispositions is row-writing by construction. */
export type Section8Disposition =
  | 'invalid_json'
  | 'address_required'
  | 'geocode_unavailable'
  | 'confirmed_la'
  | 'not_la'
  | 'manual_review'
  | 'gate_closed';

/** Dispositions whose branch WRITES an audit row (success verdicts + the synthetic
 *  gate_closed self-assertion). route.ts writes the synchronous disposition row at
 *  exactly these returns (Fork G); the deferred geocode_audit_log insert also
 *  happens only for these. */
export const ROW_WRITING_DISPOSITIONS: ReadonlySet<Section8Disposition> = new Set<Section8Disposition>([
  'confirmed_la',
  'not_la',
  'manual_review',
  'gate_closed',
]);

/** Dispositions that by design produce NO row. route.ts neither calls recordAudit
 *  nor writes a geocode_dispositions row at these returns (Fork D §4). Retained as
 *  the canonical reference + drift discipline; the monitor never reads them. */
export const NO_ROW_BY_DESIGN_DISPOSITIONS: ReadonlySet<Section8Disposition> = new Set<Section8Disposition>([
  'invalid_json',
  'address_required',
  'geocode_unavailable',
]);

/**
 * The three durable counts the monitor reads for a window (CLI owns the SQL):
 *   - D   = geocode_dispositions rows in [start, end + 5m)
 *   - R_h = geocode_audit_log rows in [start, end + 5m) whose decision_input_hash
 *           is one of the in-window disposition hashes (the hash-join / N1 query)
 *   - R_t = geocode_audit_log rows in [start, end + 5m), raw (no hash filter)
 * The +5m band absorbs the insert-time midnight straddle; it cancels symmetrically
 * on both orphan quantities under the dual write (IF-1 §3.2), so it needs no
 * special handling here.
 */
export interface Section8Counts {
  D: number;
  R_h: number;
  R_t: number;
}

export interface Section8Components {
  /** D - R_h: a disposition row with no matching audit row. Audit-write loss
   *  (teardown or partial). Stored in section8_runs.freeze_loss_suspected (name
   *  retained for migration compatibility; IF-1 §3.4). MAY be negative -- a
   *  negative residual is the substrate-bug signal; never clamped. */
  freeze_dispositions_orphaned: number;
  /** R_t - R_h: an audit row with no matching disposition row. Synchronous
   *  disposition-write failure / substrate divergence. Stored in
   *  section8_runs.freeze_audit_orphaned. MAY be negative (substrate bug). */
  freeze_audit_orphaned: number;
}

export type Section8Verdict = 'green' | 'yellow' | 'red';

/** Pure decomposition (IF-1 §3.3). Two subtractions; no classification, no
 *  recovery set, no wfu. */
export function computeSection8Components(counts: Section8Counts): Section8Components {
  return {
    freeze_dispositions_orphaned: counts.D - counts.R_h,
    freeze_audit_orphaned: counts.R_t - counts.R_h,
  };
}

/**
 * Threshold verdict (Fork G/F §5.1 + IF-1 §3.3, most-severe-wins):
 *   - D == 0 AND R_t > 0                     -> red (substrate divergence: audit rows,
 *                                               zero dispositions -- the sync write surface is broken)
 *   - either orphan < 0                       -> red (negative residual = substrate bug)
 *   - either orphan >= 2                       -> red
 *   - either orphan == 1                       -> yellow on first occurrence; red if the
 *                                               SAME quantity was == 1 on the prior
 *                                               non-degraded run (NF-2; Fork E: the two
 *                                               chains are independent and do not cross)
 *   - else                                     -> green   (incl. the quiet window D==0 AND R_t==0)
 *
 * `prior` is the previous NON-DEGRADED run's components (null for the first run
 * and for the pre-go-live one-shot). Only the per-quantity == 1 history matters,
 * so the chain reads the prior orphan integers, not a prior verdict string.
 */
export function computeSection8Verdict(
  counts: Section8Counts,
  c: Section8Components,
  prior: Section8Components | null,
): Section8Verdict {
  if (counts.D === 0 && counts.R_t > 0) return 'red';
  if (c.freeze_dispositions_orphaned < 0 || c.freeze_audit_orphaned < 0) return 'red';
  if (c.freeze_dispositions_orphaned >= 2 || c.freeze_audit_orphaned >= 2) return 'red';

  // NF-2 independent chains (Fork E): a quantity at 1 this run AND 1 on the prior
  // non-degraded run escalates to red. The disposition chain and the audit chain
  // are evaluated separately; a 1 on one side followed by a 1 on the other side is
  // two first-occurrence yellows, not a consecutive pair.
  const dispChainRed = c.freeze_dispositions_orphaned === 1 && prior?.freeze_dispositions_orphaned === 1;
  const auditChainRed = c.freeze_audit_orphaned === 1 && prior?.freeze_audit_orphaned === 1;
  if (dispChainRed || auditChainRed) return 'red';

  if (c.freeze_dispositions_orphaned === 1 || c.freeze_audit_orphaned === 1) return 'yellow';
  return 'green';
}
