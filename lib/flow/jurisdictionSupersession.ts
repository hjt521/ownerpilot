/**
 * Slice 4d — jurisdiction verdict supersession for the produce gate.
 *
 * FORK A (slice4c_pageside_bridge_synchronous_flow_broker_ruling_response_2026-06-22 §2.1):
 * the synchronous `detectJurisdiction` stub remains the first-pass gate at
 * block (b) and still produces `BLOCK_OVERLAY_CITY` for hard string matches.
 * The resolver supersedes the stub ONLY on the `NEEDS_CONFIRMATION` branch, and
 * only when a cached verdict for the CURRENT normalized address is present
 * ("supersedes once present" — absent a cached verdict, the stub's
 * NEEDS_CONFIRMATION stands; FORK B's face-gating is the independent safety that
 * prevents producing an unverified notice).
 *
 * Verdict mapping (FORK A §2.1, four-way; `confirmed_other_overlay_city` verified
 * ABSENT from the resolver's GeocodeDisposition union during 4d implementation, so
 * that row is a no-op and not wired):
 *   confirmed_la       -> JURISDICTION_LA_OVERLAY_NOT_YET_AVAILABLE (hard block)
 *   not_la             -> clears NEEDS_CONFIRMATION (no jurisdiction blocker)
 *   manual_review      -> JURISDICTION_MANUAL_REVIEW_REQUIRED (hard block)
 *   resolution_failed  -> JURISDICTION_RESOLUTION_FAILED (hard block, Retry-able)
 *
 * The three new-code messages are broker-authored locked prose (ruling §3.B),
 * wired verbatim below.
 *
 * Not legal advice; product workflow logic.
 */
import type { CachedResolverVerdict } from './jurisdictionVerdict';
import { normalizeAddressKey } from './jurisdictionVerdict';
import { isLaProducePhase2dWired, isLaProductionUnblocked } from '../jurisdiction/laRtcRules';

/** Minimal blocker shape (mirrors gates.ts ProduceBlocker; code + message). */
export interface JurisdictionBlocker {
  code: string;
  message: string;
}

// --- Locked prose (ruling §3.B; wire verbatim, no paraphrase) --------------
// These are the `message` values for the three new hard-block jurisdiction
// codes. Byte-identical to slice4d_pageside_bridge_mechanism_broker_ruling_response_2026-06-22 §3.B.
export const JURISDICTION_LA_OVERLAY_NOT_YET_AVAILABLE_MESSAGE =
  "This property is in the City of Los Angeles. The Los Angeles overlay isn't available in OwnerPilot yet, so a notice for this address can't be produced here. We'll let you know when LA support is live.";
export const JURISDICTION_MANUAL_REVIEW_REQUIRED_MESSAGE =
  "We couldn't automatically determine the jurisdiction for this address. A notice for this property requires manual review before it can be produced. Please contact your broker or attorney for assistance with this address.";
export const JURISDICTION_RESOLUTION_FAILED_MESSAGE =
  "We weren't able to verify jurisdiction for this address right now. This is usually temporary. Please try again, or come back in a few minutes.";
// Phase 2D produce-overlay runtime failure (la_notice_production_gap erratum §5).
// Distinct from NOT_YET_AVAILABLE: fires when the overlay IS wired but attachment
// fails at runtime (missing PDF, SHA mismatch, I/O). Broker-locked verbatim.
export const JURISDICTION_LA_OVERLAY_ATTACHMENT_FAILED_MESSAGE =
  "This property is in the City of Los Angeles. We hit a problem attaching the required Los Angeles forms, so this notice can't be produced right now. Please try again shortly. If this persists, the issue has been logged for review.";

/**
 * Given the stub's NEEDS_CONFIRMATION outcome and the current address, return
 * the jurisdiction blocker the resolver verdict implies — or `null` when the
 * verdict CLEARS the blocker (not_la) or when no usable cached verdict is
 * present (stub's NEEDS_CONFIRMATION stands; caller pushes the stub blocker).
 *
 * The return discriminates three cases for the caller:
 *  - { kind: 'superseded', blocker }   -> push this blocker INSTEAD of the stub's
 *  - { kind: 'cleared' }               -> push NO jurisdiction blocker
 *  - { kind: 'no_verdict' }            -> push the stub's NEEDS_CONFIRMATION blocker
 */
export type SupersessionResult =
  | { kind: 'superseded'; blocker: JurisdictionBlocker }
  | { kind: 'cleared' }
  /** confirmed_la with Phase 2D wired + production gate open: the legacy
   *  NOT_YET_AVAILABLE hard block is cleared; the LA produce panel + server
   *  verify-la/la-packet now govern produce (with RTC attach + LAHD prompt). */
  | { kind: 'cleared_la' }
  | { kind: 'no_verdict' };

/** Flags injectable for tests; default to the real module gates. */
export interface SupersessionFlags {
  phase2dWired?: boolean;
  productionUnblocked?: boolean;
}

export function supersedeNeedsConfirmation(
  currentAddress: string | undefined,
  cached: CachedResolverVerdict | undefined,
  flags?: SupersessionFlags,
): SupersessionResult {
  // No cached verdict at all -> stub stands.
  if (!cached) return { kind: 'no_verdict' };
  // Cached verdict is for a DIFFERENT (edited) address -> stale; stub stands
  // until the resolver re-runs at ReviewStep entry for the new address.
  if (cached.addressKey !== normalizeAddressKey(currentAddress)) {
    return { kind: 'no_verdict' };
  }
  switch (cached.verdict) {
    case 'not_la':
      return { kind: 'cleared' };
    case 'confirmed_la': {
      // Phase 2D: when the produce-overlay is wired AND the production gate is open,
      // clear the legacy hard block — the LA produce panel + server assertion govern
      // (with RTC attach + LAHD prompt). Default (flag false) keeps NOT_YET_AVAILABLE.
      const wired = flags?.phase2dWired ?? isLaProducePhase2dWired();
      const unblocked = flags?.productionUnblocked ?? isLaProductionUnblocked();
      if (wired && unblocked) return { kind: 'cleared_la' };
      return {
        kind: 'superseded',
        blocker: {
          code: 'JURISDICTION_LA_OVERLAY_NOT_YET_AVAILABLE',
          message: JURISDICTION_LA_OVERLAY_NOT_YET_AVAILABLE_MESSAGE,
        },
      };
    }
    case 'manual_review':
      return {
        kind: 'superseded',
        blocker: {
          code: 'JURISDICTION_MANUAL_REVIEW_REQUIRED',
          message: JURISDICTION_MANUAL_REVIEW_REQUIRED_MESSAGE,
        },
      };
    case 'resolution_failed':
      return {
        kind: 'superseded',
        blocker: {
          code: 'JURISDICTION_RESOLUTION_FAILED',
          message: JURISDICTION_RESOLUTION_FAILED_MESSAGE,
        },
      };
  }
}
