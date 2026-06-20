/**
 * Phase 2A — City-of-LA geocode resolver.
 *
 * Implements the broker geocode parameters ruling §2.1 call sequence VERBATIM:
 *   1. Address Validation API on the input address.
 *   2. Reverse-geocode the validated lat/lng via Geocoding API.
 *   3. Confirm City-of-LA membership iff:
 *        locality === "Los Angeles" AND
 *        administrative_area_level_1 === "California" AND
 *        validationGranularity ∈ {SUB_PREMISE, PREMISE}.
 *   4. Route to manual review (§2.1(4)) when granularity is coarse, locality is
 *      missing, a boundary edge case appears, or the call errors / cap trips.
 *   5. Disposition not-LA (§2.1(5)) when locality !== "Los Angeles" at PREMISE+.
 *
 * Confidence threshold: PREMISE (§2.2). Circuit breaker: §2.3 — when the $500
 * cap is exhausted, every call short-circuits to manual review with reason
 * 'billing_cap_exhausted' (no live calls made).
 *
 * GATE: this resolver asserts isLaProductionUnblocked() at entry. While the gate
 * is closed (default at HEAD) it THROWS rather than run — no production path may
 * consult it until geocodeConfirmationBuilt flips on broker test-set sign-off
 * (ruling §3). It flips no flag and makes no live call until that sign-off.
 *
 * SECURITY: reads GOOGLE_GEOCODE_API_KEY from server env. Never logs or returns
 * the key. Server-side only.
 */
import { isLaProductionUnblocked } from '../laRtcRules';
import type {
  BillingCapStatus,
  GeocodeResult,
  ManualReviewQueue,
  ManualReviewReason,
  ValidationGranularity,
} from './geocodeTypes';

const PREMISE_OK: ReadonlySet<ValidationGranularity> = new Set<ValidationGranularity>([
  'SUB_PREMISE',
  'PREMISE',
]);

/** Minimal shapes of the Google responses the ruling §2.1 names (only fields used). */
export interface AddressValidationResponse {
  result?: {
    verdict?: {
      validationGranularity?: ValidationGranularity;
      geocodeGranularity?: ValidationGranularity;
    };
    address?: { formattedAddress?: string };
    geocode?: { location?: { latitude?: number; longitude?: number } };
  };
}
export interface ReverseGeocodeComponent {
  long_name?: string;
  short_name?: string;
  types?: string[];
}
export interface ReverseGeocodeResponse {
  results?: Array<{ address_components?: ReverseGeocodeComponent[] }>;
}

/** Pull the first component whose types include `type`. */
function findComponent(
  components: ReverseGeocodeComponent[] | undefined,
  type: string,
): ReverseGeocodeComponent | undefined {
  return (components ?? []).find((c) => (c.types ?? []).includes(type));
}

/**
 * PURE classification core (§2.1 (3)/(4)/(5)) — no network. Decides the
 * disposition from already-fetched Google data. Separated so it is exhaustively
 * unit-testable without any live call.
 */
export function classifyLaMembership(args: {
  inputAddress: string;
  validationGranularity?: ValidationGranularity;
  formattedAddress?: string;
  latitude?: number;
  longitude?: number;
  reverseComponents?: ReverseGeocodeComponent[];
}): GeocodeResult {
  const locality =
    findComponent(args.reverseComponents, 'locality')?.long_name ?? null;
  const adminArea1 =
    findComponent(args.reverseComponents, 'administrative_area_level_1')
      ?.long_name ?? null;

  const observed: GeocodeResult['observed'] = {
    validationGranularity: args.validationGranularity,
    formattedAddress: args.formattedAddress,
    locality,
    administrativeAreaLevel1: adminArea1,
    latitude: args.latitude,
    longitude: args.longitude,
  };

  const granularityOk =
    args.validationGranularity !== undefined &&
    PREMISE_OK.has(args.validationGranularity);

  // §2.1(4) first trigger: coarse granularity → manual review.
  if (!granularityOk) {
    return manualReview(args.inputAddress, 'coarse_granularity', observed);
  }

  // §2.1(4): no locality component → manual review.
  if (locality === null) {
    return manualReview(args.inputAddress, 'no_locality', observed);
  }

  // §2.1(3): confirmed LA.
  if (locality === 'Los Angeles' && adminArea1 === 'California') {
    return { disposition: 'confirmed_la', observed, inputAddress: args.inputAddress };
  }

  // §2.1(5): locality is something other than Los Angeles, at PREMISE+ → not LA.
  // (At this point granularity is OK and locality is non-null and != Los Angeles.)
  if (locality !== 'Los Angeles') {
    return { disposition: 'not_la', observed, inputAddress: args.inputAddress };
  }

  // Fallback boundary edge case (e.g. locality says LA but adminArea1 != California):
  // surface for human review rather than auto-deciding.
  return manualReview(args.inputAddress, 'boundary_edge_case', observed);
}

