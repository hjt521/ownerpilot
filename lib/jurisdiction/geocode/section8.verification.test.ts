/**
 * Slice 8 — verification suite (the pre-go-live one-shot; ruling §2.7-(1)).
 *
 * Posture (b), ratified 2026-06-22: per the Slice 2 / Slice 4 test posture, this
 * suite drives the REAL deferred audit sink (createDeferredSupabaseRecordAudit)
 * across every row-writing disposition class to produce real geocode_audit_log
 * rows with real decision_input_hashes, models the route's geocode_disposition
 * events exactly as app/api/notice/geocode/route.ts emits them (deliverable 1),
 * and reconciles the two through section8Core's four-component decomposition
 * (ruling §3.2). It asserts the pre-go-live pass criterion (§2.5) AND the MUST
 * route-vs-sink hash-equality lockstep (deliverable-1 ruling §6 / §2) for
 * confirmed_la and gate_closed.
 *
 * It also demonstrates DETECTION (the point of a verification suite): a modeled
 * freeze-loss surfaces as freeze_loss_suspected; a real sink write-failure
 * surfaces as write_failures_unrecovered (distinct from freeze-loss); a
 * recovered write-failure nets to green. This proves the decomposition both
 * produces clean numbers on a clean set and isolates each anomaly class.
 *
 * No live calls: Supabase client + alert sink + defer are injected (the Slice 4c
 * deferred-sink test pattern). The resolver function is NOT invoked here (it
 * pulls live network adapters); the row-producing substrate under test is the
 * sink + the route's emission + the §8 decomposition — exactly what freeze-loss
 * afflicts.
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
  ROW_WRITING_DISPOSITIONS,
  type Section8Disposition,
  type Section8DispositionEvent,
  type Section8Input,
} from './section8Core';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  \u2713 ' + name); } else { failed++; console.log('  \u2717 ' + name); }
}

const FIXED_SHA = 'deadbeefcafe';

/** Supabase stub: records inserted rows; can be told to fail (deferred test pattern). */
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

/** Build a row-writing GeocodeAuditRecord for a disposition class (the shape the
 *  resolver/route produce). Distinct inputAddress → distinct decision_input_hash. */
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

/** Model the route's geocode_disposition event for an (address, disposition):
 *  hash present iff the disposition is row-writing, computed the SAME way the
 *  route computes it — computeDecisionInputHash(address, sha). Mirrors
 *  app/api/notice/geocode/route.ts; this is the route side of the lockstep. */
function routeEvent(address: string, disposition: Section8Disposition): Section8DispositionEvent {
  return ROW_WRITING_DISPOSITIONS.has(disposition)
    ? { disposition, decision_input_hash: computeDecisionInputHash(address, FIXED_SHA) }
    : { disposition };
}

/** Drive one record through the REAL deferred sink; return the inserted row (or
 *  null if the insert failed or the deferred fn was not run — i.e. freeze-loss). */
