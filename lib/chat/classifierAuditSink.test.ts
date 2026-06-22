/**
 * Slice 3a — classifier audit sink tests. No live calls (client + flag injected).
 * Covers the dormant-flag no-op (§4.2), the null-hash warning path (§4.3), and the
 * swallow+log+alert+count failure posture (§2.3 / Slice 2 parity).
 * Slice 3b adds the boot self-check cases (§2.4 req 4 / §4.4).
 */
import {
  createClassifierAuditSink,
  classifierAuditWriteFailureCount,
  classifierAuditHashKeyMissingCount,
  classifierAuditStartupCheck,
  type ClassifierAuditAlert,
  type ClassifierAuditAlertSink,
  type SupabaseAuditClient,
} from './classifierAuditSink';
import type { ClassifierAuditRecord } from './classifierAuditTypes';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  \u2713 ' + name); } else { failed++; console.log('  \u2717 ' + name); }
}

const rec = (over: Partial<ClassifierAuditRecord> = {}): ClassifierAuditRecord => ({
  model_id: 'claude-haiku-4.5', model_call_id: 'msg_123', verdict: 'ok',
  score_or_flags: { categories: [] }, decision_latency_ms: 42, chain_head_sha: 'b79148a',
  input_decision_hash: '7cb9be6f', key_generation: 'gen-2026-06',
  side: 'input', ok: true, unsure: false, reason: null, ...over,
});

class CapturingAlertSink implements ClassifierAuditAlertSink {
  emitted: ClassifierAuditAlert[] = [];
  async emit(a: ClassifierAuditAlert): Promise<void> { this.emitted.push(a); }
}

const okClient = (capture?: (row: unknown) => void): SupabaseAuditClient => ({
  from: () => ({ insert: async (row: unknown) => { capture?.(row); return { error: null }; } }),
});
const errClient = (msg: string): SupabaseAuditClient => ({
  from: () => ({ insert: async () => ({ error: { message: msg } }) }),
});

