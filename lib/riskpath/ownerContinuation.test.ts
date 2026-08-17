// lib/riskpath/ownerContinuation.test.ts
// Owner Continuation QR V1 focused/adversarial contract suite.

import { readFileSync } from 'node:fs';
import {
  OWNER_CONTINUATION_LOCATOR_BYTES,
  OWNER_CONTINUATION_PURPOSE,
  buildOwnerContinuationPublicUrl,
  canonicalOwnerPilotOrigin,
  evaluateOwnerContinuationAssociation,
  exactRiskPathDestination,
  generateOwnerContinuationLocator,
  hashOwnerContinuationLocator,
  isOwnerContinuationMagicBinding,
  isSensitiveOwnerContinuationTelemetryUrl,
  resolveOwnerContinuationTask,
  authorizeOwnerRiskPathRecord,
} from './ownerContinuation';
import { RISKPATH_STATUSES } from './transitions';

let passed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean) {
  if (cond) passed += 1;
  else { failures.push(name); console.error(`FAIL: ${name}`); }
}
function throws(name: string, fn: () => unknown) {
  let did = false;
  try { fn(); } catch { did = true; }
  check(name, did);
}
function src(path: string): string { return readFileSync(path, 'utf8'); }

const recordId = '11111111-1111-4111-8111-111111111111';
const userA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const userB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const raw1 = generateOwnerContinuationLocator();
const raw2 = generateOwnerContinuationLocator();
const assoc1 = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  locator_digest: hashOwnerContinuationLocator(raw1),
  riskpath_record_id: recordId,
  purpose: OWNER_CONTINUATION_PURPOSE,
  version: 'v1',
  revoked_at: null,
};
const assoc2 = { ...assoc1, id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', locator_digest: hashOwnerContinuationLocator(raw2) };

// Locator construction/storage semantics.
check('locator: 256-bit generation', Buffer.from(raw1, 'hex').byteLength === OWNER_CONTINUATION_LOCATOR_BYTES);
check('locator: hex encoded 64 chars', /^[0-9a-f]{64}$/.test(raw1));
check('locator: independent generations differ', raw1 !== raw2);
check('locator: digest-only input differs from raw locator', hashOwnerContinuationLocator(raw1) !== raw1);
check('locator: digest is SHA-256 hex', /^[0-9a-f]{64}$/.test(hashOwnerContinuationLocator(raw1)));
check('locator: first association admitted', evaluateOwnerContinuationAssociation(raw1, assoc1).ok);
check('locator: multiple active locators may bind same RiskPath', assoc1.riskpath_record_id === assoc2.riskpath_record_id && evaluateOwnerContinuationAssociation(raw2, assoc2).ok);
check('locator: old locator remains admissible after later issuance', evaluateOwnerContinuationAssociation(raw1, assoc1).ok);
check('locator: revoked denied', !evaluateOwnerContinuationAssociation(raw1, { ...assoc1, revoked_at: new Date().toISOString() }).ok);
check('locator: wrong purpose denied', !evaluateOwnerContinuationAssociation(raw1, { ...assoc1, purpose: 'packet_authenticity' }).ok);
check('locator: malformed denied', !evaluateOwnerContinuationAssociation('xyz', null).ok);
check('locator: random locator denied against different digest', !evaluateOwnerContinuationAssociation(raw2, assoc1).ok);
check('locator: nonexistent locator denied', !evaluateOwnerContinuationAssociation(raw1, null).ok);

// Authorization is current-user + exact-row, never possession.
check('authz: exact owner accepted', authorizeOwnerRiskPathRecord({ id: recordId, user_id: userA, soft_deleted_at: null }, userA).ok);
check('authz: wrong authenticated user denied', !authorizeOwnerRiskPathRecord({ id: recordId, user_id: userA, soft_deleted_at: null }, userB).ok);
check('authz: soft-deleted record denied', !authorizeOwnerRiskPathRecord({ id: recordId, user_id: userA, soft_deleted_at: '2026-08-16T00:00:00Z' }, userA).ok);
check('authz: possession without authenticated user denied', !authorizeOwnerRiskPathRecord({ id: recordId, user_id: userA, soft_deleted_at: null }, null).ok);

// Fixed destination and magic-link purpose binding.
check('destination: fixed exact-record path', exactRiskPathDestination(recordId) === `/riskpath/${recordId}`);
throws('destination: rejects arbitrary redirect string', () => exactRiskPathDestination('https://evil.example'));
check('magic: owner purpose requires association', isOwnerContinuationMagicBinding(OWNER_CONTINUATION_PURPOSE, assoc1.id));
check('magic: owner purpose missing association denied', !isOwnerContinuationMagicBinding(OWNER_CONTINUATION_PURPOSE, null));
check('magic: unrelated purpose not treated as owner continuation', !isOwnerContinuationMagicBinding('save_to_riskpath', assoc1.id));

// Public URL contains only configured origin + public scan route + fragment locator.
const publicUrl = buildOwnerContinuationPublicUrl(raw1, 'https://ownerpilot.ai');
check('public URL: approved fragment shape', publicUrl === `https://ownerpilot.ai/owner-continuation#${raw1}`);
check('public URL: no RiskPath UUID', !publicUrl.includes(recordId));
check('public URL: no owner/user/private matter semantics', !/tenant|rent|user_id|riskpath_records|property/i.test(publicUrl));

// Canonical production origin validation. Request Host is never an input.
check('origin: canonical Production https accepted', canonicalOwnerPilotOrigin({ appUrl: 'https://ownerpilot.ai', vercelEnv: 'production' }) === 'https://ownerpilot.ai');
throws('origin: localhost rejected in Production', () => canonicalOwnerPilotOrigin({ appUrl: 'https://localhost:3000', vercelEnv: 'production' }));
throws('origin: Preview branch rejected in Production', () => canonicalOwnerPilotOrigin({ appUrl: 'https://ownerpilot-git-x.vercel.app', vercelEnv: 'production' }));
throws('origin: http rejected in Production', () => canonicalOwnerPilotOrigin({ appUrl: 'http://ownerpilot.ai', vercelEnv: 'production' }));
throws('origin: URL path rejected', () => canonicalOwnerPilotOrigin({ appUrl: 'https://ownerpilot.ai/other', vercelEnv: 'production' }));

// Bounded task resolver precedence.
check('task: stale wins over notice_created', resolveOwnerContinuationTask({ currentState: 'notice_created', stale: true, lahdEligible: true, lahdFiled: false }).kind === 'existing_staleness_action');
const noticeTask = resolveOwnerContinuationTask({ currentState: 'notice_created', stale: false, lahdEligible: true, lahdFiled: false });
check('task: notice_created -> Record service', noticeTask.kind === 'record_service' && noticeTask.label === 'Record service');
check('task: notice_created guidance exact', noticeTask.kind === 'record_service' && noticeTask.guidance === 'Record an actual service attempt only after it happens.');
check('task: LAHD follows notice_created precedence', resolveOwnerContinuationTask({ currentState: 'tenant_responded', stale: false, lahdEligible: true, lahdFiled: false }).kind === 'existing_lahd_action');
check('task: fallback is Review this record', resolveOwnerContinuationTask({ currentState: 'notice_closed', stale: false, lahdEligible: false, lahdFiled: false }).label === 'Review this record');
check('status catalog: locked 15 unchanged', RISKPATH_STATUSES.length === 15 && !(RISKPATH_STATUSES as readonly string[]).includes('notice_created'));
check('task resolver: no transition graph inference', !src('lib/riskpath/ownerContinuation.ts').includes('ALLOWED_TRANSITIONS'));

// Sensitive telemetry classifier.
check('telemetry: public scan sensitive', isSensitiveOwnerContinuationTelemetryUrl('https://ownerpilot.ai/owner-continuation'));
check('telemetry: public scan query sensitive', isSensitiveOwnerContinuationTelemetryUrl('/owner-continuation?auth=invalid'));
check('telemetry: exact RiskPath sensitive', isSensitiveOwnerContinuationTelemetryUrl(`/riskpath/${recordId}`));
check('telemetry: generic RiskPath dashboard allowed', !isSensitiveOwnerContinuationTelemetryUrl('/riskpath'));
check('telemetry: ordinary notice route allowed', !isSensitiveOwnerContinuationTelemetryUrl('/notice/3-day'));

// Static route/security pins across the authorized implementation seams.
const migration = src('supabase/migrations/056_owner_continuations.sql');
check('migration: locator digest unique', /locator_digest\s+text not null unique/.test(migration));
check('migration: raw locator column absent', !/raw_locator|locator_raw/i.test(migration));
check('migration: no user authority claim column', !/^\s*user_id\s+/m.test(migration));
check('migration: no arbitrary URL/return column', !/return_to|callback_url|target_url/i.test(migration));
check('migration: RLS enabled', migration.includes('alter table public.owner_continuations enable row level security'));
check('migration: public grants revoked', migration.includes('revoke all on public.owner_continuations from anon, authenticated'));
check('migration: no one-active-per-record unique index', !/unique[^;]*riskpath_record_id/i.test(migration));
check('migration: purpose-bound magic association', migration.includes('magic_link_tokens_owner_continuation_binding_check'));

const authRoute = src('app/api/owner-continuation/auth/route.ts');
const issueRoute = src('app/api/owner-continuation/issue/route.ts');
const redeemRoute = src('app/api/magic-link/redeem/route.ts');
const exactPage = src('app/riskpath/[id]/page.tsx');
const scanPage = src('app/owner-continuation/page.tsx');
const scanClient = src('components/owner-continuation/OwnerContinuationScan.tsx');
const printClient = src('components/packet-print-options.tsx');
const layout = src('app/layout.tsx');
const gtm = src('components/GoogleTagManagerScript.tsx');

check('scan GET: auth API exposes POST only', authRoute.includes('export async function POST') && !authRoute.includes('export async function GET'));
check('issue: exact user filter present', issueRoute.includes(".eq('user_id', session.user_id)"));
check('issue: soft-delete filter present', issueRoute.includes(".is('soft_deleted_at', null)"));
check('issue: Host header cannot choose printed origin', !issueRoute.includes("headers.get('host')") && !issueRoute.includes("headers.get(\"host\")"));
check('auth return: continuation purpose explicit', redeemRoute.includes("tok.purpose === 'owner_record_continuation'"));
check('auth return: revoked association re-read', redeemRoute.includes(".is('revoked_at', null)"));
check('auth return: post-auth owner equality re-executed', redeemRoute.includes(".eq('user_id', owner.id)"));
check('auth return: same-browser session required', redeemRoute.includes('currentSession.id !== tok.chat_session_id'));
check('open redirect: no returnTo/callback parameters', !/returnTo|return_to|callbackUrl|callback_url/.test(authRoute + redeemRoute));
check('exact page: current user exact-row filter', exactPage.includes(".eq('user_id', session.user_id)"));
check('exact page: soft-deleted row filter', exactPage.includes(".is('soft_deleted_at', null)"));
check('exact page: dynamic no public cache', exactPage.includes("dynamic = 'force-dynamic'") && exactPage.includes('revalidate = 0'));
check('exact page: noindex + no-referrer', exactPage.includes('index: false') && exactPage.includes("referrer: 'no-referrer'"));

// Fragment capture/scrub is inline and precedes client admission; raw locator is ephemeral only.
check('fragment: synchronous bootstrap captures location.hash', scanPage.includes('window.location.hash'));
check('fragment: synchronous history scrub', scanPage.includes('history.replaceState'));
check('fragment: bootstrap script precedes client component', scanPage.indexOf('<script') < scanPage.indexOf('<OwnerContinuationScan'));
check('fragment: client deletes bootstrap global', scanClient.includes('delete window.__opOwnerContinuationLocator'));
check('fragment: no local/session storage', !/localStorage|sessionStorage/.test(scanPage + scanClient));
check('fragment: controlled admission is POST', scanClient.includes("fetch('/api/owner-continuation/auth'") && scanClient.includes("method: 'POST'"));
check('fragment: hard server navigation to exact record', scanClient.includes('window.location.assign'));
check('fragment: raw locator is released after admission', scanClient.includes('locatorRef.current = null'));
check('fragment: no app-visible locator logging', !/console\.(log|info|warn|error).*locator/i.test(scanPage + scanClient + authRoute));

// Same mounted print session deduplicates issuance and reuses the returned raw scan URL in browser memory only.
check('print: same-mount scan URL memory ref', printClient.includes('scanUrlRef = useRef<string | null>(null)'));
check('print: in-flight issuance promise deduplicated', printClient.includes('issuePromiseRef') && printClient.includes('if (!issuePromiseRef.current)'));
check('print: at most one issuance attempt after failure', printClient.includes('issuanceAttemptedRef') && printClient.includes('issuanceAttemptedRef.current = true'));
check('print: later QR render retry reuses scan URL', printClient.includes('if (!scanUrl)') && printClient.includes('ownerContinuationQrDataUrl(scanUrl'));
check('print: QR failure does not block base Notice', printClient.includes('Build the legal document first') && printClient.includes('html = baseHtml'));

// Vercel Web Analytics/Speed Insights and GTM sensitive fresh routes are narrowly suppressed.
check('analytics: exact-equivalent transport guard installed before children', layout.includes('SENSITIVE_TELEMETRY_GUARD') && layout.indexOf('SENSITIVE_TELEMETRY_GUARD') < layout.indexOf('{children}'));
check('analytics: public scan path filtered by guard', layout.includes("p === '/owner-continuation'"));
check('analytics: exact RiskPath path filtered by guard', layout.includes('/^\\\\/riskpath\\\\/[^/]+\\\\/?$/.test(p)'));
check('analytics: Vercel view/event ingestion path blocked', layout.includes("u.pathname.startsWith('/_vercel/insights/')"));
check('analytics: Vercel Speed Insights ingestion path blocked', layout.includes("u.pathname.startsWith('/_vercel/speed-insights/')") && layout.includes("vitals.vercel-analytics.com"));
check('analytics: fetch transport guarded', layout.includes('window.fetch = (input, init)'));
check('analytics: sendBeacon transport guarded', layout.includes('navigator.sendBeacon = (url, data)'));
check('analytics: components otherwise retain generic mounting', layout.includes('<Analytics />') && layout.includes('<SpeedInsights />'));
check('analytics: generic RiskPath remains outside sensitive classifier', !isSensitiveOwnerContinuationTelemetryUrl('/riskpath'));
check('GTM: usePathname fresh-route suppression', gtm.includes('usePathname') && gtm.includes('sensitiveFreshRoute(pathname)'));
check('GTM: public scan suppression present', gtm.includes("pathname === '/owner-continuation'"));
check('GTM: exact RiskPath suppression present', gtm.includes('/^\\/riskpath\\/[^/]+\\/?$/.test(pathname)'));

console.log(`ownerContinuation: ${passed} passed, ${failures.length} failed`);
if (failures.length) process.exit(1);
