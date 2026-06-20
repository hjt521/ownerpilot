/**
 * B.1 integration adapter — assembles the live geocode signal fetch for the
 * V2 classifier (resolveLaAddressV2). Wires the already-tested
 * geocodeNetworkAdapter fetchers (Address Validation + reverse Geocoding) into
 * the single `fetchGeocodeSignals` shape the V2 orchestrator injects, and
 * extracts the §4.2 correction flags from the AV verdict.
 *
 * This is pure assembly of existing, tested pieces — no new decision logic.
 * The classifier (resolveLaAddressV2) owns all branch decisions; this only
 * gathers the inputs.
 *
 * SECURITY: the key is passed through to the fetchers (header for AV, query for
 * Geocoding per the adapter). Never logged or returned here.
 */
import {
  fetchAddressValidation,
  fetchReverseGeocode,
} from './geocodeNetworkAdapter';
import type { ReverseGeocodeComponent } from './resolveLaAddress';
import type { ValidationGranularity } from './geocodeTypes';
import type { CorrectionFlags } from './resolveLaAddressV2';

/** The verdict fields the §4.2 correction-flag gate reads (not in the legacy AV type). */
interface AvVerdictWithCorrection {
  validationGranularity?: ValidationGranularity;
  hasInferredComponents?: boolean;
  hasReplacedComponents?: boolean;
  hasUnconfirmedComponents?: boolean;
  possibleNextAction?: string;
}

function findComponentLongName(
  components: ReverseGeocodeComponent[] | undefined,
  type: string,
): string | null {
  const c = (components ?? []).find((x) => (x.types ?? []).includes(type));
  return c?.long_name ?? null;
}

/**
 * Builds the `fetchGeocodeSignals` function the V2 classifier needs, bound to a
 * server API key. The returned function does AV → reverse-geocode and returns the
 * assembled signals (granularity, formatted address, lat/lng, locality, admin1,
 * correction flags).
 *
 * Throws on a network/parse failure (the V2 orchestrator catches it and routes
 * to manual_review api_error — never a false confirm).
 */
export function buildFetchGeocodeSignals(apiKey: string) {
  return async function fetchGeocodeSignals(inputAddress: string): Promise<{
    validationGranularity?: ValidationGranularity;
    formattedAddress?: string;
    latitude?: number;
    longitude?: number;
    locality: string | null;
    administrativeAreaLevel1: string | null;
    correction: CorrectionFlags;
  }> {
    const av = await fetchAddressValidation(inputAddress, apiKey);
    const verdict = (av.result?.verdict ?? {}) as AvVerdictWithCorrection;
    const granularity = verdict.validationGranularity;
    const formatted = av.result?.address?.formattedAddress;
    const lat = av.result?.geocode?.location?.latitude;
    const lng = av.result?.geocode?.location?.longitude;

    const correction: CorrectionFlags = {
      hasInferredComponents: verdict.hasInferredComponents === true,
      hasReplacedComponents: verdict.hasReplacedComponents === true,
      possibleNextAction: verdict.possibleNextAction,
    };

    // Without a coordinate we cannot reverse-geocode; return null locality so the
    // classifier routes appropriately (no_locality / coarse). Still carry the
    // granularity + correction so the gates upstream of locality can fire.
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return {
        validationGranularity: granularity,
        formattedAddress: formatted,
        latitude: undefined,
        longitude: undefined,
        locality: null,
        administrativeAreaLevel1: null,
        correction,
      };
    }

    const rg = await fetchReverseGeocode(lat, lng, apiKey);
    const components = rg.results?.[0]?.address_components;
    const locality = findComponentLongName(components, 'locality');
    const adminArea1 = findComponentLongName(components, 'administrative_area_level_1');

    return {
      validationGranularity: granularity,
      formattedAddress: formatted,
      latitude: lat,
      longitude: lng,
      locality,
      administrativeAreaLevel1: adminArea1,
      correction,
    };
  };
}
