#!/usr/bin/env node
/**
 * county_spatial_latency_probe.mjs — §1.2 MUST-FIX latency validation tooling.
 *
 * Governing ruling: county_parcel_lookup_method_broker_ruling_2026-06-28 §1.2
 *   "measure County spatial-query p50/p95/p99 across a sample of at least 20 real
 *    LA addresses spanning RSO-covered, post-1978, hillside, and Hollywood/Downtown
 *    clusters. The production timeout must be set such that the 99th percentile
 *    completes inside the timeout AND the timeout itself does not exceed the resolver
 *    SLO. … investigate the 180-second stall."
 *
 * §0 / web-policy note: this is engineering-built tooling that performs the LIVE
 * measurement run. It is intended to be RUN host-side (or in CI) by the operator —
 * `node scripts/latency/county_spatial_latency_probe.mjs` — NOT inside the agent
 * sandbox. It hits the same public LA County endpoint + exact spatial query the
 * production adapter builds (buildCountyParcelSpatialQueryUrl), with no API key.
 *
 * Output: per-request latency table, p50/p95/p99 over successful requests, timeout
 * count, slowest outliers (the 180s-stall class), and a recommended bounded timeout.
 *
 * Usage:
 *   node scripts/latency/county_spatial_latency_probe.mjs            # default 1 round
 *   ROUNDS=3 TIMEOUT_MS=30000 node scripts/latency/county_spatial_latency_probe.mjs
 */

const ENDPOINT =
  'https://public.gis.lacounty.gov/public/rest/services/LACounty_Cache/LACounty_Parcel/MapServer/0/query';

// Exact production spatial query shape (mirrors buildCountyParcelSpatialQueryUrl).
function buildUrl(lat, lng) {
  const geometry = encodeURIComponent(`${lng},${lat}`);
  const fields = encodeURIComponent('TaxRateCity,SitusCity,AIN,APN');
  return (
    `${ENDPOINT}?geometry=${geometry}&geometryType=esriGeometryPoint` +
    `&inSR=4326&spatialRel=esriSpatialRelIntersects` +
    `&outFields=${fields}&returnGeometry=false&f=json`
  );
}

// ≥20 real LA coordinates spanning the ruling's required clusters.
const SAMPLE = [
  // Downtown
  { label: 'Downtown — 1200 Wilshire', lat: 34.0528297, lng: -118.2650958 },
  { label: 'Downtown — Hall of Admin', lat: 34.0577, lng: -118.2447 },
  { label: 'Downtown — 9th/Hill', lat: 34.0440, lng: -118.2570 },
  // Hollywood
  { label: 'Hollywood — 5537 La Mirada', lat: 34.0939268, lng: -118.3105939 },
  { label: 'Hollywood — Highland', lat: 34.1016, lng: -118.3387 },
  { label: 'Hollywood — Sunset/Vine', lat: 34.0980, lng: -118.3267 },
  // Hillside
  { label: 'Hillside — Mulholland', lat: 34.1340, lng: -118.3870 },
  { label: 'Hillside — Beachwood Canyon', lat: 34.1200, lng: -118.3210 },
  { label: 'Hillside — Bel Air', lat: 34.0900, lng: -118.4600 },
  // RSO-covered (older multifamily cores)
  { label: 'RSO — Koreatown', lat: 34.0617, lng: -118.3000 },
  { label: 'RSO — East Hollywood', lat: 34.0900, lng: -118.2900 },
  { label: 'RSO — Pico-Union', lat: 34.0500, lng: -118.2800 },
  { label: 'RSO — Mid-City', lat: 34.0500, lng: -118.3500 },
  { label: 'RSO — Westlake', lat: 34.0570, lng: -118.2750 },
  // Post-1978 / newer
  { label: 'Post-78 — Playa Vista', lat: 33.9750, lng: -118.4250 },
  { label: 'Post-78 — Woodland Hills', lat: 34.1700, lng: -118.6050 },
  { label: 'Post-78 — Porter Ranch', lat: 34.2750, lng: -118.5550 },
  // San Fernando Valley (City of LA)
  { label: 'Valley — Van Nuys', lat: 34.1860, lng: -118.4490 },
  { label: 'Valley — North Hollywood', lat: 34.1720, lng: -118.3790 },
  { label: 'Valley — Sylmar', lat: 34.3080, lng: -118.4470 },
  // Harbor (City of LA)
  { label: 'Harbor — San Pedro', lat: 33.7360, lng: -118.2920 },
  { label: 'Harbor — Wilmington', lat: 33.7900, lng: -118.2600 },
  // Westside (City of LA)
  { label: 'Westside — Venice', lat: 33.9900, lng: -118.4600 },
  { label: 'Westside — West LA', lat: 34.0400, lng: -118.4300 },
];