async function sinkRow(
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

function parseFailureEvent(captured: string[]): Record<string, unknown> | undefined {
  return captured
    .map((c) => { try { return JSON.parse(c) as Record<string, unknown>; } catch { return null; } })
    .find((o) => o && o.event === 'geocode_audit_write_failure') as Record<string, unknown> | undefined;
}

async function main() {
  // === SCENARIO 1: clean one-shot — one of every disposition class. ===========
  {
    const addrs = {
      confirmed_la: '100 Confirmed Ave',
      not_la: '200 Denied Blvd',
      manual_review: '300 Ambiguous St',
      gate_closed: '400 Gate Closed Way',
    };
    const rowConfirmed = await sinkRow(recordFor('confirmed_la', addrs.confirmed_la));
    const rowNotLa = await sinkRow(recordFor('not_la', addrs.not_la));
    const rowManual = await sinkRow(recordFor('manual_review', addrs.manual_review));
    const rowGateClosed = await sinkRow(recordFor('gate_closed', addrs.gate_closed));
    const windowRows = [rowConfirmed, rowNotLa, rowManual, rowGateClosed]
      .filter((r): r is Record<string, unknown> => r !== null)
      .map((r) => ({ decision_input_hash: r.decision_input_hash as string }));

    const dispositionEvents: Section8DispositionEvent[] = [
      routeEvent(addrs.confirmed_la, 'confirmed_la'),
      routeEvent(addrs.not_la, 'not_la'),
      routeEvent(addrs.manual_review, 'manual_review'),
      routeEvent(addrs.gate_closed, 'gate_closed'),
      routeEvent('', 'invalid_json'),
      routeEvent('', 'address_required'),
      routeEvent('500 Unavailable Rd', 'geocode_unavailable'),
    ];

    const input: Section8Input = {
      windowRows,
      dispositionEvents,
      failureEvents: [],
      recoveryRowHashes: new Set(windowRows.map((r) => r.decision_input_hash)),
    };
    const c = computeSection8Components(input);

    check('clean: all four row-writing rows landed', windowRows.length === 4);
    check('clean: rows_written 4', c.rows_written === 4);
    check('clean: write_failures_unrecovered 0', c.write_failures_unrecovered === 0);
    check('clean: dispositions_with_no_row_by_design 3', c.dispositions_with_no_row_by_design === 3);
    check('clean: freeze_loss_suspected 0', c.freeze_loss_suspected === 0);
    const oneShotPass =
      c.freeze_loss_suspected === 0 && c.write_failures_unrecovered === 0 && c.dispositions_with_no_row_by_design === 3;
    check('clean: PRE-GO-LIVE one-shot pass criterion satisfied', oneShotPass);
    check('clean: verdict green', computeSection8Verdict(c, null) === 'green');

    // MUST (deliverable-1 ruling §6): route-vs-sink hash equality for the two
    // row-writing dispositions that carry a hash on the event.
    const evConfirmed = routeEvent(addrs.confirmed_la, 'confirmed_la');
    const evGateClosed = routeEvent(addrs.gate_closed, 'gate_closed');
    check('LOCKSTEP confirmed_la: route event hash equals sink row hash',
      evConfirmed.decision_input_hash !== undefined &&
      rowConfirmed !== null &&
      evConfirmed.decision_input_hash === rowConfirmed.decision_input_hash);
    check('LOCKSTEP gate_closed: route event hash equals sink row hash',
      evGateClosed.decision_input_hash !== undefined &&
      rowGateClosed !== null &&
      evGateClosed.decision_input_hash === rowGateClosed.decision_input_hash);
    check('LOCKSTEP: the two hashes differ (distinct input addresses)',
      evConfirmed.decision_input_hash !== evGateClosed.decision_input_hash);
    check('LOCKSTEP: sink row hash is a 64-hex SHA-256, not a placeholder',
      typeof rowConfirmed?.decision_input_hash === 'string' &&
      /^[0-9a-f]{64}$/.test(rowConfirmed.decision_input_hash as string));
  }

  // === SCENARIO 2: freeze-loss DETECTION. =====================================
  // A confirmed_la disposition is emitted, but the deferred insert never runs
  // (instance frozen/torn down post-response) → no row, no failure event. The
  // residual is the only signal.
  {
    const addr = '600 Frozen Instance Ct';
    const rowOrNull = await sinkRow(recordFor('confirmed_la', addr), { run: false });
    check('freeze-loss: row absent (deferred insert never ran)', rowOrNull === null);
    const c = computeSection8Components({
      windowRows: [],
      dispositionEvents: [routeEvent(addr, 'confirmed_la')],
      failureEvents: [],
      recoveryRowHashes: new Set<string>(),
    });
    check('freeze-loss: freeze_loss_suspected 1', c.freeze_loss_suspected === 1);
    check('freeze-loss: write_failures_unrecovered 0 (no failure event)', c.write_failures_unrecovered === 0);
    check('freeze-loss: verdict yellow (first occurrence)', computeSection8Verdict(c, null) === 'yellow');
  }

  // === SCENARIO 3: write-failure DETECTION (distinct from freeze-loss). ========
  // The deferred insert RUNS but fails → no row, and the sink emits a REAL
  // geocode_audit_write_failure event (captured from console.error). §8 reads
  // that event from the log archive; here we parse the real emission and feed its
  // decision_input_hash. wfu drives red; the freeze residual stays 0.
  {
    const addr = '700 Write Failure Pl';
    const origError = console.error;
    const captured: string[] = [];
    console.error = (msg?: unknown) => { captured.push(String(msg)); };
    let row: Record<string, unknown> | null = null;
    try {
      row = await sinkRow(recordFor('confirmed_la', addr), { fail: true });
    } finally {
      console.error = origError;
    }
    const failEvt = parseFailureEvent(captured);

    check('write-failure: no row written', row === null);
    check('write-failure: real failure event emitted', failEvt !== undefined);
    check('write-failure: failure event carries decision_input_hash', typeof failEvt?.decision_input_hash === 'string');

    const failHash = failEvt?.decision_input_hash as string;
    const c = computeSection8Components({
      windowRows: [],
      dispositionEvents: [routeEvent(addr, 'confirmed_la')],
      failureEvents: [{ decision_input_hash: failHash }],
      recoveryRowHashes: new Set<string>(),
    });
    check('write-failure: write_failures_unrecovered 1', c.write_failures_unrecovered === 1);
    check('write-failure: freeze_loss_suspected 0 (failure accounts for the disposition)', c.freeze_loss_suspected === 0);
    check('write-failure: verdict red', computeSection8Verdict(c, null) === 'red');
    check('write-failure: failure hash equals the route event hash (joinable)',
      failHash === computeDecisionInputHash(addr, FIXED_SHA));
  }

  // === SCENARIO 4: RECOVERED write-failure → green. ===========================
  // A failure event was emitted on a first attempt, but the row exists (a later
  // attempt / backfill landed it). The decision_input_hash join reclassifies the
  // failure as recovered (ruling §2.4). wfu 0, freeze 0 → green.
  {
    const addr = '800 Recovered Later Dr';
    const rec = recordFor('confirmed_la', addr);
    const origError = console.error;
    const captured: string[] = [];
    console.error = (m?: unknown) => { captured.push(String(m)); };
    let row: Record<string, unknown> | null = null;
    try {
      await sinkRow(rec, { fail: true }); // first attempt fails → failure event
      row = await sinkRow(rec);           // later attempt succeeds → row lands
    } finally {
      console.error = origError;
    }
    const failEvt = parseFailureEvent(captured);
    const failHash = failEvt?.decision_input_hash as string;
    const rowHash = row?.decision_input_hash as string;
    check('recovered: failure event and row share the same decision_input_hash', failHash === rowHash);

    const c = computeSection8Components({
      windowRows: [{ decision_input_hash: rowHash }],
      dispositionEvents: [routeEvent(addr, 'confirmed_la')],
      failureEvents: [{ decision_input_hash: failHash }],
      recoveryRowHashes: new Set([rowHash]),
    });
    check('recovered: rows_written 1', c.rows_written === 1);
    check('recovered: write_failures_unrecovered 0 (row exists → recovered)', c.write_failures_unrecovered === 0);
    check('recovered: freeze_loss_suspected 0', c.freeze_loss_suspected === 0);
    check('recovered: verdict green', computeSection8Verdict(c, null) === 'green');
  }
}

main().then(() => {
  console.log(`\n  ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}).catch((e) => { console.error(e); process.exit(1); });
