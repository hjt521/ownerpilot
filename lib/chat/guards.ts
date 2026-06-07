/**
 * Chat-endpoint guard logic (help chatbox). Pure + testable; no SDK, no I/O.
 *
 * Scope:
 *  - H3 message-history caps (ruling 2026-06-06 §5, LOCKED thresholds).
 *  - H1 input pre-check + output guard. Refusal copy is verbatim attorney copy
 *    (ruling 2026-06-07 §A.3). Detection patterns GRADUATED LIVE per the conditional
 *    sign-off (chatbox_h1_patterns_attorney_signoff_2026-06-07.md), Decisions 1–5
 *    applied. Six categories closed (A.1.1, A.1.2, A.1.4, A.1.5, A.2.1, A.2.3, A.2.4);
 *    A.1.3 + A.2.2 ship as PARTIAL closure — a classifier is required to close the
 *    bare-topic / verdict-semantic cases regex cannot bind (classifier track).
 *
 * NOTE (Decision 1): the input detectors run ONLY against the user's latest input
 * message. The refusal strings are output and are never evaluated as input. The
 * harness self-trigger check is a labeling property of the test set, not a runtime
 * path — do not "fix" it by routing refusal copy through the detectors.
 *
 * §0: the build side does not author refusal/trigger wording. INPUT_REFUSAL and
 * OUTPUT_REFUSAL are the attorney's verbatim 2026-06-07 copy; GENERIC_DECLINE is
 * her verbatim 2026-06-06 interim copy. Detection patterns are build-side plumbing
 * signed off against the attorney's scenario definitions.
 */

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

// --- Verbatim attorney copy ------------------------------------------------
// Oversized-payload / cap rejection (ruling 2026-06-06 §5). Neutral, non-legal.
export const GENERIC_DECLINE =
  "I'm not able to help with that here — please contact support.";

// Input-side refusal — input pre-check (§A.1) fires before the model. Verbatim §A.3.a.
export const INPUT_REFUSAL = [
  "That sounds like a situation that needs a lawyer working with you directly, not a chatbot. I'm not the right tool for this one.",
  "A few reasons I'm pulling back here: the question touches something — a court case, a bankruptcy, a fair-housing concern, a domestic-violence context, or a retaliation/habitability dispute — where a wrong-direction answer from me could make things meaningfully worse for you. Even a careful general answer risks landing as advice on your specific facts, and I'm not built to be the one making that call.",
  "What I'd suggest: talk to a California landlord-tenant attorney before you take the next step. If cost is a concern, your county bar association's lawyer-referral service is the standard starting point — most offer a low-cost initial consultation. OwnerPilot intentionally doesn't refer you to a specific attorney (more on why at /our-approach).",
  "If you have a different question that doesn't touch any of the above, ask away.",
].join('\n\n');

// Output-side refusal — output guard (§A.2) replaces a completed response. Verbatim §A.3.b.
export const OUTPUT_REFUSAL = [
  "I was about to answer that in a way I shouldn't — let me stop and reset.",
  "Drafting notice language, giving you a yes/no on whether your situation is legally valid, or coaching you through litigation strategy is outside what this chat does. The notice itself gets produced by the structured flow (with the checks built in); anything that reads like legal advice on your specific facts needs to come from your own attorney.",
  "I can still help with general information — what California requires for a 3-day pay-or-quit, how the day-count works, what fields the producer asks for and why. If your question can be re-asked in that frame, I'll take another run at it.",
].join('\n\n');

// --- H3 caps (ruling §5, LOCKED). -------------------------------------------
export const MAX_MESSAGES = 32;
export const MAX_MESSAGE_CHARS = 4000;
export const MAX_TOTAL_CHARS = 50000;

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

/** The last user message in a history, or '' if none. */
export function latestUserText(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') return messages[i].content;
  }
  return '';
}

// ===========================================================================
// H1 detection — LIVE (graduated 2026-06-07, Decisions 1–5 applied).
// ===========================================================================

/** lowercase; fold curly quotes + en/em dashes; drop the § sign (so statute
 *  variants reduce to a matchable number token); collapse whitespace. */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u2018\u2019\u201b]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/§+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const anyRe = (res: RegExp[], t: string): boolean => res.some((r) => r.test(t));
const allRe = (res: RegExp[], t: string): boolean => res.every((r) => r.test(t));

