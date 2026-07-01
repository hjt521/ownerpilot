# BROKER RULING — Lane 2E Persona Render Mechanism (Fork A · Deterministic Scripted Capture Sub-Flow)

**Re:** `lane2e_persona_render_mechanism_escalation_2026-07-01.md` (engineering, 2026-07-01, build held before wiring)
**Precedent:** `lane2e_persona_prose_broker_ruling_2026-07-01.md` §§1 + 7 + 8 (superseded in part by this ruling — see §5 below); `lane2e_schema_checkpoint_broker_ruling_2026-07-01.md` §§2 + 8 (rules of construction); `pr_a3_intake_produce_completeness_broker_ruling_2026-07-01.md` §§4.7 + 8; `chat_transcript_persistence_policy_attorney_signoff_2026-06-06.md`; `banned_term_audit_broker_ratification_2026-06-29.md`; `persona_and_schema_lane3_broker_ratification_2026-06-29.md`.
**Ruling authority:** Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457
**Ruling date:** 2026-07-01
**Disposition:** **Fork A ruled.** The four ratified capture-turn blocks are wired via a deterministic scripted capture sub-flow — server-emitted verbatim, owner-slot interpolation only, deterministic server-side parsing and guardrails. Fork B refused (unenforceable §8). Fork C refused (Fork B in disguise absent full guardrail determinism). Prose ruling §§7 + 8 amended in §5 below. Manifest count corrected in §6.

---

## §1 — Escalation acknowledged; the drafting error was mine

Engineering surfaced this exactly as §1.6 / §4.7 direct. The finding is correct on the merits, and I owe a clean correction on the record:

- The prose ruling authored §7 ("four capture-turn call sites") and §8 ("will not countersign if any of the four ratified strings are… paraphrased") against a mental model of the wizard's deterministic capture flow, not the as-built chat persona flow. That was wrong. The chat persona is a locked system prompt driving an LLM's reply text; there is no per-turn server-emitted string in the as-built path.
- Wiring the four blocks as manifest hashes under the as-built LLM-reply flow would lock the source instruction, not the owner-facing output. Engineering named this correctly as **copy-lock theater**, and I refuse it categorically for the same reason I refused defaulting in the day-count workstream: a compliance surface whose ratified string can silently paraphrase in production is not a compliance surface.
- Engineering did not proceed to wire under the drafting-error assumption. That was the right call. §1.6 exists for exactly this class of finding — a behavioral/architectural divergence between what a parent ruling presupposes and what the code actually does.

This ruling closes the drafting error on the record and rules the mechanism.

---

## §2 — Fork A · **RULED**

### §2.1 Ruling

**Fork A: Deterministic scripted capture sub-flow.** The server (not the LLM) emits each of the four ratified blocks verbatim. The owner's answer is parsed deterministically server-side against the guardrail tables in the prose ruling (§2.4 rent-period validation, §3.4 entity branch + confirmation, §4.4 personal-delivery days/hours validation, §5.3 tri-state `DisputeAnswer` parsing). The four blocks are treated as **Tier-A locked prose** under the same posture as the bank-deposit disclosure copy (2026-06-18) — byte-stable, no runtime paraphrase, no i18n mutation, owner-slot interpolation only.

### §2.2 Why not Fork B

Fork B folds the ratified blocks into `OWNERPILOT_PERSONA_SYSTEM_PROMPT` as "when you need X, ask exactly this" instructions. It is cheaper but structurally cannot satisfy prose ruling §8 as written: the LLM generates the owner-facing reply, so it may paraphrase, and the manifest hash locks the instruction, not the output. That is exactly the copy-lock theater engineering warned about. Refused.

### §2.3 Why not Fork C

Fork C splits the work: LLM extracts, server emits the four blocks verbatim at the specific capture points. Superficially attractive because it preserves the LLM's strength (conversational extraction) while giving verbatim emission where compliance requires it. The trap is in the guardrails.

