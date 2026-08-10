import { resolveLaAddressV2, type ResolverV2Deps } from './resolveLaAddressV2';
import type { ParsedParcelRecord } from './countyParcelAdapter';
import type { ZimasParcelRecord } from './zimasParcelAdapter';
import type { ParcelHealthReader, ParcelHealthStatusRow } from '../parcelHealthGate';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  ✓ ' + name); }
  else { failed++; console.log('  ✗ ' + name); }
}

const county = (taxRateCity: string | null): ParsedParcelRecord => ({
  taxRateCity, situsCity: 'LOS ANGELES CA', ain: 'A', apn: 'P',
});
const zimas = (cnclDist: string | null, tract: string | null): ZimasParcelRecord => ({
  pind: 'PI', pin: 'PN', tract, cnclDist,
});
const fresh = () => new Date().toISOString();
const stale = () => new Date(Date.now() - 76 * 60 * 1000).toISOString();
const health = (
  endpoint: 'county' | 'zimas', currentStatus: 'live' | 'not_live', lastProbeAt: string | null,
): ParcelHealthStatusRow => ({ endpoint, currentStatus, lastProbeAt });

interface Options {
  healthRows?: ParcelHealthStatusRow[];
  healthReader?: ParcelHealthReader;
  countyRecords?: ParsedParcelRecord[];
  zimasRecords?: ZimasParcelRecord[];
  correction?: { hasReplacedComponents?: boolean; possibleNextAction?: string };
  counters?: { county: number; zimas: number; healthReads: number };
}

function deps(opts: Options): ResolverV2Deps {
  const counters = opts.counters ?? { county: 0, zimas: 0, healthReads: 0 };
  const reader = opts.healthReader ?? {
    read: async () => { counters.healthReads++; return opts.healthRows ?? []; },
  };
  return {
    fetchGeocodeSignals: async () => ({
      validationGranularity: 'PREMISE',
      formattedAddress: '1100 Wilshire Blvd, Los Angeles, CA 90017',
      latitude: 34.05,
      longitude: -118.26,
      locality: 'Los Angeles',
      administrativeAreaLevel1: 'California',
      correction: opts.correction ?? {},
    }),
    county: {
      fetcher: async () => {
        counters.county++;
        return opts.countyRecords ?? [];
      },
    },
    zimas: {
      fetcher: async () => {
        counters.zimas++;
        return opts.zimasRecords ?? [];
      },
    },
    parcelHealthReader: reader,
  };
}

async function gateClosed(run: () => Promise<unknown>, source: 'county' | 'zimas'): Promise<boolean> {
  try {
    await run();
    return false;
  } catch (e) {
    return e instanceof Error && e.message === `la-prod-gate-closed: ${source} source unavailable`;
  }
}

