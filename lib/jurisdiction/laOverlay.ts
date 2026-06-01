/**
 * LA overlay requirement computation.
 *
 * Given a property CONFIRMED to be in the City of Los Angeles, compute what RTC
 * obligations attach to a 3-day pay-or-quit: which language form, the posting
 * obligation, and the LAHD filing prompt. Pure logic over verified rules.
 *
 * IMPORTANT — this computes WHAT WOULD ATTACH; it does not authorize production.
 * The produce path must still consult isLaProductionUnblocked() (laRtcRules.ts)
 * before acting on any of this. Computing the requirements is safe; producing
 * the notice is gated on the three dependencies.
 *
 * Language selection (attorney-confirmed):
 *  - Attach the RTC form in the tenant's primary language IF among the nine
 *    LAHD-published languages.
 *  - If the primary language is not among the nine -> English fallback.
 *  - If primary language is UNKNOWN -> do NOT silently default. The flow must
 *    prompt to capture it before producing. We surface `languageUnknown` so the
 *    flow can enforce the prompt; if the user explicitly selects
 *    "unknown/prefer not to say", that is a DIFFERENT state (englishWithLoggedAck)
 *    handled by the flow, not a silent default here.
 *
 * Not legal advice; encodes attorney-verified rules.
 */

import {
  RTC_PUBLISHED_LANGUAGES,
  RtcLanguage,
  LA_RTC_RULES,
} from './laRtcRules';

export type PrimaryLanguageInput =
  | { kind: 'known'; language: string }
  | { kind: 'explicitly_unknown' } // user chose "unknown / prefer not to say"
  | { kind: 'not_captured' }; // system hasn't asked yet

export type RtcLanguageResolution =
  | { status: 'matched'; language: RtcLanguage }
  | { status: 'english_fallback'; reason: 'language_not_published' }
  | { status: 'english_with_logged_ack'; reason: 'explicitly_unknown' }
  | { status: 'must_capture_first' }; // flow must prompt before producing

/** Resolve which RTC form language to attach (or that we must ask first). */
export function resolveRtcLanguage(
  input: PrimaryLanguageInput,
): RtcLanguageResolution {
  switch (input.kind) {
    case 'not_captured':
      // Attorney addition: do not silently default. Force capture.
      return { status: 'must_capture_first' };

    case 'explicitly_unknown':
      // User declined to specify -> English, but the flow logs that English was
      // served because no other language was known at the time.
      return { status: 'english_with_logged_ack', reason: 'explicitly_unknown' };

    case 'known': {
      const norm = input.language.trim().toLowerCase();
      if ((RTC_PUBLISHED_LANGUAGES as readonly string[]).includes(norm)) {
        return { status: 'matched', language: norm as RtcLanguage };
      }
      // Primary language known but LAHD hasn't published it -> English fallback.
      return { status: 'english_fallback', reason: 'language_not_published' };
    }
  }
}

export interface LaOverlayRequirements {
  /** RTC notice must be attached to the served eviction notice. Always true for LA. */
  rtcAttachmentRequired: true;
  /** Which language resolution applies (or must-capture). */
  language: RtcLanguageResolution;
  /** RTC notice must be posted in a common area. Always true for LA. */
  postingRequired: true;
  /** LAHD filing prompt fires (all eviction notices). Always true for LA. */
  lahdFilingPromptRequired: true;
  /** Business-day count for the filing deadline (rule fact). */
  lahdFilingDeadlineBusinessDays: number;
  /**
   * Whether the filing deadline can be shown as a COMPUTED date. False until the
   * LA city business-day calendar dependency is built; until then the prompt
   * shows "within 3 business days — confirm exact deadline with LAHD".
   */
  filingDeadlineComputable: boolean;
}

/**
 * Compute the overlay requirements for a CONFIRMED LA property. `cityCalendarBuilt`
 * reflects whether the LA city business-day calendar dependency exists yet; it
 * gates whether the filing deadline is computable (defaults false = not yet).
 */
export function computeLaOverlayRequirements(
  primaryLanguage: PrimaryLanguageInput,
  cityCalendarBuilt = false,
): LaOverlayRequirements {
  return {
    rtcAttachmentRequired: true,
    language: resolveRtcLanguage(primaryLanguage),
    postingRequired: true,
    lahdFilingPromptRequired: true,
    lahdFilingDeadlineBusinessDays: LA_RTC_RULES.filingDeadlineBusinessDays,
    filingDeadlineComputable: cityCalendarBuilt === true,
  };
}
