// lib/btrm/safeguards/characterLabelDenylist.ts
// BTRM-001 §11 hard constraint: "No personality labeling" + "No protected-characteristic inference." This is a
// DIFFERENT concern from lib/safety/denylist.ts (which guards PII leaving the process) — this guards BTRM output
// CONTENT against prohibited character judgments and protected-characteristic inference/proxies. Every BAE-001
// observation and every RIE-001/OCM-001/CS-001 free-text field must be scanned before it is returned.
//
// Mirrors the house pattern (one canonical list per concern; scan function; violation is a hard failure, not a
// silent redaction — unlike PII, a character-label conclusion is not something we want to "clean up and ship
// anyway," it means the analysis itself is wrong and must not be returned).

/** Prohibited character/personality-judgment terms (spec §11, explicit examples + close variants). Exact
 *  case-insensitive phrase match against BTRM free-text output. Extend only via a ratified BTRM-001 amendment. */
export const PROHIBITED_CHARACTER_LABELS: string[] = [
  'dishonest person', 'dishonest tenant', 'dishonest landlord', 'dishonest owner',
  'bad tenant', 'bad landlord', 'bad owner', 'difficult landlord', 'difficult tenant',
  'manipulative', 'manipulative tenant', 'manipulative landlord',
  'unstable', 'lazy', 'lazy tenant', 'lazy landlord',
  'aggressive personality', 'high-risk person', 'evasive by nature',
  'untrustworthy person', 'liar', 'con artist', 'scammer', 'deadbeat',
];

/** Protected characteristics that must never be inferred or used, and the stylistic proxies BTRM-001 §11
 *  specifically calls out as forbidden substitutes for them. */
export const PROTECTED_CHARACTERISTICS: string[] = [
  'race', 'ethnicity', 'religion', 'disability', 'national origin',
  'gender identity', 'sexual orientation', 'family status', 'immigration status',
];

export const PROHIBITED_STYLE_PROXIES: string[] = [
  'writing style', 'language fluency', 'spelling', 'dialect', 'emotional expression',
  'accent', 'broken english', 'poor grammar',
];

const ALL_DENIED = [...PROHIBITED_CHARACTER_LABELS, ...PROTECTED_CHARACTERISTICS, ...PROHIBITED_STYLE_PROXIES];

/** Scan free text for any denied phrase. Returns the matched phrases (empty = clean). Case-insensitive,
 *  substring match — deliberately broad (false positives are cheap to re-word; false negatives are not). */
export function scanForCharacterLabels(text: string): string[] {
  const lower = text.toLowerCase();
  return ALL_DENIED.filter((phrase) => lower.includes(phrase));
}

/** True iff `text` contains no denied phrase. */
export function isCleanOfCharacterLabels(text: string): boolean {
  return scanForCharacterLabels(text).length === 0;
}