const ROUNDS = Number(process.env.ROUNDS ?? 1);
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS ?? 30000);

function pctl(sorted, p) {
  if (sorted.length === 0) return NaN;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

async function timeOne(s) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const t0 = performance.now();
  try {
    const resp = await fetch(buildUrl(s.lat, s.lng), { signal: ctrl.signal });
    const body = await resp.json().catch(() => ({}));
    const ms = performance.now() - t0;
    clearTimeout(timer);
    const feats = Array.isArray(body.features) ? body.features.length : (body.error ? 'ERR' : 0);
    return { label: s.label, ms, ok: resp.ok && !body.error, feats };
  } catch (e) {
    clearTimeout(timer);
    const ms = performance.now() - t0;
    return { label: s.label, ms, ok: false, feats: e.name === 'AbortError' ? 'TIMEOUT' : 'NETERR' };
  }
}

async function main() {
  console.log(`County spatial latency probe — ${SAMPLE.length} addresses × ${ROUNDS} round(s), timeout ${TIMEOUT_MS}ms\n`);
  const results = [];
  for (let r = 0; r < ROUNDS; r++) {
    for (const s of SAMPLE) {
      const res = await timeOne(s);
      results.push(res);
      console.log(`  ${String(Math.round(res.ms)).padStart(7)}ms  ${String(res.feats).padStart(7)}  ${res.ok ? 'ok ' : 'MISS'}  ${res.label}`);
    }
  }
  const oks = results.filter((r) => r.ok).map((r) => r.ms).sort((a, b) => a - b);
  const timeouts = results.filter((r) => r.feats === 'TIMEOUT').length;
  const neterrs = results.filter((r) => r.feats === 'NETERR').length;
  const slowest = [...results].sort((a, b) => b.ms - a.ms).slice(0, 5);

  console.log('\n=== summary ===');
  console.log(`  n=${results.length}  ok=${oks.length}  timeouts=${timeouts}  neterrs=${neterrs}`);
  console.log(`  p50=${Math.round(pctl(oks, 50))}ms  p95=${Math.round(pctl(oks, 95))}ms  p99=${Math.round(pctl(oks, 99))}ms  max=${Math.round(oks[oks.length - 1] ?? NaN)}ms`);
  console.log('  slowest 5 (180s-stall watch):');
  for (const s of slowest) console.log(`    ${String(Math.round(s.ms)).padStart(7)}ms  ${s.feats}  ${s.label}`);
  const p99 = pctl(oks, 99);
  const recommended = Number.isFinite(p99) ? Math.ceil((p99 * 1.5) / 500) * 500 : null;
  console.log('\n=== recommendation ===');
  console.log(`  Suggested per-attempt timeout ≈ ceil(p99 × 1.5) = ${recommended ?? 'n/a'}ms`);
  console.log('  Confirm this is < resolver SLO; total County+ZIMAS(attempt+retry) budget must fit the SLO (ruling §4.3).');
  if (timeouts > 0) console.log(`  ⚠ ${timeouts} request(s) hit the ${TIMEOUT_MS}ms ceiling — re-run with higher TIMEOUT_MS to characterize the tail (180s-stall class).`);
}

main();
