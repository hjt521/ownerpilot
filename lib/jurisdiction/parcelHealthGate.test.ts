/**
 * Dynamic parcel-health gate-read — boundary tests (predicate-6 ruling 2026-06-27 §6).
 * Pure evaluator + async isLaProductionLive (static short-circuit, fail-closed, 75-min window).
 */
import {
  evaluateParcelHealthGate,
  isLaProductionLive,
  PARCEL_HEALTH_FRESHNESS_WINDOW_MS,
  type ParcelHealthStatusRow,
  type ParcelHealthReader,
  type GateClosure,
} from './parcelHealthGate';
import type { LaProductionDependencies } from './laRtcRules';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  ✓ ' + name); }
  else { failed++; console.log('  ✗ ' + name); }
}

const NOW = new Date('2026-06-27T20:30:00Z');
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();
const MIN = 60 * 1000;
const fresh = ago(10 * MIN);
const row = (
  endpoint: 'county' | 'zimas',
  currentStatus: 'live' | 'not_live',
  lastProbeAt: string | null,
): ParcelHealthStatusRow => ({ endpoint, currentStatus, lastProbeAt });

const ALL_TRUE: LaProductionDependencies = {
  geocodeConfirmationBuilt: true,
  cityBusinessDayCalendarBuilt: true,
  rtcFormRefreshJobBuilt: true,
  geocodeAuditDurabilityWired: true,
  cityOfLaZipsAuthoritative: true,
  parcelEndpointHealthCheckLive: true,
};
const FLAG_FALSE: LaProductionDependencies = { ...ALL_TRUE, parcelEndpointHealthCheckLive: false };

function reader(rows: ParcelHealthStatusRow[]): ParcelHealthReader {
  return { read: async () => rows };
}
const throwingReader: ParcelHealthReader = { read: async () => { throw new Error('db unreachable'); } };

async function main() {
  console.log('\n=== evaluateParcelHealthGate: the six boundary cases ===');
  check('both live + fresh → OPEN',
    evaluateParcelHealthGate([row('county','live',fresh), row('zimas','live',fresh)], NOW).open === true);

  {
    const r = evaluateParcelHealthGate([row('county','live',fresh), row('zimas','not_live',fresh)], NOW);
    check('one not_live (both fresh) → CLOSED', r.open === false);
    check('  closure reason = not_live on zimas',
      !r.open && r.closures.some((c: GateClosure) => c.endpoint==='zimas' && c.condition==='not_live'));
  }
  {
    const stale = ago(76 * MIN);
    const r = evaluateParcelHealthGate([row('county','live',stale), row('zimas','live',fresh)], NOW);
    check('both live, one stale (>75m) → CLOSED', r.open === false);
    check('  closure reason = stale on county',
      !r.open && r.closures.some((c) => c.endpoint==='county' && c.condition==='stale'));
  }
  {
    const r = evaluateParcelHealthGate([row('zimas','live',fresh)], NOW); // county row missing
    check('one row missing entirely → CLOSED', r.open === false);
    check('  closure reason = missing on county',
      !r.open && r.closures.some((c) => c.endpoint==='county' && c.condition==='missing'));
  }
  check('row present but last_probe_at null → missing → CLOSED',
    evaluateParcelHealthGate([row('county','live',fresh), row('zimas','live',null)], NOW).open === false);

  console.log('\n=== freshness boundary (75-min mark is FRESH; +1s is stale) ===');
  check('age exactly 75:00 → OPEN (inclusive)',
    evaluateParcelHealthGate([row('county','live',ago(75*MIN)), row('zimas','live',fresh)], NOW).open === true);
  check('age 75:00 + 1s → CLOSED (stale)',
    evaluateParcelHealthGate([row('county','live',ago(75*MIN + 1000)), row('zimas','live',fresh)], NOW).open === false);
  check('window constant = 75 minutes', PARCEL_HEALTH_FRESHNESS_WINDOW_MS === 75*60*1000);

  console.log('\n=== isLaProductionLive: static short-circuit + fail-closed ===');
  {
    let readerCalled = false;
    const spy: ParcelHealthReader = { read: async () => { readerCalled = true; return []; } };
    const open = await isLaProductionLive({ deps: FLAG_FALSE, reader: spy, now: () => NOW });
    check('parcelEndpointHealthCheckLive=false → gate false', open === false);
    check('  short-circuit: reader NOT called (no DB read)', readerCalled === false);
  }
  {
    const open = await isLaProductionLive({
      deps: ALL_TRUE, now: () => NOW,
      reader: reader([row('county','live',fresh), row('zimas','live',fresh)]),
    });
    check('all static true + both live/fresh → gate OPEN', open === true);
  }
  {
    const open = await isLaProductionLive({ deps: ALL_TRUE, now: () => NOW, reader: throwingReader });
    check('read throws (DB unreachable) → fail CLOSED', open === false);
  }
  {
    const closures: GateClosure[][] = [];
    const open = await isLaProductionLive({
      deps: ALL_TRUE, now: () => NOW,
      reader: reader([row('county','live',ago(80*MIN)), row('zimas','live',fresh)]),
      logClosure: (i) => closures.push(i.closures),
    });
    check('all true but one stale → gate CLOSED', open === false);
    check('  logClosure fired with the stale endpoint',
      closures.length === 1 && closures[0].some((c) => c.condition==='stale'));
  }
  {
    const open = await isLaProductionLive({
      deps: ALL_TRUE, now: () => NOW,
      reader: reader([row('county','not_live',fresh), row('zimas','live',fresh)]),
    });
    check('all true but one not_live → gate CLOSED', open === false);
  }

  console.log('\n----------------------------------------');
  console.log(`  ${passed} passed, ${failed} failed`);
  console.log('----------------------------------------');
  if (failed > 0) process.exit(1);
}
main();