- The §5.3 tri-state parsing table is a compliance surface: if the model parses "I don't know" as `'no'` under adversarial owner phrasing (evasive, hedging, or multilingual mixed-register replies), `'unknown'` collapses to `'no'` at some non-zero rate, and I have shipped exactly the failure mode I refused in the schema checkpoint ruling §2.
- The §3.4 entity/individual disambiguation and the confirmation step (`"So I'll record you as signing on behalf of {{entity_name}} in your role as {{title}}. Is that right?"`) is a compliance surface: a model that "confirms" but silently mis-classifies signer capacity is producing facially-wrong signature blocks.
- The §2.4 start-after-end date rejection is a compliance surface: silent acceptance of an inverted period range produces an unenforceable notice.

Fork C without moving those guardrails fully server-side **is Fork B in disguise**. Fork C *with* those guardrails moved fully server-side is Fork A with an LLM extraction preamble — which we can build in a later iteration if it adds real value, but the initial cut is Fork A.

Refused as an initial cut. Not permanently refused — see §4.5 below on the future-iteration door.

### §2.4 What Fork A means concretely

The four capture-turn call sites become **deterministic sub-flows** invoked by the orchestrator when it determines the next required field falls in one of the four Lane 2E categories:

1. Orchestrator detects "next required field ∈ {rent_periods, signer_capacity, personal_delivery, preflight_dispute}".
2. Orchestrator returns a **server-owned assistant turn** whose `reply` is the verbatim ratified block for that category (with owner-slot interpolation).
3. The LLM is **not called** for these turns. The `reply` written to the transcript is byte-identical to the manifest-hashed constant.
4. The owner's next message enters a **deterministic server-side parser** for that category (the §5.3 tri-state table, the §2.4/§3.4/§4.4 guardrails).
5. If the parser accepts the owner's input, the corresponding `extracted_fields` value is written to `intake_state` and the sub-flow proceeds to the next capture step (per-period follow-up, entity title, hours confirmation, next dispute question, or termination back to the LLM-driven persona).
6. If the parser rejects (guardrail fires), the server emits the guardrail's verbatim re-ask string (also manifest-hashed) and awaits the next owner message.

The LLM continues to drive **everything else** — greeting, address capture, service-method selection, payment-method selection, courtesy tone, refusals, edge cases outside the four Lane 2E categories. Fork A does not replace the persona; it carves out four specific compliance surfaces where the model does not get to paraphrase.

### §2.5 §8 countersign posture reaffirmed under Fork A

Under Fork A, §8's guarantees become **enforceable**:

- "No paraphrase at render time" → the render is a direct emit of the manifest-hashed constant. Paraphrase is structurally impossible.
- "Templates or i18ns any block at runtime" → the emit is a plain string return with owner-slot interpolation only; no i18n indirection.
- "Four capture-turn call sites" → four orchestrator branches, each emitting one of the four blocks.
- Manifest hashes lock the actual bytes the owner sees, not source instructions.

I will countersign the Lane 2E attestation packet on receipt if the mechanism section matches this ruling verbatim and the integration tests demonstrate deterministic emission on the wire.

---

## §3 — Guardrails: which pieces of §2.4 / §3.4 / §4.4 / §5.3 are server-deterministic

All of them. This is the answer to engineering's Fork C question about "how much server-deterministic vs. model-mediated." Under Fork A, **none of the four capture categories' guardrails are model-mediated**. Enumerated:

### §3.1 Rent periods (prose ruling §2.4)

