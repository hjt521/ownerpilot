/**
 * Supabase-backed classifier audit sink (Slice 3a — capability; dormant by default).
 *
 * Writes one classifier_audit_log row per classifier decision with the §1.2 field
 * set from the classifier-lock-conflict ruling. NO input_text — only the HMAC
 * input_decision_hash (computed in classifierAuditHash.ts) ever lands. Governed by
 * broker ruling 2026-06-21:
 *
 *   - 4.2 dormant flag: CLASSIFIER_AUDIT_LIVE (default false) is checked HERE, in
 *     the sink. When off, the audit insert path is a no-op; the capture-path code
 *     that builds the record still runs upstream, but nothing is persisted.
 *   - 4.3 durability-first: a record arriving with input_decision_hash === null
 *     means the HMAC key was missing at compute time. The row is still written
 *     (only dedup is unavailable); a DISTINCT alert class
 *     classifier_audit_hash_key_missing fires + a distinct counter increments.
 *   - audit-write failure mirrors Slice 2 §2.3: try/catch, swallow + log + alert +
 *     count, never throw — a classifier-audit hiccup must not affect the request.
 */
import type { ClassifierAuditRecord } from './classifierAuditTypes';

// --- Alert taxonomy (mirrors the Slice 2 AuditAlertSink shape; source is
//     classifier-specific; alertClass distinguishes the two failure modes). ------
export type ClassifierAuditAlertSeverity = 'major' | 'critical';
export type ClassifierAuditAlertClass =
  | 'classifier_audit_write_failure'
  | 'classifier_audit_hash_key_missing';
export interface ClassifierAuditAlert {
  source: 'classifier_audit';
  alertClass: ClassifierAuditAlertClass;
  channels: ReadonlyArray<'in_app' | 'email'>;
  severity: ClassifierAuditAlertSeverity;
  title: string;
  body: string;
}
export interface ClassifierAuditAlertSink {
  emit(alert: ClassifierAuditAlert): Promise<void>;
}

// --- Minimal Supabase client shape (the @supabase/ssr client satisfies it). -----
export interface SupabaseInsertResult { error: { message: string } | null; }
export interface SupabaseAuditClient {
  from(table: string): { insert(row: unknown): PromiseLike<SupabaseInsertResult> };
}

/** Two distinct in-process counters (ruling §2.3 items 1–2: distinct dashboard
 *  lines). Reset per serverless instance; the dashboard is the durable trend. */
const counters = { classifierAuditWriteFailures: 0, classifierAuditHashKeyMissing: 0 };
export function classifierAuditWriteFailureCount(): number { return counters.classifierAuditWriteFailures; }
export function classifierAuditHashKeyMissingCount(): number { return counters.classifierAuditHashKeyMissing; }

/** The dormant-flag check (ruling §4.2). Default false. */
export function classifierAuditLive(): boolean {
  return process.env.CLASSIFIER_AUDIT_LIVE === 'true';
}

function toClassifierAuditRow(r: ClassifierAuditRecord) {
  return {
    model_id: r.model_id,
    model_call_id: r.model_call_id,
    verdict: r.verdict,
    score_or_flags: r.score_or_flags ?? null,
    decision_latency_ms: r.decision_latency_ms,
    chain_head_sha: r.chain_head_sha,
    input_decision_hash: r.input_decision_hash,
    key_generation: r.key_generation,
    side: r.side,
    ok: r.ok,
    unsure: r.unsure,
    reason: r.reason,
  };
}

/** Missing-key warning (ruling §4.3): distinct class + counter + structured log +
 *  alert. The row is still written; this only flags that dedup is unavailable for
 *  it. Never throws. */
