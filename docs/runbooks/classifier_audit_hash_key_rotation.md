# Runbook — CLASSIFIER_AUDIT_HASH_KEY rotation

**Owner:** broker (JT) · **Cadence:** annual at minimum (broker ruling 2026-06-20 §3 SHOULD FIX 8)
**Governing rulings:** `classifier_persistence_lock_conflict_broker_ruling_response_2026-06-20.md` §1.3; `slice3_split_classifier_audit_activation_broker_ruling_response_2026-06-21.md` §2.4

## What the key does

`CLASSIFIER_AUDIT_HASH_KEY` is the HMAC-SHA-256 secret that produces `classifier_audit_log.input_decision_hash`. The hash lets two audit rows about the same classifier input be linked ("did we see this before") without ever storing the input text (the 2026-06-06 persistence lock). The key lives only in the production secret store (Vercel env) — never in source, never in a git-tracked env file.

A second env var, `CLASSIFIER_AUDIT_KEY_GENERATION`, names the current key generation (e.g. `gen-2026-06`). The sink stamps it on every row as `key_generation`, so each row self-identifies which key produced its hash.

## Generation registry (primary source of truth is the rows; this table explains the values)

| key_generation | key set on | rotated out | notes |
|----------------|-----------|-------------|-------|
| gen-2026-06    | initial   | —           | initial generation; migration 004 default |

Append a row here on every rotation. The `classifier_audit_log` rows are the primary record of which generation applied when (via `key_generation` + `decided_at`); this table maps a generation label to the human facts (when it was active, why rotated).

## Rotation procedure

1. **Generate a new key.** A high-entropy random secret (≥ 32 bytes). Do not reuse a prior key.
2. **Pick the new generation label.** Convention: `gen-YYYY-MM` of the rotation (e.g. `gen-2027-06`). Add it to the registry table above with today's date.
3. **Retain the old key read-only.** Keep the prior `CLASSIFIER_AUDIT_HASH_KEY` value recorded in the secret store under a dated name (e.g. `CLASSIFIER_AUDIT_HASH_KEY_gen-2026-06`) for the retention window (7 years), so historical hashes within that generation can still be recomputed/matched. Per §1.3, hashes across generations are intentionally non-comparable.
4. **Set the new values in Vercel** (production scope): `CLASSIFIER_AUDIT_HASH_KEY` = new key, `CLASSIFIER_AUDIT_KEY_GENERATION` = new label.
5. **Redeploy.** New classifier-audit rows stamp the new `key_generation` and hash under the new key. Old rows are unaffected and remain matchable with the retained old key.
6. **Verify.** Confirm a fresh `classifier_audit_log` row carries the new `key_generation` value and a non-null `input_decision_hash`.

## Missing-key handling (not a rotation, but related)

If `CLASSIFIER_AUDIT_HASH_KEY` is absent at write time, the sink writes the row with `input_decision_hash = null` and emits the `classifier_audit_hash_key_missing` alert (ruling §4.3). This is a misconfiguration to fix, not an audit gap — the row still lands; only dedup is unavailable for it. A startup self-check (Slice 3b) also alerts once at boot when the flag is on and the key is absent.

## Who / when

- **Who rotates:** the broker (JT), or a delegate the broker authorizes in writing.
- **When:** annually at minimum; immediately on any suspected secret-store compromise.
- **Record:** every rotation appends to the registry table above and is noted in the deploy that carries it.
