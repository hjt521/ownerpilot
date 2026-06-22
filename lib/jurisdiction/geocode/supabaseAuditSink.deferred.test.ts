/**
 * Slice 4c — DEFERRED Supabase audit sink tests.
 *
 * Proves the §2.2 / §2.8 deferred-scope contract for
 * createDeferredSupabaseRecordAudit:
 *   - row assembly (incl. decision_input_hash + chain_head_sha) happens
 *     SYNCHRONOUSLY before recordAudit resolves;
 *   - ONLY the Supabase insert is deferred — nothing is inserted until the
 *     scheduled deferred fn actually runs;
 *   - a successful deferred insert writes the correct row to geocode_audit_log;
 *   - a failing deferred insert goes through swallow+log+alert+count (Slice 2
 *     §2.3 parity) and NEVER throws into the runtime;
 *   - the insert is carried by the injected `defer` (the surface's after()),
 *     not awaited inline in recordAudit.
 *
 * No live calls: Supabase client + alert sink + defer are all injected. `defer`
 * is a manual collector so the test controls exactly when the deferred work runs
 * (modeling after()'s post-response execution).
 */
import {
  createDeferredSupabaseRecordAudit,
  toGeocodeAuditRow,
  geocodeAuditWriteFailureCount,
  type AuditAlertSink,
  type GeocodeAuditAlert,
  type SupabaseAuditClient,
  type Defer,
} from './supabaseAuditSink';
import type { GeocodeAuditRecord } from './resolveLaAddressV2';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  \u2713 ' + name); } else { failed++; console.log('  \u2717 ' + name); }
}

const rec = (over: Partial<GeocodeAuditRecord> = {}): GeocodeAuditRecord => ({
  inputAddress: '11460 S Normandie Ave',
  locality: 'Los Angeles', administrativeAreaLevel1: 'California',
  hasInferredComponents: false, hasReplacedComponents: false, possibleNextAction: null,
  disposition: 'manual_review', reviewReason: 'no_locality', branch: 'no_locality',
  ...over,
});

class CapturingAlertSink implements AuditAlertSink {
  emitted: GeocodeAuditAlert[] = [];
  async emit(a: GeocodeAuditAlert): Promise<void> { this.emitted.push(a); }
}

/** Manual defer collector: stores scheduled fns; run() executes them (models
 *  after() firing AFTER the response). */
class DeferCollector {
  scheduled: Array<() => Promise<void>> = [];
  defer: Defer = (fn) => { this.scheduled.push(fn); };
  async run(): Promise<void> {
    const fns = this.scheduled;
    this.scheduled = [];
    for (const fn of fns) await fn();
  }
}

/** Supabase stub that records inserted rows and can be told to fail. */
class StubClient implements SupabaseAuditClient {
  inserted: unknown[] = [];
  failWith: string | null = null;
  getClientCalls = 0;
  from(table: string) {
    const self = this;
    return {
      insert(row: unknown): PromiseLike<{ error: { message: string } | null }> {
        if (table !== 'geocode_audit_log') {
          return Promise.resolve({ error: { message: `wrong table ${table}` } });
        }
        if (self.failWith) return Promise.resolve({ error: { message: self.failWith } });
        self.inserted.push(row);
        return Promise.resolve({ error: null });
      },
    };
  }
}

