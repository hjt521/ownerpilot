import { evaluateProbe, type ProbeObservation } from '../evaluateProbe';
import type { ProbeResult } from '../types';
import {
  buildZimasParcelQueryUrl,
  parseZimasFeatures,
  classifyZimasParcel,
  type ZimasArcgisResponse,
} from '../../geocode/zimasParcelAdapter';

// ZIMAS endpoint health probe (drip-003).
//
// §4 divergence #1 (geometry-keyed): ZIMAS is queried by a WGS84 point, not an address or
// APN — the production resolver hands lat/lng straight to the adapter, so there is no
// parseAddressForZimas. The probe targets a fixed known-LA parcel and mirrors production's
// exact spatial query via the shared encoder (buildZimasParcelQueryUrl).
//
// §4 divergence #2 (two-signal conjunction): the shape-check reuses the production
// classifier classifyZimasParcel — healthy iff EXACTLY ONE parcel AND CNCL_DIST trimmed
// ∈ [1..15] AND TRACT trimmed non-blank (drip-003 §3.2 = ratification v6 §3.2). Single source
// of truth with the production jurisdiction path; the probe cannot drift from how production
// actually consumes ZIMAS.
//
// §4 divergence #3 (single attempt): production uses 5–10s with one retry (v6 §3.5); the probe
// takes a 15s single attempt and no internal retry — the gate's two-consecutive roll-up is the
// retry layer. (Timeout raised 8s→15s per the ZIMAS-from-Edge diagnostic, 2026-06-27.)

// Locked constant (broker-authored, drip-003 §5): LA Central Library, a stable, always-resolvable
// known-LA parcel. Do NOT re-geocode at runtime — the probe must hit the same point every cycle,
// so the shape-check has a fixed expected verdict.
const CENTRAL_LIBRARY_COORDS = { lng: -118.2428, lat: 34.0537 } as const;

// §2.4 ruled UA addition (probe = production-twin PLUS this header).
const PROBE_USER_AGENT = 'ownerpilot-parcel-health/1.0';

// §2.6 single attempt, NO internal retry. ZIMAS-from-Edge measured ~9s (diagnostic 2026-06-27);
// 15s gives ~60% headroom. Amends drip-003 §2.6.
const ZIMAS_PROBE_TIMEOUT_MS = 15_000;

/**
 * PURE: classify a ZIMAS probe response into the observation's httpStatus + responseShapeValid.
 * Separated from the fetch so the §5 fixtures (healthy / OUTLA-sentinel rejection / ArcGIS
 * error-envelope / HTTP non-200) are testable without network.
 *
 * §2.5 ordering: a non-200 short-circuits first; then json.error is checked BEFORE the
 * features / two-signal read (an ArcGIS 200-with-error-body → response_shape, never an NPE on
 * `.features`). A healthy body is one where classifyZimasParcel confirms LA for the fixed
 * Central Library point.
 */
export function evaluateZimasProbeResponse(
  httpStatus: number,
  json: ZimasArcgisResponse | null,
): { httpStatus: number; responseShapeValid: boolean } {
  if (httpStatus !== 200) return { httpStatus, responseShapeValid: false };
  if (json == null || json.error != null) return { httpStatus, responseShapeValid: false };
  const records = parseZimasFeatures(json);
  const responseShapeValid = classifyZimasParcel(records).verdict === 'zimas_confirms_la';
  return { httpStatus, responseShapeValid };
}

export async function probeZimas(): Promise<ProbeResult> {
  const url = buildZimasParcelQueryUrl(CENTRAL_LIBRARY_COORDS);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ZIMAS_PROBE_TIMEOUT_MS);
  const started = Date.now();

  let httpStatus = 0; // 0 = no HTTP response (timeout/network) → http_status
  let json: ZimasArcgisResponse | null = null;
  let errorDetail: string | null = null; // [5a] abort/timeout/error message; null on success
  try {
    const resp = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': PROBE_USER_AGENT },
      signal: ctrl.signal,
    });
    httpStatus = resp.status;
    if (resp.status === 200) {
      json = (await resp.json().catch(() => null)) as ZimasArcgisResponse | null;
    }
  } catch (err) {
    // §2.6 single attempt, no retry. Timeout/network → httpStatus stays 0 → http_status.
    errorDetail = String((err as Error)?.message ?? err).slice(0, 500); // [5a] forensic capture
  } finally {
    clearTimeout(timer);
  }

  const latencyMs = Date.now() - started;
  const { responseShapeValid } = evaluateZimasProbeResponse(httpStatus, json);
  const obs: ProbeObservation = { httpStatus, responseShapeValid, latencyMs };
  // [5a] forensic enrichment: the §2 verdict plus the observed http_status / latency / error.
  return { ...evaluateProbe(obs), httpStatus, latencyMs, errorDetail };
}
