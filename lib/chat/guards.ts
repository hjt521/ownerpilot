/**
 * Chat-endpoint guard logic (help chatbox). Pure + testable; no SDK, no I/O.
 *
 * Scope:
 *  - H3 message-history caps (ruling 2026-06-06 §5, LOCKED thresholds).
 *  - H1 input pre-check + output guard. The user-facing REFUSAL COPY is final and
 *    verbatim per the attorney ruling 2026-06-07 §A.3 (rendered exactly; the bold
 *    in that doc was formatting and is stripped here). The DETECTION PATTERN LISTS
 *    are still intentionally EMPTY: per ruling 2026-06-07 §A.4, every pattern the
 *    build side drafts must be signed off in a chatbox_h1_patterns_attorney_ruling
 *    artifact BEFORE it goes live. So the guards are wired with final copy but stay
 *    INERT until that pattern sign-off lands.
 *
 * §0: the build side does not author refusal/trigger wording. INPUT_REFUSAL and
 * OUTPUT_REFUSAL are the attorney's verbatim 2026-06-07 copy; GENERIC_DECLINE
 * (oversized-payload rejection) is her verbatim 2026-06-06 interim copy.
 */

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

// --- Verbatim attorney copy ------------------------------------------------
// Oversized-payload / cap rejection (ruling 2026-06-06 §5). Neutral, non-legal.
export const GENERIC_DECLINE =
  "I'm not able to help with that here — please contact support.";

// Input-side refusal — shown when the input pre-check (§A.1) fires, before the
// model runs. Verbatim, ruling 2026-06-07 §A.3.a.
export const INPUT_REFUSAL = [
  "That sounds like a situation that needs a lawyer working with you directly, not a chatbot. I'm not the right tool for this one.",
  "A few reasons I'm pulling back here: the question touches something — a court case, a bankruptcy, a fair-housing concern, a domestic-violence context, or a retaliation/habitability dispute — where a wrong-direction answer from me could make things meaningfully worse for you. Even a careful general answer risks landing as advice on your specific facts, and I'm not built to be the one making that call.",
  "What I'd suggest: talk to a California landlord-tenant attorney before you take the next step. If cost is a concern, your county bar association's lawyer-referral service is the standard starting point — most offer a low-cost initial consultation. OwnerPilot intentionally doesn't refer you to a specific attorney (more on why at /our-approach).",
  "If you have a different question that doesn't touch any of the above, ask away.",
].join('\n\n');

// Output-side refusal — shown when the output guard (§A.2) replaces a completed
// model response. Verbatim, ruling 2026-06-07 §A.3.b.
export const OUTPUT_REFUSAL = [
  "I was about to answer that in a way I shouldn't — let me stop and reset.",
  "Drafting notice language, giving you a yes/no on whether your situation is legally valid, or coaching you through litigation strategy is outside what this chat does. The notice itself gets produced by the structured flow (with the checks built in); anything that reads like legal advice on your specific facts needs to come from your own attorney.",
  "I can still help with general information — what California requires for a 3-day pay-or-quit, how the day-count works, what fields the producer asks for and why. If your question can be re-asked in that frame, I'll take another run at it.",
].join('\n\n');

// --- Detection patterns — EMPTY pending §A.4 sign-off (see header) ----------
// Categories delivered (ruling 2026-06-07 §A.1: five input; §A.2: four output).
// The build side's drafted patterns go to the attorney for sign-off before they
// populate these lists and go live. Until then: empty => guards inert.
export const TRIGGERS_PENDING_ATTORNEY_REVIEW: RegExp[] = [];
export const OUTPUT_PATTERNS_PENDING_ATTORNEY_REVIEW: RegExp[] = [];

// --- H3 caps (ruling §5, LOCKED). -------------------------------------------
export const MAX_MESSAGES = 32;
export const MAX_MESSAGE_CHARS = 4000;
export const MAX_TOTAL_CHARS = 50000;

/** Generic match engine — exported (underscored) only so tests can prove the
 *  mechanism works while the real pattern lists are still empty placeholders. */
export function _anyMatch(patterns: RegExp[], text: string): boolean {
  return patterns.some((re) => re.test(text));
}

/**
 * H3: caller-controlled history must stay within the locked caps. Returns false
 * when the payload exceeds count / per-message / total-length limits. The caller
 * rejects with GENERIC_DECLINE and does NOT echo the offending cap value.
 */
export function withinHistoryLimits(messages: ChatMessage[]): boolean {
  if (messages.length > MAX_MESSAGES) return false;
  let total = 0;
  for (const m of messages) {
    if (m.content.length > MAX_MESSAGE_CHARS) return false;
    total += m.content.length;
  }
  return total <= MAX_TOTAL_CHARS;
}

/** H1 input pre-check: does the latest user turn hit a HARD-RULES trigger?
 *  Inert until the attorney delivers TRIGGERS_PENDING_ATTORNEY_REVIEW. */
export function inputTriggersHandoff(latestUserText: string): boolean {
  return _anyMatch(TRIGGERS_PENDING_ATTORNEY_REVIEW, latestUserText);
}

/** H1 output guard: does the model's completed response hit a blocked pattern?
 *  Inert until the attorney delivers OUTPUT_PATTERNS_PENDING_ATTORNEY_REVIEW. */
export function outputViolates(text: string): boolean {
  return _anyMatch(OUTPUT_PATTERNS_PENDING_ATTORNEY_REVIEW, text);
}

/** The last user message in a history, or '' if none. */
export function latestUserText(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') return messages[i].content;
  }
  return '';
}
