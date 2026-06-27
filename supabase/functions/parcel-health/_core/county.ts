// ============================================================================
// GENERATED FILE — DO NOT EDIT
// Source: lib/jurisdiction/parcelHealth/endpoints/county.ts
// Regenerate with: npm run build:parcel-health-core
// CI guard: git diff --exit-code supabase/functions/parcel-health/_core/
// Governing ruling: slice2_architecture_and_alert_sink_broker_ruling_2026-06-25.md
// ============================================================================
import { evaluateProbe, type ProbeObservation } from './evaluateProbe.ts';
import type { ProbeResult } from './types.ts';
import {
  buildCountyParcelQueryUrl,
  parseAddressForCounty,
  normalizeJurisdiction,
} from './countyParcelAdapter.ts';

// §2.2 (divergence ruling): probe target is the Hall of Administration address.
// The URL is computed from it via the shared production encoder — never hand-rolled.
const HALL_OF_ADMINISTRATION_ADDRESS = '500 W Temple St, Los Angeles, CA 90012';

// §2.3 (divergence ruling): healthy iff normalize(TaxRateCity) === "los angeles".
const EXPECTED_TAX_RATE_CITY = 'los angeles';

// §2.4: ruled UA addition (probe = production-twin PLUS this header).
const PROBE_USER_AGENT = 'ownerpilot-parcel-health/1.0';

// §2.6: single attempt, NO internal retry. County production per-attempt cap; mirrors drip-001 §2.6.
const COUNTY_PROBE_TIMEOUT_MS = 8_000;

interface CountyProbeResponse {
  error?: unknown;
  features?: Array<{ attributes?: Record<string, unknown> }>;
}

export async function probeCounty(): Promise<ProbeResult> {
  const url = buildCountyParcelQueryUrl(parseAddressForCounty(HALL_OF_ADMINISTRATION_ADDRESS));

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), COUNTY_PROBE_TIMEOUT_MS);
  const started = Date.now();

  let httpStatus = 0;            // 0 = no HTTP response (timeout/network) → http_status
  let responseShapeValid = false;
  let errorDetail: string | null = null; // [5a] abort/timeout/error message; null on success
  try {
    const resp = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': PROBE_USER_AGENT },
      signal: ctrl.signal,
    });
    httpStatus = resp.status;
    if (resp.status === 200) {
      // §2.5: ArcGIS returns 200-with-error-body — check json.error BEFORE the
      // shape contract so we never read .features off an error body.
      const json = (await resp.json().catch(() => null)) as CountyProbeResponse | null;
      if (json && json.error == null) {
        const attrs = json.features?.[0]?.attributes;
        const taxRateCity = typeof attrs?.TaxRateCity === 'string' ? attrs.TaxRateCity : null;
        responseShapeValid =
          taxRateCity != null && normalizeJurisdiction(taxRateCity) === EXPECTED_TAX_RATE_CITY;
      }
      // json.error present, json null (parse fail), or contract miss → stays false.
    }
  } catch (err) {
    // §2.6 single attempt, no retry. Timeout/network → httpStatus stays 0 → http_status.
    errorDetail = String((err as Error)?.message ?? err).slice(0, 500); // [5a] forensic capture
  } finally {
    clearTimeout(timer);
  }

  const latencyMs = Date.now() - started;
  const obs: ProbeObservation = { httpStatus, responseShapeValid, latencyMs };
  // [5a] forensic enrichment: the §2 verdict plus the observed http_status / latency / error.
  return { ...evaluateProbe(obs), httpStatus, latencyMs, errorDetail };
}
