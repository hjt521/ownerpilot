/**
 * Per-language LA production gate (additive wrapper).
 *
 * Per the production-status ruling Q2(A), this is a NEW module that wraps the
 * existing parameterless `isLaProductionUnblocked()` read-only, adding the
 * per-language isolation W4 §2.2(b) requires — WITHOUT editing the frozen
 * `laRtcRules.ts`.
 *
 * `isLaLanguageUnblocked({language})` returns true only when:
 *   1. the LA-wide production gate is open (all three deps built + signed off), AND
 *   2. the language is not currently under broker revision review (W4 §2.5), AND
 *   3. the language's last RTC-form refresh did not fail (W4 §2.2).
 *
 * The two supporting predicates read state the step-(e) refresh-job scaffold
 * owns. Until that scaffold lands, they default to the safe answers (not under
 * review, last refresh not failed) so this module type-checks and is testable;
 * step (e) wires them to real state. Critically, predicate (1) — the LA-wide
 * gate — is real today and returns false (gate closed), so this wrapper returns
 * false for every language until the gate genuinely opens. No bypass.
 *
 * Additive; does NOT edit laRtcRules.ts (frozen under W2).
 */
import { isLaProductionUnblocked, type RtcLanguage } from './laRtcRules';

export type LanguageGateInput = { language: RtcLanguage };

/**
 * Whether a given language may be produced/served in LA production right now.
 * Fail-closed: any condition unmet → false.
 */
export function isLaLanguageUnblocked({ language }: LanguageGateInput): boolean {
  // (1) LA-wide gate first. Real today; returns false while any dependency is
  //     unbuilt. This is the load-bearing check — no per-language state can make
  //     this true while the gate is closed.
  if (!isLaProductionUnblocked()) return false;

  // (2) language-specific revision review (W4 §2.5). Step (e) wires real state.
  if (isLanguageUnderRevisionReview(language)) return false;

  // (3) language-specific last-refresh failure (W4 §2.2). Step (e) wires real state.
  if (lastRefreshFailedFor(language)) return false;

  return true;
}

/**
 * W4 §2.5 state: is this language's RTC form currently staged-but-not-accepted
 * pending broker revision review? Stub default: no. Step (e) backs this with the
 * real rollout-review store.
 */
export function isLanguageUnderRevisionReview(_language: RtcLanguage): boolean {
  return false;
}

/**
 * W4 §2.2 state: did the last refresh check for this language fail (blocking the
 * language per the no-stale-serve policy)? Stub default: no. Step (e) backs this
 * with the real refresh-run store.
 */
export function lastRefreshFailedFor(_language: RtcLanguage): boolean {
  return false;
}
