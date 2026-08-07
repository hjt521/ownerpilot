// PR 1 — controlled-launch attorney-boundary regression checks.
// Source-level checks keep this suite deterministic and prevent the retired referral edge from reappearing.

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok -', name); }
}

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const brokerPage = read('app/broker-review/[token]/page.tsx');
const counselPage = read('app/route-to-counsel/page.tsx');
const lockedProse = read('lib/compliance/lockedProse.ts');

const gitBlobSha = (content: string) =>
  createHash('sha1').update(`blob ${Buffer.byteLength(content)}\0`).update(content).digest('hex');

for (const status of ['not_la', 'inconclusive', 'expired']) {
  check(`${status} has no route-to-counsel transition`, !brokerPage.includes('/route-to-counsel'));
}

check('broker review no longer imports the counsel CTA', !brokerPage.includes('BROKER_REVIEW_COUNSEL_CTA'));
check('broker review keeps factual status copy', brokerPage.includes('brokerReviewStatusCopy(data.status)'));
check('confirmed_la continue behavior remains', brokerPage.includes("data.status === 'confirmed_la'") && brokerPage.includes('href="/chat"'));
check('pending cancellation behavior remains', brokerPage.includes("data.status === 'pending'") && brokerPage.includes('/api/notice/broker-confirm/cancel'));
check('direct counsel route invokes notFound()', counselPage.includes("from 'next/navigation'") && /\bnotFound\(\);/.test(counselPage));
check('direct counsel route renders no referral copy', !counselPage.includes('routeToCounselCopy') && !counselPage.includes('ROUTE_TO_COUNSEL_'));
check('no attorney assignment workflow introduced', !/attorney[^\n]{0,40}assign|assign[^\n]{0,40}attorney/i.test(brokerPage + counselPage));
check('no attorney request workflow introduced', !/attorney[^\n]{0,40}request|request[^\n]{0,40}attorney/i.test(brokerPage + counselPage));
check('no attorney referral workflow introduced', !/attorney[^\n]{0,40}referr|referr[^\n]{0,40}attorney/i.test(brokerPage + counselPage));
check('locked prose accessor is byte-identical to baseline', gitBlobSha(lockedProse) === 'ff2bed0ad6e0e1e245e4e776fecbaeabd3791699');

if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log('\ncontrolledLaunchAttorneyBoundary: all passed');
