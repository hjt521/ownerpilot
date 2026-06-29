/**
 * LAHD filing-prompt copy (Phase 2D produce-success page).
 *
 * Source: la_notice_production_gap_broker_ruling_2026-06-28_erratum_artifact_drop_2026-06-28.md
 *
 * LOCKED prose (§5 of the artifact-drop erratum; originally locked at
 * lahd_filing_prompt_copy_broker_determination_2026-06-18.md §1). Verbatim — do NOT
 * edit without a new broker ruling. Surfaced on the produce-success page for an
 * LA-jurisdiction notice; the owner must acknowledge before the page completes.
 * Long strings are wrapped in parens so the locked-prose extractor reads the full
 * literal; the paren is stripped on decode, so the value/hash is unchanged.
 */

/** Coupled version stamp for the locked-prose guard (advances when the broker updates LAHD copy). */
export const lahdFilingPromptCopyVersion = 'v1';

export const lahdFilingPromptHeader = 'File this notice with LAHD within 3 business days';

export const lahdFilingPromptBody =
  ('The City of Los Angeles requires this 3-day notice to be filed with the Los Angeles Housing Department (LAHD) within 3 business days of service on the tenant. Filing applies to all eviction notices for all rental units in the City of LA, regardless of whether the unit is covered by the Rent Stabilization Ordinance or the Just Cause Ordinance. Filing is the landlord\'s obligation. Failure to file may be raised by the tenant as an affirmative defense in an unlawful detainer action. Authority: Los Angeles Municipal Code §§ 151.09.C.9 and 165.05.B.5.');

export const lahdFilingChannelsList =
  ('File one of three ways:\n\n1. **Online** — Upload a PDF of the notice to the LAHD eviction filing portal at housing.lacity.gov. This is the fastest method and produces an automatic confirmation receipt.\n2. **By mail** — Mail a hard copy of the notice (with a printed LAHD cover sheet) to LAHD. Postmark date is not the filing date — LAHD\'s date of receipt controls.\n3. **In person** — Deliver a hard copy of the notice to an LAHD public counter.\n\nFile the actual notice that was served. The LAHD cover sheet alone is not a filing. Include the proof of service if one was prepared — the service date is what the 3-business-day clock measures from.');
