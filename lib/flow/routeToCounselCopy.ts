/**
 * Route-to-counsel page copy (Decision 2 §0-flags ruling, Flag 5).
 *
 * Source: decision2_backend_build_section0_flags_broker_ruling_2026-06-28.md
 *
 * §5.4 LOCKED copy — paste verbatim; do NOT edit without a new broker ruling. The
 * title, intro, LACBA body, and the bottom disclaimer are covered by the
 * locked-prose CI guard (docs/compliance/locked_prose_manifest.json). Per §5.1 this
 * page NEVER lists specific law firms or any attorney by name — generic referral
 * services only.
 */

/** Coupled version stamp for the locked-prose guard. */
export const routeToCounselCopyVersion = 'v1';

/** H1 — LOCKED. */
export const routeToCounselTitle = 'Find a California landlord-tenant attorney';

/** Intro paragraph — LOCKED. */
export const routeToCounselIntro =
  'OwnerPilot AI is a California real estate broker service. We can guide you through CA landlord notice procedures, but we don\'t give legal advice. If you need legal advice — about an eviction, a tenant dispute, a contract issue, or anything else where a lawyer\'s judgment matters — please contact one of the referral services below.';

/** Primary referral (LACBA) heading. */
export const routeToCounselLacbaHeading =
  'Los Angeles County Bar Association — Lawyer Referral Service';

/** Primary referral (LACBA) body — LOCKED. */
export const routeToCounselLacbaBody =
  'The LACBA Lawyer Referral Service connects you with a screened California attorney for an initial consultation.';

export const routeToCounselLacbaPhone = '(213) 243-1525';
export const routeToCounselLacbaUrl = 'https://www.smartlaw.org/';
export const routeToCounselLacbaLinkLabel = 'LACBA Lawyer Referral Service';

/** Secondary referrals (generic services only — never specific firms, §5.1). */
export const routeToCounselSecondaryHeading = 'Other California referral services';
export const routeToCounselSecondaryStateBar =
  'State Bar of California — Certified Lawyer Referral Services directory';
export const routeToCounselSecondaryCounty =
  'Your county bar association — most California counties run a referral service';

/** Bottom disclaimer — LOCKED (broker fee-splitting wall, §5.4). */
export const routeToCounselDisclaimer =
  'OwnerPilot AI operates as a California real estate broker (CalDRE B9445457). We do not refer to specific attorneys, we do not receive referral fees, and we have no fee-splitting arrangement with any attorney or law firm. The referral services above are independent of OwnerPilot AI.';
