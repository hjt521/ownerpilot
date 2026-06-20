/**
 * County parcel jurisdiction adapter (Workstream A.2).
 *
 * Queries the LA County public parcel service by the Google-formatted address and
 * reads ONLY `TaxRateCity` to decide jurisdiction, per
 * `la_geocode_parcel_lookup_open_questions_broker_ruling_response_2026-06-20.md`
 * (Decision A: TaxRateCity authoritative) and the combined build prompt §A.2.
 *
 * Decision rule (binding):
 *   normalize(TaxRateCity) == "los angeles"            → county says LA   (countyConfirmsLa)
 *   TaxRateCity non-null, any other value              → county says NOT LA (countyDeniesLa)
 *   parcel not found OR TaxRateCity null               → inconclusive (fall through to ZIMAS)
 *   API unreachable / 5xx / timeout (after one retry)  → inconclusive, FAIL-CLOSED
 *
 * normalize = lowercase + trim (+ collapse internal whitespace as convenience).
 * The case-insensitive trim is the compliance-binding rule.
 *
 * ⚠️ SitusCity is PROHIBITED as a jurisdiction signal (ruling §2.3). It is captured
 * in the audit fields for forensic value ONLY and is never read by the decision
 * logic. See the capture site below.
 *
 * Endpoint: LACounty_Parcel MapServer layer 0. No API key (public endpoint). If
 * the endpoint begins requiring auth, that is an escalation — do not embed creds.
 *
 * This module is pure-logic + an injected fetcher, matching the geocode adapter
 * pattern: `classifyCountyParcel` is a pure function over a parsed parcel record;
 * `lookupCountyParcel` does the network with retry/fail-closed and delegates the
 * decision to the pure core.
 */

export const COUNTY_PARCEL_ENDPOINT =
  'https://public.gis.lacounty.gov/public/rest/services/LACounty_Cache/LACounty_Parcel/MapServer/0/query';

/** County jurisdiction verdict the classifier (A.5) consumes. */
export type CountyVerdict =
  | 'county_confirms_la' // TaxRateCity == "los angeles"
  | 'county_denies_la' // TaxRateCity present, some other value
  | 'county_inconclusive'; // not found / null / error (→ ZIMAS fallback)

/** Audit fields captured for every County lookup (binding audit-log set, §A.6). */
export interface CountyAuditFields {
  /** Raw TaxRateCity as returned (the ONLY field the decision reads). */
  taxRateCityRaw: string | null;
  /**
   * Raw SitusCity — FORENSIC ONLY. Per ruling §2.3 this field is PROHIBITED as a
   * jurisdiction signal and is NOT read by classifyCountyParcel. Captured here
   * solely for the audit trail (it has forensic value: it shows the USPS/mailing
   * city that would have produced a false confirm if used).
   */
  situsCityRaw: string | null;
  /** Assessor parcel identifier(s), forensic. */
  ain: string | null;
  apn: string | null;
  /** Whether a parcel record was matched at all. */
  parcelFound: boolean;
  /** Set when the lookup failed (network/5xx/timeout); decision is fail-closed. */
  failureMode?: 'timeout' | 'http_5xx' | 'network_error' | 'bad_response';
}

export interface CountyLookupResult {
  verdict: CountyVerdict;
  audit: CountyAuditFields;
}

/** A parsed parcel record (provider-shape-agnostic; the fetcher normalizes to this). */
export interface ParsedParcelRecord {
  taxRateCity: string | null;
  situsCity: string | null;
  ain: string | null;
  apn: string | null;
}

