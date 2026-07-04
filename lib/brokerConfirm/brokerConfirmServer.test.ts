/**
 * Broker-confirm server-layer tests (Decision 2 §6 step 5).
 * Injected Supabase stub — no live DB. Covers eligibility gate, token mint/hash
 * round-trip, contact handling, poll mapping + on-read, cancel, and error paths.
 */
import {
  submitBrokerConfirm,
  pollBrokerConfirm,
  cancelBrokerConfirm,
  verifyProduceBrokerConfirm,
  type BrokerConfirmClient,
} from './brokerConfirmServer';
import { hashRequesterToken, slaDueAt } from './brokerConfirmCore';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  ✓ ' + name); } else { failed++; console.log('  ✗ ' + name); }
}

function stubClient(opts: {
  insertError?: string;
  rpcData?: unknown;
  rpcError?: string;
  captured?: { row?: Record<string, unknown>; rpc?: { fn: string; args: Record<string, unknown> } };
}): BrokerConfirmClient {
  return {
    from() {
      return {
        insert(row: unknown) {
          if (opts.captured) opts.captured.row = row as Record<string, unknown>;
          return Promise.resolve({ error: opts.insertError ? { message: opts.insertError } : null });
        },
      };
    },
    rpc(fn: string, args: Record<string, unknown>) {
      if (opts.captured) opts.captured.rpc = { fn, args };
      return Promise.resolve({ data: opts.rpcData ?? null, error: opts.rpcError ? { message: opts.rpcError } : null });
    },
  };
}

const NOW = '2026-06-28T12:00:00.000Z';

