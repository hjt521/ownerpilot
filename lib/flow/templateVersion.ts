/**
 * Notice template version + attorney wording sign-off.
 *
 * The v4 payment-fields change introduces new on-the-face wording (the § 1161(2)
 * payee trio, the per-branch HOW TO PAY text, the mailbox-rule sentence). That
 * wording was SIGNED OFF by the A1 Part D sign-off (2026-06-03) and countersign
 * (2026-06-04); the thirteen renderer prose constants are build-locked, verbatim
 * only (see the LOCKED comment in renderNotice.ts).
 *
 * This is the single switch that enforces the gate. The produce gate
 * (evaluateCanProduceV4) adds a hard blocker while it is false, so the entire
 * v4 path "fails closed" — exactly like the unverified-holiday-year and
 * unverified-RTC-dataset gates elsewhere in the codebase.
 *
 * It is now true (since 2026-06-04). Flipping it back to false would block all
 * v4 production; do not change it without a fresh attorney ruling.
 */

export const NOTICE_TEMPLATE_VERSION = 'v4-2026-06-01-payment-fields';

/**
 * Attorney wording sign-off for the v4 template. TRUE since 2026-06-04 per the
 * A1 Part D countersign (see renderNotice.ts LOCKED comment). While false,
 * evaluateCanProduceV4 would block production with TEMPLATE_NOT_SIGNED_OFF.
 */
export const V4_WORDING_SIGNED_OFF = true;

/**
 * Whether address geocoding is live. While false, the § 1161(2) 5-mile
 * bank-branch rule cannot be machine-verified, so a notice listing a
 * bank-deposit branch requires a human within-5-miles attestation to produce
 * (per ruling C2). Flip to true when the geocode dependency lands; the gate
 * will then verify by distance instead of requiring the attestation.
 */
export const GEOCODING_LIVE = false;

/**
 * Whether the broker-supervised notice workflow (the Step 1–7 producer) is LIVE
 * to owners in production (not dev-only). This is sunset condition (b) for the
 * help-chatbox DOCUMENTS interim notice-response language
 * (system_prompt_drift_diff_attorney_correction_2026-06-07.md §3.2).
 *
 * While FALSE, the chatbox's DOCUMENTS interim language ("…not going to draft the
 * actual notice here in chat… take it to your broker or attorney…") must keep
 * running — routing owners to a workflow they cannot yet reach would be the unsafe
 * state. When this flips to TRUE, the DOCUMENTS interim language must be revisited
 * in an attorney-reviewed prompt revision (sunset condition (a), V4_WORDING_SIGNED_OFF,
 * is already true). That coupling is ENFORCED by scripts/check_documents_sunset.mjs:
 * flipping this to true while the interim language is still in the deployed prompt
 * fails CI, so the sunset cannot be silently forgotten. Do not flip without routing
 * the DOCUMENTS revision to the attorney of record.
 */
export const BROKER_WORKFLOW_PRODUCTION_LIVE = false;
