// lib/btrm/enr/provenance.ts
// ENR-001 provenance classification (spec §3.1, §12 self-critique #3: "provenance defaults to the weakest
// compatible class; upgrades require explicit corroboration"). Deterministic, rules-only — verificationStatus +
// evidenceType, nothing else. Deliberately does NOT attempt cross-item corroboration: that measurement belongs
// to CM-001 (Stage 3, ConfidenceAssessment.corroboration — spec §4), and ENR-001 pre-empting it here would
// duplicate a future component's responsibility and blur the "descriptive, not a learned model" boundary this
// stage is scoped to. Extend HARD_RECORD_EVIDENCE_TYPES only via a reviewed change — it is the one lever that
// moves an item from "document_supported" to "confirmed_fact" and should stay narrow and auditable.

import type { EvidenceItem, Provenance } from '../types';

/** Evidence types treated as inherently authoritative third-party records (bank/payroll/lease/inspection/court/
 *  notice records) — the only evidence types eligible for `confirmed_fact` even when `verificationStatus` is
 *  'verified'. Everything else verified still lands at `document_supported`, the weaker compatible class,
 *  per the "default to weakest" rule. */
export const HARD_RECORD_EVIDENCE_TYPES: ReadonlySet<string> = new Set([
  'payment_record',
  'bank_record',
  'payroll_record',
  'lease',
  'signed_agreement',
  'inspection_report',
  'court_record',
  'notice',
]);

/**
 * Classify a single EvidenceItem's provenance. Rules, in order:
 *  1. Missing verificationStatus or evidenceType -> 'unknown' (never guess).
 *  2. 'disputed' verificationStatus -> 'disputed_statement', regardless of evidenceType (disputed is a distinct
 *     semantic state, not merely "weak" — it means a party contests the item, which HARD_RECORD status cannot
 *     override).
 *  3. 'unverified' verificationStatus -> 'unverified_statement' (the default weakest class for non-disputed,
 *     non-verified evidence).
 *  4. 'verified' verificationStatus -> 'confirmed_fact' only if evidenceType is in HARD_RECORD_EVIDENCE_TYPES;
 *     otherwise 'document_supported' (verified-but-not-authoritative-record still defaults to the weaker of the
 *     two verified-compatible classes).
 */
export function classifyProvenance(item: Pick<EvidenceItem, 'verificationStatus' | 'evidenceType'>): Provenance {
  if (!item.verificationStatus || !item.evidenceType) return 'unknown';
  if (item.verificationStatus === 'disputed') return 'disputed_statement';
  if (item.verificationStatus === 'unverified') return 'unverified_statement';
  // verificationStatus === 'verified'
  return HARD_RECORD_EVIDENCE_TYPES.has(item.evidenceType) ? 'confirmed_fact' : 'document_supported';
}

/** Human-readable rationale for a classification, for the ProvenanceLedger entry (spec: every derived event
 *  carries a provenance class AND a plain-language reason — no bare enum with no explanation, matching the
 *  explainability posture the rest of BTRM-001 holds RIE/OCM/CS to). */
export function provenanceRationale(item: Pick<EvidenceItem, 'verificationStatus' | 'evidenceType'>, result: Provenance): string {
  switch (result) {
    case 'unknown':
      return 'Missing verificationStatus or evidenceType — classified as unknown rather than guessed.';
    case 'disputed_statement':
      return `Marked disputed by verificationStatus, regardless of evidenceType ("${item.evidenceType}").`;
    case 'unverified_statement':
      return `verificationStatus is unverified — defaulted to the weakest compatible class.`;
    case 'document_supported':
      return `verificationStatus is verified, but evidenceType ("${item.evidenceType}") is not an authoritative-record type — defaulted to the weaker verified class.`;
    case 'confirmed_fact':
      return `verificationStatus is verified and evidenceType ("${item.evidenceType}") is an authoritative third-party record type.`;
    case 'ai_inference':
      return 'ENR-001 never assigns ai_inference — this class is reserved for downstream inferential components.';
  }
}
