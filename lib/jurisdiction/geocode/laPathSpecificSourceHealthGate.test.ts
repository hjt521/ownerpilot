/**
 * LA Path-Specific Source Health Gate v1 — Founder-authorized regression matrix.
 *
 * Proves source health is enforced at the point of reliance without changing the
 * existing County/ZIMAS decision predicates. No live network calls; all adapters
 * and health rows are injected.
 */
import {
  isLaProductionLive,
  PARCEL_HEALTH_FRESHNESS_WINDOW_MS,
  type ParcelHealthReader,
  type ParcelHealthStatusRow,
} from '../parcelHealthGate';
import {
  resolveLaAddressV2,
  type ResolverV2Deps,
} from './resolveLaAddressV2';
import type {
  CountyCache,
  CountyLookupResult,
  ParsedParcelRecord,
} from './countyParcelAdapter';
import type {
  ZimasCache,
  ZimasLookupResult,
  ZimasParcelRecord,
} from './zimasParcelAdapter';

let passed = 0;
let failed = 0;
function check(name: string, condition: boolean) {
  if (condition) {
    passed++;
    console.log('  ✓ ' + name);
  } else {
    failed++;
    console.log('  ✗ ' + name);
  }
}

const countyRecord = (taxRateCity: string): ParsedParcelRecord => ({
  taxRateCity,
  situsCity: 'FORENSIC ONLY',
  ain: 'A',
  apn: 'P',
});
const zimasRecord = (): ZimasParcelRecord => ({
  pind: 'PI',
  pin: 'PN',
  tract: 'TR 9358',
  cnclDist: '11',
});

const fresh = () => new Date().toISOString();
const stale = () => new Date(Date.now() - PARCEL_HEALTH_FRESHNESS_WINDOW_MS - 60_000).toISOString();
const healthRow = (
  endpoint: 'county' | 'zimas',
  currentStatus: 'live' | 'not_live',
  lastProbeAt: string | null,
): ParcelHealthStatusRow => ({ endpoint, currentStatus, lastProbeAt });
const healthReader = (rows: ParcelHealthStatusRow[]): ParcelHealthReader => ({
  read: async () => rows,
});

interface HarnessOptions {
  healthRows: ParcelHealthStatusRow[];
  countyRecords?: ParsedParcelRecord[];
  zimasRecords?: ZimasParcelRecord[];
  countyCache?: CountyCache;
  zimasCache?: ZimasCache;
}

function harness(opts: HarnessOptions): {
  deps: ResolverV2Deps;
  calls: { healthReads: number; countyFetches: number; zimasFetches: number };
} {
  const calls = { healthReads: 0, countyFetches: 0, zimasFetches: 0 };
  const reader: ParcelHealthReader = {
    read: async () => {
      calls.healthReads++;
      return opts.healthRows;
    },
  };

  return {
    calls,
    deps: {
      fetchGeocodeSignals: async () => ({
        validationGranularity: 'PREMISE',
        formattedAddress: '1100 Wilshire Boulevard, Los Angeles, CA 90017, USA',
        latitude: 34.05,
        longitude: -118.26,
        locality: 'Los Angeles',
        administrativeAreaLevel1: 'California',
        correction: {},
      }),
      county: {
        fetcher: async () => {
          calls.countyFetches++;
          return opts.countyRecords ?? [];
        },
        cache: opts.countyCache,
      },
      zimas: {
        fetcher: async () => {
          calls.zimasFetches++;
          return opts.zimasRecords ?? [];
        },
        cache: opts.zimasCache,
      },
      parcelHealthReader: reader,
    },
  };
}

async function throwsGateClosed(deps: ResolverV2Deps): Promise<boolean> {
  try {
    await resolveLaAddressV2('1100 Wilshire Blvd', deps);
    return false;
  } catch (error) {
    return error instanceof Error && error.message.startsWith('la-prod-gate-closed:');
  }
}

