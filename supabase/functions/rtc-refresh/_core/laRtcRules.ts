// ============================================================================
// GENERATED FILE — DO NOT EDIT
// Source: lib/jurisdiction/laRtcRules.ts
// Regenerate with: npm run build:edge-core
// CI guard: git diff --exit-code supabase/functions/rtc-refresh/_core/
// Governing ruling: rtc_edge_core_gitignore_vs_guard_broker_ruling_response_2026-06-23.md
// ============================================================================
/**
 * Los Angeles Right-to-Counsel (RTC) overlay — BROKER-VERIFIED RULES + boundary.
 *
 * Broker-verified 2026-06-01 via primary-source citation pull (see broker sign-off). This module holds
 * the RTC rule FACTS as structured data, the AB 2347 post-production boundary
 * message, and a structural gate that makes producing LA notices impossible
 * until the three required dependencies are satisfied.
 *
 * ⚠️  SCOPE OF THE SIGN-OFF (critical):
 * The broker verified the RULES (per primary-source citation pull) and authorized BUILDING the overlay logic. The
 * sign-off explicitly does NOT authorize producing LA notices in the live
 * product. Three dependencies must each land with their own broker sign-off
 * first (see LA_PRODUCTION_DEPENDENCIES). The `isLaProductionUnblocked()` gate
 * below enforces this in code, not just in comments.
 *
 * Not legal advice; encodes broker-verified rules.
 */

// --- Verified rule facts ---------------------------------------------------

export interface VerifiedRuleEntry {
  verified: boolean;
  verifiedBy?: string; // "Jack Taglyan, CalDRE B9445457"
  verifiedOn?: string; // 'YYYY-MM-DD'
  source: string;
}

/** The nine languages LAHD publishes the RTC notice in. English is the fallback. */
export const RTC_PUBLISHED_LANGUAGES = [
  'english',
  'spanish',
  'korean',
  'farsi',
  'armenian',
  'russian',
  'cantonese',
  'mandarin',
  'tagalog',
] as const;

export type RtcLanguage = (typeof RTC_PUBLISHED_LANGUAGES)[number];

/**
 * Official LAHD-published RTC notice form locations. The product must serve the
 * OFFICIAL PDF (embed-and-refresh per broker direction), never a regenerated
 * copy. These URLs are the canonical source for the embed-and-refresh job.
 * NOTE: presence here does NOT mean a verified local copy exists — that's the
 * form-refresh dependency (see LA_PRODUCTION_DEPENDENCIES).
 */
export const RTC_FORM_URLS: Record<RtcLanguage, string> = {
  english:
    'https://housing.lacity.gov/wp-content/uploads/2025/07/NOTICE-OF-TENANTS-RIGHT-TO-COUNSEL-PROGRAM-English.pdf',
  spanish:
    'https://housing.lacity.gov/wp-content/uploads/2025/07/NOTICE-OF-TENANTS-RIGHT-TO-COUNSEL-PROGRAM-Spanish.pdf',
  korean:
    'https://housing.lacity.gov/wp-content/uploads/2025/07/NOTICE-OF-TENANTS-RIGHT-TO-COUNSEL-PROGRAM-Korean.pdf',
  farsi:
    'https://housing.lacity.gov/wp-content/uploads/2025/07/NOTICE-OF-TENANTS-RIGHT-TO-COUNSEL-PROGRAM-Farsi.pdf',
  armenian:
    'https://housing.lacity.gov/wp-content/uploads/2025/07/NOTICE-OF-TENANTS-RIGHT-TO-COUNSEL-PROGRAM-Armenian.pdf',
  russian:
    'https://housing.lacity.gov/wp-content/uploads/2025/07/NOTICE-OF-TENANTS-RIGHT-TO-COUNSEL-PROGRAM-Russian.pdf',
  cantonese:
    'https://housing.lacity.gov/wp-content/uploads/2025/07/NOTICE-OF-TENANTS-RIGHT-TO-COUNSEL-PROGRAM-Traditional-Chinese.pdf',
  mandarin:
    'https://housing.lacity.gov/wp-content/uploads/2025/07/NOTICE-OF-TENANTS-RIGHT-TO-COUNSEL-PROGRAM-Simplified-Chinese.pdf',
  tagalog:
    'https://housing.lacity.gov/wp-content/uploads/2025/07/NOTICE-OF-TENANTS-RIGHT-TO-COUNSEL-PROGRAM-Tagalog.pdf',
};

