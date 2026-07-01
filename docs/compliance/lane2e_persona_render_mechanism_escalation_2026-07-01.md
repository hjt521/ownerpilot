# ENGINEERING ESCALATION — Lane 2E Persona Capture-Turn Render Mechanism (§1.6)

**Re:** `lane2e_persona_prose_broker_ruling_2026-07-01.md` (four ratified capture-turn blocks, manifest #5–#8).
**Raised by:** engineering, 2026-07-01, before wiring (build held per §0 / §1.6).
**Class:** §1.6 behavioral/architectural divergence — NOT a §8 field-shape reuse. The ruling presupposes a
deterministic verbatim-emission render pipeline; the as-built persona flow is LLM-generated reply text. This
determines *what artifact gets built*, so it is a broker ruling, not an engineering default.
**Disposition requested:** rule the render mechanism (Fork A / B / C below), then engineering wires + files the
Lane 2E attestation. No prose is edited — the four ratified strings (§§2–5) are accepted verbatim regardless.

---

## §1 — The as-built persona flow (evidence)

The persona is a single **locked system prompt** sent to Perplexity `sonar-pro`; the owner-facing text is always
the model's generated `reply`. There is no deterministic point at which a server-owned verbatim string is emitted
to the owner.

- `app/api/chat/route.ts` L41–49, L69: one call per turn —
  `messages = [{role:'system', content: OWNERPILOT_PERSONA_SYSTEM_PROMPT}, ...history, {role:'user', content: message}]`
  → `callPerplexity(messages)` → `applyTurn(...)` → `reply: turn.reply`.
- `lib/chat/orchestrate.ts` L37–43: the assistant transcript turn and the returned reply are both `model.reply`.
  There is **no override path** that substitutes a server-owned string for the model's reply.

## §2 — Where the ruling assumes deterministic emission

- §1: "no paraphrase **at render time**" and "no templating… at render time" — presupposes a render pipeline that
  *could* paraphrase and is being told not to.
- §7 item 2: "The four capture-turn **call sites** in the persona flow calling into the ratified blocks" —
  there is one call site (the system prompt), not four per-turn call sites.
- §8 (countersign posture): "I will not countersign if any of the four ratified strings are edited, paraphrased,
  or reformatted in `persona.ts`… or if the persona.ts render pipeline templates or i18ns any of the four blocks
  at runtime."

In an LLM-generated-reply flow, "render" **is** the model writing the owner-facing text, which paraphrases by
nature. Hashing a `chatIntakeRentPeriodsPrompt` constant proves the *source string* is byte-stable; it does **not**
guarantee the owner ever sees those exact words. **§8's countersign conditions cannot be met by adding constants +
manifest hashes to an LLM-driven reply path.** That would be copy-lock theater.

## §3 — Fork (broker to rule)

**Fork A — Deterministic scripted capture sub-flow (matches the ruling's guarantee).**
The server (not the model) emits each of the four blocks verbatim, with owner-slot interpolation only, at the
capture point; the owner's answer is parsed deterministically server-side (the §5.3 tri-state table; §2.4/§3.4/§4.4
guardrails become real server logic — start-after-end, non-positive amount, entity branch + confirm, zero-day
availability, ambiguous-dispute re-ask). §8's byte-stability + no-paraphrase guarantee becomes real and hashable.
*Cost:* a new orchestration mode alongside the LLM flow; the model stops driving these four turns; parsing +
guardrail logic moves server-side. This is the largest build but the only one that honors §8 as written.

**Fork B — System-prompt injection (instruction, not guarantee).**
Add the four blocks to `OWNERPILOT_PERSONA_SYSTEM_PROMPT` as "when you need X, ask exactly this" instructions.
Cheap; keeps the LLM flow. But the model still generates the owner-facing `reply`, so it MAY paraphrase — §8's
"no paraphrase / will not countersign if paraphrased" **cannot be honored**, and the manifest hash locks the
instruction, not the output. Also folds the blocks *into* the system-prompt constant, so persona.lock.json
re-locks (operator re-review per drift ruling 2026-06-06 §4) and there are **no** separate manifest entries #5–#8.

**Fork C — Hybrid: LLM extracts, server emits the four blocks verbatim.**
Keep the LLM for extraction and all other turns, but when the orchestrator determines the next required field is one
of the four, override `reply` with the verbatim server-owned block (deterministic), then let the LLM parse the
owner's next answer into `extracted_fields`. Gives real verbatim emission for the four blocks with a smaller build
than A. *Complication:* "next required field" and the guardrail re-asks need deterministic server logic too, or they
leak back to the model (partial §8 exposure). Requires a broker line on how much of §2.4/§3.4/§4.4/§5.3 must be
server-deterministic vs. model-mediated.

## §4 — Secondary data-shape items (resolve with the fork)

1. **Manifest numbering.** §6/§7 reference "entries #1–#4" and "green on all 8 entries." The as-built
   `docs/compliance/locked_prose_manifest.json` has **11** entries (bank-deposit / LAHD / jurisdiction /
   intended-service-date), **none in persona.ts**, and **no `entry_id`** field. Appending four → 15, not 8.
   Under Fork A/C the four persona entries are appended in the as-built Shape-A schema (no `entry_id`; §8 rule of
   construction / §4.12 as-built). Confirm the attestation should cite the true entry count, not "8."
2. **Lock mechanism.** persona.lock.json hashes only the `OWNERPILOT_PERSONA_SYSTEM_PROMPT` literal (the guard reads
   the first backtick-pair after the anchor). Constants added *after* it do not change that hash → **no
   system-prompt re-lock under Fork A/C**. Only Fork B (folding blocks into the system prompt) re-locks persona.ts
   and requires operator re-review.

## §5 — What is NOT in question

- The four ratified prose strings (§§2–5) are accepted verbatim; this escalation does not edit them.
- Tri-state `DisputeAnswer` and the 4-value `SignerCapacity` are already landed (Lane 2E, #116) and untouched.
- G4 fires on any dispute `'yes'`, not on `'unknown'` — unchanged.
- Build is held only on the render-mechanism question; PR-A3 §5.2 remains sequenced after this closes.

— Engineering, 2026-07-01 · surfaced per §0 / §1.6 before build
