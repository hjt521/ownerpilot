/**
 * RTC form baselines — the authoritative SHA-256 fingerprint and Last-Modified
 * timestamp for each language's official LAHD RTC PDF.
 *
 * These are the baselines the W4 form-refresh job (step e) compares against:
 * any SHA-256 inequality is a "change" that routes to the broker-gated rollout
 * review (W4 §2.3 strict_sha256 + §2.5).
 *
 * Provenance (broker determinations, 2026-06-19):
 *   - english + spanish: the CORRECTED Jun-16 versions, accepted per
 *     la_rtc_form_revision_acceptance_english_2026-06-19 and
 *     la_rtc_form_revision_acceptance_spanish_2026-06-19. The spanish Jun-16
 *     version fixes the Stay Housed LA phone number; the Aug-2025 spanish form
 *     (with the prior number) is intentionally NOT represented here and must
 *     never be served.
 *   - seven others: confirmed authoritative per W4 §3.1
 *     (la_rtc_forms_authoritative_source_and_refresh_policy_broker_ruling_response_2026-06-19).
 *
 * This module is additive and does NOT edit laRtcRules.ts (frozen under W2).
 * It imports only the RtcLanguage type for key-typing.
 *
 * Broker-verified data. Not legal advice.
 */
import type { RtcLanguage } from './laRtcRules';

/** Full-body SHA-256 of each language's authoritative RTC PDF (baseline for drift detection). */
export const RTC_FORM_BASELINE_HASHES: Record<RtcLanguage, string> = {
  armenian: '05b83877d97221bf3b98a4bbbaeb29235f870cef2fe3378885f991f5b51bba20',
  cantonese: '71ad943a24f1a6c49aa64c4db973b0262b92cafaa12743c9e8c5d86a1b3dafc9',
  english: 'd0653950008da9004c405a91685c2c212557ae6398eb2f79d9a6cf7d7beb5f7a', // Jun-16 (footer rev; no substantive change)
  farsi: '8d12f5a4e3bdaa60807d61d94181b8db9c6280f29f349c81b329dfdce9140ee0',
  korean: '683dbc620035d6458dc762cba776b36afd47b1f81a8eefe8a336194256e248c5',
  mandarin: 'c74efb9f64771fb059e6186f8d6f150df6cf1c8b834fe3a1eaacb76199c2acd3',
  russian: '63cc30da901b64e3c8e7a8169b38db7786dea7f5bb6a6799d8bfbdf2750bef02',
  spanish: '947885d0af7eb21f7b66c0f54294b6803923449a21c93c75c0797512455d8371', // Jun-16 CORRECTED — (888) phone fix
  tagalog: '0a70e2eb4cb863f034ddf3723b05a82f152c3172453e1169ec6c18b566428c20',
};

/** Last-Modified header value at the time each baseline was captured (ISO-8601 UTC). */
export const RTC_FORM_LAST_MODIFIED: Record<RtcLanguage, string> = {
  armenian: '2025-08-07T23:34:01Z',
  cantonese: '2025-08-07T23:34:15Z',
  english: '2026-06-16T21:03:44Z',
  farsi: '2025-08-08T23:10:15Z',
  korean: '2025-08-07T23:34:07Z',
  mandarin: '2025-08-07T23:15:03Z',
  russian: '2025-08-07T23:15:10Z',
  spanish: '2026-06-16T21:03:55Z',
  tagalog: '2025-08-07T23:14:57Z',
};
