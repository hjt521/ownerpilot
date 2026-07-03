// lib/chat/scriptedOrchestrate.ts
// Lane 2E — turn-level glue between the LLM persona flow and the deterministic scripted capture sub-flow (Fork A).
// Source: lane2e_persona_render_mechanism_broker_ruling_2026-07-01.md §§2-4.
//
// Rules enforced here:
//  - The scripted sub-flow only STARTS once every NON-scripted required field is captured (so scripted
//    capture is a contiguous block at the end; no dead hand-back turns).
//  - While a cursor is active, the LLM is NOT called: the owner's message is parsed deterministically.
//  - On the transition turn the LLM is called only to extract the last non-scripted field; its reply is then
//    OVERRIDDEN with the verbatim first-ask (the LLM never authors a scripted prompt).
//  - Completed scripted categories chain to the next ready category; when all are captured, route to review.

import type { IntakeState } from './intakeSchema';
import { REQUIRED_FIELDS } from './intakeSchema';
import { mergeIntake, missingRequiredFields } from './intakeMerge';
import type { TurnResult } from './orchestrate';
import type { TranscriptTurn } from './dbTypes';
import {
  beginCapture, stepCapture, nextScriptedCategory, SCRIPTED_CATEGORIES,
  type CaptureCursor, type CaptureCategory, type ScriptedTurn,
} from './scriptedCapture';
import { ff3CaptureEnabled } from './ff3Flag';

// The exact review handoff already ratified inside OWNERPILOT_PERSONA_SYSTEM_PROMPT (CLOSING). Reused verbatim
// so the deterministic path and the LLM path emit identical closing copy.
const CLOSING_HANDOFF =
  'I have what I need. Let me pull together a review screen so you can check every detail before we generate the PDF. One moment.';

/** The active scripted cursor, read from the most recent assistant turn's metadata (or null). */
export function activeCursorOf(transcript: TranscriptTurn[] | null | undefined): CaptureCursor | null {
  const last = [...(transcript ?? [])].reverse().find((t) => t.role === 'assistant');
  return last?.metadata?.capture ?? null;
}

/**
 * True-category to begin scripted capture, gated on all NON-scripted required fields already being present.
 * ff3Status (chat_sessions.ff3_capture_status) lets nextScriptedCategory decide whether FF-3 is still pending.
 */
export function scriptedBeginCategory(state: IntakeState, ff3Status?: string | null): CaptureCategory | null {
  const scripted = new Set<string>(SCRIPTED_CATEGORIES);
  const nonScriptedMissing = missingRequiredFields(state).filter((f) => !scripted.has(f));
  if (nonScriptedMissing.length > 0) return null;
  return nextScriptedCategory(state, ff3Status);
}

function assistantTurn(content: string, now: string, cursor: CaptureCursor | null): TranscriptTurn {
  return {
    role: 'assistant', content, refusal: null, extracted_fields: [], ts: now,
    metadata: { capture: cursor },
  };
}
function ownerTurn(content: string, now: string): TranscriptTurn {
  return { role: 'owner', content, refusal: null, extracted_fields: [], ts: now };
}

function mergeExtracted(state: IntakeState, scripted: ScriptedTurn): IntakeState {
  if (!scripted.extracted) return state;
  return mergeIntake(state, [{ field: scripted.extracted.field, value: scripted.extracted.value, confidence: 1 }]);
}

/**
 * Build a TurnResult, deriving completeness + review routing from the merged state.
 * ff3Persist (typed columns) rides out to the route. ff3BlocksReview holds the session out of review while FF-3
 * is still pending or parked for broker review (only meaningful when the FF-3 flag is on; false ⇒ base behavior).
 * Review routing additionally requires no active cursor, so a session mid-capture never routes.
 */
function finish(
  mergedState: IntakeState, reply: string, cursor: CaptureCursor | null,
  ownerMessage: string, now: string,
  ff3Persist?: Record<string, unknown>, ff3BlocksReview = false,
): TurnResult {
  const complete = missingRequiredFields(mergedState).length === 0;
  const done = complete && cursor === null && !ff3BlocksReview;
  return {
    reply,
    refusal: null,
    intakeState: mergedState,
    intakeComplete: complete,
    missingFields: [],
    status: done ? 'intake_complete' : 'active',
    transcriptAdditions: [ownerTurn(ownerMessage, now), assistantTurn(reply, now, cursor)],
    routeToReview: done,
    ff3Persist,
  };
}

