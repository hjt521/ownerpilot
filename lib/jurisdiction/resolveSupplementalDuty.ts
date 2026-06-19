/**
 * Supplemental-duty resolver (Phase 1, thin wrapper).
 *
 * Per the architecture ruling §4a (shape ii) and the Phase 1 ruling §1: this is
 * a thin wrapper over detectJurisdiction. detectJurisdiction is the authority on
 * whether a jurisdiction is production-authorized; this wrapper NEVER overrides
 * it from the matrix. The matrix's branchState is legal-research data that ships
 * dark; it is consulted only on the NO_KNOWN_OVERLAY branch, for DEFAULT routing.
 *
 * Phase 1 ships zero user-visible UI. The wrapper returns a typed discriminated
 * union; no user-facing copy is authored here (Phase 1 ruling §3). The block-copy
 * string is deferred to Phase 2 when a UI surface exists to consume it.
 *
 * Fail-closed: throws if invoked on an address that has not gone through
 * detectJurisdiction's confirmation flow (architecture ruling §1 item 4) — the
 * matrix-side analogue of getVerifiedCityHolidaySet throwing on unverified data.
 */

import {
  detectJurisdiction,
  type JurisdictionInput,
  type JurisdictionResult,
} from './detectJurisdiction';
import {
  CA_JURISDICTION_DEFAULT,
  type JurisdictionOverlayRow,
} from './caJurisdictionMatrix';

/**
 * Phase 1 reason vocabulary. Locked to exactly two values per the Phase 1
 * ruling §3. Any third value is a re-escalation. These are typed-value literals,
 * NOT user-facing legal copy — no manifest entry, no // Source: comment.
 */
export type SupplementalDutyReason =
  | 'jurisdiction-not-yet-supported'
  | 'jurisdiction-confirmation-required';

export type SupplementalDutyResolution =
  | { route: 'blocked'; reason: 'jurisdiction-not-yet-supported' }
  | { route: 'confirmation-required'; reason: 'jurisdiction-confirmation-required' }
  | { route: 'default'; defaultRow: JurisdictionOverlayRow };

/**
 * Resolve the supplemental-filing routing for a property address.
 *
 * Calls detectJurisdiction first and routes on its decision. The matrix is
 * consulted only for the DEFAULT row on NO_KNOWN_OVERLAY. The matrix is never
 * the authority on whether a hard-block or LA-ish jurisdiction is supported.
 */
export function resolveSupplementalDuty(
  input: JurisdictionInput,
): SupplementalDutyResolution {
  const detected: JurisdictionResult = detectJurisdiction(input);

  switch (detected.decision) {
    case 'BLOCK_OVERLAY_CITY':
      // Hard-block cities (incl. SF/Santa Monica whose MATRIX state is LIVE) are
      // block-routed until a per-city graduation determination. No matrix lookup.
      return { route: 'blocked', reason: 'jurisdiction-not-yet-supported' };

    case 'NEEDS_CONFIRMATION':
      // LA-ish / ambiguous. Production blocked upstream by the geocode gate.
      return {
        route: 'confirmation-required',
        reason: 'jurisdiction-confirmation-required',
      };

    case 'NO_KNOWN_OVERLAY':
      // The only branch that consults the matrix: statewide-only DEFAULT routing.
      return { route: 'default', defaultRow: CA_JURISDICTION_DEFAULT };

    default: {
      // Fail-closed: an unrecognized decision means the input did not go through
      // detectJurisdiction's confirmation flow as expected. Throw rather than
      // silently fall through to DEFAULT.
      const exhaustive: never = detected.decision;
      throw new Error(
        `resolveSupplementalDuty: unrecognized jurisdiction decision "${String(
          exhaustive,
        )}". Address was not routed through detectJurisdiction's confirmation flow.`,
      );
    }
  }
}
