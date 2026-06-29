/** LA produce server-logic tests (ruling §2 assertion + erratum §2 assembly). */
import { verifyLaProduce, assembleLaPacketAttachments, type VerifyLaProduceInput } from './laProduceServer';
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
const failPacket: LoadPacketResult = { ok: false, reason: 'pdf_unreadable', detail: 'missing' };

const base: VerifyLaProduceInput = {
  verdict: 'confirmed_la',
  productionUnblocked: true,
  phase2dWired: true,
  packet: okPacket,
  lahdCopyVersion: 'v1',
  currentLahdCopyVersion: 'v1',
};

// happy
{
  const r = verifyLaProduce(base);
  check('confirmed_la + wired + packet ok + lahd current → ok', r.ok === true);
  check('ok carries packet metadata for audit', r.ok === true && r.metadata?.rtcFormHashes.english === 'a');
}
// not wired → NOT_YET_AVAILABLE
check('not wired → NOT_YET_AVAILABLE',
  (() => { const r = verifyLaProduce({ ...base, phase2dWired: false }); return !r.ok && r.code === 'JURISDICTION_LA_OVERLAY_NOT_YET_AVAILABLE'; })());
// packet load failed → ATTACHMENT_FAILED
check('packet load failed → ATTACHMENT_FAILED',
  (() => { const r = verifyLaProduce({ ...base, packet: failPacket }); return !r.ok && r.code === 'JURISDICTION_LA_OVERLAY_ATTACHMENT_FAILED'; })());
// production gate closed → ATTACHMENT_FAILED
check('production gate closed → ATTACHMENT_FAILED',
  (() => { const r = verifyLaProduce({ ...base, productionUnblocked: false }); return !r.ok && r.code === 'JURISDICTION_LA_OVERLAY_ATTACHMENT_FAILED'; })());
// LAHD copy version drift → ATTACHMENT_FAILED
check('LAHD copy version stale → ATTACHMENT_FAILED',
  (() => { const r = verifyLaProduce({ ...base, lahdCopyVersion: 'v0' }); return !r.ok && r.code === 'JURISDICTION_LA_OVERLAY_ATTACHMENT_FAILED'; })());
// non-LA verdict → gate not applicable (ok)
check('not_la verdict → ok (LA gate not applicable)', verifyLaProduce({ ...base, verdict: 'not_la' }).ok === true);

// assembly
{
  const att = assembleLaPacketAttachments('notice_5537', okPacket);
  check('assembles 2 attachments', att.length === 2);
  check('EN suffix + content', att[0].filename === 'notice_5537_rtc_notice_en.pdf' && att[0].content.equals(Buffer.from('EN-PDF')));
  check('ES suffix + content', att[1].filename === 'notice_5537_rtc_notice_es.pdf' && att[1].content.equals(Buffer.from('ES-PDF')));
}

console.log('\n----------------------------------------');
console.log(`  ${passed} passed, ${failed} failed`);
console.log('----------------------------------------');
if (failed > 0) process.exit(1);
