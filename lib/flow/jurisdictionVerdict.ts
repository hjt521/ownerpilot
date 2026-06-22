/**
 * Cached jurisdiction-resolver verdict (Slice 4d).
 *
 * FORK B (slice4c_pageside_bridge_synchronous_flow_broker_ruling_response_2026-06-22)
 * invokes `resolveLaAddressV2` at ReviewStep entry, keyed on the normalized
 * `propertyAddress`, and caches the verdict in flow state. The gate
 * (`evaluateCanProduceV4`) reads this cached verdict synchronously and never
 * makes the async call itself.
 *
 * Ruling 4d-A.1 (§1.1 constraint 1): the cache captures ONLY enough to make the
 * gate decision without re-invoking the resolver on refresh — the verdict enum,
 * the normalized address it was keyed on, and the resolved-at timestamp. The
 * full audit-row payload is NOT cached here; that is the gate's input substrate,
 * not the user's session state. Persisting this field bumps DRAFT_VERSION 2 -> 3
 * (see lib/flow/persistence.ts); pre-4d drafts are discarded on load.
 *
 * Not legal advice; product workflow state.
 */

/**
 * The terminal outcomes the page-side bridge records. The first three mirror the
 * resolver's success-path `GeocodeDisposition` (the resolver cannot return
 * `gate_closed` on the 200 path — that disposition appears only on the
 * gate-closed audit row, never to the client). `resolution_failed` is the
 * client-side verdict for any non-200 surface response or network error: per
 * FORK A there is NO silent fallback to the stub, so an error is its own
 * blocking verdict.
 */
export type CachedJurisdictionVerdict =
  | 'confirmed_la'
  | 'not_la'
  | 'manual_review'
  | 'resolution_failed';

/**
 * The cached resolver verdict for one normalized address. `null` verdict is not
 * representable — absence of a verdict is represented by the whole field being
 * undefined on NoticeFlowData (the gate then leaves the stub's NEEDS_CONFIRMATION
 * standing per the "supersedes once present" reading).
 */
export interface CachedResolverVerdict {
  /** The terminal verdict the bridge recorded for `addressKey`. */
  verdict: CachedJurisdictionVerdict;
  /**
   * The normalized `propertyAddress` this verdict was keyed on (FORK B keying:
   * trim + collapse internal whitespace + lowercase). The gate compares the
   * current normalized address against this; a mismatch means the cache is stale
   * for the current address and the verdict does NOT apply (the resolver re-runs
   * at ReviewStep entry for the new address).
   */
  addressKey: string;
  /** ISO timestamp when the verdict was recorded (audit / staleness reference). */
  resolvedAt: string;
}

/**
 * Normalize a property address into the cache key (FORK B keying rule). The
 * broker constraint is only that visually-identical addresses produce the same
 * key; this is the build-picked normalization: trim, collapse internal runs of
 * whitespace to a single space, lowercase.
 */
export function normalizeAddressKey(address: string | undefined | null): string {
  return (address ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}
