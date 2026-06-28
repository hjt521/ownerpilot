/**
 * Step (e) tests — the six §7 item-3 paths + gate enforcement + Q5 taxonomy.
 */
import { runRefresh, classifyOutcome, buildAlert, type LanguageFetcher } from './rtcRefreshJob';
import { pinStatus, serveTimePinMatches, sealVersionRecord, mayWriteVersionRecord } from './rtcPinAndVersion';
import { InMemoryRefreshStateStore, RecordingAlertSink } from './rtcRefreshStubs';
import { isLaProductionUnblocked, RTC_PUBLISHED_LANGUAGES, type RtcLanguage } from '../laRtcRules';
import { RTC_FORM_BASELINE_HASHES } from '../rtcFormBaselines';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  \u2713 ' + name); } else { failed++; console.log('  \u2717 ' + name); }
}
async function throwsAsync(fn: () => Promise<unknown>): Promise<boolean> {
  try { await fn(); return false; } catch { return true; }
}

// fetcher that returns baseline (match) for all, with optional overrides
function fetcher(overrides: Partial<Record<RtcLanguage, { sha256?: string; error?: string }>> = {}): LanguageFetcher {
  return async (language) => {
    const o = overrides[language];
    if (o) return { language, ...o };
    return { language, sha256: RTC_FORM_BASELINE_HASHES[language] };
  };
}
const openGate = () => true;

