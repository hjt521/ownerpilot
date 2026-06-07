/**
 * H1 classifier — pure logic (verdict parsing, side routing, fail-mode). No SDK,
 * no network: the model call is dependency-injected so this is unit-testable in the
 * sandbox. The route supplies a real `complete` that wraps the Anthropic SDK; tests
 * supply a stub. Per attorney ruling chatbox_h1_classifier_attorney_ruling_2026-06-07.md.
 *
 * Scope: closes A.1.3 + A.2.2 (and the paraphrase FNs in A.1.4/A.1.5/A.2.1/A.2.3) that
 * the regex floor leaves. Runs on the RESIDUAL — only when the regex layer is clean.
 *
 * Fail-mode (ruling §4): FAIL-OPEN-TO-REGEX-FLOOR. A classifier error/timeout/parse
 * failure must NOT block the response — it degrades to exactly the signed-off regex
 * floor. The caller increments an ops-visible error counter (ruling §4.1) and the
 * institutional sustained-outage escalation (§4.2) is an ops/flag concern, not here.
 */

import { CLASSIFIER_PROMPT } from './classifierPrompt';

export type ClassifierSide = 'input' | 'output';

export const INPUT_CATEGORIES = [
  'discrimination_context',
  'retaliation_oblique',
  'dv_context_oblique',
] as const;
export const OUTPUT_CATEGORIES = [
  'notice_draft',
  'legal_conclusion',
  'litigation_strategy',
] as const;
export const UNSURE = 'unsure';

export type ClassifierVerdict = { flagged: boolean; categories: string[] };

/**
 * Parse the model's raw output into a verdict. The locked prompt demands bare JSON,
 * but we defend against a stray markdown fence or surrounding prose anyway. Throws on
 * unrecoverable output — the caller treats a throw as a classifier error (fail-open).
 */
export function parseClassifierVerdict(raw: string): ClassifierVerdict {
  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) throw new Error('classifier: no JSON object found');
  const obj = JSON.parse(text.slice(start, end + 1)) as unknown;
  if (typeof obj !== 'object' || obj === null) throw new Error('classifier: not an object');
  const rec = obj as Record<string, unknown>;
  const categories = Array.isArray(rec.categories)
    ? rec.categories.filter((c): c is string => typeof c === 'string')
    : [];
  // Recall-favoring: trust a non-empty category list even if `flagged` is malformed.
  const flagged = rec.flagged === true || categories.length > 0;
  return { flagged, categories };
}

/** Does a verdict flag for this side? Any in-scope category for the side, or `unsure`,
 *  counts. Out-of-side categories are ignored defensively (input refusal vs output). */
export function verdictFlagsSide(v: ClassifierVerdict, side: ClassifierSide): boolean {
  const scope: readonly string[] = side === 'input' ? INPUT_CATEGORIES : OUTPUT_CATEGORIES;
  return v.categories.some((c) => c === UNSURE || scope.includes(c));
}

/** Build the classifier's user message: side + recent context + the target text. */
export function buildClassifierInput(side: ClassifierSide, target: string, context: string): string {
  return `SIDE: ${side}\n\nRECENT CONVERSATION:\n${context || '(none)'}\n\nTARGET:\n${target}`;
}

/** Injected model call: takes (systemPrompt, userMessage) → completion text + tokens. */
export type CompleteFn = (system: string, user: string) => Promise<{ text: string; tokens: number }>;

export type ClassifierResult =
  | { ok: true; flagged: boolean; categories: string[]; tokens: number }
  | { ok: false; error: string };

/** Run the classifier on the residual. Never throws — any failure returns
 *  { ok:false }, which the caller fail-opens to the regex floor. */
export async function runClassifier(
  side: ClassifierSide,
  target: string,
  context: string,
  complete: CompleteFn
): Promise<ClassifierResult> {
  try {
    const { text, tokens } = await complete(CLASSIFIER_PROMPT, buildClassifierInput(side, target, context));
    const verdict = parseClassifierVerdict(text);
    return { ok: true, flagged: verdictFlagsSide(verdict, side), categories: verdict.categories, tokens };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'classifier error' };
  }
}

/** The fail-open rule: the classifier BLOCKS only on a successful, flagged verdict.
 *  An error (ok:false) returns false — degrade to the regex floor, never block on a
 *  classifier outage. The caller increments the error counter when !result.ok. */
export function classifierBlocks(result: ClassifierResult): boolean {
  return result.ok && result.flagged;
}

/** Whether a successful verdict carried `unsure` (ruling §6: log distinctly). */
export function isUnsure(result: ClassifierResult): boolean {
  return result.ok && result.categories.includes(UNSURE);
}

/**
 * The final block decision, honoring the §4.2 fail-closed flag.
 *  - success  → block iff flagged (recall-favoring; `unsure` counts as flagged).
 *  - error    → block only if ops has flipped CLASSIFIER_FAIL_CLOSED on a sustained
 *               outage; otherwise FAIL-OPEN to the regex floor (default).
 */
export function classifierDecision(result: ClassifierResult, failClosed: boolean): boolean {
  return result.ok ? classifierBlocks(result) : failClosed;
}
