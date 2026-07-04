# P4 — Persona Production Wiring — Close-Out Attestation Packet (Q1–Q5)

**Date:** 2026-07-04
**Ruling:** `p4_persona_production_wiring_broker_ruling_2026-07-04` + Q1 countersign `p4_q1_persona_lease_concept_vocabulary_broker_countersign_2026-07-04`.
**Author:** Engineering (Claude Code), under BROKER STANDING ORDER 2026-07-03 §2 P4.
**Status:** P4 CLOSED — all five items delivered.

---

## Q1 — CAR RLMM lease literacy ✅ (this PR)

- **Concept vocabulary appended to the persona.** The broker-countersigned block (all six amendments integrated) was appended **verbatim** to `OWNERPILOT_PERSONA_SYSTEM_PROMPT` (`lib/chat/persona.ts`) — extracted programmatically from the countersign doc for byte-fidelity (8196 chars, 10 paragraphs). Covers: rent/payment (§ 1671(d), *Orozco*, § 1161(2), § 1947.3), term/conversion (§§ 1945/1946/1946.1), **just-cause/no-fault** (§ 1946.2 TPA + at-fault/no-fault + relocation § 1946.2(d) + JCO/RSO layering + the three-question framework), security deposit (§ 1950.5, AB 12 cap + small-landlord exception), parties/occupants, signer authority (SoS exact-name + agent basis), premises/service address (§ 1962), configurable terms, and broker-scope posture (§ 10131(b)).
- **Re-locked:** `system-prompt-lock` regenerated → sha256 `78a48c501d154411fefa6c140e80e80bc043d54ea0f6cb6cf61dac6677c994f4`, 14498 bytes, status `LOCKED_P4_Q1`, approvedBy "Jack Taglyan / CalDRE B9445457". Guard re-run → matches.
- **CAR-clean + banned-term clean:** no CAR form language/structure; the only Realtor-association mention is the generic "any format" product framing. `ci:verify-banned-terms` passes (persona.ts scanned).
- **T3 (CAR runtime identifiers)** shipped earlier in Q3.

## Q2 — Transcript retention (parallel lane) 

Per ruling: out of P4 scope for blocking. The decision doc (`schema_and_persistence_lane2_transcript_retention_decision_2026-06-29.md`) is not in the workspace; flagged for the broker's 07-10 §9 (P4 follow-ups) — reconcile against as-built persistence in a parallel lane after 042 clears. No P4 block.

## Q3 — Runtime banned-term output gate ✅ (merged, PR `feature/p4-q3-…`)

Runtime gate wired into `/api/chat` — all model output BLOCK/SCRUB'd before it leaves the server (legal-advice → block; CAR identifiers → scrub); fail-closed; excerpt-only audit logging; single-source `bannedTerms.json` shared with the CI guard. See `p4_persona_wiring_attestation_2026-07-04.md`.

## Q4 — Classifier + rate-limit wiring ✅ (merged, PR `feature/p4-q4-…`)

Rate-limit (ratified per-session config → 429, degrade-open) + H1 classifier (`CLASSIFIER_LIVE`-gated, log+pass-through) wired into `/api/chat`. **Open fork (omnibus §F14):** Q4's per-IP/user recommendation vs the ratified per-session config — wired the ratified config, reconciliation flagged. See `p4_q4_classifier_ratelimit_attestation_2026-07-04.md`.

## Q5 — System-prompt locking form ✅

Confirmed: keep the dedicated `system-prompt-lock` guard (byte-fidelity via `persona.lock.json`; no manifest migration). This PR exercised exactly that re-lock path. Order-text doc reconcile noted.

## Verification (this PR)

`tsc --noEmit` clean · `system-prompt-lock` re-locked + matches (78a48c50…, 14498 bytes) · `ci:verify-banned-terms` OK · `ci:verify-locked-prose` 128 (persona's other consts unaffected) · Q3 runtime-gate test still green.

## Standing open items (07-10 / omnibus §F)

- F14 rate-limit config reconciliation · F15 `CLASSIFIER_LIVE` flip · F16 rate-limit Redis env · Q2 transcript-retention reconcile · ToS user-content clause (Q1 legal footing — before public launch).

---

**Authorized under BROKER STANDING ORDER 2026-07-03 §2 (P4) + rulings 2026-07-04 — Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-04**
Engineering author: Claude Code. **P4 complete.**
