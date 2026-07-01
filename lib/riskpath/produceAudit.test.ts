// lib/riskpath/produceAudit.test.ts — PR-A3 §5.2 produce-audit fast-follow.
// The audit blob the chat produce path persists must match the wizard's LaProduceAuditFields shape.

import { laProduceAuditSchema, produceAuditBodySchema } from './produceAudit';
import type { LaProduceAuditFields } from '@/lib/produce/laProduceClient';

let passed = 0, failed = 0;
const check = (n: string, c: boolean, d = '') => { c ? passed++ : (failed++, console.log(`  ✗ ${n}${d ? ` — ${d}` : ''}`)); if (c) console.log(`  ✓ ${n}`); };
const ok = (r: { success: boolean }) => r.success;

// A valid blob — exactly the LaProduceAuditFields shape LaProducePanel.onAudit emits (compile-time typed).
const valid: LaProduceAuditFields = {
  rtcFormHashes: { english: 'abc', spanish: 'def' },
  rtcFormLastModified: { english: '2026-06-25', spanish: '2026-06-25' },
  rtcRefreshRunAt: '2026-06-25T00:00:00Z',
  lahdFilingPromptCopyVersion: 'v1',
  lahdFilingPromptAcknowledgedAt: '2026-06-30T12:00:00Z',
  isLaProductionUnblockedAtProduce: true,
  cachedResolverVerdictSource: 'live_resolver',
};

check('valid LaProduceAuditFields blob parses (wizard-shape parity)', ok(laProduceAuditSchema.safeParse(valid)));
check('rtcFormHashes null allowed', ok(laProduceAuditSchema.safeParse({ ...valid, rtcFormHashes: null, rtcFormLastModified: null, rtcRefreshRunAt: null })));
check('missing lahdFilingPromptAcknowledgedAt rejected', !ok(laProduceAuditSchema.safeParse({ ...valid, lahdFilingPromptAcknowledgedAt: undefined })));
check('empty lahdFilingPromptAcknowledgedAt rejected', !ok(laProduceAuditSchema.safeParse({ ...valid, lahdFilingPromptAcknowledgedAt: '' })));
check('non-boolean isLaProductionUnblockedAtProduce rejected', !ok(laProduceAuditSchema.safeParse({ ...valid, isLaProductionUnblockedAtProduce: 'yes' })));
check('partial hash pair rejected', !ok(laProduceAuditSchema.safeParse({ ...valid, rtcFormHashes: { english: 'abc' } })));

check('body { laProduceAudit } parses', ok(produceAuditBodySchema.safeParse({ laProduceAudit: valid })));
check('body missing laProduceAudit rejected', !ok(produceAuditBodySchema.safeParse({})));
check('body with extra top-level key still parses the audit', ok(produceAuditBodySchema.safeParse({ laProduceAudit: valid, stray: 1 })));

console.log(`\n${'-'.repeat(44)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(44)}`);
if (failed > 0) process.exit(1);