async function main() {
  console.log('\n=== endpoint evaluator preserves legacy/global semantics ===');
  {
    const rows = [
      healthRow('county', 'live', fresh()),
      healthRow('zimas', 'live', stale()),
    ];
    const reader = healthReader(rows);
    const globalOpen = await isLaProductionLive({ reader });
    const countyOpen = await isLaProductionLive({ reader, endpoint: 'county' });
    const zimasOpen = await isLaProductionLive({ reader, endpoint: 'zimas' });
    check('legacy/global gate still closes when ZIMAS is stale', globalOpen === false);
    check('path-specific County gate opens when County alone is live/fresh', countyOpen === true);
    check('path-specific ZIMAS gate closes when ZIMAS is stale', zimasOpen === false);
  }
  {
    const countyMissing = await isLaProductionLive({
      reader: healthReader([healthRow('zimas', 'live', fresh())]),
      endpoint: 'county',
    });
    check('missing County row fails County source health closed', countyMissing === false);
  }
  {
    const unreadable = await isLaProductionLive({
      reader: { read: async () => { throw new Error('health store unavailable'); } },
      endpoint: 'zimas',
      logReadError: () => undefined,
    });
    check('unreadable health store fails required source closed', unreadable === false);
  }

  console.log('\n=== Founder matrix: County-owned dispositions do not depend on unused ZIMAS ===');
  {
    const h = harness({
      healthRows: [healthRow('county', 'live', fresh())], // ZIMAS unavailable/missing
      countyRecords: [countyRecord('LOS ANGELES')],
    });
    const result = await resolveLaAddressV2('1100 Wilshire Blvd', h.deps);
    check('healthy County + ZIMAS unavailable + County LA → confirmed_la',
      result.disposition === 'confirmed_la' && result.audit.branch === 'county_confirm');
    check('County decisive LA path never reads/uses ZIMAS adapter', h.calls.zimasFetches === 0);
    check('County decisive LA path needs only one source-health read', h.calls.healthReads === 1);
  }
  {
    const h = harness({
      healthRows: [healthRow('county', 'live', fresh())], // ZIMAS unavailable/missing
      countyRecords: [countyRecord('SANTA MONICA')],
    });
    const result = await resolveLaAddressV2('1100 Wilshire Blvd', h.deps);
    check('healthy County + ZIMAS unavailable + County non-LA → not_la',
      result.disposition === 'not_la' && result.audit.branch === 'county_deny');
    check('County decisive non-LA path never reads/uses ZIMAS adapter', h.calls.zimasFetches === 0);
    check('County decisive non-LA path needs only one source-health read', h.calls.healthReads === 1);
  }

  console.log('\n=== Founder matrix: ZIMAS is gated only when existing fallback is required ===');
  {
    const h = harness({
      healthRows: [
        healthRow('county', 'live', fresh()),
        healthRow('zimas', 'live', fresh()),
      ],
      countyRecords: [],
      zimasRecords: [zimasRecord()],
    });
    const result = await resolveLaAddressV2('1100 Wilshire Blvd', h.deps);
    check('healthy County + inconclusive County + healthy ZIMAS → existing zimas_confirm',
      result.disposition === 'confirmed_la' && result.audit.branch === 'zimas_confirm');
    check('fallback path checks health twice: County then ZIMAS', h.calls.healthReads === 2);
    check('fallback path invokes ZIMAS exactly once after health passes', h.calls.zimasFetches === 1);
  }
  {
    const h = harness({
      healthRows: [
        healthRow('county', 'live', fresh()),
        healthRow('zimas', 'live', stale()),
      ],
      countyRecords: [],
      zimasRecords: [zimasRecord()],
    });
    check('healthy County + inconclusive County + stale ZIMAS → fail closed',
      await throwsGateClosed(h.deps));
    check('stale ZIMAS is rejected before ZIMAS fetch', h.calls.zimasFetches === 0);
  }
  {
    const h = harness({
      healthRows: [healthRow('county', 'live', fresh())], // ZIMAS row missing
      countyRecords: [],
      zimasRecords: [zimasRecord()],
    });
    check('healthy County + inconclusive County + missing ZIMAS → fail closed',
      await throwsGateClosed(h.deps));
    check('missing ZIMAS is rejected before ZIMAS fetch', h.calls.zimasFetches === 0);
  }

  console.log('\n=== Founder matrix: County outage always fails closed before County evidence ===');
  {
    const h = harness({
      healthRows: [
        healthRow('county', 'live', stale()),
        healthRow('zimas', 'live', fresh()),
      ],
      countyRecords: [countyRecord('LOS ANGELES')],
      zimasRecords: [zimasRecord()],
    });
    check('stale County → fail closed regardless of healthy ZIMAS', await throwsGateClosed(h.deps));
    check('stale County is rejected before County fetch', h.calls.countyFetches === 0);
    check('County outage never reaches ZIMAS', h.calls.zimasFetches === 0);
  }
  {
    const h = harness({
      healthRows: [healthRow('zimas', 'live', fresh())], // County missing
      countyRecords: [countyRecord('LOS ANGELES')],
      zimasRecords: [zimasRecord()],
    });
    check('missing County → fail closed regardless of healthy ZIMAS', await throwsGateClosed(h.deps));
    check('missing County is rejected before County fetch', h.calls.countyFetches === 0);
    check('missing County never reaches ZIMAS', h.calls.zimasFetches === 0);
  }

  console.log('\n=== no stale-cache outage path ===');
  {
    let countyCacheReads = 0;
    const cachedCounty: CountyLookupResult = {
      verdict: 'county_confirms_la',
      audit: {
        taxRateCityRaw: 'LOS ANGELES', situsCityRaw: 'FORENSIC ONLY', ain: 'A', apn: 'P',
        parcelFound: true,
      },
    };
    const countyCache: CountyCache = {
      get: async () => { countyCacheReads++; return cachedCounty; },
      set: async () => undefined,
    };
    const h = harness({
      healthRows: [
        healthRow('county', 'live', stale()),
        healthRow('zimas', 'live', fresh()),
      ],
      countyCache,
    });
    check('stale County cannot reuse cached County jurisdiction evidence', await throwsGateClosed(h.deps));
    check('County cache is not read while County source health is stale', countyCacheReads === 0);
  }
  {
    let zimasCacheReads = 0;
    const cachedZimas: ZimasLookupResult = {
      verdict: 'zimas_confirms_la',
      audit: {
        zimasPind: 'PI', zimasPin: 'PN', zimasTract: 'TR 9358', zimasCnclDist: '11',
        zimasTwoSignalPassed: true, zimasTwoSignalFailReason: null,
        zimasCouncilDistrict: 11, zimasBoundaryAdjacent: null, parcelFound: true,
      },
    };
    const zimasCache: ZimasCache = {
      get: async () => { zimasCacheReads++; return cachedZimas; },
      set: async () => undefined,
    };
    const h = harness({
      healthRows: [
        healthRow('county', 'live', fresh()),
        healthRow('zimas', 'live', stale()),
      ],
      countyRecords: [],
      zimasCache,
    });
    check('stale ZIMAS cannot reuse cached ZIMAS jurisdiction evidence', await throwsGateClosed(h.deps));
    check('ZIMAS cache is not read while ZIMAS source health is stale', zimasCacheReads === 0);
  }

  console.log('\n=== locked health constant ===');
  check('freshness window remains exactly 75 minutes',
    PARCEL_HEALTH_FRESHNESS_WINDOW_MS === 75 * 60 * 1000);

  console.log('\n----------------------------------------');
  console.log(`  ${passed} passed, ${failed} failed`);
  console.log('----------------------------------------');
  if (failed > 0) process.exit(1);
}

main();
