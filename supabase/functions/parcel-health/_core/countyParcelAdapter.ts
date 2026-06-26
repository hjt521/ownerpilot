// ============================================================================
// GENERATED FILE — DO NOT EDIT
// Source: lib/jurisdiction/geocode/countyParcelAdapter.ts
// Regenerate with: npm run build:parcel-health-core
// CI guard: git diff --exit-code supabase/functions/parcel-health/_core/
// Governing ruling: slice2_architecture_and_alert_sink_broker_ruling_2026-06-25.md
// ============================================================================
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

// CROSS-WORKSTREAM MIRROR: this file is mirrored into
// supabase/functions/parcel-health/_core/ for the parcel-health Edge Function — the
// County health probe (lib/jurisdiction/parcelHealth/endpoints/county.ts) reuses
// buildCountyParcelQueryUrl + parseAddressForCounty from here. Any edit to this file
// MUST regenerate that mirror in the same PR:  npm run build:parcel-health-core
// or CI's verify-parcel-health-core-sync will fail. (Slice-2 C-6 sync obligation,
// extended cross-workstream per the drip-001 divergence ruling, broker 2026-06-25.)

export const COUNTY_PARCEL_ENDPOINT =
  'https://public.gis.lacounty.gov/public/rest/services/LACounty_Cache/LACounty_Parcel/MapServer/0/query';

/** County jurisdiction verdict the classifier (A.5) consumes. */
export type CountyVerdict =
  | 'county_confirms_la' // TaxRateCity == "los angeles"
  | 'county_denies_la' // TaxRateCity present, some other value
  | 'county_ambiguous' // >1 parcel with conflicting TaxRateCity (ruling §2.3)
  | 'county_inconclusive'; // not found (0 features) / null / error (resolver gates on ZIP)

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
    // Ambiguous: matched parcels disagree on tax-rate city (ruling §2.3) → distinct
    // verdict so the resolver routes to manual_review (county_ambiguous), not ZIMAS.
    return { verdict: 'county_ambiguous', audit };
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

/** Parsed street components the County structured-field query consumes. */
export interface ParsedCountyAddress {
  house: string | null;
  coreStreet: string | null;
  zip: string | null;
}

/**
 * Build the County parcel MapServer query URL for a parsed address.
 *
 * Structured-field match (v3 ruling §2.4, refined): Google's formatted address
 * is inconsistent about directionals (drops "S", spells out "West") and jams in
 * unit numbers ("Apt 5"), so a SitusFullAddress LIKE reconstruction misses. The
 * County normalizes into SitusHouseNo / SitusStreet (incl. suffix, e.g.
 * "NORMANDIE AVE") / SitusDirection (separate). Match house + core street name
 * (directional + unit + suffix stripped) + ZIP5 — directional- and unit-agnostic.
 *
 * Pure: no I/O. Extracted from defaultCountyFetcher (behavior-preserving) so the
 * parcel-health probe (lib/jurisdiction/parcelHealth/endpoints/county.ts) reuses
 * the exact production where-clause encoder per the slice-2 mirror principle.
 */