/** proximity: a and b within `window` chars with no sentence terminator between. */
function near(t: string, a: RegExp, b: RegExp, window = 90): boolean {
  const bMatches: Array<[number, number]> = [];
  const bg = new RegExp(b.source, 'g');
  let bm: RegExpExecArray | null;
  while ((bm = bg.exec(t)) !== null) bMatches.push([bm.index, bm.index + bm[0].length]);
  const ag = new RegExp(a.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = ag.exec(t)) !== null) {
    const aStart = m.index;
    const aEnd = m.index + m[0].length;
    for (const [bStart, bEnd] of bMatches) {
      const lo = Math.min(aEnd, bStart);
      const hi = Math.max(aStart, bEnd);
      if (hi - lo <= window && !/[.!?]/.test(t.slice(lo, hi))) return true;
    }
  }
  return false;
}

export type Detector = (raw: string) => boolean;

// A.1.1 — Active/imminent litigation. Decision 5: the broad evict pattern requires
// a FILING term (not bare "court"); the evicted+(filed|served|court) clause stands.
const A11: Detector = (raw) => {
  const t = norm(raw);
  return (
    anyRe(
      [
        /unlawful detainer/,
        /\bu\.?d\.? (case|action|complaint|filed)/,
        /writ of possession/,
        /sheriff'?s? (lockout|lock out|eviction)/,
        /notice to appear/,
        /eviction (trial|hearing)/,
        /served (with )?(a )?(summons|complaint)/,
        /represented by (an? )?(attorney|lawyer|counsel)/,
        /tenant'?s (attorney|lawyer|counsel)/,
      ],
      t
    ) ||
    allRe([/(summons|complaint)/, /(serv|receiv|filed|court)/], t) ||
    near(t, /\bevicted\b/, /(filed|served|court)/, 60) ||
    near(t, /evict\w*/, /(filed|served|summons|complaint|subpoena|writ|judgment)/, 60)
  );
};

// A.1.2 — Bankruptcy. "chapter N" requires a bankruptcy term so "chapter 13 of the
// lease" does not fire.
const A12: Detector = (raw) => {
  const t = norm(raw);
  return (
    anyRe(
      [
        /bankruptc(y|ies)/,
        /automatic stay/,
        /bankruptcy (trustee|case|petition|filing)/,
        /341 (meeting|hearing)/,
        /proof of claim/,
        /relief from stay/,
      ],
      t
    ) || allRe([/chapter\s*(7|11|13)/, /(bankruptc|trustee|debtor|creditor|stay|petition)/], t)
  );
};

// A.1.3 — Discrimination/fair-housing HIGH-SIGNAL. Decision 3: bare `fair housing`
// and bare `discriminat` MOVED to the classifier; action-context terms stay live.
const A13: Detector = (raw) => {
  const t = norm(raw);
  return (
    anyRe(
      [
        /\bfeha\b/,
        /\brfha\b/,
        /reasonable (accommodation|modification)/,
        /(service|assistance|emotional support) (animal|dog)/,
        /\besa\b/,
        /section 8/,
        /housing (choice )?voucher/,
        /\bhcv\b/,
        /source of income/,
        /\bdfeh\b/,
        /\bcrd\b/,
        /steering/,
        /familial status/,
        /(citizenship|immigration) status/,
      ],
      t
    ) ||
    allRe([/\bhud\b/, /complaint/], t) ||
    allRe([/title (vii|viii)/, /(discriminat|housing|tenant)/], t) ||
    near(t, /\bice\b/, /(immigration|deport|citizenship|status|raid|agent|detain)/, 60)
  );
};

// A.1.4 — DV/SA/stalking/trafficking/elder-abuse.
const A14: Detector = (raw) => {
  const t = norm(raw);
  return anyRe(
    [
      /domestic violence/,
      /sexual assault/,
      /\bstalking\b/,
      /human trafficking/,
      /elder abuse/,
      /dependent adult/,
      /1946\.7/,
      /1161\.3/,
      /restraining order/,
      /protective order/,
      /\bvawa\b/,
      /(victim|survivor) of (abuse|violence|assault|stalking|trafficking)/,
      /(safe at home|address confidentiality)/,
    ],
    t
  );
};

// A.1.5 — Retaliation/habitability/repair-and-deduct/withholding. Decision 2: bare
// 1941/1942 require statute context (decimals stay bare); causal window narrowed to 45.
const A15: Detector = (raw) => {
  const t = norm(raw);
  return (
    anyRe(
      [
        /retaliat/,
        /habitability/,
        /uninhabitable/,
        /repair[ -]and[ -]deduct/,
        /code enforcement/,
        /building inspector/,
        /code violation/,
        /withh(old|olding|eld) rent/,
        /rent strike/,
        /tenant (union|organizing)/,
        /1942\.5/,
        /1941\.1/,
        /(section|code|civ|ccp)\s*194[12]\b/,
        /tobener/,
      ],
      t
    ) || near(t, /evict\w*/, /(complain|reported|repair|inspector|withh(old|olding|eld))/, 45)
  );
};

