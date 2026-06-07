/**
 * Verbatim attorney-locked H1 classifier prompt.
 *
 * Source of record: chatbox_h1_classifier_attorney_ruling_2026-06-07.md §3, extracted
 * byte-identical between the BEGIN/END VERBATIM CLASSIFIER_PROMPT markers into the
 * canonical JSON store lib/chat/classifier_prompt.json (the same file the lock guard
 * hashes — single source of truth, JSON-escaped so backticks/quotes/newlines survive).
 *
 * DO NOT edit the prompt text. Any change is legal-adjacent copy and comes through the
 * §A.4 review loop + a new attorney ruling. Hash-locked by
 * scripts/check_classifier_prompt_lock.mjs + lib/chat/classifier_prompt.lock.json.
 *
 * CLASSIFIER_PROMPT sha256: 3f901f548d1b766b99fa35447d51ff26af113b6babce3458c47b8b6fb3394090
 */

import promptData from './classifier_prompt.json';

export const CLASSIFIER_PROMPT: string = (promptData as { prompt: string }).prompt;
