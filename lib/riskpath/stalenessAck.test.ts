// lib/riskpath/stalenessAck.test.ts — PR-B §5 acknowledgment body validation.

import { stalenessAckBodySchema } from './stalenessAck';

let passed = 0, failed = 0;
const check = (n: string, c: boolean) => { c ? passed++ : (failed++, console.log(`  ✗ ${n}`)); if (c) console.log(`  ✓ ${n}`); };
const ok = (r: { success: boolean }) => r.success;

check('valid proceed_to_reproduce', ok(stalenessAckBodySchema.safeParse({ staleness_reason: 'AMOUNT_CHANGED', changed_fields: ['Amount demanded'], action_taken: 'proceed_to_reproduce' })));
check('valid dismiss_banner', ok(stalenessAckBodySchema.safeParse({ staleness_reason: 'FACE_FIELD_CHANGED', changed_fields: ['Tenant names'], action_taken: 'dismiss_banner' })));
check('valid cancel_at_generate', ok(stalenessAckBodySchema.safeParse({ staleness_reason: 'AMOUNT_CHANGED', action_taken: 'cancel_at_generate' })));
check('changed_fields defaults to []', (() => { const r = stalenessAckBodySchema.safeParse({ staleness_reason: 'AMOUNT_CHANGED', action_taken: 'dismiss_banner' }); return r.success && Array.isArray(r.data.changed_fields); })());
check('rejects unknown reason', !ok(stalenessAckBodySchema.safeParse({ staleness_reason: 'WHATEVER', action_taken: 'dismiss_banner' })));
check('rejects unknown action', !ok(stalenessAckBodySchema.safeParse({ staleness_reason: 'AMOUNT_CHANGED', action_taken: 'delete' })));
check('rejects missing reason', !ok(stalenessAckBodySchema.safeParse({ action_taken: 'dismiss_banner' })));

console.log(`\n${'-'.repeat(44)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(44)}`);
if (failed > 0) process.exit(1);
