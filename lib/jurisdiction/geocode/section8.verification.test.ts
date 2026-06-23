/**
 * Slice 8 — verification suite (the pre-go-live one-shot; ruling §2.7-(1)),
 * DELIVERABLE 4b (durable-vs-durable; G-b + F-a).
 *
 * Posture (b): this suite drives the REAL deferred audit sink
 * (createDeferredSupabaseRecordAudit) across the row-writing disposition classes
 * to produce real geocode_audit_log rows with real decision_input_hashes, and
 * MODELS the synchronous geocode_dispositions rows the way
 * app/api/notice/geocode/route.ts writes them under Fork G (G-b) —
 * computeDecisionInputHash(address, sha), the SAME hash the sink stamps on the
 * audit row. It reconciles the two through section8Core's 4b decomposition
 * (D / R_h / R_t -> two orphan quantities) and asserts:
 *   - the pre-go-live pass criterion (freeze_dispositions_orphaned == 0 AND
 *     freeze_audit_orphaned == 0) on a clean set;
 *   - the route-vs-sink hash-equality LOCKSTEP (deliverable-1 ruling §6): the
 *     modeled disposition-row hash equals the real sink audit-row hash;
 *   - DETECTION of each anomaly class the 4b model is responsible for.
 *
 * What changed from deliverable 4:
 *   - Fork D: only the four ROW-WRITING dispositions get a geocode_dispositions
 *     row; the three no-row-by-design dispositions are NOT captured -> they do
 *     not enter D, and N3 is retired (not asserted).
 *   - Fork G: Scenario 2 (teardown) STAYS yellow — the synchronous disposition
 *     row survives the teardown that loses the deferred audit row, so the loss
 *     surfaces as freeze_dispositions_orphaned == 1 (it would have been an
 *     invisible green under the rejected G-a).
 *   - Fork F-a: wfu is retired. An audit-write FAILURE (the deferred insert runs
 *     and errors) is no longer a distinct wfu/red signal; it surfaces as the SAME
 *     freeze_dispositions_orphaned the teardown does (audit row absent,
 *     disposition row present). The geocode_audit_write_failure console emission
 *     stays as an operator-side leading indicator only.
 *   - Fork G symmetric: a synchronous disposition-write FAILURE with the audit row
 *     present surfaces as freeze_audit_orphaned (the new quantity).
 *
 * No live calls: Supabase client + alert sink + defer are injected.
 */
import {
  createDeferredSupabaseRecordAudit,
  computeDecisionInputHash,
  type SupabaseAuditClient,
  type AuditAlertSink,
  type Defer,
} from './supabaseAuditSink';
import type { GeocodeAuditRecord } from './resolveLaAddressV2';
import {
  computeSection8Components,
  computeSection8Verdict,
  type Section8Counts,
} from './section8Core';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  \u2713 ' + name); } else { failed++; console.log('  \u2717 ' + name); }
}

const FIXED_SHA = 'deadbeefcafe';

/** Supabase stub: records inserted geocode_audit_log rows; can be told to fail. */
class StubClient implements SupabaseAuditClient {
  inserted: Array<Record<string, unknown>> = [];
  failWith: string | null = null;
  from(table: string) {
    const self = this;
    return {
      insert(row: unknown): PromiseLike<{ error: { message: string } | null }> {
        if (table !== 'geocode_audit_log') return Promise.resolve({ error: { message: `wrong table ${table}` } });
        if (self.failWith) return Promise.resolve({ error: { message: self.failWith } });
        self.inserted.push(row as Record<string, unknown>);
        return Promise.resolve({ error: null });
      },
    };
  }
}
/** Manual defer collector: models after() firing AFTER the response. */
class DeferCollector {
  scheduled: Array<() => Promise<void>> = [];
  defer: Defer = (fn) => { this.scheduled.push(fn); };
  async run(): Promise<void> { const fns = this.scheduled; this.scheduled = []; for (const fn of fns) await fn(); }
}

/** Build a row-writing GeocodeAuditRecord for a disposition class. Distinct
 *  inputAddress → distinct decision_input_hash. */
function recordFor(
  disposition: 'confirmed_la' | 'not_la' | 'manual_review' | 'gate_closed',
  addr: string,
): GeocodeAuditRecord {
  const base = {
    inputAddress: addr,
    locality: disposition === 'gate_closed' ? null : 'Los Angeles',
    administrativeAreaLevel1: disposition === 'gate_closed' ? null : 'California',
    hasInferredComponents: false,
    hasReplacedComponents: false,
    possibleNextAction: null,
  };
  switch (disposition) {
    case 'confirmed_la': return { ...base, disposition, branch: 'county_confirm' };
    case 'not_la': return { ...base, disposition, branch: 'county_deny' };
    case 'manual_review': return { ...base, disposition, reviewReason: 'county_ambiguous', branch: 'county_ambiguous' };
    case 'gate_closed': return { ...base, disposition, branch: 'gate_closed' };
    default: throw new Error('unreachable');
  }
}

