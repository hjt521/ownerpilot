/** LA produce client-orchestration tests (§3) — injected fetch, no network. */
import { runLaProduceSequence, type LaProduceSequenceDeps } from './laProduceClient';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  ✓ ' + name); } else { failed++; console.log('  ✗ ' + name); }
}

function resp(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

/** fetch stub: first call (POST verify-la) → verify; second (GET la-packet) → packet. */
function seqFetch(verify: Response, packet?: Response): typeof fetch {
  let n = 0;
  return (async () => {
    n += 1;
    return n === 1 ? verify : (packet as Response);
  }) as unknown as typeof fetch;
}

const base: Omit<LaProduceSequenceDeps, 'fetchImpl'> = {
  verdict: 'confirmed_la',
  lahdCopyVersion: 'v1',
  baseName: 'notice_5537',
};

async function main() {
  // not_applicable
  {
    const r = await runLaProduceSequence({ ...base, verdict: 'not_la', fetchImpl: seqFetch(resp(200, {})) });
    check('non-LA verdict → not_applicable (no calls needed)', r.kind === 'not_applicable');
  }
  // ready
  {
    const att = [{ filename: 'notice_5537_rtc_notice_en.pdf', contentBase64: 'AAA' }, { filename: 'notice_5537_rtc_notice_es.pdf', contentBase64: 'BBB' }];
    const r = await runLaProduceSequence({ ...base, fetchImpl: seqFetch(resp(200, { ok: true }), resp(200, { ok: true, attachments: att, metadata: { rtcFormHashes: { english: 'd', spanish: 'e' } } })) });
    check('verify 200 + packet 200 → ready with 2 attachments', r.kind === 'ready' && r.kind === 'ready' && r.attachments.length === 2);
  }
  // blocked at verify (NOT_YET_AVAILABLE)
  {
    const r = await runLaProduceSequence({ ...base, fetchImpl: seqFetch(resp(409, { ok: false, code: 'JURISDICTION_LA_OVERLAY_NOT_YET_AVAILABLE' })) });
    check('verify 409 → blocked NOT_YET_AVAILABLE (no packet call)', r.kind === 'blocked' && (r as { code: string }).code === 'JURISDICTION_LA_OVERLAY_NOT_YET_AVAILABLE');
  }
  // blocked at packet (ATTACHMENT_FAILED)
  {
    const r = await runLaProduceSequence({ ...base, fetchImpl: seqFetch(resp(200, { ok: true }), resp(409, { ok: false, code: 'JURISDICTION_LA_OVERLAY_ATTACHMENT_FAILED' })) });
    check('verify 200 + packet 409 → blocked ATTACHMENT_FAILED', r.kind === 'blocked' && (r as { code: string }).code === 'JURISDICTION_LA_OVERLAY_ATTACHMENT_FAILED');
  }
  // current real state: flag false → verify 409 NOT_YET_AVAILABLE
  {
    const r = await runLaProduceSequence({ ...base, fetchImpl: seqFetch(resp(409, { code: 'JURISDICTION_LA_OVERLAY_NOT_YET_AVAILABLE' })) });
    check('flag-false production state → blocked NOT_YET_AVAILABLE', r.kind === 'blocked');
  }
  // network error → error (fail-safe)
  {
    const r = await runLaProduceSequence({ ...base, fetchImpl: (async () => { throw new Error('offline'); }) as unknown as typeof fetch });
    check('fetch throws → error (not producible)', r.kind === 'error');
  }
  // malformed packet body → error
  {
    const r = await runLaProduceSequence({ ...base, fetchImpl: seqFetch(resp(200, { ok: true }), resp(200, { ok: true })) });
    check('packet 200 missing attachments → error', r.kind === 'error');
  }

  console.log('\n----------------------------------------');
  console.log(`  ${passed} passed, ${failed} failed`);
  console.log('----------------------------------------');
  if (failed > 0) process.exit(1);
}
main();