/**
 * Cursor-active turn: parse the owner's message deterministically, chain to the next scripted category on
 * completion, and route to review when all required fields are captured. The LLM is never called.
 */
export function runScriptedActiveTurn(
  priorState: IntakeState, ownerMessage: string, cursor: CaptureCursor, now: string,
  ff3Status?: string | null,
): TurnResult {
  const scripted = stepCapture(cursor, ownerMessage, priorState);

  // Resulting FF-3 status after this turn (unchanged for non-FF-3 turns) and whether it holds review.
  const newFf3Status = (scripted.ff3Persist?.ff3_capture_status as string | undefined) ?? ff3Status ?? null;
  const ff3Blocks = ff3CaptureEnabled() && newFf3Status !== 'complete';

  // Still inside the same category (prompt/reask) — carry the next cursor, no merge.
  if (scripted.kind === 'prompt' || scripted.kind === 'reask') {
    return finish(priorState, scripted.reply, scripted.nextCursor, ownerMessage, now, scripted.ff3Persist, ff3Blocks);
  }
  // Escalation (rule-of-three / don't-know-title / FF-3 broker-review) — clear cursor, hand back; not complete.
  if (scripted.kind === 'escalate') {
    return finish(priorState, scripted.reply, null, ownerMessage, now, scripted.ff3Persist, ff3Blocks);
  }
  // Completion — merge, then chain to the next ready scripted category or route to review.
  const merged = mergeExtracted(priorState, scripted);
  const ack = scripted.reply; // '' for rent/pd/dispute; ack for signer; confirmation card for FF-3
  const next = nextScriptedCategory(merged, newFf3Status);
  if (next) {
    const begin = beginCapture(next);
    const reply = [ack, begin.reply].filter(Boolean).join('\n\n');
    // The just-begun category's status (e.g. FF-3 'in_progress') supersedes; a live cursor blocks review anyway.
    return finish(merged, reply, begin.nextCursor, ownerMessage, now, begin.ff3Persist ?? scripted.ff3Persist, true);
  }
  const reply = [ack, CLOSING_HANDOFF].filter(Boolean).join('\n\n');
  return finish(merged, reply, null, ownerMessage, now, scripted.ff3Persist, ff3Blocks);
}

/**
 * Transition turn: the base (LLM) turn already extracted the last non-scripted field. If scripted capture is
 * now ready, OVERRIDE the LLM reply with the verbatim first-ask and open the cursor. Otherwise return baseTurn.
 */
export function maybeBeginScripted(baseTurn: TurnResult, now: string, ff3Status?: string | null): TurnResult {
  // Never override a refusal turn.
  if (baseTurn.refusal) return baseTurn;
  const category = scriptedBeginCategory(baseTurn.intakeState, ff3Status);
  if (!category) return baseTurn;

  const begin = beginCapture(category);
  // Keep the base turn's owner turn (with any extracted_fields the LLM captured); replace the assistant turn
  // with the server-owned verbatim first-ask carrying the cursor.
  const additions = [...baseTurn.transcriptAdditions];
  const assistantIdx = additions.map((t) => t.role).lastIndexOf('assistant');
  if (assistantIdx >= 0) {
    additions[assistantIdx] = assistantTurn(begin.reply, additions[assistantIdx].ts ?? now, begin.nextCursor);
  } else {
    additions.push(assistantTurn(begin.reply, now, begin.nextCursor));
  }
  return {
    ...baseTurn,
    reply: begin.reply,
    intakeComplete: false,          // scripted capture just started; not complete
    status: 'active',
    missingFields: [],
    routeToReview: false,
    transcriptAdditions: additions,
    // FF-3: when the category we just opened is ff3_intake, mark the session mid-capture (in_progress).
    ff3Persist: begin.ff3Persist ?? baseTurn.ff3Persist,
  };
}

// Re-export for the route.
export { REQUIRED_FIELDS };
