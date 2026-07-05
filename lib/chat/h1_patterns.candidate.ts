/**
 * H1 detection patterns — CANDIDATE set for broker sign-off.
 *
 * NOT WIRED INTO THE ROUTE. The live guards in lib/chat/guards.ts keep empty
 * pattern lists and stay inert. This module exists so the validation harness
 * (lib/chat/h1_harness.ts) can produce the FP/FN report the attorney requires
 * before sign-off (interim review 2026-06-07 §2). On a sign-off ruling, the
 * approved subset is copied into guards.ts.
 *
 * Incorporates every §3 redline from chatbox_h1_patterns_attorney_interim_review_
 * 2026-06-07.md. Recall-favoring on all categories except A.2.4 (precision-
 * favoring per §1.1 carve-out, allow-list checked first per §3.9).
 *
 * Categories deferred to the classifier track (not closed by regex): A.1.3
 * bare-characteristic context, A.2.2 (regex is a partial pre-filter only),
 * A.2.1 paraphrased drafts, A.2.4 robust name detection.
 */

import { INPUT_REFUSAL, OUTPUT_REFUSAL } from './guards';

// --- normalization ---------------------------------------------------------
// lowercase; fold curly quotes + en/em dashes; drop the § sign (so "§ 1942.5",
// "section 1942.5", "civil code 1942.5", "civ. code § 1942.5" all reduce to a
// matchable "...1942.5" token); collapse whitespace.
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

const any = (res: RegExp[], t: string): boolean => res.some((r) => r.test(t));
const all = (res: RegExp[], t: string): boolean => res.every((r) => r.test(t));

/** proximity: a and b occur within `window` chars with no sentence terminator
 *  between them (approximates "same sentence / within ~15 tokens"). */
