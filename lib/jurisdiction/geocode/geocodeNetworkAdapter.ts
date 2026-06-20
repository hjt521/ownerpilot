/**
 * Geocode network adapter — the LIVE fetch layer for the LA geocode resolver.
 *
 * Provides the two functions the resolver injects (ResolverDeps):
 *   - fetchAddressValidation(address, apiKey) → AddressValidationResponse
 *   - fetchReverseGeocode(lat, lng, apiKey)   → ReverseGeocodeResponse
 *
 * Built against Google's DOCUMENTED request/response shapes (verified against
 * current docs 2026-06-20):
 *   - Address Validation: POST https://addressvalidation.googleapis.com/v1:validateAddress
 *     header X-Goog-Api-Key; body { address: { regionCode, addressLines } };
 *     response { result: { verdict: { validationGranularity }, address:
 *     { formattedAddress }, geocode: { location: { latitude, longitude } } } }.
 *   - Geocoding (reverse): GET https://maps.googleapis.com/maps/api/geocode/json
 *     ?latlng=LAT,LNG  header X-Goog-Api-Key; response { status, results:
 *     [ { address_components: [ { long_name|longText, types[] } ] } ] }.
 *
 * ⚠️ DOC-BUILT, LIVE-VERIFY PENDING. The sandbox has no network to Google, so
 * these shapes are doc-verified but NOT yet confirmed against live responses.
 * The broker test-set run (ruling §3) is the moment they get confirmed. All
 * parsing is DEFENSIVE: a missing/odd field degrades to a resolver
 * manual-review disposition (never a false confirm), because the resolver
 * treats absent coordinates / components as manual-review per §2.1(4).
 *
 * SECURITY: the API key is sent only in the X-Goog-Api-Key header and the
 * Geocoding query string is built WITHOUT the key in a logged location. The key
 * is never logged, never included in thrown error messages, never returned.
 * Server-side only.
 */
import type {
  AddressValidationResponse,
  ReverseGeocodeResponse,
  ReverseGeocodeComponent,
} from './resolveLaAddress';

const AV_ENDPOINT = 'https://addressvalidation.googleapis.com/v1:validateAddress';
const GEOCODE_ENDPOINT = 'https://maps.googleapis.com/maps/api/geocode/json';
const TIMEOUT_MS = 10_000;

/** AbortController-based timeout so a hung request becomes an error (→ manual review). */
function withTimeout(ms: number): { signal: AbortSignal; clear: () => void } {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, clear: () => clearTimeout(t) };
}

/**
 * Normalize a raw Google reverse-geocode component to the resolver's expected
 * shape. Handles BOTH the legacy `long_name`/`short_name` and the newer
 * `longText`/`shortText` field variants (Google ships both depending on
 * endpoint version — observed in docs 2026-06-20). The classifier reads
 * `long_name`, so we map either source into it.
 */
function normalizeComponent(raw: Record<string, unknown>): ReverseGeocodeComponent {
  const longName =
    (typeof raw.long_name === 'string' && raw.long_name) ||
    (typeof raw.longText === 'string' && raw.longText) ||
    undefined;
  const shortName =
    (typeof raw.short_name === 'string' && raw.short_name) ||
    (typeof raw.shortText === 'string' && raw.shortText) ||
    undefined;
  const types = Array.isArray(raw.types) ? (raw.types as string[]) : [];
  return { long_name: longName, short_name: shortName, types };
}

/**
 * Address Validation fetch. Sends regionCode 'US' + the raw address line.
 * Returns the resolver's AddressValidationResponse shape. Throws on network
 * error / non-2xx / timeout — the resolver's try/catch turns that into a
 * manual-review disposition (never a false confirm).
 */
export async function fetchAddressValidation(
  address: string,
  apiKey: string,
): Promise<AddressValidationResponse> {
  const { signal, clear } = withTimeout(TIMEOUT_MS);
  try {
    const resp = await fetch(AV_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey, // key only here, never logged
      },
      body: JSON.stringify({ address: { regionCode: 'US', addressLines: [address] } }),
      signal,
    });
    if (!resp.ok) {
      // Do not include the key or full URL in the error.
      throw new Error(`address-validation HTTP ${resp.status}`);
    }
    const json = (await resp.json()) as AddressValidationResponse;
    return json;
  } finally {
    clear();
  }
}

/**
 * Reverse-geocode fetch. GET with latlng=LAT,LNG (no space). Returns the
 * resolver's ReverseGeocodeResponse shape with components normalized. A non-OK
 * Google `status` is surfaced as a thrown error so the resolver fails safe.
 */
export async function fetchReverseGeocode(
  lat: number,
  lng: number,
  apiKey: string,
): Promise<ReverseGeocodeResponse> {
  const { signal, clear } = withTimeout(TIMEOUT_MS);
  try {
    // latlng must have NO space (Google requirement). Key goes in the header,
    // NOT the query string, so the URL is safe to log if ever needed.
    const url = `${GEOCODE_ENDPOINT}?latlng=${encodeURIComponent(`${lat},${lng}`)}`;
    const resp = await fetch(url, {
      method: 'GET',
      headers: { 'X-Goog-Api-Key': apiKey }, // key only here, never logged
      signal,
    });
    if (!resp.ok) {
      throw new Error(`reverse-geocode HTTP ${resp.status}`);
    }
    const raw = (await resp.json()) as {
      status?: string;
      results?: Array<{ address_components?: Array<Record<string, unknown>> }>;
    };

    // Google returns status OK / ZERO_RESULTS / OVER_QUERY_LIMIT / etc. Anything
    // other than OK with results is treated as "no usable data" → the resolver
    // will route to manual review (no locality found). We surface OVER_QUERY_LIMIT
    // / REQUEST_DENIED as errors so they alert rather than silently degrade.
    const status = raw.status ?? 'UNKNOWN';
    if (status === 'OVER_QUERY_LIMIT' || status === 'REQUEST_DENIED' || status === 'INVALID_REQUEST') {
      throw new Error(`reverse-geocode status ${status}`);
    }

    const results = (raw.results ?? []).map((r) => ({
      address_components: (r.address_components ?? []).map(normalizeComponent),
    }));
    return { results };
  } finally {
    clear();
  }
}
