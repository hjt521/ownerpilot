/**
 * Notice template version + attorney wording sign-off.
 *
 * The v4 payment-fields change introduces new on-the-face wording (the § 1161(2)
 * payee trio, the per-branch HOW TO PAY text, the mailbox-rule sentence). Per the
 * attorney ruling of 2026-06-01, NO v4 notice may be produced until she has
 * signed off that wording in the Part-D pass.
 *
 * This is the single switch that enforces that. The produce gate
 * (evaluateCanProduceV4) adds a hard blocker while it is false, so the entire
 * v4 path "fails closed" — exactly like the unverified-holiday-year and
 * unverified-RTC-dataset gates elsewhere in the codebase.
 *
 * DO NOT flip this to true until the reviewing attorney has signed off the v4
 * wording in writing. Flipping it is the deliberate, reviewable act that turns
 * v4 production on.
 */

export const NOTICE_TEMPLATE_VERSION = 'v4-2026-06-01-payment-fields';

/**
 * Attorney wording sign-off for the v4 template. FALSE until signed off.
 * While false, evaluateCanProduceV4 blocks production with TEMPLATE_NOT_SIGNED_OFF.
 */
export const V4_WORDING_SIGNED_OFF = false;

/**
 * Whether address geocoding is live. While false, the § 1161(2) 5-mile
 * bank-branch rule cannot be machine-verified, so a notice listing a
 * bank-deposit branch requires a human within-5-miles attestation to produce
 * (per ruling C2). Flip to true when the geocode dependency lands; the gate
 * will then verify by distance instead of requiring the attestation.
 */
export const GEOCODING_LIVE = false;