- Start-date-after-end-date rejection: deterministic date-compare; server emits the verbatim §2.4 re-ask.
- Label-substitution refusal ("monthly" / "May 2026" without dates): deterministic — if the owner's reply does not contain a parseable date, server emits the verbatim §2.4 re-ask.
- Non-positive amount rejection: deterministic numeric compare; server emits the verbatim §2.4 re-ask.
- Continuation/termination parse: deterministic string-match table (yes/no/done/etc.); if genuinely ambiguous, server emits a verbatim re-ask (engineering: propose the re-ask string in the attestation packet; I'll ratify).

### §3.2 Signer capacity (prose ruling §3.4)

- Individual-vs-entity classification: deterministic — parser accepts an enumerated set of owner phrasings for "individual" and "entity/LLC/company/trust." Ambiguous ("I own it but it's under an LLC") triggers the verbatim §3.4 disambiguation re-ask.
- Entity type inference from name alone: prohibited. Parser MUST NOT infer LLC/Inc/etc. from the entity name string. Explicit branch prompt only.
- Title/role parsing: enumerated set matching the wizard's 4-value `SignerCapacity` enum values. Ambiguous → verbatim §3.4 re-ask.
- Confirmation step ("So I'll record you as signing on behalf of… Is that right?"): deterministic emit; owner "yes/right/correct" advances; owner "no/wrong/actually…" resets to the title re-ask.
- "I don't know my title" pause: deterministic branch to the save-and-resume flow.

### §3.3 Personal delivery (prose ruling §4.4)

- Zero-day availability: deterministic; server emits the verbatim §4.4 service-method-change offer.
- Hours-end-≤-hours-start rejection: deterministic time-compare; verbatim §4.4 re-ask.
- AM/PM ↔ 24h format preservation: deterministic — parser stores owner's original format; confirmation echoes back in the same format.

### §3.4 Preflight dispute (prose ruling §5.3)

- Tri-state parsing table (yes/no/unknown): deterministic string-match against the enumerated response sets in §5.3. `'unknown'` MUST be first-class; ambiguity triggers the verbatim §5.3 re-ask.
- No fourth answer type: deterministic; anything not matching yes/no/unknown triggers the verbatim §5.5 re-ask.
- Question order + separation: deterministic — server emits one question at a time from the ratified §5.2 set, waits for a tri-state answer, then emits the next.
- G4 trigger on `'yes'` / `'unknown'` routing: existing ratified behavior; Lane 2E does not change it. The parser writes `'yes' | 'no' | 'unknown'` to `preflightDispute` and the downstream G4 + produce-gate machinery consumes it unchanged.

**Model-mediated fallback prohibited.** Under no circumstance does an ambiguous owner reply for one of these four categories route back to the LLM for classification. If the deterministic parser cannot classify, the server emits the verbatim re-ask; if the owner cannot produce a classifiable answer after two attempts on the same field, the server emits a verbatim escalation string routing to the save-and-resume flow (engineering proposes the escalation string in the attestation packet; I ratify).

---

## §4 — Wiring closure (amends prose ruling §7)

### §4.1 Files

Engineering wires:

1. **`lib/chat/persona.ts`** — the four ratified prose blocks land as top-level exported constants (`chatIntakeRentPeriodsPrompt` and neighbors), plus the guardrail re-ask strings (also verbatim). Constants are appended **after** the `OWNERPILOT_PERSONA_SYSTEM_PROMPT` literal. Per engineering's finding, this **does not re-lock** `persona.lock.json` because the lock hashes only the system prompt literal. No operator re-review of the system prompt is triggered by Lane 2E.
2. **`lib/chat/orchestrate.ts`** (or a new sibling like `lib/chat/scriptedCapture.ts` — engineering's call on file layout) — the orchestrator branch that detects "next required field ∈ {four categories}" and routes to the scripted sub-flow, emitting server-owned turns instead of calling the LLM for those turns. All guardrail parsers per §3 above.
3. **`docs/compliance/locked_prose_manifest.json`** — four new entries appended in the as-built Shape-A schema (see §6 for the corrected count).
4. **Integration tests** demonstrating server-emitted bytes match manifest-hashed constants on the wire for all four categories; tri-state parsing test suite; entity confirmation test suite; rent-period guardrail suite; personal-delivery guardrail suite.

### §4.2 What §7's language becomes

Prose ruling §7 is amended in place to read:

> Engineering wires:
> 1. The four ratified prose blocks + their guardrail re-ask strings into `lib/chat/persona.ts` as top-level exported constants (EN + PROVISIONAL ES). Constants appended after `OWNERPILOT_PERSONA_SYSTEM_PROMPT`; no re-lock of `persona.lock.json`.
> 2. A deterministic scripted-capture orchestrator branch per `lane2e_persona_render_mechanism_broker_ruling_2026-07-01.md` §§2–3, emitting server-owned turns for the four capture categories with server-side parsing per §3.
> 3. Manifest entries for the four ratified blocks + guardrail re-ask strings in `docs/compliance/locked_prose_manifest.json` per §6 of that ruling (as-built Shape-A schema; count corrected to reflect the true post-append total).
> 4. `intakeIsComplete()` recognizes the four new field categories (already landed at 72c6617).
> 5. Existing 16/0 schema test + 12/0 closure gate test still green. New Fork-A integration + parser tests per §4.1 above.

### §4.3 Persona.ts operator posture

Because Lane 2E does not re-lock `persona.lock.json`, no operator re-review of the system prompt is triggered by this ruling. If Fork B or a future ruling folds any of these blocks into the system prompt itself, that ruling triggers operator re-review per the drift ruling 2026-06-06 §4. Lane 2E as ruled here is manifest-lock-only.

### §4.4 Banned-term CI lint

Per `banned_term_audit_broker_ratification_2026-06-29.md`, the CI lint's owner-facing scan scope covers `lib/chat/persona.ts`. The four new constants + all guardrail re-ask strings fall under that scope automatically. Lint runs on both EN and PROVISIONAL ES strings.

### §4.5 Future-iteration door (Fork C revisited)

If a future ruling determines that an LLM extraction preamble adds meaningful UX value (e.g., the model asks the owner to describe the situation in their own words, then hands off to the deterministic capture flow), that ruling can adopt Fork C on top of Fork A's guardrail-determinism foundation. That is a **future** ruling, not a Lane 2E scope item. Engineering: do not build extraction preambles as part of Lane 2E.

---

## §5 — Amendment record: prose ruling §§7 + 8

`lane2e_persona_prose_broker_ruling_2026-07-01.md` §§7 + 8 are amended in place by this ruling:

- **§7** amended per §4.2 above.
- **§8** posture stands as written but the mechanism basis is this ruling's Fork A. Specifically, the four countersign-blocking conditions in prose ruling §8 are now enforceable because:
  - "Ratified strings edited / paraphrased / reformatted in `persona.ts`" — enforceable via manifest hash check.
  - "`'unknown'` collapses to `'no'`" — enforceable via §3.4 deterministic tri-state parser + integration test.
  - "Render pipeline templates or i18ns any of the four blocks at runtime" — enforceable via §2.4 direct-emit posture (no runtime templating exists).
  - "Spanish PROVISIONAL versions ship as ratified" — enforceable via the same manifest hash mechanism + a `// PROVISIONAL` marker guard in CI.

The prose itself (§§2–5 of the prose ruling) is **not amended**. The four blocks stand verbatim as filed.

---

## §6 — Manifest count correction

Engineering's finding is correct: the as-built `docs/compliance/locked_prose_manifest.json` has **11 entries**, none of them persona.ts constants, and no `entry_id` field. My "entries #1–#4" / "all 8 entries" phrasing in the prose ruling §6 + §7 was a drafting error against a stale mental model of the manifest state.

**Correction of record:** Lane 2E appends **four new entries** for the ratified prose blocks (`chatIntakeRentPeriodsPrompt`, `chatIntakeSignerCapacityPrompt`, `chatIntakePersonalDeliveryPrompt`, `chatIntakePreflightDisputePrompt`) plus one or more entries for the guardrail re-ask strings (engineering proposes count in the attestation packet — I ratify). Post-append manifest count is **≥ 15**, not "8."

**Shape:** as-built Shape-A schema (per §8.1 rule of construction from the schema-checkpoint ruling — wizard-parity governs, extended here to as-built-parity for the manifest schema). No `entry_id` field. Fields per existing manifest entries.

**Hash computation posture** from prose ruling §6 stands: SHA-256 on UTF-8 bytes, no BOM, no trailing whitespace, `{{value_slot}}` markers preserved verbatim in the hashed content. `\n\n` between concatenated top-level ratified blocks within a single manifest entry.

The attestation packet cites the true post-append count. I will not countersign a packet that references "8 entries" or an `entry_id` field.

---

## §7 — Attestation posture (amends prose ruling §8)

Lane 2E's final attestation packet cites:

1. This ruling §§2–4 as the mechanism basis for the four capture-turn render path.
2. The prose ruling §§2–5 as the source of the four ratified prose blocks (unchanged).
3. The schema-checkpoint ruling §§2 + 3 as the source of the tri-state `DisputeAnswer` and 4-value `SignerCapacity` reuse (unchanged).
4. Deviations from parent rulings under a "Deviations" subsection: (a) prose ruling §§7 + 8 mechanism-basis correction per this ruling §5; (b) manifest count correction per §6.
5. Integration test evidence that server-emitted bytes match manifest hashes on the wire.
6. Guardrail parser test evidence demonstrating no model-mediated fallback for any of the four categories.

I will not countersign the packet if:

- Any of the four ratified strings are edited, paraphrased, or reformatted (mechanism now enforceable per §5).
- `'unknown'` collapses to `'no'` in any path.
- Any owner-facing turn for the four categories routes through the LLM for classification when the deterministic parser cannot classify (must route to the verbatim re-ask, not the model).
- The persona.ts render pipeline templates or i18ns any of the four blocks at runtime.
- Spanish PROVISIONAL versions ship as ratified.
- The attestation packet references "8 entries" or an `entry_id` field.

---

## §8 — Rule of construction (extends schema-checkpoint §8)

Adding a third rule of construction to the two established in `lane2e_schema_checkpoint_broker_ruling_2026-07-01.md` §8:

3. **As-built parity governs implementation artifacts.** When a parent ruling's implementation prose (file paths, schema shapes, count-of-entries claims, lock-mechanism assumptions) diverges from the actual repository state, engineering reuses the as-built shape verbatim and captures the deviation in the attestation packet under a "Deviations" subsection. No new ruling required for shape/count/path drafting errors. **However:** if the divergence changes what compliance behavior the parent ruling can guarantee (as it did here — the LLM-reply flow vs. deterministic-emission assumption), that is a §1.6 escalation, not a rule-of-construction pass-through.

Engineering's escalation here correctly triggered §1.6 rather than defaulting to as-built parity. Reason: the parent ruling's §8 countersign conditions were **unenforceable** under the as-built LLM-reply flow. That is a compliance-behavior divergence, not a shape divergence. Engineering read the distinction correctly.

**Applying the rule going forward:**
- Shape/count/path divergences from a parent ruling → as-built parity, "Deviations" subsection, no new ruling.
- Compliance-behavior divergences (a ratified guarantee cannot be honored under the as-built mechanism) → §1.6 escalation, new ruling required.

---

## §9 — Non-changes

- The four ratified prose blocks (prose ruling §§2–5). Untouched.
- Tri-state `DisputeAnswer` and 4-value `SignerCapacity`. Untouched (already landed at 72c6617).
- G4 counsel hard-stop trigger behavior. Untouched. Fires on `'yes'`; does not fire on `'unknown'`.
- Existing 11 manifest entries (#1–#11 in as-built shape). Untouched. Lane 2E appends only.
- `OWNERPILOT_PERSONA_SYSTEM_PROMPT` literal and `persona.lock.json` hash. Untouched. No operator re-review triggered by Lane 2E.
- Refusal bank (`lib/chat/refusalBank.ts`). Untouched.
- LLM-driven turns outside the four Lane 2E capture categories. Untouched. Persona continues to drive everything else.
- Fork C's future-iteration door (§4.5). Explicitly preserved — not shipped in Lane 2E, not permanently refused.

---

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-01
