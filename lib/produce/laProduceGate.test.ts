/** LA produce-overlay gate tests (la_notice_production_gap_broker_ruling §2, fail-closed). */
import { evaluateLaProduceGate, type LaProduceGateInput } from './laProduceGate';
import { isLaProducePhase2dWired, PHASE2D_ASSEMBLY_ENGINE_WIRED } from '../jurisdiction/laRtcRules';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  ✓ ' + name); } else { failed++; console.log('  ✗ ' + name); }
}

const base: LaProduceGateInput = {
  verdict: 'confirmed_la',
  productionUnblocked: true,
  phase2dWired: true,
  rtcPacketAttached: true,
  lahdCopyCurrent: true,
};

// Launch flag default
check('PHASE2D flag defaults false (gate closed)', PHASE2D_ASSEMBLY_ENGINE_WIRED === false);
check('isLaProducePhase2dWired() default false', isLaProducePhase2dWired() === false);
check('isLaProducePhase2dWired(true) → true', isLaProducePhase2dWired(true) === true);

// Not wired → the existing locked block
check('confirmed_la + not wired → NOT_YET_AVAILABLE',
  (() => { const r = evaluateLaProduceGate({ ...base, phase2dWired: false }); return !r.ok && r.code === 'JURISDICTION_LA_OVERLAY_NOT_YET_AVAILABLE'; })());

// Wired + all preconditions → produce
check('confirmed_la + wired + all preconditions → ok', evaluateLaProduceGate(base).ok === true);

// Wired but a precondition fails → ATTACHMENT_FAILED (fail-closed, distinct code)
check('wired but RTC packet not attached → ATTACHMENT_FAILED',
  (() => { const r = evaluateLaProduceGate({ ...base, rtcPacketAttached: false }); return !r.ok && r.code === 'JURISDICTION_LA_OVERLAY_ATTACHMENT_FAILED'; })());
check('wired but production gate closed → ATTACHMENT_FAILED',
  (() => { const r = evaluateLaProduceGate({ ...base, productionUnblocked: false }); return !r.ok && r.code === 'JURISDICTION_LA_OVERLAY_ATTACHMENT_FAILED'; })());
check('wired but LAHD copy stale → ATTACHMENT_FAILED',
  (() => { const r = evaluateLaProduceGate({ ...base, lahdCopyCurrent: false }); return !r.ok && r.code === 'JURISDICTION_LA_OVERLAY_ATTACHMENT_FAILED'; })());

// Non-LA verdict → gate not applicable
check('not_la → gate not applicable (ok)', evaluateLaProduceGate({ ...base, verdict: 'not_la' }).ok === true);
check('manual_review → gate not applicable (ok)', evaluateLaProduceGate({ ...base, verdict: 'manual_review' }).ok === true);

console.log('\n----------------------------------------');
console.log(`  ${passed} passed, ${failed} failed`);
console.log('----------------------------------------');
if (failed > 0) process.exit(1);
