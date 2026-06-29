/**
 * LA produce-overlay gate (la_notice_production_gap_broker_ruling_2026-06-28 §2).
 *
 * The fail-closed produce check for a City-of-LA notice. Consulted ONLY for a
 * `confirmed_la` verdict (the caller routes non-LA verdicts through the existing
 * statewide path). Pure core; the server produce endpoint supplies the runtime
 * inputs and maps the result to HTTP (409 + error code on block).
 *
 * Decision 2 (post-overlay) rules, fail-closed:
 *   - Phase 2D not wired/launched → NOT_YET_AVAILABLE (the existing locked block).
 *   - Wired, but any precondition fails (gate closed, RTC packet not attached with
 *     valid SHAs, or LAHD copy version stale) → ATTACHMENT_FAILED. No partial
 *     production; no silent omission of the RTC attachment.
 *   - Wired AND all preconditions hold → produce (with RTC EN+ES notice +
 *     declaration attached + LAHD prompt surfaced by the caller).
 */

export type LaProduceBlockCode =
  | 'JURISDICTION_LA_OVERLAY_NOT_YET_AVAILABLE'
  | 'JURISDICTION_LA_OVERLAY_ATTACHMENT_FAILED';

export type LaProduceGateResult = { ok: true } | { ok: false; code: LaProduceBlockCode };

export interface LaProduceGateInput {
  /** cachedResolverVerdict verdict. This gate applies only to 'confirmed_la'. */
  verdict: string;
  /** isLaProductionUnblocked() — the six-flag resolver/predicate gate. */
  productionUnblocked: boolean;
  /** isLaProducePhase2dWired() — the separate produce-overlay launch flag. */
  phase2dWired: boolean;
  /** Both EN+ES RTC notice + declaration loaded with SHAs matching the refresh snapshot. */
  rtcPacketAttached: boolean;
  /** lahdFilingPromptCopyVersion === the current locked manifest version. */
  lahdCopyCurrent: boolean;
}

/**
 * Evaluate whether a `confirmed_la` notice may produce. For any non-`confirmed_la`
 * verdict this gate is not applicable and returns ok (the caller's statewide /
 * supersession logic governs those). Fail-closed for the LA case.
 */
export function evaluateLaProduceGate(i: LaProduceGateInput): LaProduceGateResult {
  if (i.verdict !== 'confirmed_la') return { ok: true }; // LA gate not applicable
  if (!i.phase2dWired) {
    return { ok: false, code: 'JURISDICTION_LA_OVERLAY_NOT_YET_AVAILABLE' };
  }
  if (!i.productionUnblocked || !i.rtcPacketAttached || !i.lahdCopyCurrent) {
    return { ok: false, code: 'JURISDICTION_LA_OVERLAY_ATTACHMENT_FAILED' };
  }
  return { ok: true };
}
