/**
 * A.5 — City-of-LA geocode classifier rewrite (the §5 binding classifier order).
 *
 * Implements the §5 binding classifier order as amended by Q1 (correction-flag
 * field set) and Q2 (correction gate moved to a post-parcel ASYMMETRIC step).
 * Order:
 *
 *   1. Granularity gate (+ 1a PROXIMITY-locality-deny → not_la)
 *   2. Locality presence → manual_review (no_locality)
 *   3. Geocode locality check → not_la else proceed
 *   4. County TaxRateCity → confirm (subject to step 6) / deny (final) / fall-through
 *   5. ZIMAS two-signal fallback → confirm (subject to step 6) / fall-through
 *   6. Correction-flag gate (ASYMMETRIC, Q2): isCorrected = hasReplacedComponents
 *      || possibleNextAction=='FIX'.
 *        - confirmed_la + isCorrected → suppress to manual_review (input_corrected)
 *        - not_la                     → passthrough (deny NEVER suppressed)
 *        - both parcel branches fell through + isCorrected → input_corrected
 *        - both fell through + not corrected → parcel_lookup_inconclusive
 *
 * Steps 1–3 are PURE (`classifyPreParcel`), no network. Steps 4–6 run in the
 * async orchestrator with injected County/ZIMAS adapters. Fail-closed throughout.
 *
 * GATE: the orchestrator asserts the LA production gate at entry. A test hook may inject
 * `gateIsOpen` (sync); otherwise the dynamic parcel-health gate (isLaProductionLive) reads
 * parcel_health_status with the 75-min freshness guard once the static predicate flag is true,
 * and short-circuits closed while it is false. No reader + no override → fail closed. Flips no
 * flag; makes no live call while the gate is closed.
 */
import { isLaProductionLive, type ParcelHealthReader } from '../parcelHealthGate';
import type {
  GeocodeDisposition,
  ManualReviewReason,
  ValidationGranularity,
} from './geocodeTypes';
import {
  lookupCountyParcel,
  parseAddressForCounty,
  type CountyLookupDeps,
  type CountyAuditFields,
  type CountyVerdict,
} from './countyParcelAdapter';
import { zipInCityOfLa, classifyZip, type ZipBucket } from './cityOfLaZips';
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
  | 'county_situs_gap'
  | 'county_ambiguous'
  | 'zimas_confirm'
  | 'zimas_miss'
  | 'correction_suppressed'
  | 'correction_inconclusive'
  | 'billing_cap_exhausted'
  | 'api_error'
  | 'gate_closed';

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
  // v3 County ruling §3.5 — logged whenever the County branch ran:
  countyQueryReturnedZeroFeatures?: boolean;
  countyZipInLaZipSet?: boolean;
  // A-3 §6.1 wire-up: three-bucket classification of the geocoded ZIP against the
  // authoritative snapshot ('in' | 'straddler' | 'out'). Audit metadata only — the
  // v6 verdict taxonomy is preserved (§6.1 clarification (f)); 'in'/'straddler' both
  // keep the address on the parcel-rail path, 'out' routes to county_situs_gap.
  countyZipBucket?: ZipBucket;
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

  // (Correction-flag gate REMOVED from pre-parcel — Q2 ruling moved it to a
  // post-parcel asymmetric suppression step in the orchestrator. Parcel branches
  // resolve first; a confirm on a corrected input is suppressed, a deny is not.)

  // STEP 2 — locality presence.
  if (i.locality === null) {
    return {
      kind: 'terminal',
      disposition: 'manual_review',
      reviewReason: 'no_locality',
      branch: 'no_locality',
    };
  }

  // STEP 3 — geocode locality check.
  if (i.locality === 'Los Angeles' && i.administrativeAreaLevel1 === 'California') {
    return { kind: 'proceed_to_parcel' };
  }
  return { kind: 'terminal', disposition: 'not_la', branch: 'locality_not_la' };
}

/**
 * Post-parcel asymmetric correction-suppression (Q2 ruling §3 step 6). Applied
 * AFTER County/ZIMAS resolve. `isCorrected` fires on hasReplacedComponents OR
 * possibleNextAction=='FIX' (Q1 field set). Asymmetry:
 *   - confirmed_la + isCorrected → suppress to manual_review (input_corrected)
 *   - not_la                     → passthrough (a deny is NEVER suppressed)
 * The compliance cost of a false confirm (defective notice) outweighs a false
 * deny (user re-tries), so the gate pays only on the confirm side.
 */