async function main() {
  const FIXED_SHA = 'deadbeefcafe';

  // 1. Assembly is synchronous; insert is deferred (nothing inserted until run()).
  {
    const client = new StubClient();
    const defer = new DeferCollector();
    const record = createDeferredSupabaseRecordAudit(defer.defer, {
      getClient: async () => { client.getClientCalls++; return client; },
      chainHeadSha: () => FIXED_SHA,
    });
    await record(rec());
    check('recordAudit resolves with exactly one deferred fn scheduled', defer.scheduled.length === 1);
    check('no insert before deferred fn runs', client.inserted.length === 0);
    check('getClient not called before deferred fn runs', client.getClientCalls === 0);
    await defer.run();
    check('one insert after deferred fn runs', client.inserted.length === 1);
    check('getClient called once during deferred run', client.getClientCalls === 1);
  }

  // 2. Deferred insert writes the EXACT toGeocodeAuditRow shape (assembly used
  //    the synchronous sha at record() time).
  {
    const client = new StubClient();
    const defer = new DeferCollector();
    const r = rec({ disposition: 'confirmed_la', reviewReason: undefined, branch: 'county_confirm' });
    const expected = toGeocodeAuditRow(r, FIXED_SHA);
    const record = createDeferredSupabaseRecordAudit(defer.defer, {
      getClient: async () => client,
      chainHeadSha: () => FIXED_SHA,
    });
    await record(r);
    await defer.run();
    const got = client.inserted[0] as Record<string, unknown>;
    check('inserted row equals toGeocodeAuditRow(record, sha)', JSON.stringify(got) === JSON.stringify(expected));
    check('inserted row carries the synchronous decision_input_hash', got.decision_input_hash === expected.decision_input_hash);
    check('inserted disposition is confirmed_la', got.disposition === 'confirmed_la');
  }

  // 3. Deferred insert FAILURE → swallow + log + alert + count; never throws.
  {
    const before = geocodeAuditWriteFailureCount();
    const client = new StubClient();
    client.failWith = 'insert boom';
    const alerts = new CapturingAlertSink();
    const defer = new DeferCollector();
    const record = createDeferredSupabaseRecordAudit(defer.defer, {
      getClient: async () => client,
      chainHeadSha: () => FIXED_SHA,
      alerts,
    });
    await record(rec()); // must not throw at record() time
    let threw = false;
    try { await defer.run(); } catch { threw = true; } // deferred run must not throw
    check('deferred insert failure does not throw', threw === false);
    check('failure counter incremented by one', geocodeAuditWriteFailureCount() === before + 1);
    check('one geocode_audit alert emitted on failure', alerts.emitted.length === 1);
    check('alert source is geocode_audit', alerts.emitted[0]?.source === 'geocode_audit');
    check('alert channels are in_app + email', JSON.stringify(alerts.emitted[0]?.channels) === JSON.stringify(['in_app', 'email']));
    check('no row recorded on failed insert', client.inserted.length === 0);
  }

  // 4. Failure path WITHOUT an alert sink still counts + does not throw (parity
  //    with Slice 2: alerts optional, counting always).
  {
    const before = geocodeAuditWriteFailureCount();
    const client = new StubClient();
    client.failWith = 'insert boom 2';
    const defer = new DeferCollector();
    const record = createDeferredSupabaseRecordAudit(defer.defer, {
      getClient: async () => client,
      chainHeadSha: () => FIXED_SHA,
    });
    await record(rec());
    let threw = false;
    try { await defer.run(); } catch { threw = true; }
    check('no-alert failure does not throw', threw === false);
    check('no-alert failure still counts', geocodeAuditWriteFailureCount() === before + 1);
  }

  // 5. The deferred fn is the ONLY thing that touches the client — recordAudit
  //    itself performs no insert (deferred-scope discipline).
  {
    const client = new StubClient();
    const defer = new DeferCollector();
    const record = createDeferredSupabaseRecordAudit(defer.defer, {
      getClient: async () => client,
      chainHeadSha: () => FIXED_SHA,
    });
    await record(rec());
    await record(rec({ inputAddress: '456 Other St' }));
    check('two record() calls schedule two deferred fns', defer.scheduled.length === 2);
    check('still zero inserts before run', client.inserted.length === 0);
    await defer.run();
    check('two inserts after run', client.inserted.length === 2);
  }

  // 6. Gate-closed synthetic record (ratification §2.2) flows through the SAME
  //    deferred sink and writes a row with the distinct gate_closed marker.
  //    (The route builds this record; here we model it directly to prove the
  //    sink path handles it identically to a verdict row.)
  {
    const client = new StubClient();
    const defer = new DeferCollector();
    const gateClosedRecord: GeocodeAuditRecord = {
      inputAddress: '123 Closed Gate Ave',
      locality: null, administrativeAreaLevel1: null,
      hasInferredComponents: false, hasReplacedComponents: false, possibleNextAction: null,
      disposition: 'gate_closed', branch: 'gate_closed',
    };
    const record = createDeferredSupabaseRecordAudit(defer.defer, {
      getClient: async () => client,
      chainHeadSha: () => FIXED_SHA,
    });
    await record(gateClosedRecord);
    check('gate-closed row deferred, not written synchronously', client.inserted.length === 0);
    await defer.run();
    const got = client.inserted[0] as Record<string, unknown>;
    check('gate-closed row written via deferred sink', client.inserted.length === 1);
    check('gate-closed disposition persisted', got.disposition === 'gate_closed');
    check('gate-closed branch persisted', got.branch === 'gate_closed');
    check('gate-closed row retains input_address', got.input_address === '123 Closed Gate Ave');
    check('gate-closed row carries decision_input_hash', typeof got.decision_input_hash === 'string' && (got.decision_input_hash as string).length === 64);
    check('gate-closed disposition is NOT manual_review (no enqueue-trigger trip)', got.disposition !== 'manual_review');
  }

  // 7. §2.3 req 1: the failure-event payload field-set is privacy-compliant.
  //    Capture console.error and assert the exact keys — hash + attempted_at +
  //    error_class + chain_head_sha (+ event + failure_count), and crucially
  //    NO input_address and NO verdict (disposition/review_reason).
  {
    const origError = console.error;
    const captured: string[] = [];
    console.error = (msg?: unknown) => { captured.push(String(msg)); };
    try {
      const client = new StubClient();
      client.failWith = 'boom for payload';
      const defer = new DeferCollector();
      const record = createDeferredSupabaseRecordAudit(defer.defer, {
        getClient: async () => client,
        chainHeadSha: () => FIXED_SHA,
      });
      await record(rec({ inputAddress: '789 Secret Address Way' }));
      await defer.run();
    } finally {
      console.error = origError;
    }
    const evt = captured.map((c) => { try { return JSON.parse(c) as Record<string, unknown>; } catch { return null; } })
      .find((o) => o && o.event === 'geocode_audit_write_failure') as Record<string, unknown> | undefined;
    check('failure event was logged', evt !== undefined);
    check('event carries decision_input_hash', typeof evt?.decision_input_hash === 'string');
    check('event carries attempted_at', typeof evt?.attempted_at === 'string');
    check('event carries error_class', typeof evt?.error_class === 'string');
    check('event carries chain_head_sha', evt?.chain_head_sha === FIXED_SHA);
    check('event does NOT carry input_address', !('input_address' in (evt ?? {})));
    check('event does NOT carry raw address value', !captured.some((c) => c.includes('789 Secret Address Way')));
    check('event does NOT carry disposition (verdict)', !('disposition' in (evt ?? {})));
    check('event does NOT carry review_reason (verdict)', !('review_reason' in (evt ?? {})) && !('reviewReason' in (evt ?? {})));
  }
}

main().then(() => {
  console.log(`\n  ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}).catch((e) => { console.error(e); process.exit(1); });
