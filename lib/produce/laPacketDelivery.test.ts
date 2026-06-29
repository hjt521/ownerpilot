/** LA packet delivery tests (§3 — gated, base64, fail-closed). Fixture packet. */
import { deliverLaPacket, type DeliverLaPacketInput } from './laPacketDelivery';
import type { LoadPacketResult } from '../rtc/loadCurrentPacket';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  ✓ ' + name); } else { failed++; console.log('  ✗ ' + name); }
}

const okPacket: Extract<LoadPacketResult, { ok: true }> = {
  ok: true,
  english: Buffer.from('EN-PDF'),
  spanish: Buffer.from('ES-PDF'),
  metadata: { rtcFormHashes: { english: 'a', spanish: 'b' }, rtcFormLastModified: { english: 'x', spanish: 'y' }, rtcRefreshRunAt: null },
};

const base: DeliverLaPacketInput = {
  baseName: 'notice_5537',
  verdict: 'confirmed_la',
  productionUnblocked: true,
  phase2dWired: true,
  packet: okPacket,
  lahdCopyVersion: 'v1',
  currentLahdCopyVersion: 'v1',
};

// happy
{
  const r = deliverLaPacket(base);
  check('all-good → 200 with 2 attachments', r.status === 200 && r.body.ok === true && r.body.attachments.length === 2);
  check('attachments base64-encode the PDFs', r.status === 200 && r.body.attachments[0].contentBase64 === Buffer.from('EN-PDF').toString('base64'));
  check('200 carries metadata (audit)', r.status === 200 && r.body.metadata?.rtcFormHashes.spanish === 'b');
}
// fail-closed: not wired → 409 NOT_YET_AVAILABLE
check('not wired → 409 NOT_YET_AVAILABLE',
  (() => { const r = deliverLaPacket({ ...base, phase2dWired: false }); return r.status === 409 && r.body.ok === false && r.body.code === 'JURISDICTION_LA_OVERLAY_NOT_YET_AVAILABLE'; })());
// fail-closed: packet missing (current real state until PDFs land) → 409 ATTACHMENT_FAILED
check('packet load failed → 409 ATTACHMENT_FAILED',
  (() => { const r = deliverLaPacket({ ...base, packet: { ok: false, reason: 'pdf_unreadable', detail: 'missing' } }); return r.status === 409 && r.body.ok === false && r.body.code === 'JURISDICTION_LA_OVERLAY_ATTACHMENT_FAILED'; })());
// non-LA verdict → 200 with NO RTC attachments (statewide; LA overlay not applicable)
check('not_la → 200 with zero attachments',
  (() => { const r = deliverLaPacket({ ...base, verdict: 'not_la' }); return r.status === 200 && r.body.ok === true && r.body.attachments.length === 0; })());

console.log('\n----------------------------------------');
console.log(`  ${passed} passed, ${failed} failed`);
console.log('----------------------------------------');
if (failed > 0) process.exit(1);
