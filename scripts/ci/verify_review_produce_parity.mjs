#!/usr/bin/env node
/**
 * scripts/ci/verify_review_produce_parity.mjs
 *
 * PR-A3 §5.2 wizard-parity guard.
 *
 * The chat Review produce path (components/chat/ReviewScreen.tsx + lib/chat/reviewProduce.ts) MUST render the
 * notice through the SAME assembly + renderer the wizard uses, so a chat-produced notice can never drift from a
 * wizard-produced one for identical intake. This guard fails CI if the chat path stops reusing the shared
 * pieces or introduces a divergent renderer.
 *
 * Required (per pr_a3_produce_handoff_fork_ruling_2026-07-01.md — Fork A(iii) client verdict resolution +
 * Fork B(ii) client rail-caller):
 *   reviewProduce.ts   → imports toNoticeFlowData (assembly source), renderNotice type, runJurisdictionResolution.
 *   ReviewScreen.tsx   → imports renderNotice (@/lib/produce/renderNotice), buildNoticeDocumentHtml, LaProducePanel.
 * Forbidden (divergence): a local `function renderNotice` / `function toNoticeFlowData` re-implementation, or a
 *   local copy of the locked renderer prose (NOTICE_PROSE) in either file.
 *
 * Dependency-free (Node built-ins). Exit 0 = parity intact; 1 = drift.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.env.REVIEW_PARITY_REPO_ROOT ?? resolve(new URL('..', import.meta.url).pathname, '..'));
const REVIEW = resolve(ROOT, 'components/chat/ReviewScreen.tsx');
const ORCH = resolve(ROOT, 'lib/chat/reviewProduce.ts');

const failures = [];
function read(p) {
  if (!existsSync(p)) { failures.push(`missing file: ${p}`); return ''; }
  return readFileSync(p, 'utf8');
}
function requireContains(src, needle, label) {
  if (!src.includes(needle)) failures.push(`${label}: expected to find \`${needle}\``);
}
function forbid(src, re, label) {
  if (re.test(src)) failures.push(`${label}: forbidden divergent construct \`${re}\``);
}

const orch = read(ORCH);
requireContains(orch, "from './toNoticeFlowData'", 'reviewProduce.ts must reuse the shared toNoticeFlowData assembly');
requireContains(orch, 'toNoticeFlowData(', 'reviewProduce.ts must call toNoticeFlowData');
requireContains(orch, "runJurisdictionResolution", 'reviewProduce.ts must reuse the wizard resolver (Fork A(iii))');
requireContains(orch, "@/lib/flow/jurisdictionBridge", 'reviewProduce.ts must import the shared jurisdiction bridge');
forbid(orch, /function\s+toNoticeFlowData\b/, 'reviewProduce.ts must NOT re-implement toNoticeFlowData');
forbid(orch, /function\s+renderNotice\b/, 'reviewProduce.ts must NOT re-implement renderNotice');

const review = read(REVIEW);
requireContains(review, "from '@/lib/produce/renderNotice'", 'ReviewScreen.tsx must reuse the shared renderNotice');
requireContains(review, 'renderNotice({', 'ReviewScreen.tsx must call the shared renderNotice');
requireContains(review, "from '@/lib/produce/buildNoticeHtml'", 'ReviewScreen.tsx must reuse buildNoticeDocumentHtml');
requireContains(review, "from '@/components/la-produce-panel'", 'ReviewScreen.tsx must mount the shared LaProducePanel (Fork B(ii))');
requireContains(review, "from '@/lib/chat/reviewProduce'", 'ReviewScreen.tsx must use the reviewProduce orchestration');
forbid(review, /function\s+renderNotice\b/, 'ReviewScreen.tsx must NOT re-implement renderNotice');
forbid(review, /const\s+NOTICE_PROSE\b/, 'ReviewScreen.tsx must NOT inline a copy of the locked renderer prose');

if (failures.length === 0) {
  console.log('[verify-review-produce-parity] PASS — chat Review reuses the shared renderer + assembly + resolver; no divergence.');
  process.exit(0);
}
console.error('[verify-review-produce-parity] FAIL — wizard-parity drift:');
for (const f of failures) console.error(`  - ${f}`);
console.error('\nThe chat produce path must render through the same toNoticeFlowData + renderNotice + LaProducePanel\nthe wizard uses (pr_a3_produce_handoff_fork_ruling_2026-07-01.md, Fork A(iii)+B(ii)).');
process.exit(1);