/** Broker-verified RTC rule facts. */
export const LA_RTC_RULES: VerifiedRuleEntry & {
  effectiveDate: string;
  ordinance: string;
  /** Filing scope confirmed as ALL eviction notices, not just at-fault. */
  filingScope: 'all_eviction_notices';
  filingDeadlineBusinessDays: number;
} = {
  effectiveDate: '2025-08-20',
  ordinance: 'City of Los Angeles Ordinance 188,681 (RTC/RTCPO), LAMC Ch. XVI',
  filingScope: 'all_eviction_notices',
  filingDeadlineBusinessDays: 3,
  verified: true,
  verifiedBy: 'Jack Taglyan, CalDRE B9445457', // broker-verified per primary-source citation pull 2026-06-01
  verifiedOn: '2026-06-01',
  source:
    'LAHD RTC page (https://housing.lacity.gov/rtc) and JCO page ' +
    '(https://housing.lacity.gov/residents/just-cause-for-eviction-ordinance-jco), ' +
    'fetched + broker-verified 2026-06-01; City of LA Ordinance 188,681; ' +
    'LAMC 151.09.C.9 & 165.05.B.5 (3-business-day filing); ' +
    'CCP § 1167 as amended by AB 2347 (UD response, court days).',
};

// --- AB 2347 post-production boundary --------------------------------------

/**
 * The ENTIRE permitted post-production message regarding the UD stage / AB 2347.
 * Per broker direction: ZERO specific day-counts about the UD stage. Do not
 * add "10 days", "court days", "business days", or any number near this. The
 * product must never compute, display, or track UD/court deadlines.
 *
 * Enforcement note for reviewers/CI: search the codebase for the literal "10"
 * near UD/eviction language before shipping. This string intentionally contains
 * no day counts.
 */
export const UD_STAGE_BOUNDARY_MESSAGE =
  'Next stage is attorney-handled. If the tenant does not pay or move within ' +
  'the 3-day period, the next step is filing an unlawful detainer (eviction) ' +
  'action in court. That filing, and everything after it, is handled by your ' +
  'California licensed attorney — not by OwnerPilot. We do not compute, ' +
  'display, or track court deadlines.';

// --- Production-readiness gate (structural enforcement) ---------------------

/**
 * The three dependencies that must ALL be satisfied before LA notice production
 * may be unblocked. The broker sign-off authorized building the overlay but
 * NOT producing LA notices until these land, each with its own sign-off.
 *
 * These flags default to false and must be flipped only when the corresponding
 * dependency is built AND broker/admin-signed-off. They are deliberately not
 * wired to any auto-detection — flipping them is a human, reviewed act.
 */
export interface LaProductionDependencies {
  /** Authoritative City-of-LA boundary confirmation (geocode), not string match. */
  geocodeConfirmationBuilt: boolean;
  /** Verified LA city business-day calendar for the LAHD filing deadline. */
  cityBusinessDayCalendarBuilt: boolean;
  /** Embedded RTC forms with versioning + hash-comparison refresh job. */
  rtcFormRefreshJobBuilt: boolean;
  // --- Production-traffic conditions (geocode v6 ratification §2.6) -----------
  // The three flags above are BUILD-CORRECTNESS signals. These three are
  // PRODUCTION-TRAFFIC conditions that must ALSO hold before real LA traffic
  // flows. Separable concerns: a build flag can be true (code correct) while a
  // traffic condition is false (deployment infra not yet in place). Optional so
  // existing partial dependency literals keep compiling; the gate uses === true,
  // so absent/undefined correctly fails closed. All effectively default false.
  /** Audit-log sink + manual-review queue on durable storage (not in-memory). */
  geocodeAuditDurabilityWired?: boolean;
  /** City-of-LA ZIP set replaced with the authoritative USPS LACA / LA City GIS pull. */
  cityOfLaZipsAuthoritative?: boolean;
  /** Quarterly County + ZIMAS endpoint health-check cron live, with drift notification. */
  parcelEndpointHealthCheckLive?: boolean;
}

