// lib/decision2/brokerConfirmCopy.ts
// Lane 5 Decision 2 — broker-confirm + broker-review locked-prose, re-exported by manifest ID
// (master prompt §3.1 pattern). Changing copy requires editing locked_prose_manifest.json (broker-reviewed),
// which ci:verify-locked-prose enforces. DO NOT inline strings here.

import { lockedProse } from '@/lib/compliance/lockedProse';

// Submit-side (decision2 §2.A–§2.D, §3.3)
export const BROKER_CONFIRM_REQUEST_PROMPT     = lockedProse('BROKER_CONFIRM_REQUEST_PROMPT');     // LockedKey: BROKER_CONFIRM_REQUEST_PROMPT
export const BROKER_CONFIRM_REQUEST_BUTTON     = lockedProse('BROKER_CONFIRM_REQUEST_BUTTON');     // LockedKey: BROKER_CONFIRM_REQUEST_BUTTON
export const BROKER_CONFIRM_EMAIL_FIELD        = lockedProse('BROKER_CONFIRM_EMAIL_FIELD');        // LockedKey: BROKER_CONFIRM_EMAIL_FIELD
export const BROKER_CONFIRM_SAVE_LINK_NOTICE   = lockedProse('BROKER_CONFIRM_SAVE_LINK_NOTICE');   // LockedKey: BROKER_CONFIRM_SAVE_LINK_NOTICE
export const BROKER_CONFIRM_CANCEL_CONFIRM     = lockedProse('BROKER_CONFIRM_CANCEL_CONFIRM');     // LockedKey: BROKER_CONFIRM_CANCEL_CONFIRM
export const BROKER_CONFIRM_CHECK_STATUS_H1     = lockedProse('BROKER_CONFIRM_CHECK_STATUS_H1');     // LockedKey: BROKER_CONFIRM_CHECK_STATUS_H1
export const BROKER_CONFIRM_CHECK_STATUS_INTRO  = lockedProse('BROKER_CONFIRM_CHECK_STATUS_INTRO');  // LockedKey: BROKER_CONFIRM_CHECK_STATUS_INTRO
export const BROKER_CONFIRM_CHECK_STATUS_FIELD  = lockedProse('BROKER_CONFIRM_CHECK_STATUS_FIELD');  // LockedKey: BROKER_CONFIRM_CHECK_STATUS_FIELD
export const BROKER_CONFIRM_CHECK_STATUS_BUTTON = lockedProse('BROKER_CONFIRM_CHECK_STATUS_BUTTON'); // LockedKey: BROKER_CONFIRM_CHECK_STATUS_BUTTON
export const BROKER_CONFIRM_CHECK_STATUS_ERROR  = lockedProse('BROKER_CONFIRM_CHECK_STATUS_ERROR');  // LockedKey: BROKER_CONFIRM_CHECK_STATUS_ERROR

// Status states (decision2 §2.E–§2.H — Option A locked SSOT)
export const BROKER_REVIEW_PENDING       = lockedProse('BROKER_REVIEW_PENDING');       // LockedKey: BROKER_REVIEW_PENDING
export const BROKER_REVIEW_CONFIRMED_LA  = lockedProse('BROKER_REVIEW_CONFIRMED_LA');  // LockedKey: BROKER_REVIEW_CONFIRMED_LA
export const BROKER_REVIEW_NOT_LA        = lockedProse('BROKER_REVIEW_NOT_LA');        // LockedKey: BROKER_REVIEW_NOT_LA
export const BROKER_REVIEW_INCONCLUSIVE  = lockedProse('BROKER_REVIEW_INCONCLUSIVE');  // LockedKey: BROKER_REVIEW_INCONCLUSIVE
export const BROKER_REVIEW_EXPIRED       = lockedProse('BROKER_REVIEW_EXPIRED');       // LockedKey: BROKER_REVIEW_EXPIRED
export const BROKER_REVIEW_CANCELLED     = lockedProse('BROKER_REVIEW_CANCELLED');     // LockedKey: BROKER_REVIEW_CANCELLED
export const BROKER_REVIEW_COUNSEL_CTA   = lockedProse('BROKER_REVIEW_COUNSEL_CTA');   // LockedKey: BROKER_REVIEW_COUNSEL_CTA

/** Map a /status outcome to the locked status-state body (decision2 §2 SSOT). */
export function brokerReviewStatusCopy(status: string): string {
  switch (status) {
    case 'pending':       return BROKER_REVIEW_PENDING;
    case 'confirmed_la':  return BROKER_REVIEW_CONFIRMED_LA;
    case 'not_la':        return BROKER_REVIEW_NOT_LA;
    case 'inconclusive':  return BROKER_REVIEW_INCONCLUSIVE;
    case 'cancelled':     return BROKER_REVIEW_CANCELLED;
    case 'expired':       return BROKER_REVIEW_EXPIRED;
    default:              return BROKER_REVIEW_PENDING;
  }
}
