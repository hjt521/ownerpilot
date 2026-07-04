# P4 — Persona Production Wiring — Verification & Fork

**Date:** 2026-07-03
**Built under:** BROKER STANDING ORDER — Productization 2026-07-03 §2 P4.
**Author:** Engineering (Claude Code).

---

## §1 — Verified production-wired ✅

- **System prompt locked + wired.** `OWNERPILOT_PERSONA_SYSTEM_PROMPT` (`lib/chat/persona.ts`) is byte-locked by the dedicated `system-prompt-lock` CI guard (sha256 `f3991a92…`, 6266 bytes — verified passing) and sent verbatim as the system message in `app/api/chat/route.ts:55`. It is not runtime-templated.
- **Modules present:** H1 classifier (`classifierPrompt.ts`), rate-limit (`rateLimit.ts`, `rateLimitStore.ts`), riskpath escalation (`triggers.ts` / riskpath), banned-terms CI guard.

## §2 — Architecture note (not a defect): "manifest vs dedicated guard"

The order says "system prompt loaded from locked-prose manifest (not inline)." As-built, the prompt is an inline const locked by the **`system-prompt-lock`** guard (byte-exact, sha256-pinned) rather than the phase-2 manifest. This is **equivalent locking** by a different mechanism. **Engineer recommendation:** keep the dedicated guard — refactoring a 6.3KB system prompt into the manifest is risky churn with no security gain (both enforce byte-fidelity). Broker to confirm, or rule if manifest form is required.

## §3 — FORK: CAR RLMM lease facts — BLOCKED on missing input + IP surface

The order: *"commit the CAR RLMM lease facts from `5537LaMirada-202-CliftonAlexander_lease_examination_and_ud_field_mapping_broker_ruling_2026-07-03.md` to the persona's reference context."* Two blockers:

1. **The ruling is not in the workspace or uploads.** I cannot extract the lease facts from a document I don't have. Authoring CAR RLMM lease-section content from memory would be **legal-content hallucination** — unacceptable for a compliance surface.
2. **IP surface not ruled.** CAR RLMM is a **proprietary, copyrighted California Association of Realtors form.** `CLAUDE.md` states: *"All notice templates are original OwnerPilot IP — never use CAR forms."* Embedding CAR RLMM section content/structure into the persona reference context is arguably in tension with that rule and with CAR copyright — even if the intent is *reading* a tenant's existing CAR lease (input) rather than *generating* a CAR form (output). This needs an explicit broker ruling.

**Broker action (omnibus §F):** (a) provide the lease-examination ruling doc (or the extracted, IP-cleared fact set), and (b) rule the IP question — may the persona reference CAR RLMM form structure, or should the reference context describe lease *concepts* (rent, term, parties, deposit) in OwnerPilot's own words without reproducing CAR's proprietary form? **Engineer lean:** the latter — teach the persona lease *concepts* generically, never reproduce CAR's copyrighted section text/structure. I will build once you provide the source + rule the IP question.

## §4 — Flags to confirm (verify, not assert)

- **Transcript retention:** the referenced decision doc (`schema_and_persistence_lane2_transcript_retention_decision_2026-06-29.md`) is **not in the workspace** — I can't verify the retention impl against it. Please add the doc (or confirm retention is out of scope for P4).
- **Classifier + rate-limit wiring:** both modules exist; `rateLimit` is wired in `app/api/notice/geocode/route.ts`, but I don't see the H1 classifier or rate-limit invoked in the `/api/chat` persona flow. This may be intentional (classifier is a separate lane) or a wiring gap — flagging for confirmation rather than "fixing" a possibly-intended design.
- **Banned-term RUNTIME enforcement:** the order says "banned-term allowlist enforced runtime." As-built, banned-terms is a **CI/static guard** on committed copy — I found no runtime scrub of LLM output. If runtime enforcement (scrub model output before returning) is intended, that's a real build; flagging so you can rule scope before I add a runtime gate.

## §5 — Disposition

P4 is **blocked** on the two missing docs + the IP ruling; I did **not** build code (nothing cleanly buildable without the inputs, and the CAR-facts path risks IP + hallucination). This is a verify-and-fork record. On your inputs (§3/§4), I'll build: the persona reference context (concept-based, IP-cleared) + any confirmed runtime-enforcement gate.

**Omnibus §F additions:** F11 · CAR RLMM lease ruling + IP question (§3). F12 · transcript-retention decision doc (§4). F13 · confirm classifier/rate-limit chat-flow wiring + runtime-banned-term scope (§4).

---

**Authorized under BROKER STANDING ORDER 2026-07-03 §2 (P4) — Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-03**
Engineering author: Claude Code.
