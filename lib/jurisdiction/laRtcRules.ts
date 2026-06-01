/**
 * Los Angeles Right-to-Counsel (RTC) overlay — VERIFIED RULES + boundary.
 *
 * Attorney-verified 2026-06-01 (see citation pull sign-off). This module holds
 * the RTC rule FACTS as structured data, the AB 2347 post-production boundary
 * message, and a structural gate that makes producing LA notices impossible
 * until the three required dependencies are satisfied.
 *
 * ⚠️  SCOPE OF THE SIGN-OFF (critical):
 * The attorney verified the RULES and approved BUILDING the overlay logic. The
 * sign-off explicitly does NOT authorize producing LA notices in the live
 * product. Three dependencies must each land with their own attorney sign-off
 * first (see LA_PRODUCTION_DEPENDENCIES). The `isLaProductionUnblocked()` gate
 * below enforces this in code, not just in comments.
 *
 * Not legal advice; encodes attorney-verified rules.
 */

// --- Verified rule facts ---------------------------------------------------

export interface VerifiedRuleEntry {
  verified: boolean;
  verifiedBy?: string; // "Name, SBN ######"
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
 * OFFICIAL PDF (embed-and-refresh per attorney direction), never a regenerated
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

/** Attorney-verified RTC rule facts. */
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
  verifiedBy: '{ATTORNEY_NAME}, SBN {SBN}', // replace with reviewing attorney name + SBN before commit
  verifiedOn: '2026-06-01',
  source:
    'LAHD RTC page (https://housing.lacity.gov/rtc) and JCO page ' +
    '(https://housing.lacity.gov/residents/just-cause-for-eviction-ordinance-jco), ' +
    'fetched + attorney-verified 2026-06-01; City of LA Ordinance 188,681; ' +
    'LAMC 151.09.C.9 & 165.05.B.5 (3-business-day filing); ' +
    'CCP § 1167 as amended by AB 2347 (UD response, court days).',
};

// --- AB 2347 post-production boundary --------------------------------------

/**
 * The ENTIRE permitted post-production message regarding the UD stage / AB 2347.
 * Per attorney direction: ZERO specific day-counts about the UD stage. Do not
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
 * may be unblocked. The attorney sign-off authorized building the overlay but
 * NOT producing LA notices until these land, each with its own sign-off.
 *
 * These flags default to false and must be flipped only when the corresponding
 * dependency is built AND attorney/admin-signed-off. They are deliberately not
 * wired to any auto-detection — flipping them is a human, reviewed act.
 */
export interface LaProductionDependencies {
  /** Authoritative City-of-LA boundary confirmation (geocode), not string match. */
  geocodeConfirmationBuilt: boolean;
  /** Verified LA city business-day calendar for the LAHD filing deadline. */
  cityBusinessDayCalendarBuilt: boolean;
  /** Embedded RTC forms with versioning + hash-comparison refresh job. */
  rtcFormRefreshJobBuilt: boolean;
}

/** Current state: NONE built. LA production is blocked. */
export const LA_PRODUCTION_DEPENDENCIES: LaProductionDependencies = {
  geocodeConfirmationBuilt: false,
  cityBusinessDayCalendarBuilt: false,
  rtcFormRefreshJobBuilt: false,
};

/**
 * Structural gate: returns true ONLY when all three dependencies are satisfied.
 * The produce path must consult this before ever attaching an RTC notice and
 * treating an LA property as produceable. Until then, LA stays blocked — the
 * code enforces the sign-off's "does not authorize production" condition.
 */
export function isLaProductionUnblocked(
  deps: LaProductionDependencies = LA_PRODUCTION_DEPENDENCIES,
): boolean {
  return (
    deps.geocodeConfirmationBuilt === true &&
    deps.cityBusinessDayCalendarBuilt === true &&
    deps.rtcFormRefreshJobBuilt === true
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
  return missing;
}