function manualReview(
  inputAddress: string,
  reason: ManualReviewReason,
  observed: GeocodeResult['observed'],
): GeocodeResult {
  return { disposition: 'manual_review', reviewReason: reason, observed, inputAddress };
}

/** Dependency-injected collaborators so the resolver is testable without globals. */
export interface ResolverDeps {
  fetchAddressValidation: (
    address: string,
    apiKey: string,
  ) => Promise<AddressValidationResponse>;
  fetchReverseGeocode: (
    lat: number,
    lng: number,
    apiKey: string,
  ) => Promise<ReverseGeocodeResponse>;
  queue: ManualReviewQueue;
  billing: BillingCapStatus;
  /** Returns the server API key; throws if unset. Injected for testability. */
  getApiKey: () => string;
  /**
   * Gate check. Defaults to the REAL isLaProductionUnblocked() (closed at HEAD).
   * Injectable ONLY so tests can exercise the resolver body with the gate forced
   * open — production callers omit this and get the real, load-bearing gate.
   */
  gateIsOpen?: () => boolean;
}

/**
 * Full resolver (§2.1 sequence + §2.3 circuit breaker). Asserts the closed gate
 * at entry. On any manual_review disposition, enqueues to the typed review
 * queue (§2.1(4)). Never throws on a Google error — it routes to manual review
 * with reason 'api_error' (defensive: an upstream failure must not produce a
 * false LA confirmation).
 */
export async function resolveLaAddress(
  inputAddress: string,
  deps: ResolverDeps,
): Promise<GeocodeResult> {
  // GATE: refuse to run while LA production is blocked. This is the structural
  // guarantee that the resolver cannot feed any production path pre-sign-off.
  // Defaults to the real isLaProductionUnblocked(); tests may inject an open
  // gate to exercise the body, but production callers get the real closed gate.
  const gateOpen = deps.gateIsOpen ?? isLaProductionUnblocked;
  if (!gateOpen()) {
    throw new Error('la-prod-gate-closed: geocode resolver must not run while the LA production gate is closed');
  }

  // §2.3 circuit breaker: if the $500 cap is exhausted, do not call Google.
  if (await deps.billing.isExhausted()) {
    const result = manualReview(inputAddress, 'billing_cap_exhausted', {});
    await deps.queue.enqueue({
      inputAddress,
      reason: 'billing_cap_exhausted',
      observed: {},
      enqueuedAt: new Date().toISOString(),
    });
    return result;
  }

  const apiKey = deps.getApiKey();

  let result: GeocodeResult;
  try {
    // §2.1(1) Address Validation.
    const av = await deps.fetchAddressValidation(inputAddress, apiKey);
    const granularity = av.result?.verdict?.validationGranularity;
    const formatted = av.result?.address?.formattedAddress;
    const lat = av.result?.geocode?.location?.latitude;
    const lng = av.result?.geocode?.location?.longitude;

    // If AV gave no coordinate we cannot reverse-geocode → manual review.
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      result = manualReview(inputAddress, 'coarse_granularity', {
        validationGranularity: granularity,
        formattedAddress: formatted,
      });
    } else {
      // §2.1(2) reverse-geocode the validated coordinate.
      const rg = await deps.fetchReverseGeocode(lat, lng, apiKey);
      const components = rg.results?.[0]?.address_components;
      result = classifyLaMembership({
        inputAddress,
        validationGranularity: granularity,
        formattedAddress: formatted,
        latitude: lat,
        longitude: lng,
        reverseComponents: components,
      });
    }
  } catch {
    // §2.1(4): call errored / timed out → manual review (never a false confirm).
    result = manualReview(inputAddress, 'api_error', {});
  }

  if (result.disposition === 'manual_review') {
    await deps.queue.enqueue({
      inputAddress,
      reason: result.reviewReason ?? 'api_error',
      observed: result.observed,
      enqueuedAt: new Date().toISOString(),
    });
  }

  return result;
}

/** Default API-key reader (server env). Throws if unset — never returns ''. */
export function readGeocodeApiKey(): string {
  const key = process.env.GOOGLE_GEOCODE_API_KEY;
  if (!key) {
    throw new Error('GOOGLE_GEOCODE_API_KEY is not set in the server environment');
  }
  return key;
}