async function main() {
console.log('\n=== classifyOutcome (pure, strict SHA-256 W4 §2.3) ===');
check('exact baseline => match',
  classifyOutcome({ language: 'english', sha256: RTC_FORM_BASELINE_HASHES.english }).kind === 'match');
check('different hash => revision_detected',
  classifyOutcome({ language: 'english', sha256: 'deadbeef' }).kind === 'revision_detected');
check('error => fetch_error',
  classifyOutcome({ language: 'english', error: 'timeout' }).kind === 'fetch_error');

console.log('\n=== gate enforcement ===');
check('gate OPEN at HEAD (go-live; predicate-6 attestation 2026-06-27)', isLaProductionUnblocked() === true);
check('runRefresh THROWS while gate closed (explicit closed gate)',
  await throwsAsync(() => runRefresh({ fetcher: fetcher(), store: new InMemoryRefreshStateStore(), alerts: new RecordingAlertSink(), gateIsOpen: () => false })));

console.log('\n=== Q2: all-match run => no blocks, no alerts, deploy non-blocking ===');
{
  const store = new InMemoryRefreshStateStore();
  const alerts = new RecordingAlertSink();
  const res = await runRefresh({ fetcher: fetcher(), store, alerts, gateIsOpen: openGate });
  check('all 9 outcomes are match', res.outcomes.every((o) => o.kind === 'match'));
  check('no alerts on clean run', alerts.emitted.length === 0);
  check('english state unblocked', (await store.getLanguageState('english')).status === 'unblocked');
  check('run recorded', store.runs.length === 1);
}

console.log('\n=== Q1/Q2: one-language refresh FAILURE => block state + major alert ===');
{
  const store = new InMemoryRefreshStateStore();
  const alerts = new RecordingAlertSink();
  await runRefresh({ fetcher: fetcher({ spanish: { error: 'HTTP 503' } }), store, alerts, gateIsOpen: openGate });
  const st = await store.getLanguageState('spanish');
  check('spanish => refresh_failure state', st.status === 'refresh_failure');
  check('english still unblocked (per-language isolation)', (await store.getLanguageState('english')).status === 'unblocked');
  check('major refresh_failure alert emitted',
    alerts.emitted.some((a) => a.severity === 'major' && a.title.includes('spanish blocked')));
}

console.log('\n=== Q2: on-deploy hash MISMATCH => staged_revision + alert, non-blocking ===');
{
  const store = new InMemoryRefreshStateStore();
  const alerts = new RecordingAlertSink();
  const res = await runRefresh({ fetcher: fetcher({ korean: { sha256: 'aa'.repeat(32) } }), store, alerts, gateIsOpen: openGate });
  check('korean => staged_revision', (await store.getLanguageState('korean')).status === 'staged_revision');
  check('revision alert emitted', alerts.emitted.some((a) => a.title.includes('revision detected — korean')));
  check('run did NOT throw (non-blocking on deploy)', res.allFailed === false);
}

console.log('\n=== Q2 §2.3: ALL nine fail => [CRITICAL] alert, still returns ===');
{
  const allErr: Partial<Record<RtcLanguage, { error: string }>> = {};
  for (const l of RTC_PUBLISHED_LANGUAGES) allErr[l] = { error: 'network down' };
  const store = new InMemoryRefreshStateStore();
  const alerts = new RecordingAlertSink();
  const res = await runRefresh({ fetcher: fetcher(allErr), store, alerts, gateIsOpen: openGate });
  check('allFailed true', res.allFailed === true);
  check('[CRITICAL] all-languages alert emitted',
    alerts.emitted.some((a) => a.severity === 'critical' && a.title.includes('[CRITICAL]') && a.title.includes('all languages failed')));
}

console.log('\n=== Q3b: pin lifetime 30 days from acceptance date, one renewal ===');
{
  const accept = '2026-06-01';
  const pin = { language: 'spanish' as RtcLanguage, pinnedHash: 'x', acceptanceDate: accept };
  check('day 10 => active', pinStatus(pin, new Date('2026-06-11T00:00:00Z')).state === 'active');
  check('day 31 => expired', pinStatus(pin, new Date('2026-07-02T00:00:00Z')).state === 'expired');
  check('renewed: day 31 => active', pinStatus({ ...pin, renewedOnce: true }, new Date('2026-07-02T00:00:00Z')).state === 'active');
  check('renewed: day 61 => expired', pinStatus({ ...pin, renewedOnce: true }, new Date('2026-08-02T00:00:00Z')).state === 'expired');
}

console.log('\n=== Q3c: serve-time recheck, fail-closed ===');
{
  check('matching hash => true', serveTimePinMatches('abc123', 'abc123') === true);
  check('mismatch => false (caller fails closed)', serveTimePinMatches('abc123', 'def456') === false);
  const alert = buildAlert({ kind: 'pin_mismatch', language: 'spanish', noticeId: 'N-42' });
  check('pin_mismatch alert is critical', alert.severity === 'critical');
  check('pin_mismatch alert names the notice', alert.title.includes('N-42'));
}

console.log('\n=== Q4: version record seal + immutability ===');
{
  const rec = sealVersionRecord({
    isLaNotice: true, servedLanguages: ['spanish'],
    attachedHashes: { spanish: RTC_FORM_BASELINE_HASHES.spanish },
    lastModified: { spanish: '2026-06-16T21:03:55Z' },
    refreshRunAt: '2026-06-20T00:00:00Z', servedAt: '2026-06-20T12:00:00Z',
  });
  check('LA notice => record sealed', rec !== null && rec.rtcFormHashes.spanish === RTC_FORM_BASELINE_HASHES.spanish);
  check('record records service time (Q4 §4.4)', rec !== null && rec.servedAt === '2026-06-20T12:00:00Z');
  const nonLa = sealVersionRecord({ isLaNotice: false, servedLanguages: [], attachedHashes: {}, lastModified: {}, refreshRunAt: 'x', servedAt: 'y' });
  check('non-LA notice => null column (Q4a B)', nonLa === null);
  check('may write when column null', mayWriteVersionRecord(null) === true);
  check('may NOT overwrite existing record (Q4b immutable)', mayWriteVersionRecord(rec) === false);
}

console.log('\n----------------------------------------');
console.log(`  ${passed} passed, ${failed} failed`);
console.log('----------------------------------------');
if (failed > 0) process.exit(1);
}

main();