async function main() {
  console.log('\n=== submit ===');
  {
    const cap: { row?: Record<string, unknown> } = {};
    const r = await submitBrokerConfirm(stubClient({ captured: cap }), {
      address: '5537 La Mirada Ave, Unit 202, Los Angeles, CA 90038',
      decisionInputHash: 'hash123', priorDisposition: 'manual_review',
      priorReviewReason: 'parcel_lookup_inconclusive', priorBranch: 'zimas_miss',
      requesterContact: ' owner@example.com ',
    }, NOW);
    check('eligible submit → ok', r.ok === true);
    if (r.ok) {
      check('token is 64-hex', /^[0-9a-f]{64}$/.test(r.token));
      check('status pending', r.status === 'pending');
      check('slaDueAt = now + 24h', r.slaDueAt === slaDueAt(NOW));
      check('inserted row stores HASH of token (not raw)',
        cap.row?.requester_token_hash === hashRequesterToken(r.token) && cap.row?.requester_token_hash !== r.token);
      check('inserted status pending', cap.row?.status === 'pending');
      check('contact trimmed + stored', cap.row?.requester_contact === 'owner@example.com');
      check('prior fields carried', cap.row?.prior_review_reason === 'parcel_lookup_inconclusive' && cap.row?.prior_branch === 'zimas_miss');
      check('address_normalized stored (reconciliation key)', cap.row?.address_normalized === '5537 LA MIRADA AVENUE UNIT 202 LOS ANGELES CA 90038');
      check('no broker attestation on insert', cap.row?.broker_confirm_outcome === undefined || cap.row?.broker_confirm_outcome === null);
    }
  }
  {
    const cap: { row?: Record<string, unknown> } = {};
    const r = await submitBrokerConfirm(stubClient({ captured: cap }), {
      address: '1 Ocean Ave, Santa Monica, CA 90401', priorDisposition: 'not_la', priorReviewReason: null,
    }, NOW);
    check('ineligible (not_la) → rejected, no insert', r.ok === false && r.ok === false && (r as { code: string }).code === 'ineligible' && cap.row === undefined);
  }
  {
    const r = await submitBrokerConfirm(stubClient({}), { address: '   ', priorDisposition: 'manual_review', priorReviewReason: 'parcel_lookup_inconclusive' }, NOW);
    check('blank address → invalid', !r.ok && (r as { code: string }).code === 'invalid');
  }
  {
    const r = await submitBrokerConfirm(stubClient({ insertError: 'rls denied' }), { address: 'x', priorDisposition: 'manual_review', priorReviewReason: 'county_situs_gap' }, NOW);
    check('db insert error → db_error', !r.ok && (r as { code: string }).code === 'db_error');
  }
  {
    const cap: { row?: Record<string, unknown> } = {};
    await submitBrokerConfirm(stubClient({ captured: cap }), { address: 'x', priorDisposition: 'manual_review', priorReviewReason: 'county_ambiguous', requesterContact: '' }, NOW);
    check('empty contact stored as null', cap.row?.requester_contact === null);
  }

  console.log('\n=== poll ===');
  {
    const cap: { rpc?: { fn: string; args: Record<string, unknown> } } = {};
    const r = await pollBrokerConfirm(stubClient({ rpcData: [{ status: 'confirmed', sla_due_at: NOW, broker_confirm_outcome: 'confirmed_la', prior_review_reason: 'parcel_lookup_inconclusive' }], captured: cap }), 'rawtoken');
    check('poll calls broker_confirm_status with token hash', cap.rpc?.fn === 'broker_confirm_status' && cap.rpc?.args.p_token_hash === hashRequesterToken('rawtoken'));
    check('poll maps found row', r.ok && r.found === true && r.row.status === 'confirmed' && r.row.outcome === 'confirmed_la');
  }
  {
    const r = await pollBrokerConfirm(stubClient({ rpcData: [] }), 'rawtoken');
    check('poll empty → found false', r.ok && r.found === false);
  }
  {
    const r = await pollBrokerConfirm(stubClient({ rpcError: 'boom' }), 'rawtoken');
    check('poll rpc error → db_error', !r.ok && (r as { code: string }).code === 'db_error');
  }
  {
    const r = await pollBrokerConfirm(stubClient({}), '');
    check('poll blank token → invalid', !r.ok && (r as { code: string }).code === 'invalid');
  }

  console.log('\n=== cancel ===');
  {
    const r = await cancelBrokerConfirm(stubClient({ rpcData: true }), 'rawtoken');
    check('cancel true → cancelled true', r.ok && r.cancelled === true);
  }
  {
    const r = await cancelBrokerConfirm(stubClient({ rpcData: false }), 'rawtoken');
    check('cancel false (already terminal) → cancelled false', r.ok && r.cancelled === false);
  }
  {
    const r = await cancelBrokerConfirm(stubClient({ rpcError: 'boom' }), 'rawtoken');
    check('cancel rpc error → db_error', !r.ok && (r as { code: string }).code === 'db_error');
  }

  console.log('\n=== verify-produce (Guardrail 1) ===');
  const NOWP = '2026-06-28T12:00:00.000Z';
  const ADDR_RAW = '5537 La Mirada Ave, Unit 202, Los Angeles, CA 90038';
  const ADDR_NORM = '5537 LA MIRADA AVENUE UNIT 202 LOS ANGELES CA 90038';
  const confirmedRow = { status: 'confirmed', outcome: 'confirmed_la', resolved_at: '2026-06-25T12:00:00.000Z', address_normalized: ADDR_NORM };
  {
    const cap: { rpc?: { fn: string; args: Record<string, unknown> } } = {};
    const r = await verifyProduceBrokerConfirm(stubClient({ rpcData: [confirmedRow], captured: cap }), 'rawtoken', ADDR_RAW, NOWP);
    check('verify-produce calls broker_confirm_attestation with token hash',
      cap.rpc?.fn === 'broker_confirm_attestation' && cap.rpc?.args.p_token_hash === hashRequesterToken('rawtoken'));
    check('confirmed + match + fresh → ok', r.ok === true);
  }
  {
    const r = await verifyProduceBrokerConfirm(stubClient({ rpcData: [{ ...confirmedRow, address_normalized: '1200 WILSHIRE BOULEVARD LOS ANGELES CA 90017' }] }), 'rawtoken', ADDR_RAW, NOWP);
    check('token from a different address → address_mismatch', !r.ok && (r as { reason: string }).reason === 'address_mismatch');
  }
  {
    const r = await verifyProduceBrokerConfirm(stubClient({ rpcData: [{ ...confirmedRow, status: 'denied', outcome: 'denied_la' }] }), 'rawtoken', ADDR_RAW, NOWP);
    check('denied row → not_confirmed', !r.ok && (r as { reason: string }).reason === 'not_confirmed');
  }
  {
    const r = await verifyProduceBrokerConfirm(stubClient({ rpcData: [{ ...confirmedRow, resolved_at: '2026-05-20T12:00:00.000Z' }] }), 'rawtoken', ADDR_RAW, NOWP);
    check('39-day-old attestation → stale_attestation', !r.ok && (r as { reason: string }).reason === 'stale_attestation');
  }
  {
    const r = await verifyProduceBrokerConfirm(stubClient({ rpcData: [] }), 'rawtoken', ADDR_RAW, NOWP);
    check('no attestation row → not_found', !r.ok && (r as { reason: string }).reason === 'not_found');
  }
  {
    const r = await verifyProduceBrokerConfirm(stubClient({ rpcError: 'boom' }), 'rawtoken', ADDR_RAW, NOWP);
    check('rpc error → db_error', !r.ok && (r as { reason: string }).reason === 'db_error');
  }
  {
    const r = await verifyProduceBrokerConfirm(stubClient({}), '', ADDR_RAW, NOWP);
    check('missing token → invalid', !r.ok && (r as { reason: string }).reason === 'invalid');
  }

  console.log('\n----------------------------------------');
  console.log(`  ${passed} passed, ${failed} failed`);
  console.log('----------------------------------------');
  if (failed > 0) process.exit(1);
}
main();
