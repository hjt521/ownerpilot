// lib/btrm/cs/strategy.ts
// CS-001 — Communication Strategy (BTRM-001 spec §3.8, §5 interface: CS.strategy). The only BTRM-001 component
// where tone is a first-class input — and even here, tone shapes DELIVERY only, never the underlying reliance
// determination (spec §1, §3.8). CS-001 does not draft message prose from scratch: a caller supplies the
// structured content (factsStatement, optional allegationsStatement, requestedAction, offeredOptions), mirroring
// every other BTRM-001 hint. CS-001's own job is to assemble that content into a validated
// CommunicationRecommendation, enforce the §11 no-character-label safeguard on every free-text field, keep facts
// and allegations in permanently SEPARATE fields (never concatenated — spec §3.8 "separate facts from
// allegations"), and attach deterministic style adaptations (lib/btrm/cs/adaptations.ts) for the stated audience.
//
// Scoping notes:
//  - deadline defaults to the referenced ResolutionOption's own deadlineImplications unless the caller supplies
//    an explicit override — CS-001 never invents a deadline the option itself didn't already carry.
//  - humanReviewRequired is inherited unchanged from the referenced ResolutionOption — a communication
//    implementing a material-consequence option is gated exactly as the option itself is (§6/§11); CS-001 cannot
//    lower it.
//  - evidenceCited on this component's envelope reuses the referenced ResolutionOption's OWN already-validated
//    envelope.evidenceCited (guaranteed non-empty by RIE-001, spec §5) rather than re-deriving it — CS-001 does
//    not introduce a new evidentiary basis, it communicates the option's existing one.

import type { ResolutionOption, AudienceContext, CommunicationRecommendation } from '../types';
import { assertCompleteEnvelope, buildEnvelope } from '../envelope';
import { assertNoCharacterLabel } from '../safeguards/guard';
import { adaptationsFor } from './adaptations';

/** A caller-supplied communication to structure (spec §3.8). CS-001 does not invent factsStatement,
 *  allegationsStatement, requestedAction, or offeredOptions — a caller (a future, separately-scoped drafting
 *  step) supplies them; CS-001's job is strictly to validate, separate, and adapt. */
export interface CommunicationHint {
  matterId: string;
  option: ResolutionOption;
  audience: AudienceContext;
  factsStatement: string;
  allegationsStatement?: string;
  requestedAction: string;
  deadline?: string; // overrides option.deadlineImplications when supplied
  offeredOptions?: string[];
}

/**
 * CS-001's single entry point. Consumes a caller-supplied CommunicationHint plus the ResolutionOption it
 * implements, and produces one complete, envelope-carrying CommunicationRecommendation.
 */
export function strategy(hint: CommunicationHint): CommunicationRecommendation {
  assertNoCharacterLabel(hint.factsStatement, 'CommunicationRecommendation.factsStatement');
  if (hint.allegationsStatement) {
    assertNoCharacterLabel(hint.allegationsStatement, 'CommunicationRecommendation.allegationsStatement');
  }
  assertNoCharacterLabel(hint.requestedAction, 'CommunicationRecommendation.requestedAction');

  const styleAdaptations = adaptationsFor(hint.audience);
  const deadline = hint.deadline ?? hint.option.deadlineImplications;

  const envelope = buildEnvelope({
    evidenceCited: hint.option.envelope.evidenceCited,
    behaviorsIdentified: hint.option.envelope.behaviorsIdentified,
    howRelianceDetermined: `unchanged from the referenced ResolutionOption ${hint.option.id} — CS-001 never alters upstream reliance (spec §1, §3.8)`,
    missingInformation: hint.option.missingInformation,
    whatWouldChangeThis: 'a change to the referenced ResolutionOptions own reliance, risks, or missing information would change this recommendation',
    whyPreferred: hint.requestedAction,
  });
  assertCompleteEnvelope(envelope);

  return {
    id: crypto.randomUUID(),
    matterId: hint.matterId,
    resolutionOptionRef: hint.option.id,
    audience: hint.audience,
    factsStatement: hint.factsStatement,
    allegationsStatement: hint.allegationsStatement,
    requestedAction: hint.requestedAction,
    deadline,
    offeredOptions: hint.offeredOptions ?? [],
    styleAdaptations,
    humanReviewRequired: hint.option.humanReviewRequired,
    envelope,
  };
}
