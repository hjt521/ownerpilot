# P4 — Persona Production Wiring — Attestation (ruling adopted)

**Date:** 2026-07-04
**Ruling:** `p4_persona_production_wiring_broker_ruling_2026-07-04` (all five items ruled).
**Author:** Engineering (Claude Code). Built under BROKER STANDING ORDER 2026-07-03 §2 P4.

---

## Delivery status by ruling item

| Q | Ruling | Status |
|---|---|---|
| Q1 | CAR RLMM — concept-based lease literacy + 3 tightenings | **Partial:** Tightening 3 (CAR runtime banned-term entries) **DONE** via Q3. T1 concept-vocabulary prose + T2 no-verbatim-echo = **next slice** (needs broker countersign of the vocabulary before it's locked into the persona). |
| Q2 | Transcript retention — out of P4 scope, parallel lane | **Noted** (§below) — flagged as a post-042 reconcile lane; not blocking P4. |
| Q3 | **Runtime banned-term output gate** | **DONE this PR** (§Q3 below). |
| Q4 | Classifier + rate-limit wired into /api/chat | **Next slice.** |
| Q5 | Keep dedicated `system-prompt-lock` guard | **DONE** (no code change; §Q5 below). |

## Q3 — Runtime banned-term output gate ✅ (this PR)

- **Gate:** `lib/chat/runtimeBannedTermGate.ts` — `runtimeBannedTermGate(text)` → BLOCK (discard → `SAFE_FALLBACK`) / SCRUB (redact matched substrings → `[redacted]`) / LOG-ONLY / pass. **Fail-closed** (any error → block + safe fallback).
- **Location wired:** `app/api/chat/route.ts`, between the computed turn and the return/persist — **all response text** passes through before it leaves the server. Logs BLOCK/SCRUB events to the audit sink (`evt: chat.output_gate`, action, term_ids, session_id) — **excerpt only, never full response text** (per Q3 logging spec). The gated text is also written to the persisted transcript (never store unscrubbed output).
- **Single source of truth:** `lib/chat/bannedTerms.json` — consumed by **both** the runtime gate AND the CI guard (`check_banned_terms.mjs` refactored to load `ci:true` entries from it; behavior preserved — CI still passes). Legal-advice terms = `ci:true`/`runtime:block`; CAR identifiers = `ci:false`/`runtime:scrub` (they legitimately appear in rulings/docs, so they must not fail the CI lint — only live model output).
- **CAR identifiers (Q1 T3):** RLMM, C.A.R. Form, C.A.R., paragraph patterns (`¶ 3B(1)`, `Paragraph 3B`), CAR copyright notice, form codes (RLMM/LR/MTM/PAA/NBP in Form context) → **SCRUB**. This is the technical wall between "we read your lease" and "we reproduced CAR's copyrighted expression."
- **Tests:** `runtimeBannedTermGate.test.ts` — BLOCK (legal-advice → fallback), SCRUB (CAR redacted, analysis survives), paragraph-pattern scrub, benign pass-through, **fail-closed** (toString-throws → block). All pass. Default action for CAR = SCRUB per ruling.
- **Perf:** compiled-regex scan over ~2KB responses — well under the 50ms p95 budget (synchronous, no I/O).

## Q5 — System-prompt locking (no code change) ✅

Confirmed as-built: `OWNERPILOT_PERSONA_SYSTEM_PROMPT` byte-locked by the dedicated `system-prompt-lock` guard (sha256 `f3991a92499d6621ca1b0bea73f61de0485bbb06c69cb43a357dd901ed4b5451`, 6266 bytes — guard verified passing), sent verbatim in `/api/chat`. Ruling: keep the dedicated guard (equivalent byte-fidelity, no security gain to manifest migration). Doc reconcile of the order text noted.

## Q2 — Transcript retention (parallel lane, not blocking) 

The decision doc (`schema_and_persistence_lane2_transcript_retention_decision_2026-06-29.md`) is not in the engineering workspace. Per ruling: out of P4 scope for blocking; reconcile against as-built persistence in a parallel lane after 042 clears. Flagged for the broker's 07-10 §9 (P4 follow-ups).

## Next slices (P4 not yet fully closed)

- **Q4** — wire H1 classifier (pre-model, log+pass-through) + rate-limit (anon 10/60s·100/24h; auth 60/60s·1000/24h; 429) into `/api/chat` + tests + attestation Q4 section.
- **Q1 T1/T2** — author the concept-vocabulary reference context in OwnerPilot's own words (the approved concept map), **broker countersigns the vocabulary**, then it's appended to the persona (system-prompt hash re-locked). No CAR verbatim/structure.
- **ToS language** (Q1 legal footing) — product/legal follow-up, before public launch.

## Verification (this PR)

Q3 gate tests pass · tsc clean · `ci:verify-banned-terms` OK (single-source refactor preserved) · route-body-parsing 34 clean · no new dependency, no migration.

---

**Authorized under BROKER STANDING ORDER 2026-07-03 §2 (P4) + ruling p4_persona_production_wiring_broker_ruling_2026-07-04 — Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-04**
Engineering author: Claude Code.
