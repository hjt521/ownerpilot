/**
 * H1 classifier runtime config. Env-driven so the gates flip without editing code.
 * Per attorney ruling chatbox_h1_classifier_attorney_ruling_2026-06-07.md + Jack's
 * §3 architecture nod (2026-06-07).
 */

/**
 * Master gate. The classifier does NOT run until this is 'true'. Default off:
 * the regex floor is live and signed off on its own; the classifier only ships
 * after Jack's live validation pass AND the §4.1 ops visibility is in place
 * (Vercel AI Gateway error-rate + token + 5% alert — Jack's §4.1 pick = Option B).
 */
export const CLASSIFIER_LIVE = process.env.CLASSIFIER_LIVE === 'true';

/**
 * §4.2 escalation (Option B — fail-closed flag). Fail-mode is FAIL-OPEN-TO-REGEX-
 * FLOOR by default (a transient classifier error degrades to the signed-off regex
 * floor, never blocks a legitimate question). On a SUSTAINED outage, ops flips this
 * to 'true' and a classifier error then BLOCKS (institutional fail-closed) until the
 * outage clears. Default off = fail-open.
 */
export const CLASSIFIER_FAIL_CLOSED = process.env.CLASSIFIER_FAIL_CLOSED === 'true';

/**
 * §3.2 — the classifier model, as a single configurable constant. Starts on Haiku
 * (same family as the chat); if the validation pass shows correlated failure modes
 * on legal_conclusion (A.2.2), flipping to a stronger model is this one line. Routed
 * through Vercel AI Gateway, so the id is the gateway's `anthropic/`-prefixed slug —
 * confirm the exact Haiku slug against your AI Gateway model list.
 */
export const CLASSIFIER_MODEL = process.env.CLASSIFIER_MODEL ?? 'anthropic/claude-haiku-4-5';

/** Classifier replies are a tiny JSON object — keep the cap small. */
export const CLASSIFIER_MAX_TOKENS = 200;
