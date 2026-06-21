-- OwnerPilot AI — Classifier audit key-generation column
-- Migration: 004_classifier_key_generation
--
-- Implements Slice 3a per broker ruling 2026-06-21 §4.4 / §2.4
-- (slice3_split_classifier_audit_activation_broker_ruling_response_2026-06-21.md).
--
-- Adds an in-row key_generation marker so each classifier_audit_log row
-- self-identifies which HMAC key generation produced its input_decision_hash.
-- Per the classifier-lock-conflict ruling §1.3, hashes are non-comparable across
-- key generations and old keys are retained read-only for the retention window;
-- both halves require knowing, per row, which generation produced the hash.
-- External-rotation-log-only is the anti-pattern §2.1(4) ruled against — the
-- generation belongs in the row.
--
--   * NOT NULL with a static default of the initial generation ('gen-2026-06').
--     The app supplies the live value per-row from CLASSIFIER_AUDIT_KEY_GENERATION
--     (same secret store as the key); the default is the safety net.
--   * On rotation, the deploy that introduces the new key updates the env
--     generation value; the old key is retained read-only per §1.3.
--   * classifier_audit_log is currently empty, so no backfill is required.

alter table public.classifier_audit_log
  add column key_generation text not null default 'gen-2026-06';
