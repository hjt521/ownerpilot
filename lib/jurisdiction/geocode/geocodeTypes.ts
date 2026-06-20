/**
 * Types for the LA City-of-LA geocode resolver (Phase 2A).
 *
 * Encodes the disposition model and the manual-review queue contract from the
 * broker geocode parameters ruling (la_geocode_resolver_parameters_broker_ruling_2026-06-19),
 * §2.1 (call sequence + routing) and §2.1(4) (manual-review must be a real typed
 * surface, not a log line).
 *
 * This module is types only — no live calls, no side effects.
 */

/** The three terminal dispositions a candidate LA address resolves to. */
export type GeocodeDisposition =
  | 'confirmed_la' // §2.1(3): inside City of LA, auto-confirmed at PREMISE+
  | 'not_la' // §2.1(5): resolved to a locality other than Los Angeles
  | 'manual_review'; // §2.1(4): anything that cannot be auto-decided

/** Why a candidate routed to manual review (§2.1(4) + §5 classifier order). */
export type ManualReviewReason =
  | 'coarse_granularity' // validationGranularity is BLOCK/ROUTE/OTHER/GRANULARITY_UNSPECIFIED
  | 'no_locality' // reverse-geocode returned no locality component
  | 'boundary_edge_case' // AV claimed LA but reverse-geocode locality != "Los Angeles"
  | 'api_error' // call errored / timed out
  | 'billing_cap_exhausted' // §2.3: $500 cap circuit breaker tripped
  // --- §5 classifier-order additions (parcel-lookup-questions ruling) ---
  | 'input_corrected' // §5 step 2: Google AV inferred/replaced components (possibleNextAction FIX)
  | 'parcel_lookup_inconclusive' // §5 steps 5/6: County inconclusive AND ZIMAS miss/error
  // --- v3 County branch ruling additions ---
  | 'county_situs_gap' // County 0-features for the address AND ZIP not in City-of-LA ZIP set
  | 'county_ambiguous'; // County stem+ZIP returned >1 parcel with conflicting TaxRateCity

/** Granularity values Address Validation can return (the ones the ruling names). */
export type ValidationGranularity =
  | 'SUB_PREMISE'
  | 'PREMISE'
  | 'BLOCK'
  | 'ROUTE'
  | 'OTHER'
  | 'GRANULARITY_UNSPECIFIED';

/** A single resolver outcome. */
export interface GeocodeResult {
  disposition: GeocodeDisposition;
  /** Present when disposition is 'manual_review'. */
  reviewReason?: ManualReviewReason;
  /** Echo of what Google returned, for audit/telemetry (never includes the API key). */
  observed: {
    validationGranularity?: ValidationGranularity;
    formattedAddress?: string;
    locality?: string | null;
    administrativeAreaLevel1?: string | null;
    latitude?: number;
    longitude?: number;
  };
  /** The input address, echoed for queue traceability. */
  inputAddress: string;
}

/**
 * A pending manual-review item (§2.1(4)). The queue is a typed surface; its
 * backing storage (Supabase table / admin UI) is wired separately. Build does
 * NOT invent a schema here — the interface is the contract.
 */
export interface ManualReviewItem {
  inputAddress: string;
  reason: ManualReviewReason;
  observed: GeocodeResult['observed'];
  /** ISO timestamp the item was enqueued. */
  enqueuedAt: string;
}

/**
 * The manual-review queue contract. §2.1(4): "a real surface (admin UI or a
 * typed queue in DB), not a log line that gets ignored." Implementations back
 * this with persistent storage; the stub implementation (for build/test before
 * the DB lands) holds items in memory and is clearly marked non-persistent.
 */
export interface ManualReviewQueue {
  enqueue(item: ManualReviewItem): Promise<void>;
  /** For admin/test surfaces to read pending items. */
  list(): Promise<ManualReviewItem[]>;
}

/** Signal the resolver consults to know whether the $500 cap is exhausted (§2.3). */
export interface BillingCapStatus {
  /** True when GCP billing has crossed the $500 cap (circuit breaker open). */
  isExhausted(): Promise<boolean>;
}
