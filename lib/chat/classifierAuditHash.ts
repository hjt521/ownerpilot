/**
 * Classifier audit input-hash module (Slice 3a).
 *
 * The ONE place classifier input is canonicalized and hashed in the codebase
 * (broker ruling 2026-06-21 §2.5 item 1). Governs input_decision_hash per the
 * classifier-lock-conflict ruling §1.3 (HMAC-SHA-256, never plain) and this
 * ruling's §4.3 / §4.4 / §4.5.
 *
 * The raw classifier input is hashed here and never leaves this boundary as
 * stored data — the 2026-06-06 persistence lock forbids retaining the target
 * text. Only the HMAC (or null, when the key is missing) is carried onward.
 */
import { createHmac } from 'node:crypto';

/**
 * Canonical form for the classifier input hash. FROZEN at Slice 3a land
 * (ruling §4.5): NFC-normalize, then trim, then lowercase — in that order.
 *
 * Order rationale (ruling §2.5): NFC first collapses canonically-equivalent
 * Unicode sequences; trim second removes leading/trailing whitespace; lowercase
 * last avoids precomposed-vs-decomposed case-fold edge cases. `toLowerCase`
 * (NOT `toLocaleLowerCase`) is intentional — locale-independent folding so the
 * hash is reproducible regardless of server locale.
 *
 * Changing this function makes ALL historical hashes non-matchable; any change
 * is a fresh broker ruling. This is the only canonicalization of classifier
 * input in the codebase.
 */
export function canonicalizeForHash(input: string): string {
  return input.normalize('NFC').trim().toLowerCase();
}

/**
 * The HMAC message: canonical form + '|' + chain_head_sha (ruling §4.5 / §2.5
 * item 4). The '|' is the documented delimiter. (Build note: '|' can occur in
 * raw input; trim/lowercase do not strip it. Collision risk is negligible in
 * practice because chain_head_sha is a fixed-length hex suffix, and the
 * determination fixes this construction — implemented verbatim.)
 */
export function hmacInput(canonical: string, chainHeadSha: string): string {
  return `${canonical}|${chainHeadSha}`;
}

/** The HMAC key from the production secret store. Null when unset (ruling §4.3:
 *  durability-first — a missing key yields a null hash, not a dropped row). */
export function resolveClassifierAuditHashKey(): string | null {
  const k = process.env.CLASSIFIER_AUDIT_HASH_KEY;
  return k && k.length > 0 ? k : null;
}

/** The current key generation (ruling §4.4), supplied per-row so each audit row
 *  self-identifies which key produced its hash. Sourced from the same secret
 *  store as the key. Falls back to 'gen-unknown' (a self-identifying signal that
 *  the generation env was unset at write time). */
export function resolveKeyGeneration(): string {
  const g = process.env.CLASSIFIER_AUDIT_KEY_GENERATION;
  return g && g.length > 0 ? g : 'gen-unknown';
}

export interface ClassifierInputHashResult {
  /** HMAC-SHA-256 hex, or null when the key was missing at compute time. */
  hash: string | null;
  /** True when CLASSIFIER_AUDIT_HASH_KEY was absent (drives the §4.3 warning). */
  keyMissing: boolean;
  /** Key generation stamped on the row (ruling §4.4). */
  keyGeneration: string;
}

/**
 * Compute input_decision_hash: HMAC-SHA-256 over hmacInput(canonicalize(input),
 * chainHeadSha), keyed by CLASSIFIER_AUDIT_HASH_KEY. When the key is absent,
 * returns { hash: null, keyMissing: true } (ruling §4.3, durability-first).
 *
 * `keyOverride` is for tests only (inject a key or null); production reads env.
 */
export function computeClassifierInputDecisionHash(
  input: string,
  chainHeadSha: string,
  keyOverride?: string | null,
): ClassifierInputHashResult {
  const key = keyOverride !== undefined ? keyOverride : resolveClassifierAuditHashKey();
  const keyGeneration = resolveKeyGeneration();
  if (!key) return { hash: null, keyMissing: true, keyGeneration };
  const canonical = canonicalizeForHash(input);
  const hash = createHmac('sha256', key).update(hmacInput(canonical, chainHeadSha)).digest('hex');
  return { hash, keyMissing: false, keyGeneration };
}
