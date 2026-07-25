// lib/btrm/envelope.ts
// BTRM-001 explainability envelope (spec §5): "Every returned assessment/option must carry an explainability
// envelope … Outputs missing the envelope are invalid (no black-box results)." This is the safeguard CI checks
// for — the one the independent architecture-review-board challenge (spec §13) conditioned approval on — the guard
// tests in this repo assert every RIE-001/OCM-001/CS-001 output satisfies isCompleteEnvelope() before it can be
// treated as a valid recommendation.

import { z } from 'zod';

/** The explainability envelope every RIE-001/OCM-001/CS-001 output must carry (spec §5). */
export interface ExplainabilityEnvelope {
  evidenceCited: string[]; // EvidenceItem / TimelineEvent ids this conclusion rests on
  behaviorsIdentified: string[]; // BehavioralObservation ids (BAE-001) that were considered
  howRelianceDetermined: string; // plain-language trace through TM-001 dimensions, not a black-box score
  missingInformation: string[]; // what evidence, if it existed, would sharpen this conclusion
  whatWouldChangeThis: string; // explicit statement of what new evidence would change the recommendation
  whyPreferred: string; // why this option/conclusion over the alternatives considered
}

export const explainabilityEnvelopeSchema = z.object({
  evidenceCited: z.array(z.string()).min(1, 'evidenceCited must cite at least one evidence/event id'),
  behaviorsIdentified: z.array(z.string()),
  howRelianceDetermined: z.string().min(1, 'howRelianceDetermined must not be empty'),
  missingInformation: z.array(z.string()),
  whatWouldChangeThis: z.string().min(1, 'whatWouldChangeThis must not be empty'),
  whyPreferred: z.string().min(1, 'whyPreferred must not be empty'),
});

/** Runtime guard: true iff `value` is a structurally complete explainability envelope. Every BTRM component
 *  that emits an advisory conclusion (RIE-001 options, OCM-001 comparisons, CS-001 recommendations) MUST pass
 *  its output through this before returning it — a failing envelope means the output is not shippable, full stop. */
export function isCompleteEnvelope(value: unknown): value is ExplainabilityEnvelope {
  return explainabilityEnvelopeSchema.safeParse(value).success;
}

/** Throws with a precise reason if `value` is not a complete envelope. Use at component boundaries where a
 *  silent false from isCompleteEnvelope would be too easy to ignore (e.g. right before returning from RIE-001). */
export function assertCompleteEnvelope(value: unknown): asserts value is ExplainabilityEnvelope {
  const parsed = explainabilityEnvelopeSchema.safeParse(value);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ');
    throw new Error(`BTRM-001 explainability envelope incomplete — output rejected (spec §5): ${detail}`);
  }
}

/** Convenience builder so call sites construct envelopes with named args instead of positional object literals
 *  scattered across RIE-001/OCM-001/CS-001. Pure — does not validate; call assertCompleteEnvelope on the result
 *  at the component boundary before returning it to a caller. */
export function buildEnvelope(fields: ExplainabilityEnvelope): ExplainabilityEnvelope {
  return { ...fields };
}