async function main() {
  // --- dormant flag off (default): no-op, nothing persisted ---
  let inserted: boolean = false;
  const alertsOff = new CapturingAlertSink();
  const sinkOff = createClassifierAuditSink({
    getClient: async () => okClient(() => { inserted = true; }),
    alerts: alertsOff, isLive: () => false,
  });
  await sinkOff(rec());
  check('flag off: no insert', !inserted);
  check('flag off: no alert', alertsOff.emitted.length === 0);

  // --- flag on: normal write ---
  let captured: unknown = null;
  const sinkOn = createClassifierAuditSink({
    getClient: async () => okClient((r) => { captured = r; }), isLive: () => true,
  });
  await sinkOn(rec());
  check('flag on: row inserted', (captured as Record<string, unknown>)?.model_id === 'claude-haiku-4.5');
  check('flag on: maps verdict + side', (captured as Record<string, unknown>)?.verdict === 'ok' && (captured as Record<string, unknown>)?.side === 'input');
  check('flag on: carries key_generation', (captured as Record<string, unknown>)?.key_generation === 'gen-2026-06');
  check('flag on: row has no input_text field', !('input_text' in (captured as Record<string, unknown>)));

  // --- null hash (key missing): row still written + distinct warning ---
  let nullRowWritten: boolean = false;
  const alerts2 = new CapturingAlertSink();
  const missBefore = classifierAuditHashKeyMissingCount();
  const sinkNull = createClassifierAuditSink({
    getClient: async () => okClient(() => { nullRowWritten = true; }),
    alerts: alerts2, isLive: () => true,
  });
  await sinkNull(rec({ input_decision_hash: null }));
  check('null hash: row still written (durability-first)', nullRowWritten);
  check('null hash: counter incremented', classifierAuditHashKeyMissingCount() === missBefore + 1);
  check('null hash: distinct alert class', alerts2.emitted.some((a) => a.alertClass === 'classifier_audit_hash_key_missing'));

  // --- write failure: swallow + alert + count, never throw ---
  const alerts3 = new CapturingAlertSink();
  const failBefore = classifierAuditWriteFailureCount();
  const sinkErr = createClassifierAuditSink({ getClient: async () => errClient('insert denied'), alerts: alerts3, isLive: () => true });
  let threw = false;
  try { await sinkErr(rec()); } catch { threw = true; }
  check('write failure: does NOT throw', threw === false);
  check('write failure: counter incremented', classifierAuditWriteFailureCount() === failBefore + 1);
  check('write failure: distinct alert class', alerts3.emitted.some((a) => a.alertClass === 'classifier_audit_write_failure'));
  check('write failure: alert source classifier_audit', alerts3.emitted[0]?.source === 'classifier_audit');

  // --- failure with no alert sink still resolves ---
  const sinkNoAlert = createClassifierAuditSink({ getClient: async () => errClient('x'), isLive: () => true });
  let threw2 = false;
  try { await sinkNoAlert(rec()); } catch { threw2 = true; }
  check('no alert sink: still does not throw', threw2 === false);

  // --- Slice 3b: boot self-check (§2.4 req 4 / §4.4) ---
  const savedLive = process.env.CLASSIFIER_AUDIT_LIVE;
  const savedKey = process.env.CLASSIFIER_AUDIT_HASH_KEY;
  const savedSha = process.env.VERCEL_GIT_COMMIT_SHA;

  // flag off → no-op regardless of missing env
  process.env.CLASSIFIER_AUDIT_LIVE = 'false';
  delete process.env.CLASSIFIER_AUDIT_HASH_KEY;
  delete process.env.VERCEL_GIT_COMMIT_SHA;
  const a1 = new CapturingAlertSink();
  classifierAuditStartupCheck({ alerts: a1 });
  check('startup: flag off → no alerts', a1.emitted.length === 0);

  // flag on + key missing → hash_key_missing alert
  process.env.CLASSIFIER_AUDIT_LIVE = 'true';
  process.env.VERCEL_GIT_COMMIT_SHA = 'sha123';
  const a2 = new CapturingAlertSink();
  classifierAuditStartupCheck({ alerts: a2 });
  check('startup: live + key missing → hash_key_missing alert', a2.emitted.some((a) => a.alertClass === 'classifier_audit_hash_key_missing'));
  check('startup: sha present → no sha alert', !a2.emitted.some((a) => a.alertClass === 'classifier_audit_chain_head_sha_missing'));

  // flag on + sha missing → chain_head_sha_missing alert
  process.env.CLASSIFIER_AUDIT_HASH_KEY = 'k';
  delete process.env.VERCEL_GIT_COMMIT_SHA;
  const a3 = new CapturingAlertSink();
  classifierAuditStartupCheck({ alerts: a3 });
  check('startup: live + sha missing → chain_head_sha_missing alert', a3.emitted.some((a) => a.alertClass === 'classifier_audit_chain_head_sha_missing'));
  check('startup: key present → no key alert', !a3.emitted.some((a) => a.alertClass === 'classifier_audit_hash_key_missing'));

  // flag on + all present → no alerts
  process.env.VERCEL_GIT_COMMIT_SHA = 'sha123';
  const a4 = new CapturingAlertSink();
  classifierAuditStartupCheck({ alerts: a4 });
  check('startup: live + all present → no alerts', a4.emitted.length === 0);

  if (savedLive === undefined) delete process.env.CLASSIFIER_AUDIT_LIVE; else process.env.CLASSIFIER_AUDIT_LIVE = savedLive;
  if (savedKey === undefined) delete process.env.CLASSIFIER_AUDIT_HASH_KEY; else process.env.CLASSIFIER_AUDIT_HASH_KEY = savedKey;
  if (savedSha === undefined) delete process.env.VERCEL_GIT_COMMIT_SHA; else process.env.VERCEL_GIT_COMMIT_SHA = savedSha;
}

main().then(() => {
  console.log(`\n  ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}).catch((e) => {
  console.error('  \u2717 unexpected error', e);
  process.exit(1);
});
