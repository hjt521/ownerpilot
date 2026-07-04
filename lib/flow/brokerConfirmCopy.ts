/**
 * Broker-confirm owner-facing copy (Decision 2 UI slice).
 *
 * Source: decision2_owner_facing_ui_slice_broker_signoff_2026-06-28.md
 *
 * §2 + §3.3 LOCKED copy — broker-approved verbatim (incl. the three §2 edits and the
 * check-status surface). Covered by the locked-prose CI guard. The CCPA notice (C)
 * and the route-to-counsel CTA (G/CTA) are compliance-load-bearing; do NOT edit
 * without a new broker ruling. `{deadline}` in the pending string is a literal
 * placeholder substituted at render time (keeps the constant a static literal).
 */

/** Coupled version stamp for the locked-prose guard. */
export const brokerConfirmCopyVersion = 'v1';

// ---- §2 request + status + resolution ----

/** A — request prompt (broker-edited). */
export const brokerConfirmRequestPrompt =
  "We couldn't automatically confirm which city governs this address. You can request a review by our California licensed real estate broker — we'll check parcel and jurisdiction records and confirm whether this property is in the City of Los Angeles.";

/** B — request button. */
export const brokerConfirmRequestButton = 'Request broker review';

/** C — email label + CCPA notice-at-collection (compliance-load-bearing). */
export const brokerConfirmEmailNotice =
  'Email (optional) — so we can tell you when the review is done.\nWe collect this email only to notify you when your broker review completes. We do not sell or share it, and we do not add you to marketing emails. We delete it 90 days after your request resolves.';

/** D — "save this link" notice on submit (broker-edited). */
export const brokerConfirmSaveLinkNotice =
  "Your request is in. Save this page — bookmark it, or copy the URL somewhere safe. It's the only way to check your review status. We can't resend the link if you lose it.";

/** E — pending status. `{deadline}` substituted at render time. Literal wrapped in
 *  parens so the locked-prose extractor reads past the in-string ';' (it breaks on a
 *  depth-0 semicolon); the paren is stripped on decode, so the value/hash is unchanged. */
export const brokerConfirmPendingStatus =
  ('Broker review in progress. Expected by {deadline}. You can keep editing your notice; producing is paused until the review completes.');

/** F — confirmed. */
export const brokerConfirmConfirmed =
  'Confirmed — this property is in the City of Los Angeles. You can continue.';

/** G1 — denied preamble. */
export const brokerConfirmDeniedPreamble =
  'After review, we found this property is not in the City of Los Angeles. For jurisdiction-specific guidance on the city or county that does govern, please consult a California attorney.';

/** G2 — inconclusive preamble. */
export const brokerConfirmInconclusivePreamble =
  "Our broker review couldn't reach a clear conclusion on which city governs this address. For jurisdiction-specific guidance, please consult a California attorney.";

/** G3 — SLA-expired preamble. */
export const brokerConfirmExpiredPreamble =
  "Our broker review didn't resolve within the expected window. We're sorry for the wait. For jurisdiction-specific guidance, please consult a California attorney.";

/** G CTA label (shared across G1/G2/G3) → links to /route-to-counsel. */
export const brokerConfirmCounselCtaLabel = 'Find a California landlord-tenant attorney';

/** H — cancel confirmation. */
export const brokerConfirmCancelConfirm =
  'Cancel this broker review request? You can submit a new one later.';

// ---- §3.3 check-status surface ----

export const checkStatusTitle = 'Check your broker review status';
export const checkStatusIntro =
  'If you have the link we gave you when you requested a broker review, paste it below to check the status.';
export const checkStatusFieldLabel = 'Your broker review link';
export const checkStatusButton = 'Check status';
export const checkStatusError =
  "We couldn't read that link. Make sure you pasted the full URL we sent when you submitted your request. If you lost the link entirely, we can't recover it — you'll need to submit a new request.";
