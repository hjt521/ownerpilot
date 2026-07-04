/**
 * Broker-confirm server logic (Decision 2 §6 step 3).
 *
 * The Supabase-touching layer for the owner-facing flow: submit / poll / cancel.
 * Pure decisions live in brokerConfirmCore; this module wires them to an INJECTED
 * Supabase client (the anon server client in production; a stub in tests), so the
 * routes stay thin and this logic is unit-testable with no live DB.
 *
 * Access model (migration 023):
 *  - submit  → anon INSERT under the pinned-insert RLS (status forced pending).
 *  - poll    → SECURITY DEFINER rpc broker_confirm_status(token_hash) (safe subset).
 *  - cancel  → SECURITY DEFINER rpc broker_confirm_cancel(token_hash) (pending→cancelled).
 * The raw token is returned to the client ONCE on submit and never persisted
 * server-side (only its SHA-256 hash is stored).
 */
import {
  isEscalationEligible,
  generateRequesterToken,
  hashRequesterToken,
  slaDueAt,
  type BrokerConfirmStatus,
  type BrokerConfirmOutcome,
} from './brokerConfirmCore';
import { normalizeAddressForJurisdictionKey } from '../jurisdiction/addressNormalize';
import { verifyBrokerConfirmForProduce, type ProduceVerifyResult } from './produceVerify';

/** Minimal structural shape of the Supabase client this module needs. */
export interface BrokerConfirmClient {
  from(table: string): { insert(row: unknown): PromiseLike<{ error: { message: string } | null }> };
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

export interface SubmitInput {
  address: string;
  decisionInputHash?: string | null;
  priorDisposition: string;
  priorReviewReason: string | null;
  priorBranch?: string | null;
  /** Optional transactional email (Decision A §2.3.1). */
  requesterContact?: string | null;
}

export type SubmitResult =
  | { ok: true; token: string; status: 'pending'; slaDueAt: string }
  | { ok: false; code: 'invalid' | 'ineligible' | 'db_error'; message: string };

/** Owner submit: validate eligibility, mint+hash a token, insert a pending row. */
export async function submitBrokerConfirm(
  client: BrokerConfirmClient,
  input: SubmitInput,
  nowIso: string = new Date().toISOString(),
): Promise<SubmitResult> {
  if (!input.address || input.address.trim() === '') {
    return { ok: false, code: 'invalid', message: 'address is required' };
  }
  // Decision B — only eligible jurisdiction-inconclusive dispositions may escalate.
  if (!isEscalationEligible(input.priorDisposition, input.priorReviewReason ?? null)) {
    return { ok: false, code: 'ineligible', message: 'this result is not eligible for broker review' };
  }

  const token = generateRequesterToken();
  const due = slaDueAt(nowIso);
  const row = {
    requester_token_hash: hashRequesterToken(token),
    requester_contact: input.requesterContact && input.requesterContact.trim() !== '' ? input.requesterContact.trim() : null,
    address_input: input.address,
    decision_input_hash: input.decisionInputHash ?? null,
    prior_disposition: input.priorDisposition,
    prior_review_reason: input.priorReviewReason ?? null,
    prior_branch: input.priorBranch ?? null,
    // Reconciliation key (ruling §3): same normalizer used by the produce cross-check.
    address_normalized: normalizeAddressForJurisdictionKey(input.address),
    status: 'pending' as const,
    sla_due_at: due,
  };

  const { error } = await client.from('broker_confirm_requests').insert(row);
  if (error) return { ok: false, code: 'db_error', message: error.message };
  return { ok: true, token, status: 'pending', slaDueAt: due };
}

export interface PollRow {
  status: BrokerConfirmStatus;
  slaDueAt: string | null;
  outcome: BrokerConfirmOutcome | null;
  priorReviewReason: string | null;
}
export type PollResult =
  | { ok: true; found: true; row: PollRow }
  | { ok: true; found: false }
  | { ok: false; code: 'invalid' | 'db_error'; message: string };

/** Token-scoped poll via the SECURITY DEFINER rpc (on-read expiry handled in SQL). */
export async function pollBrokerConfirm(
  client: BrokerConfirmClient,
  token: string,
): Promise<PollResult> {
  if (!token || token.trim() === '') return { ok: false, code: 'invalid', message: 'token is required' };
  const { data, error } = await client.rpc('broker_confirm_status', {
    p_token_hash: hashRequesterToken(token),
  });
  if (error) return { ok: false, code: 'db_error', message: error.message };
  const rec = Array.isArray(data) ? data[0] : data;
  if (!rec) return { ok: true, found: false };
  const r = rec as Record<string, unknown>;
  return {
    ok: true,
    found: true,
    row: {
      status: r.status as BrokerConfirmStatus,
      slaDueAt: (r.sla_due_at as string) ?? null,
      outcome: (r.broker_confirm_outcome as BrokerConfirmOutcome) ?? null,
      priorReviewReason: (r.prior_review_reason as string) ?? null,
    },
  };
}

export type CancelResult =
  | { ok: true; cancelled: boolean }
  | { ok: false; code: 'invalid' | 'db_error'; message: string };

/** Token-scoped cancel (pending→cancelled) via SECURITY DEFINER rpc. Idempotent:
 *  cancelled=false when not found or already terminal. */
export async function cancelBrokerConfirm(
  client: BrokerConfirmClient,
  token: string,
): Promise<CancelResult> {
  if (!token || token.trim() === '') return { ok: false, code: 'invalid', message: 'token is required' };
  const { data, error } = await client.rpc('broker_confirm_cancel', {
    p_token_hash: hashRequesterToken(token),
  });
  if (error) return { ok: false, code: 'db_error', message: error.message };
  return { ok: true, cancelled: data === true };
}

export type VerifyProduceResult =
  | ProduceVerifyResult
  | { ok: false; reason: 'invalid' | 'db_error'; message: string };

/**
 * Produce cross-check (Guardrail 1, ruling §2.1). Fetches the durable attestation
 * row for the presented token (token-scoped RPC), then verifies it authorizes
 * produce for `addressRaw` — matched on the SAME normalizer used at submit. Used by
 * the produce endpoint only on the `source === 'broker_confirm'` branch. Fail-closed.
 */
export async function verifyProduceBrokerConfirm(
  client: BrokerConfirmClient,
  token: string,
  addressRaw: string,
  nowIso: string = new Date().toISOString(),
): Promise<VerifyProduceResult> {
  if (!token || token.trim() === '' || !addressRaw || addressRaw.trim() === '') {
    return { ok: false, reason: 'invalid', message: 'token and address are required' };
  }
  const { data, error } = await client.rpc('broker_confirm_attestation', {
    p_token_hash: hashRequesterToken(token),
  });
  if (error) return { ok: false, reason: 'db_error', message: error.message };
  const rec = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined;
  const row = rec
    ? {
        status: (rec.status as string) ?? null,
        outcome: (rec.outcome as string) ?? null,
        resolvedAt: (rec.resolved_at as string) ?? null,
        addressNormalized: (rec.address_normalized as string) ?? null,
      }
    : null;
  return verifyBrokerConfirmForProduce(row, normalizeAddressForJurisdictionKey(addressRaw), nowIso);
}