export function buildCountyParcelQueryUrl(parsed: ParsedCountyAddress): string {
  const { house, coreStreet, zip } = parsed;
  const clauses: string[] = [];
  if (house) clauses.push(`SitusHouseNo = '${escapeArcgis(house)}'`);
  if (coreStreet) clauses.push(`SitusStreet LIKE '${escapeArcgis(coreStreet)}%'`);
  if (zip) clauses.push(`SitusZIP LIKE '${escapeArcgis(zip)}%'`);
  // Require at least house + street to avoid over-broad matches.
  const where = house && coreStreet ? clauses.join(' AND ') : '1=0';
  const fields = ['TaxRateCity', 'SitusCity', 'AIN', 'APN'].join(',');
  return (
    `${COUNTY_PARCEL_ENDPOINT}?where=${encodeURIComponent(where)}` +
    `&outFields=${encodeURIComponent(fields)}&returnGeometry=false&resultRecordCount=10&f=json`
  );
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
  const url = buildCountyParcelQueryUrl(parseAddressForCounty(formattedAddress));

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
 * USPS Publication 28 Appendix C street-suffix set (the common forms Google
 * spells out and the County abbreviates). Closed enumeration; stripping the
 * trailing suffix token makes the County `SitusFullAddress LIKE` match regardless
 * of spelled-out vs abbreviated form. (Ruling §2.4.)
 */
const STREET_SUFFIXES: ReadonlySet<string> = new Set([
  'ALLEY', 'ANNEX', 'ARCADE', 'AVENUE', 'BAYOU', 'BEACH', 'BEND', 'BLUFF', 'BOULEVARD',
  'BRANCH', 'BRIDGE', 'BROOK', 'BURG', 'BYPASS', 'CAMP', 'CANYON', 'CAPE', 'CAUSEWAY',
  'CENTER', 'CIRCLE', 'CLIFF', 'CLUB', 'COMMON', 'CORNER', 'COURSE', 'COURT', 'COVE',
  'CREEK', 'CRESCENT', 'CREST', 'CROSSING', 'CURVE', 'DALE', 'DAM', 'DIVIDE', 'DRIVE',
  'ESTATE', 'EXPRESSWAY', 'EXTENSION', 'FALL', 'FALLS', 'FERRY', 'FIELD', 'FLAT', 'FORD',
  'FOREST', 'FORGE', 'FORK', 'FORT', 'FREEWAY', 'GARDEN', 'GATEWAY', 'GLEN', 'GREEN',
  'GROVE', 'HARBOR', 'HAVEN', 'HEIGHTS', 'HIGHWAY', 'HILL', 'HILLS', 'HOLLOW', 'INLET',
  'ISLAND', 'JUNCTION', 'KEY', 'KNOLL', 'LAKE', 'LANDING', 'LANE', 'LIGHT', 'LOAF',
  'LOCK', 'LODGE', 'LOOP', 'MALL', 'MANOR', 'MEADOW', 'MEWS', 'MILL', 'MISSION',
  'MOTORWAY', 'MOUNT', 'MOUNTAIN', 'NECK', 'ORCHARD', 'OVAL', 'OVERPASS', 'PARK',
  'PARKWAY', 'PASS', 'PASSAGE', 'PATH', 'PIKE', 'PINE', 'PLACE', 'PLAIN', 'PLAZA',
  'POINT', 'PORT', 'PRAIRIE', 'RADIAL', 'RAMP', 'RANCH', 'RAPID', 'REST', 'RIDGE',
  'RIVER', 'ROAD', 'ROUTE', 'ROW', 'RUN', 'SHOAL', 'SHORE', 'SPRING', 'SPUR', 'SQUARE',
  'STATION', 'STRAVENUE', 'STREAM', 'STREET', 'SUMMIT', 'TERRACE', 'THROUGHWAY', 'TRACE',
  'TRACK', 'TRAFFICWAY', 'TRAIL', 'TUNNEL', 'TURNPIKE', 'UNDERPASS', 'UNION', 'VALLEY',
  'VIADUCT', 'VIEW', 'VILLAGE', 'VILLE', 'VISTA', 'WALK', 'WALL', 'WAY', 'WELL',
]);

/** Directional tokens (prefix or as the County's SitusDirection), spelled + abbrev. */
const DIRECTIONALS: ReadonlySet<string> = new Set([
  'N', 'S', 'E', 'W', 'NE', 'NW', 'SE', 'SW',
  'NORTH', 'SOUTH', 'EAST', 'WEST', 'NORTHEAST', 'NORTHWEST', 'SOUTHEAST', 'SOUTHWEST',
]);
/** Secondary-unit designators (USPS Pub 28 Appendix C2) that may pollute the street line. */
const UNIT_DESIGNATORS: ReadonlySet<string> = new Set([
  'APT', 'APARTMENT', 'STE', 'SUITE', 'UNIT', 'RM', 'ROOM', 'FL', 'FLOOR', 'BLDG',
  'BUILDING', 'DEPT', 'SPC', 'SPACE', 'LOT', 'TRLR', 'HNGR', 'SLIP', 'PIER', 'KEY', '#',
]);

/**
 * Parse a Google-formatted address into the parts the County STRUCTURED-FIELD
 * query needs. Google's formatting is inconsistent (drops directionals, spells
 * them out, jams unit numbers into the street line), so we extract:
 *   - house: leading numeric token
 *   - coreStreet: street NAME with the directional prefix, any secondary-unit
 *     tail (Apt 5, Ste 200, #3), AND the trailing street-type suffix all removed
 *   - zip: 5-digit postal code (from the postal position, not the house number)
 *
 * The County stores street name in `SitusStreet` (e.g. "NORMANDIE AVE") with the
 * directional in its own `SitusDirection` field, so matching `SitusStreet LIKE
 * '<coreStreet>%'` is directional- and format-agnostic. Example:
 *   "11460 Normandie Avenue, ..., CA 90044" → house 11460, core "NORMANDIE", zip 90044
 *   "1234 South Hill Street Apt 5, ..., 90015" → house 1234, core "HILL", zip 90015
 *   "7510 West Sunset Boulevard, ..., 90046" → house 7510, core "SUNSET", zip 90046
 */
export function parseAddressForCounty(formatted: string): {
  house: string | null;
  coreStreet: string | null;
  zip: string | null;
} {
  const parts = formatted.split(',').map((p) => p.trim());
  const streetLine = parts.length > 0 ? parts[0] : '';
  // ZIP from the postal position, NOT the first 5-digit run (house numbers can be
  // 5 digits). Prefer the group after a 2-letter state token; else the LAST group.
  let zip: string | null = null;
  const stateZip = formatted.match(/\b[A-Z]{2}\s+(\d{5})(?:-\d{4})?\b/);
  if (stateZip) {
    zip = stateZip[1];
  } else {
    const all = formatted.match(/\b\d{5}(?:-\d{4})?\b/g);
    if (all && all.length) zip = all[all.length - 1].slice(0, 5);
  }

  let tokens = streetLine.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { house: null, coreStreet: null, zip };

  // House number = leading numeric token.
  let house: string | null = null;
  if (/^\d+[A-Za-z]?$/.test(tokens[0])) {
    house = tokens[0];
    tokens = tokens.slice(1);
  }

  // Strip a leading directional prefix (N / S / North / South / ...).
  if (tokens.length > 1 && DIRECTIONALS.has(tokens[0].toUpperCase().replace(/\.$/, ''))) {
    tokens = tokens.slice(1);
  }

  // Truncate at the first secondary-unit designator (Apt, Ste, Unit, #, ...).
  const unitIdx = tokens.findIndex((t) => UNIT_DESIGNATORS.has(t.toUpperCase().replace(/\.$/, '')) || t.startsWith('#'));
  if (unitIdx >= 0) tokens = tokens.slice(0, unitIdx);

  // Strip a trailing recognized street-type suffix (Boulevard, Avenue, ...).
  if (tokens.length > 1) {
    const last = tokens[tokens.length - 1].toUpperCase().replace(/\.$/, '');
    if (STREET_SUFFIXES.has(last)) tokens = tokens.slice(0, -1);
  }

  const coreStreet = tokens.length > 0 ? tokens.join(' ').toUpperCase() : null;
  return { house, coreStreet, zip };
}
