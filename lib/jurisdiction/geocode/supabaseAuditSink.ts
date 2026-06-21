/**
 * Supabase-backed geocode audit sink (Slice 2).
 *
 * Replaces the no-op default `recordAudit` on resolveLaAddressV2 with a writer
 * that persists each decision to geocode_audit_log. Governed by broker ruling
 * 2026-06-20 (slice2_audit_sink_queue_population_broker_ruling_response_2026-06-20.md):
 *
 *   - 4.3 = swallow + log + alert, NEVER block the request. A failed audit write
 *     is logged as a DISTINCT structured event, increments a counter, and emits
 *     an alert through the shared channel — but the user's request proceeds. An
 *     audit hiccup must never become upstream of the decision.
 *   - 4.4 = decision_input_hash is PLAIN SHA-256 (NOT HMAC) over
 *     `lower(trim(input_address)) | chain_head_sha`. HMAC is classifier-specific
 *     (classifier-lock-conflict ruling §4): the geocode address is stored raw in
 *     the same row, so the hash protects nothing — it is dedup/integrity only.
 *     chain_head_sha source is VERCEL_GIT_COMMIT_SHA; fallback is the literal
 *     'unknown' (a self-identifying audit signal, ruling §2.4).
 *
 * The manual_review_queue row is NOT written here — it is derived in Postgres by
 * the 003_manual_review_enqueue trigger when disposition='manual_review'
 * (ruling 4.1/4.2). This sink writes geocode_audit_log only.
 */
import { createHash } from 'node:crypto';
import type { GeocodeAuditRecord } from './resolveLaAddressV2';

// --- Alert taxonomy (mirrors lib/jurisdiction/rtcRefresh AlertSink shape; the
//     shared channel is the email+in_app transport. source is geocode-specific
//     so the rtcRefresh ruling's locked types are not touched). -----------------
export type AuditAlertSeverity = 'major' | 'critical';
export interface GeocodeAuditAlert {
  source: 'geocode_audit';
  channels: ReadonlyArray<'in_app' | 'email'>;
  severity: AuditAlertSeverity;
  title: string;
  body: string;
}
export interface AuditAlertSink {
  emit(alert: GeocodeAuditAlert): Promise<void>;
}

// --- Minimal structural shape of the Supabase client this sink needs. The real
//     @supabase/ssr client satisfies this; tests inject a stub. -----------------
export interface SupabaseInsertResult {
  error: { message: string } | null;
}
export interface SupabaseAuditClient {
  from(table: string): { insert(row: unknown): PromiseLike<SupabaseInsertResult> };
}

/** In-process failure counter (resets per serverless instance, like classifier
 *  telemetry). The durable trend surface is the structured event + dashboard;
 *  this is a convenience read. */
const counters = { geocodeAuditWriteFailures: 0 };
/** Test/diagnostic read of the in-process failure counter. */
export function geocodeAuditWriteFailureCount(): number {
  return counters.geocodeAuditWriteFailures;
}

/** Resolve the build SHA folded into the decision hash; 'unknown' when the
 *  deploy did not expose VERCEL_GIT_COMMIT_SHA (ruling §2.4). */
export function resolveChainHeadSha(): string {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  return sha && sha.length > 0 ? sha : 'unknown';
}

/** PLAIN SHA-256 of `lower(trim(input_address)) | chain_head_sha` (ruling §2.4).
 *  Pure: same input + same sha => same hash; different sha => different hash. */
export function computeDecisionInputHash(inputAddress: string, chainHeadSha: string): string {
  const canonical = inputAddress.trim().toLowerCase();
  return createHash('sha256').update(`${canonical}|${chainHeadSha}`).digest('hex');
}