/** Drive one record through the REAL deferred sink; return the inserted audit row
 *  (or null if the insert failed, or the deferred fn was not run — teardown). */
async function sinkAuditRow(
  record: GeocodeAuditRecord,
  opts: { fail?: boolean; alerts?: AuditAlertSink; run?: boolean } = {},
): Promise<Record<string, unknown> | null> {
  const client = new StubClient();
  if (opts.fail) client.failWith = 'insert boom';
  const defer = new DeferCollector();
  const recordAudit = createDeferredSupabaseRecordAudit(defer.defer, {
    getClient: async () => client,
    chainHeadSha: () => FIXED_SHA,
    alerts: opts.alerts,
  });
  await recordAudit(record);
  if (opts.run !== false) await defer.run();
  return client.inserted[0] ?? null;
}

/** The synchronous geocode_dispositions row hash route.ts would write for a
 *  decision (Fork G): computeDecisionInputHash(address, sha) — the SAME hash the
 *  sink stamps on the audit row (the route-vs-sink lockstep). */
function dispositionHash(addr: string): string {
  return computeDecisionInputHash(addr, FIXED_SHA);
}

function parseFailureEvent(captured: string[]): Record<string, unknown> | undefined {
  return captured
    .map((c) => { try { return JSON.parse(c) as Record<string, unknown>; } catch { return null; } })
    .find((o) => o && o.event === 'geocode_audit_write_failure') as Record<string, unknown> | undefined;
}

/** Reconcile modeled disposition rows (hashes) against real audit rows into the
 *  three counts, then run the 4b decomposition + verdict. */
function reconcile(dispositionHashes: string[], auditRows: Array<Record<string, unknown> | null>) {
  const dset = new Set(dispositionHashes);
  const auditHashes = auditRows
    .filter((r): r is Record<string, unknown> => r !== null)
    .map((r) => r.decision_input_hash as string);
  const counts: Section8Counts = {
    D: dispositionHashes.length,
    R_t: auditHashes.length,
    R_h: auditHashes.filter((h) => dset.has(h)).length,
  };
  const components = computeSection8Components(counts);
  const verdict = computeSection8Verdict(counts, components, null);
  return { counts, components, verdict };
}