async function main() {
  console.log('\n=== LA path-specific source health scenarios A-J ===');

  // A — County decisive LA result does not depend on ZIMAS health.
  {
    const c = { county: 0, zimas: 0, healthReads: 0 };
    const r = await resolveLaAddressV2('x', deps({
      counters: c,
      healthRows: [health('county','live',fresh()), health('zimas','not_live',fresh())],
      countyRecords: [county('LOS ANGELES')],
    }));
    check('A: County healthy + ZIMAS not_live + County LA → confirmed_la', r.disposition === 'confirmed_la' && r.audit.branch === 'county_confirm');
    check('A: ZIMAS lookup not consumed', c.zimas === 0);
  }

  // B — County decisive non-LA result survives any irrelevant ZIMAS health state.
  for (const [label, rows] of [
    ['missing', [health('county','live',fresh())]],
    ['stale', [health('county','live',fresh()), health('zimas','live',stale())]],
    ['not_live', [health('county','live',fresh()), health('zimas','not_live',fresh())]],
  ] as const) {
    const r = await resolveLaAddressV2('x', deps({ healthRows: [...rows], countyRecords: [county('SANTA MONICA')] }));
    check(`B: ZIMAS ${label} + County deny → not_la`, r.disposition === 'not_la' && r.audit.branch === 'county_deny');
  }

  // C — Existing ZIMAS fallback behavior when both required sources are healthy.
  {
    const r = await resolveLaAddressV2('x', deps({
      healthRows: [health('county','live',fresh()), health('zimas','live',fresh())],
      countyRecords: [], zimasRecords: [zimas('11', 'TR 9358')],
    }));
    check('C: County inconclusive + ZIMAS healthy confirm → existing zimas_confirm', r.disposition === 'confirmed_la' && r.audit.branch === 'zimas_confirm');
  }

  // D — ZIMAS required but not_live: fail closed, not manual_review.
  {
    const c = { county: 0, zimas: 0, healthReads: 0 };
    const closed = await gateClosed(() => resolveLaAddressV2('x', deps({
      counters: c,
      healthRows: [health('county','live',fresh()), health('zimas','not_live',fresh())],
      countyRecords: [], zimasRecords: [zimas('11', 'TR 9358')],
    })), 'zimas');
    check('D: County inconclusive + ZIMAS not_live → fail closed', closed);
    check('D: unavailable ZIMAS evidence is never consumed', c.zimas === 0);
  }

  // E — ZIMAS required but stale: same fail-closed architecture.
  {
    const closed = await gateClosed(() => resolveLaAddressV2('x', deps({
      healthRows: [health('county','live',fresh()), health('zimas','live',stale())],
      countyRecords: [],
    })), 'zimas');
    check('E: County inconclusive + ZIMAS stale → fail closed', closed);
  }

  // F — County is always health-gated before County evidence, independent of ZIMAS.
  for (const [label, countyRow] of [
    ['missing', null],
    ['stale', health('county','live',stale())],
    ['not_live', health('county','not_live',fresh())],
  ] as const) {
    const c = { county: 0, zimas: 0, healthReads: 0 };
    const rows = [health('zimas','live',fresh())];
    if (countyRow) rows.push(countyRow);
    const closed = await gateClosed(() => resolveLaAddressV2('x', deps({
      counters: c, healthRows: rows, countyRecords: [county('LOS ANGELES')],
    })), 'county');
    check(`F: County ${label} → fail closed`, closed && c.county === 0);
  }

  // G — Read failure for the source actually required by the branch fails closed.
  {
    const closed = await gateClosed(() => resolveLaAddressV2('x', deps({
      healthReader: { read: async () => { throw new Error('health db unavailable'); } },
      countyRecords: [county('LOS ANGELES')],
    })), 'county');
    check('G1: County health read error → fail closed', closed);
  }
  {
    let reads = 0;
    const reader: ParcelHealthReader = {
      read: async () => {
        reads++;
        if (reads === 1) return [health('county','live',fresh())];
        throw new Error('health db unavailable');
      },
    };
    const closed = await gateClosed(() => resolveLaAddressV2('x', deps({
      healthReader: reader, countyRecords: [], zimasRecords: [zimas('11','TR 9358')],
    })), 'zimas');
    check('G2: ZIMAS-required health read error → fail closed', closed && reads === 2);
  }

  // H — Corrected positive County evidence remains suppressed exactly as before.
  {
    const r = await resolveLaAddressV2('x', deps({
      healthRows: [health('county','live',fresh()), health('zimas','not_live',fresh())],
      countyRecords: [county('LOS ANGELES')],
      correction: { hasReplacedComponents: true },
    }));
    check('H: corrected County confirmation → manual_review input_corrected', r.disposition === 'manual_review' && r.reviewReason === 'input_corrected' && r.audit.branch === 'correction_suppressed');
  }

  // I — Healthy ZIMAS fallback that does not confirm keeps existing manual-review result.
  {
    const r = await resolveLaAddressV2('x', deps({
      healthRows: [health('county','live',fresh()), health('zimas','live',fresh())],
      countyRecords: [], zimasRecords: [zimas('OUTLA', ' ')],
    }));
    check('I: nonconfirming ZIMAS → existing parcel_lookup_inconclusive', r.disposition === 'manual_review' && r.reviewReason === 'parcel_lookup_inconclusive' && r.audit.branch === 'zimas_miss');
    check('I: ZIMAS never manufactures not_la', r.disposition !== ('not_la' as unknown));
  }

  // J — Source outage is a gate-closed throw; no resolver fallback verdict is manufactured.
  {
    const c = { county: 0, zimas: 0, healthReads: 0 };
    const closed = await gateClosed(() => resolveLaAddressV2('x', deps({
      counters: c,
      healthRows: [health('county','live',fresh()), health('zimas','not_live',fresh())],
      countyRecords: [], zimasRecords: [zimas('11','TR 9358')],
    })), 'zimas');
    check('J: source outage remains gate_closed architecture, not manual_review/not_la', closed && c.zimas === 0);
  }

  console.log('\n----------------------------------------');
  console.log(`  ${passed} passed, ${failed} failed`);
  console.log('----------------------------------------');
  if (failed > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
