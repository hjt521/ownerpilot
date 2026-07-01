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
const FROMCHAT = resolve(ROOT, 'app/api/notice/produce/from-chat/route.ts');
const STALENESS = resolve(ROOT, 'lib/chat/stalenessCheck.ts');

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
// Produce-audit parity (countersign ruling §2.5): the chat onAudit must persist to the produce-audit endpoint,
// never regress to a no-op — otherwise the chat path stops being compliance-equivalent to the wizard.
forbid(review, /onAudit=\{\s*\(\s*\)\s*=>\s*\{\s*\}\s*\}/, 'ReviewScreen.tsx onAudit must NOT be a no-op — persist the LA produce audit (ruling §2.5)');
requireContains(review, 'produce-audit', 'ReviewScreen.tsx onAudit must POST the audit to the produce-audit endpoint');

// PR-B staleness parity (ruling §3.1): the chat produce path must (i) call captureProductionSnapshot unchanged,
// (ii) write it onto produce_snapshot, (iii) the guard must READ produce_snapshot (durable 1A), never derive
// on the fly. And the staleness comparison must reuse the wizard's evaluateStaleness engine.
const fromchat = read(FROMCHAT);
requireContains(fromchat, 'captureProductionSnapshot(', 'from-chat must call the shared captureProductionSnapshot (§3.1)');
requireContains(fromchat, 'produce_snapshot:', 'from-chat must WRITE the snapshot onto produce_snapshot (Fork 1 → 1A durable persistence)');
requireContains(fromchat, "'produce_snapshot'", 'from-chat staleness gate must READ produce_snapshot from the prior row (not derive-on-the-fly)');
requireContains(fromchat, 'checkStaleness(', 'from-chat must use the shared staleness comparison');
forbid(fromchat, /function\s+captureProductionSnapshot\b/, 'from-chat must NOT re-implement captureProductionSnapshot');

const staleness = read(STALENESS);
requireContains(staleness, "from '@/lib/flow/escalation'", 'stalenessCheck must reuse the wizard evaluateStaleness engine');
requireContains(staleness, 'evaluateStaleness(', 'stalenessCheck must call the shared evaluateStaleness');
forbid(staleness, /function\s+evaluateStaleness\b/, 'stalenessCheck must NOT re-implement evaluateStaleness');

if (failures.length === 0) {
  console.log('[verify-review-produce-parity] PASS — chat Review reuses the shared renderer + assembly + resolver + staleness engine; no divergence.');
  process.exit(0);
}
console.error('[verify-review-produce-parity] FAIL — wizard-parity drift:');
for (const f of failures) console.error(`  - ${f}`);
console.error('\nThe chat produce path must render through the same toNoticeFlowData + renderNotice + LaProducePanel\nthe wizard uses (pr_a3_produce_handoff_fork_ruling_2026-07-01.md, Fork A(iii)+B(ii)).');
process.exit(1);
