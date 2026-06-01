/**
 * Jurisdiction-detection STUB for the 3-day pay-or-quit flow.
 *
 * ⚠️  THIS IS A STUB, NOT AUTHORITATIVE JURISDICTION DETECTION.  ⚠️
 *
 * Determining whether a property is in the City of Los Angeles (or another
 * overlay city) from an address string is NOT reliable. City boundaries do not
 * follow city-name strings or ZIP codes:
 *   - "Los Angeles, CA" in an address can be unincorporated LA County (NOT the
 *     City of LA) or a mailing city that differs from the legal jurisdiction.
 *   - West Hollywood, Santa Monica, Beverly Hills, etc. are surrounded by but
 *     NOT part of the City of LA, yet sit in "Los Angeles"-flavored ZIPs.
 *   - Conversely, City-of-LA parcels exist under many ZIP codes.
 * Authoritative detection requires parcel/boundary geocoding (e.g. the LA City
 * boundary layer / a geocoder that returns incorporated-place), which is a
 * later integration. This module is the placeholder until then.
 *
 * SAFETY DIRECTION (the core design rule):
 * The two error directions are NOT equal in consequence.
 *   - FALSE NEGATIVE (property IS in City of LA but we miss it) => notice
 *     produced WITHOUT the Right-to-Counsel attachment / LAHD filing prompt =>
 *     a non-compliant served notice. THIS IS THE DANGEROUS DIRECTION.
 *   - FALSE POSITIVE (we flag a covered city that isn't) => over-warning =>
 *     merely annoying.
 * Therefore this stub FAILS TOWARD CAUTION. It will NOT emit a confident
 * "City of LA — proceed with overlay" purely from a string match, because a
 * false "proceed" is the dangerous outcome. Anything LA-ish, or any ambiguity,
 * routes to NEEDS_CONFIRMATION, not to a silent proceed.
 *
 * This is product routing logic, not legal advice.
 */

export type JurisdictionDecision =
  /** Matched a known hard-block overlay city (not LA). Block; tell user to see attorney. */
  | 'BLOCK_OVERLAY_CITY'
  /**
   * Could be the City of LA (or otherwise ambiguous). DO NOT proceed on a
   * string guess — require authoritative confirmation (geocode / user
   * verification) before treating as City-of-LA-with-overlay or as clear.
   */
  | 'NEEDS_CONFIRMATION'
  /** No known overlay detected and nothing LA-ish. Proceed (no overlay). */
  | 'NO_KNOWN_OVERLAY';

/** Phase-1 hard-block cities (per attorney Q8 + locked MVP scope). */
export const HARD_BLOCK_CITIES = [
  'San Francisco',
  'Oakland',
  'Berkeley',
  'San Jose',
  'Santa Monica',
  'West Hollywood',
] as const;

export type HardBlockCity = (typeof HARD_BLOCK_CITIES)[number];

export interface JurisdictionInput {
  /** Full property address as entered. */
  address: string;
  /**
   * Optional structured city if the flow already has it (e.g. from a verified
   * address component). More reliable than parsing the raw string, but still
   * not authoritative for City-of-LA vs. unincorporated LA County.
   */
  city?: string;
}

export interface JurisdictionResult {
  decision: JurisdictionDecision;
  /** If a hard-block city matched, which one. */
  matchedCity?: HardBlockCity;
  /**
   * User-facing message appropriate to the decision. For BLOCK and
   * NEEDS_CONFIRMATION this is the "talk to your attorney" / "we need to
   * confirm" language.
   */
  message: string;
  /**
   * Always true for this stub except a clean NO_KNOWN_OVERLAY: signals the
   * caller that this determination is preliminary and must be confirmed by an
   * authoritative source before relying on it for overlay handling.
   */
  requiresAuthoritativeConfirmation: boolean;
  /** Machine-readable note for logging/audit. */
  note: string;
}

const OVERLAY_ATTORNEY_MESSAGE =
  'This property is in {city}, which has additional local eviction-notice ' +
  'requirements that OwnerPilot does not yet fully support. Please talk to a ' +
  'California licensed attorney before serving a notice for this property.';

const LA_CONFIRM_MESSAGE =
  'This property looks like it may be in the City of Los Angeles. LA eviction ' +
  'notices carry extra requirements — a Right-to-Counsel notice and an LAHD ' +
  'filing — and OwnerPilot’s full LA support is still being finalized. We can’t ' +
  'produce an LA notice yet; LA support is coming soon. For a property outside ' +
  'the City of Los Angeles, you can continue.';

const AMBIGUOUS_CONFIRM_MESSAGE =
  'OwnerPilot needs to confirm this property’s exact city/jurisdiction before ' +
  'continuing, to make sure any local requirements are handled correctly.';

function norm(s: string | undefined): string {
  return (s ?? '').toLowerCase();
}

/**
 * Preliminary jurisdiction routing. Returns a decision that NEVER silently
 * proceeds for a possibly-covered property. See SAFETY DIRECTION above.
 *
 * Order of checks matters: hard-block cities are checked first (and some, like
 * West Hollywood and Santa Monica, also contain "los angeles"-ish ZIP context,
 * so an explicit city match must win over the LA-ish heuristic).
 */
export function detectJurisdiction(
  input: JurisdictionInput,
): JurisdictionResult {
  const haystack = `${norm(input.city)} ${norm(input.address)}`;

  // 1. Hard-block overlay cities. Check these FIRST so an explicit
  //    "West Hollywood" / "Santa Monica" doesn't get swept up by the LA-ish
  //    heuristic below.
  for (const city of HARD_BLOCK_CITIES) {
    if (haystack.includes(city.toLowerCase())) {
      return {
        decision: 'BLOCK_OVERLAY_CITY',
        matchedCity: city,
        message: OVERLAY_ATTORNEY_MESSAGE.replace('{city}', city),
        requiresAuthoritativeConfirmation: true,
        note: `Matched hard-block overlay city "${city}" by string. ` +
          `Blocked pending Phase 2+ support; string match is itself not authoritative.`,
      };
    }
  }

  // 2. Anything LA-ish => NEEDS_CONFIRMATION, never a silent proceed.
  //    Deliberately broad: we would rather over-route to confirmation than
  //    miss a City-of-LA property (the dangerous false negative).
  if (haystack.includes('los angeles') || /\bl\.?a\.?\b/.test(haystack)) {
    return {
      decision: 'NEEDS_CONFIRMATION',
      message: LA_CONFIRM_MESSAGE,
      requiresAuthoritativeConfirmation: true,
      note: 'Address is LA-ish by string. NOT treated as City-of-LA on a string ' +
        'guess (false-proceed is the dangerous direction). Routed to ' +
        'authoritative confirmation (geocode/boundary lookup) before overlay handling.',
    };
  }

  // 3. No known overlay signal. This is the only path that proceeds without
  //    requiring confirmation — and only because nothing matched. Even here,
  //    the caller should treat this as "no overlay DETECTED", not a guarantee
  //    of no overlay, since the stub does not cover every CA overlay city.
  return {
    decision: 'NO_KNOWN_OVERLAY',
    message: '',
    requiresAuthoritativeConfirmation: false,
    note: 'No known overlay city or LA signal detected by string. Proceeding ' +
      'without overlay. NOTE: stub does not enumerate every CA overlay city; ' +
      'a future geocoder should confirm.',
  };
}
