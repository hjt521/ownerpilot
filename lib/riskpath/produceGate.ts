// lib/riskpath/produceGate.ts
// Group 4 / G4 — pure produce-eligibility gate. The produce route's server-side hard-stop reads a session's
// counsel-route trigger + completion + jurisdiction freshness and decides whether a notice may be produced.
// Counsel-route trigger has precedence (R&D §8): if any of the 22 triggers is set, NO produce — route to counsel.

import { isCounselRouteTrigger } from './triggers';

export interface ProduceEligibilityInput {
  intakeComplete: boolean;
  counselTrigger: string | null;  // chat_sessions.counsel_route_trigger (one of the 22, or null)
  freshnessOk: boolean;           // Decision 2 freshness window (enforced by the produce rail; pre-checked here)
}

export type ProduceBlockReason = 'counsel_route' | 'incomplete_intake' | 'stale_jurisdiction';

export interface ProduceDecision {
  allowed: boolean;
  reason?: ProduceBlockReason;
  /** When blocked by counsel-route, the chat refusal enum to surface (G4: maps to legal_advice). */
  refusal?: 'legal_advice';
}

/** Decide if produce may proceed. Counsel-route precedence, then completeness, then freshness. */
export function evaluateProduceEligibility(i: ProduceEligibilityInput): ProduceDecision {
  if (i.counselTrigger && isCounselRouteTrigger(i.counselTrigger)) {
    return { allowed: false, reason: 'counsel_route', refusal: 'legal_advice' };
  }
  if (!i.intakeComplete) return { allowed: false, reason: 'incomplete_intake' };
  if (!i.freshnessOk) return { allowed: false, reason: 'stale_jurisdiction' };
  return { allowed: true };
}