function near(t: string, a: RegExp, b: RegExp, window = 90): boolean {
  const ag = new RegExp(a.source, 'g');
  const bMatches: Array<[number, number]> = [];
  const bg = new RegExp(b.source, 'g');
  let bm: RegExpExecArray | null;
  while ((bm = bg.exec(t)) !== null) bMatches.push([bm.index, bm.index + bm[0].length]);
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

// ===========================================================================
// INPUT detectors (fire => INPUT_REFUSAL, before the model). Operate on norm().
// ===========================================================================

// A.1.1 — Active/imminent litigation. High-precision tier only (lower-precision
// REJECTED §3.1). restraining/protective order moved to A.1.4.
const A11: Detector = (raw) => {
  const t = norm(raw);
  return (
    any(
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
    // (summons|complaint) co-occurring with a litigation verb/context
    all([/(summons|complaint)/, /(serv|receiv|filed|court)/], t) ||
    // "filed to have them evicted" / "evicted" near a filing/court term
    near(t, /evict\w*/, /(filed|served|court)/, 60)
  );
};

// A.1.2 — Bankruptcy. Approved as drafted (§3.2). "chapter N" tightened to
// co-occur with a bankruptcy term so "chapter 13 of the lease" does not fire.
const A12: Detector = (raw) => {
  const t = norm(raw);
  return (
    any(
      [
        /bankruptc(y|ies)/,
        /automatic stay/,
        /bankruptcy (trustee|case|petition|filing)/,
        /341 (meeting|hearing)/,
        /proof of claim/,
        /relief from stay/,
      ],
      t
    ) ||
    all([/chapter\s*(7|11|13)/, /(bankruptc|trustee|debtor|creditor|stay|petition)/], t)
  );
};

// A.1.3 — Discrimination/fair-housing HIGH-SIGNAL tier (§3.3). Bare-characteristic
// context DEFERRED to classifier (§1.2). Carve-outs added: citizenship/immigration
// status (Civ. Code § 1940.3) and ICE-the-agency (disambiguated to immigration
// context to avoid "ice maker" FP — flagged for confirmation in the cover doc).
const A13: Detector = (raw) => {
  const t = norm(raw);
  return (
    any(
      [
        /fair housing/,
        /\bfeha\b/,
        /\brfha\b/,
        /discriminat/,
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
    all([/\bhud\b/, /complaint/], t) ||
    all([/title (vii|viii)/, /(discriminat|housing|tenant)/], t) ||
    near(t, /\bice\b/, /(immigration|deport|citizenship|status|raid|agent|detain)/, 60)
  );
};

// A.1.4 — DV/SA/stalking/trafficking/elder-abuse (§3.4). Approved + survivor,
// safe-at-home/address-confidentiality, restraining/protective order.
const A14: Detector = (raw) => {
  const t = norm(raw);
  return any(
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

// A.1.5 — Retaliation/habitability/repair-and-deduct/withholding (§3.5).
// High-signal approved; causal tier tightened to same-sentence/~window proximity.
const A15: Detector = (raw) => {
  const t = norm(raw);
  return (
    any(
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
        /194[12](\.\d)?/,
        /1941\.1/,
        /tobener/,
      ],
      t
    ) ||
    // causal: evict near a complaint/repair/inspector/withholding term, same sentence
    near(t, /evict\w*/, /(complain|reported|repair|inspector|withh(old|olding|eld))/, 90)
  );
};

// ===========================================================================
// OUTPUT detectors (fire => OUTPUT_REFUSAL, on completed response).
// ===========================================================================

// A.2.1 — Drafted notice text (§3.6). Boilerplate + scaffold tiers. Bare
// "N-day notice" intentionally NOT matched (general-info education uses it;
// firing would suppress allowed answers — flagged in cover doc). Paraphrased
// drafts acknowledged as a gap (classifier track).
const A21: Detector = (raw) => {
  const t = norm(raw);
  return any(
    [
      /you are hereby (notified|required|requested)/,
      /notice to (pay rent or quit|quit|perform covenants|vacate|quit possession)/,
      /within three \(3\) days/,
      /notice of belief of abandonment/,
      // scaffolds / templates
      /\[(insert|tenant|landlord|amount|address|date)[^\]]*\]/,
      /<insert[^>]*>/,
      /_{3,}/,
      /your name here/,
      /you (can|could|might) (say|write|put) something like/,
    ],
    t
  );
};

// A.2.2 — Case-specific legal conclusions (§3.7). PARTIAL pre-filter only; does
// NOT close the category (classifier required §1.3). Possessive co-occurrence
// added to avoid firing on general statements of law.
const A22: Detector = (raw) => {
  const t = norm(raw);
  return (
    any(
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
    all([/you have a (valid|strong) (case|notice)/, /your (case|notice)/], t) ||
    near(t, /you (do|don'?t|do not) (need|have)/, /(notice|just cause|grounds|defense)/, 60)
  );
};

// A.2.3 — Strategy/tactics (§3.8). High-precision approved; motion tightened;
// time-service dropped; file/answer-a-response co-occurrence added.
const A23: Detector = (raw) => {
  const t = norm(raw);
  return (
    any(
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
    ) ||
    all([/(file|filing) (a )?(response|answer)/, /(unlawful detainer|\bud\b|eviction)/], t)
  );
};

// --- A.2.4 allow-list (§3.9 BLOCKING PRECONDITION) -------------------------
// Checked BEFORE the A.2.4 patterns. Anything that is only allow-listed
// attorney-adjacent phrasing (e.g. the refusal copy itself) must pass.
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

// A.2.4 — Specific-attorney recommendation/referral (§3.9). Precision-favoring.
// Runs on ORIGINAL case (proper-noun heuristics) AFTER allow-list masking.
// Proper-noun "&" heuristic REJECTED per §3.9.
const A24: Detector = (raw) => {
  const t = maskAllowlisted(raw);
  return (
    /[Ll]aw\s+(?:[Ff]irm|[Oo]ffice)s?\s+[Oo]f\s+[A-Z][a-z]/.test(t) ||
    /\bEsq\.?\b/.test(t) ||
    /[A-Z][A-Za-z&.,'\- ]{1,40}\b(LLP|APC)\b/.test(t)
  );
};

export const INPUT_DETECTORS: Record<string, Detector> = {
  'A.1.1': A11,
  'A.1.2': A12,
  'A.1.3': A13,
  'A.1.4': A14,
  'A.1.5': A15,
};

export const OUTPUT_DETECTORS: Record<string, Detector> = {
  'A.2.1': A21,
  'A.2.2': A22,
  'A.2.3': A23,
  'A.2.4': A24,
};

/** First input category that fires (input refusal wins on co-fire). */
export function inputFires(raw: string): string | null {
  for (const [cat, det] of Object.entries(INPUT_DETECTORS)) if (det(raw)) return cat;
  return null;
}
/** First output category that fires. */
export function outputFires(raw: string): string | null {
  for (const [cat, det] of Object.entries(OUTPUT_DETECTORS)) if (det(raw)) return cat;
  return null;
}
