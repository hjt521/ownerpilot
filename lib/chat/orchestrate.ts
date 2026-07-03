// lib/chat/orchestrate.ts
// AI-first /chat — pure per-turn reducer. Given prior intake_state + the owner's message + the validated
// ModelResponse, compute the next persisted state, the reply, refusal handling, and the transcript additions.
// Pure (no I/O) so the turn logic is unit-testable; the route does the DB read/write around it.

import type { IntakeState, ModelResponse } from './intakeSchema';
import { mergeIntake, missingRequiredFields, intakeIsComplete } from './intakeMerge';
import type { TranscriptTurn, ChatSessionStatus } from './dbTypes';

export interface TurnResult {
  reply: string;
  refusal: ModelResponse['refusal'];        // 5-value enum or null → chat_sessions.last_refusal
  intakeState: IntakeState;                  // merged (confidence-gated)
  intakeComplete: boolean;                   // server-validated (model claim AND all required present)
  missingFields: string[];                   // non-empty ONLY when model claimed complete prematurely (§E.4)
  status: ChatSessionStatus;                 // 'intake_complete' when complete, else 'active'
  transcriptAdditions: TranscriptTurn[];     // owner turn + assistant turn
  routeToReview: boolean;                    // true → server routes owner to /chat/review
  // Lane FF-3 (flag-gated): typed columns to merge into the chat_sessions row this turn (ff3_capture_status +,
  // on completion, the five intake columns). Undefined for every non-FF-3 turn — the route writes nothing extra.
  ff3Persist?: Record<string, unknown>;
}

/** Apply one chat turn. `now` injectable for deterministic tests. */
export function applyTurn(
  priorState: IntakeState,
  ownerMessage: string,
  model: ModelResponse,
  now: string = new Date().toISOString(),
): TurnResult {
  const merged = mergeIntake(priorState, model.extracted_fields);
  const refusal = model.refusal ?? null;
  const complete = intakeIsComplete(merged, model.intake_complete);
  // §E.4: if the model claimed complete but the server disagrees, surface the missing fields for re-prompt.
  const missingFields = model.intake_complete && !complete ? missingRequiredFields(merged) : [];

  const ownerTurn: TranscriptTurn = {
    role: 'owner', content: ownerMessage, refusal: null, extracted_fields: [], ts: now,
  };
  const assistantTurn: TranscriptTurn = {
    role: 'assistant', content: model.reply, refusal, extracted_fields: model.extracted_fields, ts: now,
    // metadata.refusal_category is NOT emitted by §E (envelope carries only the 5-value enum); left unset.
  };

  return {
    reply: model.reply,
    refusal,
    intakeState: merged,
    intakeComplete: complete,
    missingFields,
    status: complete ? 'intake_complete' : 'active',
    transcriptAdditions: [ownerTurn, assistantTurn],
    routeToReview: complete,
  };
}