async function main() {
  // === SCENARIO 1: clean one-shot — one of every row-writing class. ============
  {
    const addrs = {
      confirmed_la: '100 Confirmed Ave',
      not_la: '200 Denied Blvd',
      manual_review: '300 Ambiguous St',
      gate_closed: '400 Gate Closed Way',
    };
    const rowConfirmed = await sinkAuditRow(recordFor('confirmed_la', addrs.confirmed_la));
    const rowNotLa = await sinkAuditRow(recordFor('not_la', addrs.not_la));
    const rowManual = await sinkAuditRow(recordFor('manual_review', addrs.manual_review));
    const rowGateClosed = await sinkAuditRow(recordFor('gate_closed', addrs.gate_closed));
    const auditRows = [rowConfirmed, rowNotLa, rowManual, rowGateClosed];

    // Fork D: only the four row-writing dispositions get a disposition row. The
    // three no-row-by-design dispositions are intentionally NOT modeled here.
    const dispositionHashes = [
      dispositionHash(addrs.confirmed_la),
      dispositionHash(addrs.not_la),
      dispositionHash(addrs.manual_review),
      dispositionHash(addrs.gate_closed),
    ];

    const { counts, components, verdict } = reconcile(dispositionHashes, auditRows);

    check('clean: all four audit rows landed', auditRows.filter((r) => r !== null).length === 4);
    check('clean: D = 4', counts.D === 4);
    check('clean: R_t = 4', counts.R_t === 4);
    check('clean: R_h = 4 (all hash-matched)', counts.R_h === 4);
    check('clean: freeze_dispositions_orphaned 0', components.freeze_dispositions_orphaned === 0);
    check('clean: freeze_audit_orphaned 0', components.freeze_audit_orphaned === 0);
    const oneShotPass = components.freeze_dispositions_orphaned === 0 && components.freeze_audit_orphaned === 0;
    check('clean: PRE-GO-LIVE one-shot pass criterion satisfied', oneShotPass);
    check('clean: verdict green', verdict === 'green');

    // LOCKSTEP (deliverable-1 ruling §6): the modeled disposition-row hash equals
    // the real sink audit-row hash, for two row-writing classes.
    check('LOCKSTEP confirmed_la: disposition hash == sink audit row hash',
      rowConfirmed !== null && dispositionHash(addrs.confirmed_la) === rowConfirmed.decision_input_hash);
    check('LOCKSTEP gate_closed: disposition hash == sink audit row hash',
      rowGateClosed !== null && dispositionHash(addrs.gate_closed) === rowGateClosed.decision_input_hash);
    check('LOCKSTEP: the two hashes differ (distinct input addresses)',
      dispositionHash(addrs.confirmed_la) !== dispositionHash(addrs.gate_closed));
    check('LOCKSTEP: sink row hash is a 64-hex SHA-256, not a placeholder',
      typeof rowConfirmed?.decision_input_hash === 'string' &&
      /^[0-9a-f]{64}$/.test(rowConfirmed.decision_input_hash as string));
  }

  // === SCENARIO 2: teardown freeze-loss (Fork G — STAYS yellow). ===============
  // The synchronous disposition row landed; the deferred audit insert never ran
  // (instance torn down post-response). D=1, R_h=0, R_t=0 -> freeze_dispositions
  // _orphaned=1 -> yellow. Under the rejected G-a this would have been an invisible
  // green; G-b's teardown-independent disposition row is what makes it detectable.
  {
    const addr = '600 Frozen Instance Ct';
    const auditRow = await sinkAuditRow(recordFor('confirmed_la', addr), { run: false }); // audit deferred fn NOT run
    check('teardown: audit row absent (deferred insert never ran)', auditRow === null);
    const { components, verdict } = reconcile([dispositionHash(addr)], [auditRow]);
    check('teardown: freeze_dispositions_orphaned 1', components.freeze_dispositions_orphaned === 1);
    check('teardown: freeze_audit_orphaned 0', components.freeze_audit_orphaned === 0);
    check('teardown: verdict yellow (caught — Fork G)', verdict === 'yellow');
  }

  // === SCENARIO 3: audit-write FAILURE — F-a subsumption. ======================
  // The deferred insert RUNS but fails; the sink emits a real geocode_audit_write
  // _failure (operator-side leading indicator). Under Fork F-a there is no wfu: the
  // audit row is absent and the disposition row is present, so it surfaces as the
  // SAME freeze_dispositions_orphaned=1 the teardown does — NOT a distinct red.
  {
    const addr = '700 Write Failure Pl';
    const origError = console.error;
    const captured: string[] = [];
    console.error = (msg?: unknown) => { captured.push(String(msg)); };
    let auditRow: Record<string, unknown> | null = null;
    try {
      auditRow = await sinkAuditRow(recordFor('confirmed_la', addr), { fail: true });
    } finally {
      console.error = origError;
    }
    const failEvt = parseFailureEvent(captured);

    check('audit-failure: no audit row written', auditRow === null);
    check('audit-failure: real geocode_audit_write_failure emitted (operator indicator)', failEvt !== undefined);
    check('audit-failure: failure event carries decision_input_hash', typeof failEvt?.decision_input_hash === 'string');
    check('audit-failure: failure hash equals the disposition hash (joinable)',
      (failEvt?.decision_input_hash as string) === dispositionHash(addr));

    const { components, verdict } = reconcile([dispositionHash(addr)], [auditRow]);
    check('audit-failure (F-a): freeze_dispositions_orphaned 1 (no separate wfu)', components.freeze_dispositions_orphaned === 1);
    check('audit-failure (F-a): verdict yellow, same as teardown', verdict === 'yellow');
  }

  // === SCENARIO 4: synchronous disposition-write FAILURE, audit present. ========
  // Fork G symmetric / the new freeze_audit_orphaned quantity. Four clean decisions
  // plus one where the audit row landed but the disposition row did NOT (the sync
  // write timed out / failed). D=4, R_h=4, R_t=5 -> freeze_audit_orphaned=1 -> yellow.
  {
    const clean = ['810 A St', '820 B St', '830 C St', '840 D St'];
    const orphanAddr = '850 Sync Failed St';
    const cleanRows = [];
    for (const a of clean) cleanRows.push(await sinkAuditRow(recordFor('confirmed_la', a)));
    const orphanAudit = await sinkAuditRow(recordFor('not_la', orphanAddr)); // audit landed
    const auditRows = [...cleanRows, orphanAudit];
    // disposition rows: the four clean ones only — the orphan decision's sync
    // disposition write FAILED, so no disposition row for it.
    const dispositionHashes = clean.map(dispositionHash);

    const { counts, components, verdict } = reconcile(dispositionHashes, auditRows);
    check('sync-fail: D 4', counts.D === 4);
    check('sync-fail: R_t 5 (orphan audit row present)', counts.R_t === 5);
    check('sync-fail: R_h 4 (orphan not hash-matched)', counts.R_h === 4);
    check('sync-fail: freeze_dispositions_orphaned 0', components.freeze_dispositions_orphaned === 0);
    check('sync-fail: freeze_audit_orphaned 1', components.freeze_audit_orphaned === 1);
    check('sync-fail: verdict yellow', verdict === 'yellow');
  }
}

main().then(() => {
  console.log(`\n  ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}).catch((e) => { console.error(e); process.exit(1); });