export function isCorrectedInput(c: CorrectionFlags): boolean {
  return c.hasReplacedComponents === true || c.possibleNextAction === 'FIX';
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
  /** Dynamic parcel-health gate reader (predicate-6). Injected in production by
   *  buildResolverDeps; absent in unit tests, which inject `gateIsOpen` instead. */
  parcelHealthReader?: ParcelHealthReader;
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
  // Gate: a test/override sync predicate if injected; otherwise the dynamic parcel-health gate
  // (isLaProductionLive — static short-circuit when the predicate flag is false, else reads
  // parcel_health_status with the 75-min freshness guard). No reader + no override → fail closed.
  const gateOpen: () => boolean | Promise<boolean> =
    deps.gateIsOpen ??
    (() => (deps.parcelHealthReader ? isLaProductionLive({ reader: deps.parcelHealthReader }) : false));
  if (!(await gateOpen())) {
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

  // STEP 4 — County TaxRateCity (stem-matched, ZIP-scoped). (proceed_to_parcel ⇒ formattedAddress.)
  const formatted = signals.formattedAddress ?? inputAddress;
  const county = await lookupCountyParcel(formatted, deps.county);
  audit.county = { ...county.audit, verdict: county.verdict };
  // §3.5 audit fields: zero-features + ZIP-in-LA-set, logged whenever County ran.
  const countyZip = parseAddressForCounty(formatted).zip;
  audit.countyQueryReturnedZeroFeatures = county.audit.parcelFound === false;
  audit.countyZipInLaZipSet = zipInCityOfLa(countyZip);
  audit.countyZipBucket = classifyZip(countyZip);

  if (county.verdict === 'county_confirms_la') {
    // Step 6 asymmetric suppression: a confirm on corrected input is held.
    if (isCorrectedInput(signals.correction)) {
      audit.disposition = 'manual_review';
      audit.reviewReason = 'input_corrected';
      audit.branch = 'correction_suppressed';
      await deps.recordAudit?.(audit);
      return { disposition: 'manual_review', reviewReason: 'input_corrected', audit };
    }
    audit.disposition = 'confirmed_la';
    audit.branch = 'county_confirm';
    await deps.recordAudit?.(audit);
    return { disposition: 'confirmed_la', audit };
  }
  if (county.verdict === 'county_denies_la') {
    // Deny is NEVER suppressed (asymmetry) — passthrough.
    audit.disposition = 'not_la';
    audit.branch = 'county_deny';
    await deps.recordAudit?.(audit);
    return { disposition: 'not_la', audit };
  }
  if (county.verdict === 'county_ambiguous') {
    // §2.3: >1 parcel with conflicting TaxRateCity → manual review, not a guess.
    audit.disposition = 'manual_review';
    audit.reviewReason = 'county_ambiguous';
    audit.branch = 'county_ambiguous';
    await deps.recordAudit?.(audit);
    return { disposition: 'manual_review', reviewReason: 'county_ambiguous', audit };
  }

  // county_inconclusive. §3.3: distinguish a SITUS GAP (0 features) from a
  // ran-but-non-actionable inconclusive. If 0 features AND ZIP not in the
  // City-of-LA ZIP set → manual_review (county_situs_gap), do NOT fall to ZIMAS
  // (this closes the #4 border-artifact failure mode). If 0 features but ZIP IS
  // in the LA set, or it's a different inconclusive, fall through to ZIMAS.
  if (county.audit.parcelFound === false && !zipInCityOfLa(countyZip)) {
    audit.disposition = 'manual_review';
    audit.reviewReason = 'county_situs_gap';
    audit.branch = 'county_situs_gap';
    await deps.recordAudit?.(audit);
    return { disposition: 'manual_review', reviewReason: 'county_situs_gap', audit };
  }

  // STEP 5 (ZIMAS) — County inconclusive (and not a non-LA situs gap). Needs lat/lng.
  const lat = signals.latitude;
  const lng = signals.longitude;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    // No coordinate to spatial-query → fall-through. Step 6 applies.
    if (isCorrectedInput(signals.correction)) {
      audit.disposition = 'manual_review';
      audit.reviewReason = 'input_corrected';
      audit.branch = 'correction_inconclusive';
      await deps.recordAudit?.(audit);
      return { disposition: 'manual_review', reviewReason: 'input_corrected', audit };
    }
    audit.disposition = 'manual_review';
    audit.reviewReason = 'parcel_lookup_inconclusive';
    audit.branch = 'zimas_miss';
    await deps.recordAudit?.(audit);
    return { disposition: 'manual_review', reviewReason: 'parcel_lookup_inconclusive', audit };
  }

  const zimas = await lookupZimasParcel(lat, lng, deps.zimas);
  audit.zimas = { ...zimas.audit, verdict: zimas.verdict };

  if (zimas.verdict === 'zimas_confirms_la') {
    // Step 6 asymmetric suppression at the ZIMAS confirm too.
    if (isCorrectedInput(signals.correction)) {
      audit.disposition = 'manual_review';
      audit.reviewReason = 'input_corrected';
      audit.branch = 'correction_suppressed';
      await deps.recordAudit?.(audit);
      return { disposition: 'manual_review', reviewReason: 'input_corrected', audit };
    }
    audit.disposition = 'confirmed_la';
    audit.branch = 'zimas_confirm';
    await deps.recordAudit?.(audit);
    return { disposition: 'confirmed_la', audit };
  }

  // Both parcel branches fell through (no current disposition). Step 6:
  //   isCorrected → input_corrected ; else → parcel_lookup_inconclusive.
  if (isCorrectedInput(signals.correction)) {
    audit.disposition = 'manual_review';
    audit.reviewReason = 'input_corrected';
    audit.branch = 'correction_inconclusive';
    await deps.recordAudit?.(audit);
    return { disposition: 'manual_review', reviewReason: 'input_corrected', audit };
  }
  audit.disposition = 'manual_review';
  audit.reviewReason = 'parcel_lookup_inconclusive';
  audit.branch = 'zimas_miss';
  await deps.recordAudit?.(audit);
  return { disposition: 'manual_review', reviewReason: 'parcel_lookup_inconclusive', audit };
}