/** normalize = lowercase + trim + collapse internal whitespace. */
export function normalizeJurisdiction(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * PURE decision core. Given the parsed parcel record(s) for a formatted address,
 * decide the County verdict. Reads ONLY taxRateCity. Never reads situsCity.
 *
 * `records` is the list of parcels the query matched. Per §A.2 the lookup is by
 * formatted address; if multiple parcels match, they should agree on
 * TaxRateCity — if they disagree, that is ambiguous and we treat as inconclusive
 * (fail-closed; the classifier routes to manual review / ZIMAS).
 */
export function classifyCountyParcel(records: ParsedParcelRecord[]): CountyLookupResult {
  if (records.length === 0) {
    return {
      verdict: 'county_inconclusive',
      audit: { taxRateCityRaw: null, situsCityRaw: null, ain: null, apn: null, parcelFound: false },
    };
  }

  // Capture audit from the first matched parcel (forensic). SitusCity captured
  // here is NOT consulted below — prohibited as a jurisdiction signal (§2.3).
  const first = records[0];
  const audit: CountyAuditFields = {
    taxRateCityRaw: first.taxRateCity,
    situsCityRaw: first.situsCity, // forensic only; never read for the decision
    ain: first.ain,
    apn: first.apn,
    parcelFound: true,
  };

  // If multiple parcels matched, require TaxRateCity agreement; disagreement → inconclusive.
  const taxCities = records
    .map((r) => (r.taxRateCity == null ? null : normalizeJurisdiction(r.taxRateCity)))
    .filter((v): v is string => v != null);

  if (taxCities.length === 0) {
    // Parcel found but TaxRateCity null → inconclusive (fall through to ZIMAS).
    return { verdict: 'county_inconclusive', audit };
  }

  const distinct = Array.from(new Set(taxCities));
  if (distinct.length > 1) {
    // Ambiguous: matched parcels disagree on tax-rate city. Fail-closed.
    return { verdict: 'county_inconclusive', audit };
  }

  const tax = distinct[0];
  if (tax === 'los angeles') {
    return { verdict: 'county_confirms_la', audit };
  }
  // Present, some other value (including "unincorporated") → not LA.
  return { verdict: 'county_denies_la', audit };
}

/** Injected fetcher: given a formatted address, return matched parcel records or throw. */
export interface CountyFetcher {
  (formattedAddress: string, signal: AbortSignal): Promise<ParsedParcelRecord[]>;
}

/** Optional cache contract (deterministic per formatted address). */
export interface CountyCache {
  get(key: string): Promise<CountyLookupResult | null>;
  set(key: string, value: CountyLookupResult): Promise<void>;
}

export interface CountyLookupDeps {
  fetcher: CountyFetcher;
  cache?: CountyCache;
  /** Per-attempt timeout (ms). Default 8000 (within §A.4 5-10s production range). */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 8_000;

function timeoutSignal(ms: number): { signal: AbortSignal; clear: () => void } {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, clear: () => clearTimeout(t) };
}

/**
 * Network lookup with one retry on transient failure and fail-closed behavior.
 * Delegates the decision to classifyCountyParcel. Never throws to the caller —
 * a failure becomes county_inconclusive with a recorded failureMode.
 */
export async function lookupCountyParcel(
  formattedAddress: string,
  deps: CountyLookupDeps,
): Promise<CountyLookupResult> {
  const cacheKey = `county:${normalizeJurisdiction(formattedAddress)}`;
  if (deps.cache) {
    const hit = await deps.cache.get(cacheKey).catch(() => null);
    if (hit) return hit;
  }

  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let lastFailure: CountyAuditFields['failureMode'] = 'network_error';

  for (let attempt = 0; attempt < 2; attempt++) {
    const { signal, clear } = timeoutSignal(timeoutMs);
    try {
      const records = await deps.fetcher(formattedAddress, signal);
      clear();
      const result = classifyCountyParcel(records);
      if (deps.cache) await deps.cache.set(cacheKey, result).catch(() => undefined);
      return result;
    } catch (e) {
      clear();
      // Categorize the failure for the audit trail; retry once on transient.
      const msg = (e as Error).message ?? '';
      if ((e as Error).name === 'AbortError') lastFailure = 'timeout';
      else if (/\b5\d\d\b/.test(msg)) lastFailure = 'http_5xx';
      else if (/parse|json|unexpected/i.test(msg)) lastFailure = 'bad_response';
      else lastFailure = 'network_error';
      // loop retries once; on second failure fall through to fail-closed below.
    }
  }

  // Fail-closed: inconclusive, never confirm on a County failure.
  return {
    verdict: 'county_inconclusive',
    audit: { taxRateCityRaw: null, situsCityRaw: null, ain: null, apn: null, parcelFound: false, failureMode: lastFailure },
  };
}

/**
 * Default network fetcher against the LA County parcel MapServer. Queries by
 * SitusFullAddress LIKE the formatted street portion AND SitusZIP. Returns parsed
 * records. Throws on non-2xx / parse failure (caller categorizes + fail-closes).
 *
 * NOTE: the formatted-address → situs-string normalization is best-effort; the
 * County stores all-caps, comma-free situs strings ("1100 WILSHIRE BLVD LOS
 * ANGELES CA 90017"). We extract the leading street line + ZIP from Google's
 * formatted address and match on those. A miss here → empty records →
 * inconclusive (→ ZIMAS fallback), which is the intended fail-soft path.
 */
export const defaultCountyFetcher: CountyFetcher = async (formattedAddress, signal) => {
  const { street, zip } = splitFormattedAddress(formattedAddress);
  // Build an ArcGIS where clause; ZIP narrows, street LIKE matches the situs head.
  const clauses: string[] = [];
  if (street) clauses.push(`SitusFullAddress LIKE '${escapeArcgis(street.toUpperCase())}%'`);
  if (zip) clauses.push(`SitusZIP LIKE '${escapeArcgis(zip)}%'`);
  const where = clauses.length ? clauses.join(' AND ') : '1=0';
  const fields = ['TaxRateCity', 'SitusCity', 'AIN', 'APN'].join(',');
  const url =
    `${COUNTY_PARCEL_ENDPOINT}?where=${encodeURIComponent(where)}` +
    `&outFields=${encodeURIComponent(fields)}&returnGeometry=false&resultRecordCount=5&f=json`;

  const resp = await fetch(url, { method: 'GET', signal });
  if (!resp.ok) throw new Error(`county HTTP ${resp.status}`);
  const json = (await resp.json()) as {
    error?: unknown;
    features?: Array<{ attributes?: Record<string, unknown> }>;
  };
  if (json.error) throw new Error('county API error');
  const feats = json.features ?? [];
  return feats.map((f) => {
    const a = f.attributes ?? {};
    return {
      taxRateCity: typeof a.TaxRateCity === 'string' ? a.TaxRateCity : null,
      situsCity: typeof a.SitusCity === 'string' ? a.SitusCity : null,
      ain: a.AIN == null ? null : String(a.AIN),
      apn: a.APN == null ? null : String(a.APN),
    };
  });
};

/** Escape single quotes for an ArcGIS where clause. */
function escapeArcgis(s: string): string {
  return s.replace(/'/g, "''");
}

/**
 * Pull the leading street line and ZIP from a Google formatted address like
 * "1100 Wilshire Boulevard, Los Angeles, CA 90017-1916, USA".
 * Returns the street head ("1100 Wilshire Boulevard") and 5-digit ZIP ("90017").
 */
export function splitFormattedAddress(formatted: string): { street: string | null; zip: string | null } {
  const parts = formatted.split(',').map((p) => p.trim());
  const street = parts.length > 0 ? parts[0] : null;
  const zipMatch = formatted.match(/\b(\d{5})(?:-\d{4})?\b/);
  return { street: street || null, zip: zipMatch ? zipMatch[1] : null };
}
