/**
 * ZIMAS parcel adapter (Workstream A.4).
 *
 * Second-tier jurisdiction signal: spatial point-in-polygon against the LA City
 * Planning landbase parcel layer, consulted ONLY when the County branch is
 * inconclusive (per parent ruling §5 classifier order step 6).
 *
 * Mechanism (ratified across diagnostics v3–v6):
 *   Google AV lat/lng → spatial query zm4/landbase/MapServer/105 (point-in-polygon)
 *   → a returned parcel counts as City-of-LA ONLY IF the two-signal rule holds.
 *
 * Two-signal confirm rule (binding, ratification §3.2):
 *   confirmed_la  ⟺  CNCL_DIST trimmed parses as integer in [1..15]
 *                    AND TRACT trimmed is non-empty.
 *   Either failing → treat as no parcel → inconclusive
 *   (classifier routes to manual_review (parcel_lookup_inconclusive)).
 *
 * Fail-closed (§3.3): API error / timeout / 5xx / malformed / multi-parcel →
 *   inconclusive. NEVER confirms LA on error. NEVER returns not_la on a ZIMAS
 *   error (the County branch already produced its answer or fell through; a ZIMAS
 *   error does not flip the disposition the other way).
 *
 * Endpoint: zm4/landbase/MapServer/105. No API key (public). inSR=4326 — the
 * server reprojects to State Plane 2229 internally; no client-side reprojection.
 *
 * Pure `classifyZimasParcel` core + injected fetcher, mirroring the County adapter.
 */

export const ZIMAS_LANDBASE_QUERY =
  'https://zimas.lacity.org/arcgis/rest/services/zm4/landbase/MapServer/105/query';

/** LA City Council currently has 15 districts (ratification §3.2 / v5 ruling §3.3). */
export const MAX_LA_COUNCIL_DISTRICT = 15;

/** ZIMAS jurisdiction verdict the classifier (A.5) consumes. */
export type ZimasVerdict =
  | 'zimas_confirms_la' // parcel hit AND two-signal rule passed
  | 'zimas_inconclusive'; // no parcel / two-signal failed / error (→ manual_review)

/** Why the two-signal rule failed (audit, §3.4). */
export type ZimasTwoSignalFailReason =
  | 'cncl_dist_invalid'
  | 'tract_blank'
  | 'both_invalid';

/** Audit fields captured at the ZIMAS branch (ratification §3.4). */
export interface ZimasAuditFields {
  zimasPind: string | null;
  zimasPin: string | null;
  zimasTract: string | null;
  /** Raw CNCL_DIST including sentinel values like "OUTLA". */
  zimasCnclDist: string | null;
  zimasTwoSignalPassed: boolean;
  /** Null when passed; the reason enum when failed. */
  zimasTwoSignalFailReason: ZimasTwoSignalFailReason | null;
  /** parseInt(trim(CNCL_DIST)) only when the rule passed; null otherwise. */
  zimasCouncilDistrict: number | null;
  /**
   * Boundary-adjacency flag (v4 ruling §4.1). Requires distance-from-polygon-edge
   * computation; shipped null in the initial A.4 per ratification §3.4, with a
   * tracked follow-up to populate it. NOT a gate — observational only.
   */
  zimasBoundaryAdjacent: boolean | null;
  /** Whether a parcel feature was returned at all (pre-rule). */
  parcelFound: boolean;
  /** Set on a fail-closed path. */
  failureMode?: 'timeout' | 'http_5xx' | 'network_error' | 'bad_response' | 'multi_parcel';
}

export interface ZimasLookupResult {
  verdict: ZimasVerdict;
  audit: ZimasAuditFields;
}

/** A parsed landbase feature (the fetcher normalizes the ArcGIS response to this). */
export interface ZimasParcelRecord {
  pind: string | null;
  pin: string | null;
  tract: string | null;
  cnclDist: string | null;
}

// ---- the two-signal rule (binding, ratification §3.2) ----

/** CNCL_DIST trimmed parses as an integer in [1..15]. Sentinels like "OUTLA" fail. */
export function cnclDistIsValidLa(raw: string | null): boolean {
  if (raw == null) return false;
  const s = raw.trim();
  if (!/^\d+$/.test(s)) return false;
  const n = parseInt(s, 10);
  return n >= 1 && n <= MAX_LA_COUNCIL_DISTRICT;
}

/** TRACT trimmed is non-empty. */
export function tractIsNonBlank(raw: string | null): boolean {
  return raw != null && raw.trim().length > 0;
}

function emptyAudit(parcelFound: boolean, failureMode?: ZimasAuditFields['failureMode']): ZimasAuditFields {
  return {
    zimasPind: null, zimasPin: null, zimasTract: null, zimasCnclDist: null,
    zimasTwoSignalPassed: false, zimasTwoSignalFailReason: null,
    zimasCouncilDistrict: null, zimasBoundaryAdjacent: null,
    parcelFound, failureMode,
  };
}

/**
 * PURE decision core. Given the landbase feature(s) for a point, apply the
 * two-signal rule. Per broker ruling v5 §3.1 + v6 §1: CNCL_DIST value of "OUTLA"
 * is the dataset's known sentinel for out-of-LA filler geometry. The integer
 * 1–15 test already rejects it; this note is forensic only.
 */
