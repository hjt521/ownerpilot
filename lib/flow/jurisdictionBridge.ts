/**
 * Slice 4d — page-side jurisdiction-resolution bridge (testable core).
 *
 * FORK B invokes the 4c server surface (`POST /api/notice/geocode`) at
 * ReviewStep entry, keyed on the normalized propertyAddress, and caches the
 * verdict in flow state. This module is the testable core of that bridge: the
 * gate check + fetch + response→verdict mapping, with every side effect
 * injected (fetch, the gate predicate, the abort signal). The React `useEffect`
 * in notice-flow.tsx is a thin wrapper that calls `runJurisdictionResolution`
 * and writes the result via `update`.
 *
 * CLOSED-GATE BEHAVIOR (ruling slice4d_gate_closed_behavior_fork_..._2026-06-22,
 * Option 1 — dormant-by-gate): the FIRST action is the page-side
 * `isLaProductionUnblocked()` check. If the gate is closed, the function returns
 * `{ kind: 'skipped_gate_closed' }` WITHOUT calling fetch, without producing a
 * verdict, and the caller writes NOTHING to flow state. The stub's
 * NEEDS_CONFIRMATION then stands (supersedeNeedsConfirmation sees no cached
 * verdict). This is the STEADY-STATE shape: when the gate opens, no code here
 * changes — only `isGateOpen()` returns true and the invocation path runs.
 *
 * NO silent fallback to the stub on error (FORK A): any non-200 surface
 * response or network/abort-adjacent error maps to the `resolution_failed`
 * verdict, never to a "pretend it resolved" state.
 *
 * Not legal advice; product workflow logic.
 */
import type { CachedJurisdictionVerdict } from './jurisdictionVerdict';
import { normalizeAddressKey } from './jurisdictionVerdict';

/** Surface success-path dispositions (the 200 body). The surface never returns
 *  `gate_closed` on 200 — that disposition lives only on the audit row. */
type SurfaceDisposition = 'confirmed_la' | 'not_la' | 'manual_review';

/** The 200 response body shape from POST /api/notice/geocode. */
interface SurfaceOkBody {
  disposition: SurfaceDisposition;
  reviewReason: string | null;
}

/** Outcome of a bridge run, for the caller (the effect) to act on. */
export type BridgeRunResult =
  | { kind: 'skipped_gate_closed' }
  | { kind: 'skipped_no_address' }
  | { kind: 'aborted' }
  | { kind: 'verdict'; verdict: CachedJurisdictionVerdict; addressKey: string };

/** Injected dependencies — all side effects and environment reads. */
export interface BridgeDeps {
  /** The page-side gate predicate (isLaProductionUnblocked). Pure, cheap; called
   *  fresh each run (no caching — the flip must be observable next entry). */
  isGateOpen: () => boolean;
  /** Injected fetch (real `fetch` in the effect; a stub in tests). */
  fetchImpl: typeof fetch;
  /** Optional abort signal (the effect supplies an AbortController for
   *  cancel-stale-on-address-edit per FORK B). */
  signal?: AbortSignal;
}

/**
 * Run one jurisdiction resolution for `address`. Returns a discriminated result;
 * the caller maps a `verdict` result into a `CachedResolverVerdict` and writes
 * it to flow state. Closed-gate and empty-address paths produce no verdict and
 * no side effect.
 */
export async function runJurisdictionResolution(
  address: string | undefined,
  deps: BridgeDeps,
): Promise<BridgeRunResult> {
  // (1) Page-side gate check FIRST. Dormant-by-gate: closed -> no fetch, no
  //     verdict, no side effect. Steady-state shape; flips with the predicate.
  if (!deps.isGateOpen()) {
    return { kind: 'skipped_gate_closed' };
  }

  const addressKey = normalizeAddressKey(address);
  if (addressKey === '') {
    return { kind: 'skipped_no_address' };
  }

  // (2) Invoke the 4c surface. Any error/non-200 -> resolution_failed (FORK A:
  //     no silent stub fallback).
  let res: Response;
  try {
    res = await deps.fetchImpl('/api/notice/geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
      signal: deps.signal,
    });
  } catch (err) {
    // Abort is a cancellation, not a failure verdict: the caller discards it.
    if (isAbortError(err)) return { kind: 'aborted' };
    return { kind: 'verdict', verdict: 'resolution_failed', addressKey };
  }

  if (deps.signal?.aborted) return { kind: 'aborted' };

  if (res.status !== 200) {
    // 503 la_production_gate_closed (defensive — shouldn't occur when the
    // page-side check is open, but the surface is the backstop), 503
    // geocode_unavailable, 400s, anything non-200: all map to the error verdict.
    // No silent stub fallback.
    return { kind: 'verdict', verdict: 'resolution_failed', addressKey };
  }

  let body: SurfaceOkBody;
  try {
    body = (await res.json()) as SurfaceOkBody;
  } catch {
    return { kind: 'verdict', verdict: 'resolution_failed', addressKey };
  }

  // (3) Map the surface disposition to the cached verdict. The three success
  //     dispositions map 1:1; anything unexpected is treated as an error verdict
  //     (never a silent pass).
  switch (body.disposition) {
    case 'confirmed_la':
    case 'not_la':
    case 'manual_review':
      return { kind: 'verdict', verdict: body.disposition, addressKey };
    default:
      return { kind: 'verdict', verdict: 'resolution_failed', addressKey };
  }
}

/** True for a DOMException/AbortError-shaped value (abort, not failure). */
function isAbortError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    (err as { name?: unknown }).name === 'AbortError'
  );
}