// A.2.1 — Drafted notice text. Boilerplate + scaffold tiers (bare "N-day notice"
// intentionally excluded; paraphrased drafts are classifier track).
const A21: Detector = (raw) => {
  const t = norm(raw);
  return anyRe(
    [
      /you are hereby (notified|required|requested)/,
      /notice to (pay rent or quit|quit|perform covenants|vacate|quit possession)/,
      /within three \(3\) days/,
      /notice of belief of abandonment/,
      /\[(insert|tenant|landlord|amount|address|date)[^\]]*\]/,
      /<insert[^>]*>/,
      /_{3,}/,
      /your name here/,
      /you (can|could|might) (say|write|put) something like/,
    ],
    t
  );
};

// A.2.2 — Case-specific legal conclusions. PARTIAL pre-filter (classifier closes it).
const A22: Detector = (raw) => {
  const t = norm(raw);
  return (
    anyRe(
      [
        /you (can|may) (legally )?evict/,
        /you'?ll win/,
        /that'?s not retaliation/,
        /the tenant (has no|does ?n'?t have a|doesn'?t have a) defense/,
        /this (qualifies|counts) as just cause/,
        /your notice (is|was) valid/,
      ],
      t
    ) ||
    allRe([/you have a (valid|strong) (case|notice)/, /your (case|notice)/], t) ||
    near(t, /you (do|don'?t|do not) (need|have)/, /(notice|just cause|grounds|defense)/, 60)
  );
};

// A.2.3 — Strategy/tactics.
const A23: Detector = (raw) => {
  const t = norm(raw);
  return (
    anyRe(
      [
        /cash[ -]?for[ -]?keys/,
        /settlement (agreement|offer|terms)/,
        /take a default/,
        /default judgment/,
        /what to (say|tell) (the|a) judge/,
        /motion to (quash|strike|dismiss|compel|stay)/,
        /negotiat\w* with (the )?tenant'?s (lawyer|attorney|counsel)/,
      ],
      t
    ) || allRe([/(file|filing) (a )?(response|answer)/, /(unlawful detainer|\bud\b|eviction)/], t)
  );
};

// --- A.2.4 allow-list (BLOCKING precondition, verified). Checked BEFORE patterns. --
export const A24_ALLOWLIST: string[] = [
  INPUT_REFUSAL,
  OUTPUT_REFUSAL,
  "county bar association's lawyer-referral service",
  'lawyer-referral service',
  'your own attorney',
  'your attorney',
  "OwnerPilot intentionally doesn't refer you to a specific attorney",
  '/our-approach',
];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function maskAllowlisted(raw: string): string {
  let out = raw;
  for (const phrase of A24_ALLOWLIST) {
    out = out.replace(new RegExp(escapeRe(phrase), 'gi'), ' ');
  }
  return out;
}

// A.2.4 — Specific-attorney referral. Precision-favoring; runs on ORIGINAL case
// (proper-noun heuristics) AFTER allow-list masking. Proper-noun-& heuristic rejected.
const A24: Detector = (raw) => {
  const t = maskAllowlisted(raw);
  return (
    /[Ll]aw\s+(?:[Ff]irm|[Oo]ffice)s?\s+[Oo]f\s+[A-Z][a-z]/.test(t) ||
    /\bEsq\.?\b/.test(t) ||
    /[A-Z][A-Za-z&.,'\- ]{1,40}\b(LLP|APC)\b/.test(t)
  );
};

export const INPUT_DETECTORS: Record<string, Detector> = {
  'A.1.1': A11, 'A.1.2': A12, 'A.1.3': A13, 'A.1.4': A14, 'A.1.5': A15,
};
export const OUTPUT_DETECTORS: Record<string, Detector> = {
  'A.2.1': A21, 'A.2.2': A22, 'A.2.3': A23, 'A.2.4': A24,
};

/** First input category that fires (input refusal wins on co-fire), or null. */
export function inputFires(raw: string): string | null {
  for (const [cat, det] of Object.entries(INPUT_DETECTORS)) if (det(raw)) return cat;
  return null;
}
/** First output category that fires, or null. */
export function outputFires(raw: string): string | null {
  for (const [cat, det] of Object.entries(OUTPUT_DETECTORS)) if (det(raw)) return cat;
  return null;
}

/** H1 input pre-check: does the latest user turn hit a HARD-RULES trigger? */
export function inputTriggersHandoff(latestUserText: string): boolean {
  return inputFires(latestUserText) !== null;
}

/** H1 output guard: does the model's completed response hit a blocked pattern? */
export function outputViolates(text: string): boolean {
  return outputFires(text) !== null;
}
