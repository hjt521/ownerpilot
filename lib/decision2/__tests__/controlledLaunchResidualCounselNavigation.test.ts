// PR 2 — controlled-launch residual counsel-navigation regression checks.
// The legal/risk determination remains intact; only customer-executable navigation to the retired route is removed.

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok -', name); }
}

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const producer = read('app/api/notice/produce/from-chat/route.ts');
const review = read('components/chat/ReviewScreen.tsx');
const chatSurface = read('components/chat/ChatSurface.tsx');
const lockedProse = read('lib/compliance/lockedProse.ts');
const changedProduction = producer + '\n' + review + '\n' + chatSurface;

function executableSourcePaths(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(resolve(process.cwd(), dir))) {
    const relative = join(dir, name);
    const absolute = resolve(process.cwd(), relative);
    if (statSync(absolute).isDirectory()) executableSourcePaths(relative, acc);
    else if (/\.(?:ts|tsx)$/.test(name)) acc.push(relative);
  }
  return acc;
}

const retiredRouteRefs = [...executableSourcePaths('app'), ...executableSourcePaths('components')]
  .filter((path) => read(path).includes('/route-to-counsel'));

const gitBlobSha = (content: string) =>
  createHash('sha1').update(`blob ${Buffer.byteLength(content)}\0`).update(content).digest('hex');

check(
  'counsel_route still blocks production with the same refusal and 409',
  /gate\.reason === 'counsel_route'[\s\S]{0,260}error: 'routed_to_counsel'[\s\S]{0,120}refusal: gate\.refusal[\s\S]{0,120}status: 409/.test(producer),
);
check('blocked producer response contains no retired counsel href', !producer.includes('/route-to-counsel') && !/\bhref\s*:/.test(producer));
check('ReviewScreen cannot follow a server-provided counsel href', !review.includes('/route-to-counsel') && !review.includes('window.location.href = j.href') && !review.includes('typeof j.href'));
check('chat refusal surface has no retired counsel link', !chatSurface.includes('/route-to-counsel') && !chatSurface.includes('showsCounselHandoff'));
check('no executable app/component source references the retired route', retiredRouteRefs.length === 0);
check('no replacement attorney URL introduced', !/https?:\/\/[^\s'"`]*(?:attorney|lawyer|counsel)/i.test(changedProduction));
check('no attorney assignment workflow introduced', !/attorney[^\n]{0,40}assign|assign[^\n]{0,40}attorney/i.test(changedProduction));
check('no attorney request workflow introduced', !/attorney[^\n]{0,40}request|request[^\n]{0,40}attorney/i.test(changedProduction));
check('no attorney referral workflow introduced', !/attorney[^\n]{0,40}referr|referr[^\n]{0,40}attorney/i.test(changedProduction));
check('existing generic blocked ReviewScreen state remains', review.includes("error: 'This notice needs review before it can be produced.'"));
check('ordinary successful production envelope remains', producer.includes('ok: true') && producer.includes('riskpathId: rec.id') && producer.includes('payload,'));
check('stale state behavior remains wired', producer.includes("error: 'stale_notice'") && review.includes("phase: 'stale'"));
check('reconciliation behavior remains wired', producer.includes("error: 'ff3_reconciliation_flag'") && review.includes("phase: 'reconcile'") && review.includes('parseReconciliationOptions'));
check('held state behavior remains wired', producer.includes("error: 'ff3_awaiting_broker_review'") && review.includes("phase: 'held'"));
check('pause state behavior remains wired', producer.includes("error: 'ff3_notice_wrong_pause'") && review.includes("phase: 'pause'"));
check('jurisdiction / LA production planning remains wired', review.includes('planProduce(env') && review.includes('isLaProductionUnblocked') && review.includes('<LaProducePanel'));
check('FF3 broker resume mechanics remain wired', producer.includes('verifyResumeToken') && producer.includes('brokerAuthorizedResume') && review.includes("fetch('/api/chat/ff3/resume'"));
check('claimed-session prerequisite remains', producer.includes("if (!session.user_id) return NextResponse.json({ error: 'claim your session before producing' }, { status: 401 });"));
check('locked prose accessor is byte-identical to baseline', gitBlobSha(lockedProse) === 'ff2bed0ad6e0e1e245e4e776fecbaeabd3791699');

if (retiredRouteRefs.length > 0) console.error('retired route refs:', retiredRouteRefs.join(', '));
if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log('\ncontrolledLaunchResidualCounselNavigation: all passed');