/**
 * Current state. geocodeConfirmationBuilt flipped TRUE per the geocode v6
 * production attestation ratification (la_geocode_resolver_v6_production_
 * attestation_broker_ratification_2026-06-20 §2.1). cityBusinessDayCalendarBuilt
 * flipped TRUE per la_city_calendar_dependency_broker_signoff_2026-06-20 (flip-
 * eligibility confirmed) and la_go_live_status_and_open_decisions_broker_ruling_
 * response_2026-06-20 §2 (per-flag flip authorized; §1.1 amendment). rtcFormRefresh
 * JobBuilt flipped TRUE per the RTC form-refresh attestation packet
 * (rtc_form_refresh_attestation_packet_2026-06-25 §6 broker attestation; all
 * eight predicates PASS). geocodeAuditDurabilityWired previously flipped TRUE
 * per the geocode audit durability gate-flip determination
 * (geocode_audit_durability_gate_flip_broker_attestation_2026-06-23) — comment
 * synced in this PR. cityOfLaZipsAuthoritative flipped TRUE per the predicate-5
 * attestation packet (2026-06-27). parcelEndpointHealthCheckLive flipped TRUE per the
 * predicate-6 attestation packet (predicate_6_parcel_endpoint_health_check_live_
 * attestation_packet_2026-06-27 §8, broker CalDRE B9445457): all six predicates are now
 * satisfied — isLaProductionUnblocked() returns true and the LA production gate is OPEN.
 *
 * Build marker 2026-06-28: content change to force a fresh client-bundle compile of this
 * module (predicate-6 go-live cache-bust). Prior production builds were cache restores that
 * reused a pre-flip chunk; touching this file's content forces webpack to recompile it so the
 * served bundle reflects parcelEndpointHealthCheckLive: true. No behavior change.
 */
export const LA_PRODUCTION_DEPENDENCIES: LaProductionDependencies = {
  geocodeConfirmationBuilt: true,
  cityBusinessDayCalendarBuilt: true,
  rtcFormRefreshJobBuilt: true,
  geocodeAuditDurabilityWired: true,
  cityOfLaZipsAuthoritative: true,
  parcelEndpointHealthCheckLive: true,
};

/**
 * Structural gate: returns true ONLY when all six dependencies are satisfied —
 * the three build-correctness flags AND the three production-traffic conditions
 * (geocode v6 ratification §2.6). The produce path must consult this before ever
 * attaching an RTC notice and treating an LA property as produceable. With
 * geocodeConfirmationBuilt, cityBusinessDayCalendarBuilt, rtcFormRefreshJobBuilt,
 * and geocodeAuditDurabilityWired all true, plus cityOfLaZipsAuthoritative (predicate-5)
 * and parcelEndpointHealthCheckLive (predicate-6) flipped, ALL SIX are satisfied — this
 * returns true and the LA production gate is OPEN (go-live, predicate-6 attestation
 * 2026-06-27). The dynamic parcel-health fail-closed behavior is enforced at the produce
 * path (isLaProductionLive); this structural predicate is the static six-flag check.
 */
export function isLaProductionUnblocked(
  deps: LaProductionDependencies = LA_PRODUCTION_DEPENDENCIES,
): boolean {
  return (
    deps.geocodeConfirmationBuilt === true &&
    deps.cityBusinessDayCalendarBuilt === true &&
    deps.rtcFormRefreshJobBuilt === true &&
    // Production-traffic conditions (§2.6) — must hold before real LA traffic.
    deps.geocodeAuditDurabilityWired === true &&
    deps.cityOfLaZipsAuthoritative === true &&
    deps.parcelEndpointHealthCheckLive === true
  );
}

/** Human-readable list of what's still missing, for UI/admin surfaces. */
export function laProductionMissingDependencies(
  deps: LaProductionDependencies = LA_PRODUCTION_DEPENDENCIES,
): string[] {
  const missing: string[] = [];
  if (!deps.geocodeConfirmationBuilt)
    missing.push('Authoritative City-of-LA geocode confirmation');
  if (!deps.cityBusinessDayCalendarBuilt)
    missing.push('Verified LA city business-day calendar (LAHD filing deadline)');
  if (!deps.rtcFormRefreshJobBuilt)
    missing.push('RTC form embed-and-refresh job (versioned, hash-checked)');
  if (!deps.geocodeAuditDurabilityWired)
    missing.push('Geocode audit-log + manual-review queue on durable storage (§2.6)');
  if (!deps.cityOfLaZipsAuthoritative)
    missing.push('Authoritative City-of-LA ZIP set (C-8 × Census ZCTA-2010 snapshot, A-3 §2.6)');
  if (!deps.parcelEndpointHealthCheckLive)
    missing.push('County + ZIMAS endpoint health-check cron (§2.6)');
  return missing;
}
