/** RTC packet loader tests — SHA-verify + fail-closed (erratum §4/§6). Fixture buffers. */
import { createHash } from 'node:crypto';
import { loadCurrentPacket, type RtcPacketBaseline } from './loadCurrentPacket';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  ✓ ' + name); } else { failed++; console.log('  ✗ ' + name); }
}

const EN = Buffer.from('FAKE-RTC-NOTICE-ENGLISH-PDF-BYTES');
const ES = Buffer.from('FAKE-RTC-NOTICE-SPANISH-PDF-BYTES');
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');

const baseline: RtcPacketBaseline = {
  rtcFormBaselineHashes: { english: sha(EN), spanish: sha(ES) },
  rtcFormLastModified: { english: '2026-06-16T21:03:44Z', spanish: '2026-06-16T21:03:55Z' },
  rtcFormLocalPath: { english: 'lib/rtc/packet/english/en.pdf', spanish: 'lib/rtc/packet/spanish/es.pdf' },
  rtcRefreshRunAt: null,
};

const reader = (files: Record<string, Buffer>) => (path: string) => {
  for (const [k, v] of Object.entries(files)) if (path.endsWith(k)) return v;
  throw new Error(`ENOENT ${path}`);
};

// happy path
{
  const r = loadCurrentPacket({ baseline, repoRoot: '/repo', readFile: reader({ 'en.pdf': EN, 'es.pdf': ES }) });
  check('matching SHAs → ok with both buffers', r.ok === true && (r.ok && r.english.equals(EN) && r.spanish.equals(ES)));
  check('metadata carries computed hashes + lastModified', r.ok === true && r.metadata.rtcFormHashes.english === sha(EN) && r.metadata.rtcFormLastModified.spanish === '2026-06-16T21:03:55Z');
}
// english tampered → sha_mismatch
{
  const r = loadCurrentPacket({ baseline, repoRoot: '/repo', readFile: reader({ 'en.pdf': Buffer.from('TAMPERED'), 'es.pdf': ES }) });
  check('english SHA mismatch → fail-closed sha_mismatch', !r.ok && (r as { reason: string }).reason === 'sha_mismatch');
}
// spanish tampered → sha_mismatch
{
  const r = loadCurrentPacket({ baseline, repoRoot: '/repo', readFile: reader({ 'en.pdf': EN, 'es.pdf': Buffer.from('TAMPERED') }) });
  check('spanish SHA mismatch → fail-closed sha_mismatch', !r.ok && (r as { reason: string }).reason === 'sha_mismatch');
}
// missing pdf → pdf_unreadable
{
  const r = loadCurrentPacket({ baseline, repoRoot: '/repo', readFile: reader({ 'en.pdf': EN }) }); // es.pdf missing
  check('missing PDF → fail-closed pdf_unreadable', !r.ok && (r as { reason: string }).reason === 'pdf_unreadable');
}
// baseline unreadable (no injected baseline, reader throws on baseline.json)
{
  const r = loadCurrentPacket({ repoRoot: '/repo', readFile: () => { throw new Error('no baseline'); } });
  check('baseline unreadable → fail-closed baseline_unreadable', !r.ok && (r as { reason: string }).reason === 'baseline_unreadable');
}

console.log('\n----------------------------------------');
console.log(`  ${passed} passed, ${failed} failed`);
console.log('----------------------------------------');
if (failed > 0) process.exit(1);
