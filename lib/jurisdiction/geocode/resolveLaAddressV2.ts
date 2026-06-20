/**
 * A.5 — City-of-LA geocode classifier rewrite (the §5 binding classifier order).
 *
 * Implements `la_geocode_parcel_lookup_open_questions_broker_ruling_response_2026-06-20`
 * §5 EXACTLY, as refined by the findings ruling (§4.1/4.2/4.3) and the ZIMAS
 * ratification (two-signal rule). Order:
 *
 *   1. Granularity gate:
 *      1a. PROXIMITY + locality non-null, non-"Los Angeles", admin1=California → not_la
 *          (else, coarse) → manual_review (coarse_granularity)
 *   2. Correction-flag gate: hasInferredComponents | hasReplacedComponents |
 *      possibleNextAction==FIX → manual_review (input_corrected)
 *   3. Locality presence: locality null → manual_review (no_locality)
 *   4. Geocode locality check: locality=="Los Angeles" && admin1=="California"
 *      → proceed to step 5; else → not_la
 *   5. County TaxRateCity:
 *        confirms_la → confirmed_la (ZIMAS not consulted)
 *        denies_la   → not_la       (ZIMAS not consulted)
 *        inconclusive → step 6
 *   6. ZIMAS fallback:
 *        confirms_la (two-signal) → confirmed_la
 *        inconclusive (miss/fail) → manual_review (parcel_lookup_inconclusive)
 *
 * A.6 — every classification produces a full audit record (see GeocodeAuditRecord)
 * naming the branch that produced the disposition.
 *
 * Steps 1–4 are PURE (`classifyPreParcel`), exhaustively unit-testable with no
 * network. Steps 5–6 run in the async orchestrator with injected County/ZIMAS
 * adapters. Fail-closed throughout: nothing here produces confirmed_la on an
 * error path.
 *
 * GATE: the orchestrator asserts isLaProductionUnblocked() at entry (default; a
 * test hook may inject an open gate). Flips no flag; makes no live call until
 * geocodeConfirmationBuilt flips on broker sign-off.
 */
import { isLaProductionUnblocked } from '../laRtcRules';
import type {
  GeocodeDisposition,
  ManualReviewReason,
  ValidationGranularity,
} from './geocodeTypes';
import {
  lookupCountyParcel,
  type CountyLookupDeps,
  type CountyAuditFields,
  type CountyVerdict,
} from './countyParcelAdapter';
import {
  lookupZimasParcel,
  type ZimasLookupDeps,
  type ZimasAuditFields,
  type ZimasVerdict,
} from './zimasParcelAdapter';

const PREMISE_OK: ReadonlySet<ValidationGranularity> = new Set<ValidationGranularity>([
  'SUB_PREMISE',
  'PREMISE',
]);
const PROXIMITY: ValidationGranularity = 'PREMISE_PROXIMITY' as ValidationGranularity;

/** Branch that produced the disposition (audit dimension, §A.6). */
export type ClassifierBranch =
  | 'granularity_proximity_deny'
  | 'coarse_granularity'
  | 'correction_flag'
  | 'no_locality'
  | 'locality_not_la'
  | 'county_confirm'
  | 'county_deny'
  | 'zimas_confirm'
  | 'zimas_miss'
  | 'billing_cap_exhausted'
  | 'api_error';

/** Google AV correction flags read at step 2 (§4.2). */
export interface CorrectionFlags {
  hasInferredComponents?: boolean;
  hasReplacedComponents?: boolean;
  possibleNextAction?: string;
}

/** Full audit record for one classification (A.6, binding). */
export interface GeocodeAuditRecord {
  inputAddress: string;
  // Google geocode signals
  locality: string | null;
  administrativeAreaLevel1: string | null;
  validationGranularity?: ValidationGranularity;
  formattedAddress?: string;
  latitude?: number;
  longitude?: number;
  // correction flags (§4.2)
  hasInferredComponents: boolean;
  hasReplacedComponents: boolean;
  possibleNextAction: string | null;
  // County branch (may be absent if not reached)
  county?: CountyAuditFields & { verdict: CountyVerdict };
  // ZIMAS branch (may be absent if not reached)
  zimas?: ZimasAuditFields & { verdict: ZimasVerdict };
  // outcome
  disposition: GeocodeDisposition;
  reviewReason?: ManualReviewReason;
  branch: ClassifierBranch;
}