export function classifyZimasParcel(records: ZimasParcelRecord[]): ZimasLookupResult {
  if (records.length === 0) {
    return { verdict: 'zimas_inconclusive', audit: emptyAudit(false) };
  }
  // Multi-parcel for a point query → fail-closed (§3.3). Should not happen.
  if (records.length > 1) {
    return { verdict: 'zimas_inconclusive', audit: emptyAudit(true, 'multi_parcel') };
  }

  const r = records[0];
  const cdValid = cnclDistIsValidLa(r.cnclDist);
  const tractOk = tractIsNonBlank(r.tract);
  const passed = cdValid && tractOk;

  let failReason: ZimasTwoSignalFailReason | null = null;
  if (!passed) {
    if (!cdValid && !tractOk) failReason = 'both_invalid';
    else if (!cdValid) failReason = 'cncl_dist_invalid';
    else failReason = 'tract_blank';
  }

  const audit: ZimasAuditFields = {
    zimasPind: r.pind,
    zimasPin: r.pin,
    zimasTract: r.tract,
    zimasCnclDist: r.cnclDist,
    zimasTwoSignalPassed: passed,
    zimasTwoSignalFailReason: failReason,
    zimasCouncilDistrict: passed ? parseInt((r.cnclDist as string).trim(), 10) : null,
    zimasBoundaryAdjacent: null, // §3.4: shipped null initially, tracked follow-up
    parcelFound: true,
  };

  return { verdict: passed ? 'zimas_confirms_la' : 'zimas_inconclusive', audit };
}

/** Injected fetcher: given a WGS84 point, return matched landbase records or throw. */
export interface ZimasFetcher {
  (lat: number, lng: number, signal: AbortSignal): Promise<ZimasParcelRecord[]>;
}

export interface ZimasCache {
  get(key: string): Promise<ZimasLookupResult | null>;
  set(key: string, value: ZimasLookupResult): Promise<void>;
}

export interface ZimasLookupDeps {
  fetcher: ZimasFetcher;
  cache?: ZimasCache;
  /** Per-attempt timeout (ms). Default 8000 (§3.5 5-10s). */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 8_000;

function timeoutSignal(ms: number): { signal: AbortSignal; clear: () => void } {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, clear: () => clearTimeout(t) };
}

/** Cache key: rounded lat/lng (6 dp ≈ 0.1 m) per §3.5. */
export function zimasCacheKey(lat: number, lng: number): string {
  return `zimas:${lat.toFixed(6)},${lng.toFixed(6)}`;
}

/**
 * Network lookup with one retry on transient failure and fail-closed behavior.
 * Never throws to the caller — a failure becomes zimas_inconclusive with a
 * recorded failureMode. Never confirms LA on error; never returns not_la.
 */
export async function lookupZimasParcel(
  lat: number,
  lng: number,
  deps: ZimasLookupDeps,
): Promise<ZimasLookupResult> {
  const key = zimasCacheKey(lat, lng);
  if (deps.cache) {
    const hit = await deps.cache.get(key).catch(() => null);
    if (hit) return hit;
  }

  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let lastFailure: ZimasAuditFields['failureMode'] = 'network_error';

  for (let attempt = 0; attempt < 2; attempt++) {
    const { signal, clear } = timeoutSignal(timeoutMs);
    try {
      const records = await deps.fetcher(lat, lng, signal);
      clear();
      const result = classifyZimasParcel(records);
      if (deps.cache) await deps.cache.set(key, result).catch(() => undefined);
      return result;
    } catch (e) {
      clear();
      const msg = (e as Error).message ?? '';
      if ((e as Error).name === 'AbortError') lastFailure = 'timeout';
      else if (/\b5\d\d\b/.test(msg)) lastFailure = 'http_5xx';
      else if (/parse|json|unexpected/i.test(msg)) lastFailure = 'bad_response';
      else lastFailure = 'network_error';
      // retry once; second failure falls through to fail-closed below
    }
  }

  return { verdict: 'zimas_inconclusive', audit: emptyAudit(false, lastFailure) };
}

/**
 * Default network fetcher: ArcGIS spatial point-in-polygon against landbase 105.
 * inSR=4326 (server reprojects). Throws on non-2xx / API error / parse failure
 * (caller categorizes + fail-closes). No API key.
 */
export const defaultZimasFetcher: ZimasFetcher = async (lat, lng, signal) => {
  const geometry = encodeURIComponent(`${lng},${lat}`);
  const outFields = 'PIND,PIN,TRACT,PARCEL,CNCL_DIST,ENG_DIST,LST_MODF_DT';
  const url =
    `${ZIMAS_LANDBASE_QUERY}?geometry=${geometry}&geometryType=esriGeometryPoint` +
    `&inSR=4326&spatialRel=esriSpatialRelIntersects` +
    `&outFields=${encodeURIComponent(outFields)}&returnGeometry=false&f=json`;

  const resp = await fetch(url, { method: 'GET', signal });
  if (!resp.ok) throw new Error(`zimas HTTP ${resp.status}`);
  const json = (await resp.json()) as {
    error?: unknown;
    features?: Array<{ attributes?: Record<string, unknown> }>;
  };
  if (json.error) throw new Error('zimas API error');
  const feats = json.features ?? [];
  return feats.map((f) => {
    const a = f.attributes ?? {};
    return {
      pind: typeof a.PIND === 'string' ? a.PIND : a.PIND == null ? null : String(a.PIND),
      pin: typeof a.PIN === 'string' ? a.PIN : a.PIN == null ? null : String(a.PIN),
      tract: typeof a.TRACT === 'string' ? a.TRACT : a.TRACT == null ? null : String(a.TRACT),
      cnclDist: typeof a.CNCL_DIST === 'string' ? a.CNCL_DIST : a.CNCL_DIST == null ? null : String(a.CNCL_DIST),
    };
  });
};