/** Map a GeocodeAuditRecord to the geocode_audit_log row shape (snake_case). */
export function toGeocodeAuditRow(rec: GeocodeAuditRecord, chainHeadSha: string) {
  return {
    input_address: rec.inputAddress,
    locality: rec.locality,
    administrative_area_level_1: rec.administrativeAreaLevel1,
    validation_granularity: rec.validationGranularity ?? null,
    formatted_address: rec.formattedAddress ?? null,
    latitude: rec.latitude ?? null,
    longitude: rec.longitude ?? null,
    has_inferred_components: rec.hasInferredComponents,
    has_replaced_components: rec.hasReplacedComponents,
    possible_next_action: rec.possibleNextAction,
    county: rec.county ?? null,
    county_query_returned_zero_features: rec.countyQueryReturnedZeroFeatures ?? null,
    county_zip_in_la_zip_set: rec.countyZipInLaZipSet ?? null,
    zimas: rec.zimas ?? null,
    disposition: rec.disposition,
    review_reason: rec.reviewReason ?? null,
    branch: rec.branch,
    decision_input_hash: computeDecisionInputHash(rec.inputAddress, chainHeadSha),
  };
}

/** Record a swallowed audit-write failure: counter + distinct structured event +
 *  alert through the shared channel. NEVER throws (ruling §2.3). The structured
 *  log carries the decision_input_hash (not the raw address) so the failed
 *  decision is identifiable without leaking the address into the log stream. */
function recordAuditFailure(
  record: GeocodeAuditRecord,
  decisionInputHash: string,
  err: unknown,
  alerts?: AuditAlertSink,
): void {
  counters.geocodeAuditWriteFailures += 1;
  const errorClass = err instanceof Error ? err.name : 'unknown';
  try {
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        event: 'geocode_audit_write_failure',
        decisionInputHash,
        disposition: record.disposition,
        reviewReason: record.reviewReason ?? null,
        errorClass,
        failureCount: counters.geocodeAuditWriteFailures,
        ts: new Date().toISOString(),
      }),
    );
  } catch {
    /* logging must never affect the request */
  }
  if (alerts) {
    void alerts
      .emit({
        source: 'geocode_audit',
        channels: ['in_app', 'email'],
        severity: 'major',
        title: 'Geocode audit-write failure',
        body:
          `A geocode_audit_log write failed (decision ${decisionInputHash.slice(0, 12)}…, ` +
          `disposition ${record.disposition}, error ${errorClass}). The user request ` +
          `proceeded; the audit row is missing and must be reconciled per the runbook ` +
          `(docs/runbooks/geocode_audit_write_failure.md).`,
      })
      .catch(() => {
        /* alert emission must never affect the request */
      });
  }
}

/** Dependencies for the sink. All injectable for tests; production uses defaults. */
export interface SupabaseAuditSinkDeps {
  /** Supabase client factory. Defaults to the @supabase/ssr server client. */
  getClient?: () => Promise<SupabaseAuditClient>;
  /** Alert channel. When omitted, failures are still counted + logged. */
  alerts?: AuditAlertSink;
  /** Override the chain-head SHA resolver (tests). */
  chainHeadSha?: () => string;
}

/**
 * Build a `recordAudit` compatible with resolveLaAddressV2's ResolverV2Deps.
 * Inserts into geocode_audit_log with `return=minimal` (plain .insert, no
 * .select()) so no SELECT privilege is needed under the INSERT-only RLS. On any
 * failure: counts, logs, alerts — and resolves without throwing (4.3=A).
 */
export function createSupabaseRecordAudit(
  deps: SupabaseAuditSinkDeps = {},
): (record: GeocodeAuditRecord) => Promise<void> {
  const getClient =
    deps.getClient ??
    (async () => {
      const { createClient } = await import('../../supabase/server');
      return (await createClient()) as unknown as SupabaseAuditClient;
    });
  const sha = deps.chainHeadSha ?? resolveChainHeadSha;

  return async function recordAudit(record: GeocodeAuditRecord): Promise<void> {
    const row = toGeocodeAuditRow(record, sha());
    try {
      const supabase = await getClient();
      const { error } = await supabase.from('geocode_audit_log').insert(row);
      if (error) throw new Error(error.message);
    } catch (err) {
      recordAuditFailure(record, row.decision_input_hash, err, deps.alerts);
      // swallowed — the user request must proceed (ruling 4.3=A)
    }
  };
}
