/**
 * Classifier audit record (Slice 3a) — the §1.2 field set from the
 * classifier-lock-conflict ruling (2026-06-20), as amended. Types only.
 *
 * NO input_text. The only input-derived field is input_decision_hash (a
 * non-reversible HMAC, or null when the key was missing). reason is preserved
 * from the existing telemetry and MUST NOT contain user input text (audited;
 * broker ruling 2026-06-21 §1.2).
 */
export type ClassifierAuditSide = 'input' | 'output';

export interface ClassifierAuditRecord {
  /** e.g. 'claude-haiku-4.5' (the CLASSIFIER_MODEL constant at decision time). */
  model_id: string;
  /** Anthropic-side call id (msg.id); nullable. */
  model_call_id: string | null;
  /** Structured classifier output: 'ok' | 'unsure' | 'block' | 'other'. */
  verdict: string;
  /** Structured classifier output payload (categories/flags). NO input text. */
  score_or_flags: unknown;
  /** End-to-end classifier call latency, ms. Nullable if unmeasured. */
  decision_latency_ms: number | null;
  /** Repo HEAD at decision time. */
  chain_head_sha: string | null;
  /** HMAC-SHA-256 of the canonical input | chain_head_sha. null => key missing. */
  input_decision_hash: string | null;
  /** Key generation that produced input_decision_hash (ruling §4.4). */
  key_generation: string;
  /** 'input' | 'output' (preserved from existing telemetry). */
  side: ClassifierAuditSide;
  /** Preserved from existing telemetry. */
  ok: boolean;
  /** Preserved from existing telemetry. */
  unsure: boolean;
  /** Preserved from existing telemetry; MUST NOT contain input text. */
  reason: string | null;
}