function recordHashKeyMissing(record: ClassifierAuditRecord, alerts?: ClassifierAuditAlertSink): void {
  counters.classifierAuditHashKeyMissing += 1;
  try {
    // eslint-disable-next-line no-console
    console.error(JSON.stringify({
      event: 'classifier_audit_hash_key_missing',
      side: record.side,
      verdict: record.verdict,
      keyGeneration: record.key_generation,
      missingCount: counters.classifierAuditHashKeyMissing,
      ts: new Date().toISOString(),
    }));
  } catch { /* logging must never affect the request */ }
  if (alerts) {
    void alerts.emit({
      source: 'classifier_audit',
      alertClass: 'classifier_audit_hash_key_missing',
      channels: ['in_app', 'email'],
      severity: 'major',
      title: 'Classifier audit hash key missing',
      body:
        'CLASSIFIER_AUDIT_HASH_KEY was absent at write time; the classifier_audit_log ' +
        'row was written with input_decision_hash = null (dedup unavailable for this ' +
        'row). Set the key in the production secret store. See the rotation runbook.',
    }).catch(() => { /* alert emission must never affect the request */ });
  }
}

/** Swallowed write failure (mirrors Slice 2 §2.3): counter + distinct structured
 *  event + alert. The structured log carries no input text. Never throws. */
function recordClassifierAuditFailure(record: ClassifierAuditRecord, err: unknown, alerts?: ClassifierAuditAlertSink): void {
  counters.classifierAuditWriteFailures += 1;
  const errorClass = err instanceof Error ? err.name : 'unknown';
  try {
    // eslint-disable-next-line no-console
    console.error(JSON.stringify({
      event: 'classifier_audit_write_failure',
      side: record.side,
      verdict: record.verdict,
      errorClass,
      failureCount: counters.classifierAuditWriteFailures,
      ts: new Date().toISOString(),
    }));
  } catch { /* logging must never affect the request */ }
  if (alerts) {
    void alerts.emit({
      source: 'classifier_audit',
      alertClass: 'classifier_audit_write_failure',
      channels: ['in_app', 'email'],
      severity: 'major',
      title: 'Classifier audit-write failure',
      body:
        `A classifier_audit_log write failed (side ${record.side}, verdict ` +
        `${record.verdict}, error ${errorClass}). The request proceeded; the audit row ` +
        `is missing and must be reconciled per the runbook.`,
    }).catch(() => { /* alert emission must never affect the request */ });
  }
}

export interface ClassifierAuditSinkDeps {
  getClient?: () => Promise<SupabaseAuditClient>;
  alerts?: ClassifierAuditAlertSink;
  /** Override the dormant-flag check (tests). */
  isLive?: () => boolean;
}

/**
 * Build a classifier-audit recorder. When CLASSIFIER_AUDIT_LIVE is off (default),
 * it is a no-op (ruling §4.2). When on, it writes the row (return=minimal, no
 * RETURNING — INSERT-only RLS), warns on a null hash (§4.3), and swallows/logs/
 * alerts/counts any write failure (§2.3) without ever throwing.
 */
export function createClassifierAuditSink(
  deps: ClassifierAuditSinkDeps = {},
): (record: ClassifierAuditRecord) => Promise<void> {
  const getClient =
    deps.getClient ??
    (async () => {
      const { createClient } = await import('../supabase/server');
      return (await createClient()) as unknown as SupabaseAuditClient;
    });
  const live = deps.isLive ?? classifierAuditLive;

  return async function recordClassifierAudit(record: ClassifierAuditRecord): Promise<void> {
    if (!live()) return; // dormant (ruling §4.2): no persistence
    if (record.input_decision_hash === null) recordHashKeyMissing(record, deps.alerts);
    const row = toClassifierAuditRow(record);
    try {
      const supabase = await getClient();
      const { error } = await supabase.from('classifier_audit_log').insert(row);
      if (error) throw new Error(error.message);
    } catch (err) {
      recordClassifierAuditFailure(record, err, deps.alerts);
      // swallowed — the request must proceed (ruling §2.3 / Slice 2 parity)
    }
  };
}
