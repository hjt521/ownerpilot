/**
 * Slice 3b — classifier audit §1.2 record assembly. Pure, synchronous, runs BEFORE
 * the (possibly deferred) sink call (ruling §2.1: deferred scope is the write only;
 * canonicalization + HMAC + assembly stay synchronous in request context).
 *
 * Governed by broker ruling 2026-06-21:
 *   - §4.2 hash the BARE target (input-side = user message; output-side = assistant
 *     drafted text); side stays OUT of the hash (carried by the side column), so the
 *     same text hashes identically across sides and dedup joins on (hash, side).
 *   - §4.4 chain_head_sha = VERCEL_GIT_COMMIT_SHA ?? 'unknown' (a queryable sentinel,
 *     never empty/null), resolved once per record here.
 *   - §2.3 a row is emitted only when the classifier was INVOKED; classifierAuditFor
 *     returns null when it was not (regex-floor pre-emption / classifier off).
 */
import { CLASSIFIER_MODEL } from './classifierConfig';
import { computeClassifierInputDecisionHash } from './classifierAuditHash';
import { classifierDecision, isUnsure, type ClassifierResult, type ClassifierSide } from './classifier';
import type { ClassifierAuditRecord } from './classifierAuditTypes';

/** chain_head_sha source (ruling §4.4). 'unknown' is an intentional, queryable
 *  sentinel — never empty/null. Participates in the HMAC message, so 'unknown' rows
 *  (local/preview) are deliberately non-comparable with production hashes. */
export function getDeploySha(): string {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  return sha && sha.length > 0 ? sha : 'unknown';
}

export interface BuildClassifierAuditArgs {
  side: ClassifierSide;
  /** The BARE target that was classified (NOT buildClassifierInput's assembly). */
  target: string;
  result: ClassifierResult;
  failClosed: boolean;
}

/** Assemble the §1.2 audit record from a classifier result. The hash is over the bare
 *  target + chain_head_sha (ruling §4.2); a missing key yields input_decision_hash =
 *  null (the sink then emits the §4.3 warning). reason is the bounded error class
 *  (never a raw message) on error, null on success (ruling §2.3a). */
export function buildClassifierAuditRecord(args: BuildClassifierAuditArgs): ClassifierAuditRecord {
  const { side, target, result, failClosed } = args;
  const chainHeadSha = getDeploySha();
  const { hash, keyGeneration } = computeClassifierInputDecisionHash(target, chainHeadSha);
  const blocked = classifierDecision(result, failClosed);
  const scoreOrFlags = result.ok
    ? { flagged: result.flagged, categories: result.categories, unsure: result.categories.includes('unsure') }
    : { error_class: result.error };
  return {
    model_id: CLASSIFIER_MODEL,
    model_call_id: result.modelCallId,
    verdict: blocked ? 'block' : 'allow',
    score_or_flags: scoreOrFlags,
    decision_latency_ms: result.latencyMs,
    chain_head_sha: chainHeadSha,
    input_decision_hash: hash,
    key_generation: keyGeneration,
    side,
    ok: result.ok,
    unsure: isUnsure(result),
    reason: result.ok ? null : result.error,
  };
}

/**
 * Emission gate (ruling §2.3). A classifier_audit_log row is built ONLY when the
 * classifier was actually invoked. When it was not (regex floor pre-empted, or the
 * classifier is off), there is no row — returns null. This is the single predicate
 * the route uses for both sides, so the six §2.3 emission scenarios are unit-testable
 * here rather than only through the route.
 */
export function classifierAuditFor(
  invoked: boolean,
  args: BuildClassifierAuditArgs,
): ClassifierAuditRecord | null {
  return invoked ? buildClassifierAuditRecord(args) : null;
}
