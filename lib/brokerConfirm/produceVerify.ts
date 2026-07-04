/**
 * Produce-time broker-confirm cross-check (Decision 2 produce-gate ruling §2, Guardrail 1).
 *
 * The single most compliance-sensitive check in Decision 2: before the wizard
 * produces a notice on a BROKER-CONFIRMED property, the server verifies the
 * durable broker attestation row — NOT just the client cache. This pure core does
 * the verification given a fetched attestation row; the server wrapper supplies the
 * row (token-scoped RPC) and the endpoint maps the result to HTTP.
 *
 * Checks (ruling §2.1, fail-closed — any miss blocks produce):
 *   1. row exists (token resolved to an attestation)        → else not_found
 *   2. row.address_normalized === the produce address       → else address_mismatch
 *      (prevents one session's confirm unlocking another address)
 *   3. status 'confirmed' AND outcome 'confirmed_la'        → else not_confirmed
 *   4. resolved_at within the 30-day freshness window       → else stale_attestation
 */

/** Broker attestations are good for a transaction, not forever (ruling §2.4). */
export const ATTESTATION_FRESHNESS_MS = 30 * 24 * 60 * 60 * 1000;

export interface AttestationRow {
  status: string | null;
  outcome: string | null; // broker_confirm_outcome
  resolvedAt: string | null; // resolved_at (ISO)
  addressNormalized: string | null;
}

export type ProduceVerifyReason =
  | 'not_found'
  | 'address_mismatch'
  | 'not_confirmed'
  | 'stale_attestation';

export type ProduceVerifyResult = { ok: true } | { ok: false; reason: ProduceVerifyReason };

/**
 * Verify a fetched attestation row authorizes produce for `requestAddressNormalized`
 * as of `nowIso`. Pure + fail-closed.
 */
export function verifyBrokerConfirmForProduce(
  row: AttestationRow | null,
  requestAddressNormalized: string,
  nowIso: string,
): ProduceVerifyResult {
  if (!row) return { ok: false, reason: 'not_found' };
  if (!row.addressNormalized || row.addressNormalized !== requestAddressNormalized) {
    return { ok: false, reason: 'address_mismatch' };
  }
  if (row.status !== 'confirmed' || row.outcome !== 'confirmed_la' || !row.resolvedAt) {
    return { ok: false, reason: 'not_confirmed' };
  }
  if (new Date(nowIso).getTime() - new Date(row.resolvedAt).getTime() > ATTESTATION_FRESHNESS_MS) {
    return { ok: false, reason: 'stale_attestation' };
  }
  return { ok: true };
}