export interface GeocodeResultV2 {
  disposition: GeocodeDisposition;
  reviewReason?: ManualReviewReason;
  audit: GeocodeAuditRecord;
}

/** Inputs to the pure pre-parcel classifier (steps 1–4). */
export interface PreParcelInput {
  inputAddress: string;
  validationGranularity?: ValidationGranularity;
  formattedAddress?: string;
  latitude?: number;
  longitude?: number;
  locality: string | null;
  administrativeAreaLevel1: string | null;
  correction: CorrectionFlags;
}

/** Pre-parcel outcome: either terminal, or "proceed to parcel branch". */
export type PreParcelOutcome =
  | { kind: 'terminal'; disposition: GeocodeDisposition; reviewReason?: ManualReviewReason; branch: ClassifierBranch }
  | { kind: 'proceed_to_parcel' };

function baseAudit(i: PreParcelInput): GeocodeAuditRecord {
  return {
    inputAddress: i.inputAddress,
    locality: i.locality,
    administrativeAreaLevel1: i.administrativeAreaLevel1,
    validationGranularity: i.validationGranularity,
    formattedAddress: i.formattedAddress,
    latitude: i.latitude,
    longitude: i.longitude,
    hasInferredComponents: i.correction.hasInferredComponents === true,
    hasReplacedComponents: i.correction.hasReplacedComponents === true,
    possibleNextAction: i.correction.possibleNextAction ?? null,
    disposition: 'manual_review',
    branch: 'api_error',
  };
}

/**
 * PURE classifier core — §5 steps 1–4. No network. Returns a terminal
 * disposition OR signals to proceed to the parcel branch (steps 5–6).
 */
export function classifyPreParcel(i: PreParcelInput): PreParcelOutcome {
  const granularityOk =
    i.validationGranularity !== undefined && PREMISE_OK.has(i.validationGranularity);

  // STEP 1 — granularity gate.
  if (!granularityOk) {
    // 1a — PROXIMITY-locality-deny (§4.3): PROXIMITY + locality non-null,
    // non-"Los Angeles", admin1 California → not_la.
    if (
      i.validationGranularity === PROXIMITY &&
      i.locality !== null &&
      i.locality !== 'Los Angeles' &&
      i.administrativeAreaLevel1 === 'California'
    ) {
      return { kind: 'terminal', disposition: 'not_la', branch: 'granularity_proximity_deny' };
    }
    // Boundary case from the ruling: PROXIMITY + locality=="Los Angeles" must NOT
    // trigger 1a — it falls through here to coarse_granularity.
    return {
      kind: 'terminal',
      disposition: 'manual_review',
      reviewReason: 'coarse_granularity',
      branch: 'coarse_granularity',
    };
  }

  // STEP 2 — correction-flag gate (§4.2).
  const corrected =
    i.correction.hasInferredComponents === true ||
    i.correction.hasReplacedComponents === true ||
    i.correction.possibleNextAction === 'FIX';
  if (corrected) {
    return {
      kind: 'terminal',
      disposition: 'manual_review',
      reviewReason: 'input_corrected',
      branch: 'correction_flag',
    };
  }

  // STEP 3 — locality presence.
  if (i.locality === null) {
    return {
      kind: 'terminal',
      disposition: 'manual_review',
      reviewReason: 'no_locality',
      branch: 'no_locality',
    };
  }

  // STEP 4 — geocode locality check.
  if (i.locality === 'Los Angeles' && i.administrativeAreaLevel1 === 'California') {
    return { kind: 'proceed_to_parcel' };
  }
  return { kind: 'terminal', disposition: 'not_la', branch: 'locality_not_la' };
}

/** Orchestrator deps: the geocode fetchers + both parcel adapters + gate hook. */
export interface ResolverV2Deps {
  /** Returns the pre-parcel signals from Google (AV + reverse geocode). */
  fetchGeocodeSignals: (inputAddress: string) => Promise<{
    validationGranularity?: ValidationGranularity;
    formattedAddress?: string;
    latitude?: number;
    longitude?: number;
    locality: string | null;
    administrativeAreaLevel1: string | null;
    correction: CorrectionFlags;
  }>;
  county: CountyLookupDeps;
  zimas: ZimasLookupDeps;
  gateIsOpen?: () => boolean;
  /** Optional sink for the audit record (A.6). Defaults to no-op. */
  recordAudit?: (record: GeocodeAuditRecord) => Promise<void> | void;
}

