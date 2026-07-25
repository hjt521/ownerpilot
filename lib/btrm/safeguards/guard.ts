// lib/btrm/safeguards/guard.ts
// BTRM-001 §6/§11 hard-constraint assertions. These are the CI-enforceable guards the independent
// architecture-review-board challenge (spec §13) conditioned approval on: "the guards in §11 ship before any
// advisory output reaches a user." Every component boundary that emits free text or a ResolutionOption must call
// the relevant assertion here before returning. A thrown error here means the output must NOT ship — it is not a
// warning path.

import { scanForCharacterLabels } from './characterLabelDenylist';
import type { ResolutionOption } from '../types';

/** Throws if `text` contains a prohibited character-label or protected-characteristic phrase (BTRM-001 §11).
 *  Call on every free-text field a component is about to return (BAE-001 summaries, RIE-001 rationale, CS-001
 *  drafted communications, etc.). */
export function assertNoCharacterLabel(text: string, fieldName = 'text'): void {
  const hits = scanForCharacterLabels(text);
  if (hits.length > 0) {
    throw new Error(
      `BTRM-001 safeguard violation (§11 no personality labeling / no protected-characteristic inference): ` +
        `${fieldName} contains prohibited phrase(s): ${hits.join(', ')}`
    );
  }
}

/**
 * State-machine guard (BTRM-001 §6): a ResolutionOption flagged `materialConsequence` (formal notices,
 * termination, filing prep, settlement terms, material financial concessions, intentional-misconduct claims,
 * external reporting) MUST require human review before it can be acted on. Throws if the flag is set without
 * the corresponding review requirement — this is the guard that prevents an automated adverse action.
 */
export function assertHumanReviewGated(option: Pick<ResolutionOption, 'materialConsequence'> & { humanReviewRequired?: boolean }): void {
  if (option.materialConsequence && option.humanReviewRequired !== true) {
    throw new Error(
      'BTRM-001 safeguard violation (§6/§11 no automated adverse action): a materialConsequence option must set humanReviewRequired = true'
    );
  }
}

/**
 * Symmetry guard (BTRM-001 §11): asserts the same behavioral-event vocabulary is available regardless of
 * subject role. This does not inspect actual output distributions (that is a test-suite concern, see
 * lib/btrm/bae/__tests__), but gives BAE-001 call sites a single place to assert a subjectId was not used to
 * branch into a different rule set. Pass the two rule-selection results for the same event class under two
 * different roles; throws if they differ.
 */
export function assertSymmetricRuleSelection<T>(resultForRoleA: T, resultForRoleB: T, context: string): void {
  const a = JSON.stringify(resultForRoleA);
  const b = JSON.stringify(resultForRoleB);
  if (a !== b) {
    throw new Error(
      `BTRM-001 safeguard violation (§11 symmetry): behavioral classification differed by role for ${context}`
    );
  }
}
