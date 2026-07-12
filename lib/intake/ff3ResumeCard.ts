// lib/intake/ff3ResumeCard.ts
// FF-3 Block B — render the entry-13 resume card the owner acknowledges after a broker resolves an
// awaiting_broker_review hold. Locked prose: chatFf3ResumeAfterBrokerReviewCard (manifest entry 13), ratified in
// ff3_countersign_ordering_awaiting_review_reconciliation_2026-07-03.md §2.2. No auto-resume — this card is shown
// on the owner's next session load when broker_resolution_note is present; the owner taps continue to proceed.
//
// The broker's note is OWNER-FACING VERBATIM: whatever the admin typed lands in the {broker_resolution_note} slot
// exactly. Function-form replacement so any regex-special chars in the note are inserted literally.

import { lockedProseEntry } from '@/lib/compliance/lockedProse';

export const FF3_RESUME_LOCKED_KEY = 'chatFf3ResumeAfterBrokerReviewCard';

/** Render the entry-13 resume card with the broker's resolution note interpolated verbatim. */
export function ff3ResumeCard(brokerResolutionNote: string): string {
  return lockedProseEntry(FF3_RESUME_LOCKED_KEY).value.replace(
    '{broker_resolution_note}',
    () => brokerResolutionNote,
  );
}

// Block C renders the CONTINUE-ONLY variant (no reply-to-broker control until the reply seam ships) —
// ff3_block_c_locked_prose_amendment_ratification_2026-07-11 §3. Entry-13 above is preserved unrendered for the
// future reply-seam block.
export const FF3_RESUME_CONTINUE_ONLY_KEY = 'chatFf3ResumeAfterBrokerReviewCardContinueOnly';

/** Render the Block-C continue-only resume card with the broker's note interpolated verbatim (function-form
 *  replace so any regex-special chars in the note are inserted literally). */
export function ff3ResumeCardContinueOnly(brokerResolutionNote: string): string {
  return lockedProseEntry(FF3_RESUME_CONTINUE_ONLY_KEY).value.replace(
    '{broker_resolution_note}',
    () => brokerResolutionNote,
  );
}