/**
 * Full resolver — §5 order end to end. Gate-asserted. Fail-closed: any error
 * routes to manual_review, never a false confirm.
 */
export async function resolveLaAddressV2(
  inputAddress: string,
  deps: ResolverV2Deps,
): Promise<GeocodeResultV2> {
  const gateOpen = deps.gateIsOpen ?? isLaProductionUnblocked;
  if (!gateOpen()) {
    throw new Error('la-prod-gate-closed: geocode resolver must not run while the LA production gate is closed');
  }

  // Fetch Google signals; on error, fail-closed to api_error manual review.
  let signals: Awaited<ReturnType<ResolverV2Deps['fetchGeocodeSignals']>>;
  try {
    signals = await deps.fetchGeocodeSignals(inputAddress);
  } catch {
    const audit: GeocodeAuditRecord = {
      inputAddress,
      locality: null, administrativeAreaLevel1: null,
      hasInferredComponents: false, hasReplacedComponents: false, possibleNextAction: null,
      disposition: 'manual_review', reviewReason: 'api_error', branch: 'api_error',
    };
    await deps.recordAudit?.(audit);
    return { disposition: 'manual_review', reviewReason: 'api_error', audit };
  }

  const pre: PreParcelInput = {
    inputAddress,
    validationGranularity: signals.validationGranularity,
    formattedAddress: signals.formattedAddress,
    latitude: signals.latitude,
    longitude: signals.longitude,
    locality: signals.locality,
    administrativeAreaLevel1: signals.administrativeAreaLevel1,
    correction: signals.correction,
  };

  const audit = baseAudit(pre);
  const outcome = classifyPreParcel(pre);

  // Steps 1–4 terminal.
  if (outcome.kind === 'terminal') {
    audit.disposition = outcome.disposition;
    audit.reviewReason = outcome.reviewReason;
    audit.branch = outcome.branch;
    await deps.recordAudit?.(audit);
    return { disposition: outcome.disposition, reviewReason: outcome.reviewReason, audit };
  }

  // STEP 5 — County TaxRateCity. (proceed_to_parcel ⇒ we have a formattedAddress.)
  const formatted = signals.formattedAddress ?? inputAddress;
  const county = await lookupCountyParcel(formatted, deps.county);
  audit.county = { ...county.audit, verdict: county.verdict };

  if (county.verdict === 'county_confirms_la') {
    audit.disposition = 'confirmed_la';
    audit.branch = 'county_confirm';
    await deps.recordAudit?.(audit);
    return { disposition: 'confirmed_la', audit };
  }
  if (county.verdict === 'county_denies_la') {
    audit.disposition = 'not_la';
    audit.branch = 'county_deny';
    await deps.recordAudit?.(audit);
    return { disposition: 'not_la', audit };
  }

  // STEP 6 — ZIMAS fallback (County inconclusive). Needs the lat/lng.
  const lat = signals.latitude;
  const lng = signals.longitude;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    // No coordinate to spatial-query → inconclusive (fail-closed).
    audit.disposition = 'manual_review';
    audit.reviewReason = 'parcel_lookup_inconclusive';
    audit.branch = 'zimas_miss';
    await deps.recordAudit?.(audit);
    return { disposition: 'manual_review', reviewReason: 'parcel_lookup_inconclusive', audit };
  }

  const zimas = await lookupZimasParcel(lat, lng, deps.zimas);
  audit.zimas = { ...zimas.audit, verdict: zimas.verdict };

  if (zimas.verdict === 'zimas_confirms_la') {
    audit.disposition = 'confirmed_la';
    audit.branch = 'zimas_confirm';
    await deps.recordAudit?.(audit);
    return { disposition: 'confirmed_la', audit };
  }

  // ZIMAS miss / two-signal fail / error → manual_review (parcel_lookup_inconclusive).
  audit.disposition = 'manual_review';
  audit.reviewReason = 'parcel_lookup_inconclusive';
  audit.branch = 'zimas_miss';
  await deps.recordAudit?.(audit);
  return { disposition: 'manual_review', reviewReason: 'parcel_lookup_inconclusive', audit };
}
