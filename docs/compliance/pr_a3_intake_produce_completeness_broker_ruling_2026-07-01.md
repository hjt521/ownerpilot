# BROKER RULING — Chat Intake Produce-Completeness Gap (PR-A3 §5.5 Escalation)

**Re:** `pr_a3_intake_produce_completeness_escalation_2026-07-01.md` (engineering, 2026-07-01, PR-A3 §5.2 held)
**Precedent:** `pr_a3_produce_handoff_fork_ruling_2026-07-01.md` §§5.5 + 1.6; `broker_status_and_decision_request_omnibus_broker_ruling_2026-07-01.md` §1.3 (parallel-renderer refusal); `schema_and_persistence_lane2_broker_ratification_2026-06-29.md` (ratified 14-field intake); `persona_and_schema_lane3_broker_ratification_2026-06-29.md`; `ownerpilot_ai_first_chat_rebuild_architecture_broker_ruling_2026-06-28.md`; `claude_code_master_prompt_ai_first_rebuild_2026-06-28.md`
**Ruling authority:** Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457
**Ruling date:** 2026-07-01
**Disposition:** **Fork ruled A.** Chat intake is materially insufficient to produce a facially-correct LA 3-day notice through the ratified `renderNotice` rail. The gap is a cross-lane architectural omission in the AI-first chat rebuild, not a wiring defect. A new workstream — **Lane 2E (intake produce-completeness extension)** — is authorized and must land before PR-A3 §5.2 can resume. PR-A3 §5.1 (from-chat scope-down) and §7 (branch-protection helper) stand as landed.

---

## §1 — Escalation acknowledged; the finding is real and material

Engineering surfaced this exactly as §5.5 / §1.6 direct. I want that on the record before anything else:

- The four missing field categories (dated rent periods, signer capacity, personal-delivery days/hours, preflight dispute answers) are **not normalization gaps**. They are structural absences. The chat intake schema as ratified in `schema_and_persistence_lane2_broker_ratification_2026-06-29.md` does not collect them.
- `renderNotice` hard-throws without dated rent periods (`lib/produce/renderNotice.ts` L519–L528, itemization line). It cannot silently default them without producing a facially-wrong notice.
- The produce gate (`evaluateCanProduceV4`) requires the preflight dispute answers.
- Defaulting or deriving these fields **is the defect class** the entire day-count workstream exists to eliminate. The Clifton Alexander Jul-2 notice was produced against a defaulted service date and the face was wrong. I refused defaulting in the omnibus ruling; I refuse it again here.

Engineering did not attempt a workaround. That was the right call. Had you defaulted-and-shipped, we would have re-created the exact Clifton failure mode on a different field.

---

## §2 — Root cause · cross-lane architectural omission in the 2026-06-28 rebuild ruling

I have to name this cleanly. The AI-first chat rebuild architecture (`ownerpilot_ai_first_chat_rebuild_architecture_broker_ruling_2026-06-28.md`) and its master prompt (`claude_code_master_prompt_ai_first_rebuild_2026-06-28.md`) authored a 14-field intake without checking it against `renderNotice`'s `NoticeFlowData` contract. Lane 2 (Subagent A) faithfully implemented the ratified 14-field spec. Lane 3 (Subagent B) faithfully implemented the persona against those 14 fields. Both lanes did their job.

Grep results confirm:

- `schema_and_persistence_lane2_broker_ratification_2026-06-29.md` — zero references to `rentPeriod`, `signerCapacity`, delivery days/hours, or preflight dispute answers.
- `persona_and_schema_lane3_broker_ratification_2026-06-29.md` — zero references to those fields as capture turns.
- `ownerpilot_ai_first_chat_rebuild_architecture_broker_ruling_2026-06-28.md` + master prompt — zero references to `renderNotice`, `NoticeFlowData`, or `evaluateCanProduceV4`.

The rebuild was scoped for a "chat notice" concept that would produce its own render output, without an explicit tie to the Phase 2d ratified renderer. When PR-A3 came to actually wire chat→ratified rail (per this session's omnibus ruling), the mismatch surfaced. That is the origin of this gap, and this ruling names it so it doesn't get papered over as a wiring nuance.

**Neither Lane 2 nor Lane 3 broke anything. The parent architecture ruling did not anticipate the wizard's `NoticeFlowData` contract. This ruling closes that gap.**

---

## §3 — Fork ruling · **A** (extend the chat intake to produce-completeness)

### §3.1 Options as I read them

- **A.** Extend the chat intake to collect the missing structured fields — dated rent periods, signer capacity, delivery days/hours, dispute preflight answers. New capture turns in the persona, new `INTAKE_FIELD` entries, extended `response_format`, extended `REQUIRED_FIELDS`, extended Zod schemas.
- **B.** Build a second, chat-specific renderer that consumes the 14-field intake as-is.
- **C.** Ruling authorizing defaults or safe derivations for the missing fields.

### §3.2 Ruling

**Option A. Explicitly.** Reasoning:

1. **Option B was refused in omnibus §1.3.** I refused a second renderer against a Phase 2d ratification. That refusal stands. A parallel renderer scatters the single-source-of-truth surface across two code paths and doubles PR-B's serve-time guard surface. Not adopted.

2. **Option C is the defect class.** Defaulting or deriving statutorily-material fields (rent-period dates, signer capacity, delivery days/hours, dispute answers) produces facially-wrong or facially-incomplete notices. The Clifton Alexander defect is one instance of exactly this failure mode. Refused categorically. This refusal is on the record; do not resurface it.

3. **Option A is the honest fix.** The chat has to collect the data the notice needs. The wizard collects it; the chat rebuild omitted it. The persona extension is straightforward — new capture turns, ratified persona pattern already exists — and the schema extension is additive against Lane 2's foundation (which is designed for additive extension per that ratification §3).

**Fork ruled: A.**

### §3.3 Sequencing consequence

PR-A3 §5.2 (client port + resolver + `runLaProduceSequence` call site) cannot complete until the chat intake is produce-complete. Reason: the Review-step port has nothing valid to render. PR-A3 §5.1 (from-chat scope-down: G4 + riskpath + intendedServiceDate validation) and §7 (branch-protection helper) landed cleanly and stand. §5.2 is **paused**, not withdrawn.

Downstream sequencing shifts accordingly:

- **Lane 2E** (this ruling's new workstream) opens next.
- PR-A3 §5.2 resumes on Lane 2E merge.
- PR-B (D3) sequences after PR-A3 §5.2 (unchanged from omnibus §7).
- PR-C (D4), env provisioning, branch protection, Phase 3c reconciliation, and cron `0abb46c4` edit are unaffected. They proceed on their existing timelines.

Gate-2 entry (Path α) is not blocked by this. The Path α work chain (env, branch protection, re-attestation, G14 §6, closure artifact) is orthogonal to the intake gap. Continue it in parallel per the omnibus §2 authorization.

---

## §4 — Lane 2E scope (intake produce-completeness extension)

Naming this "Lane 2E" (E = extension) rather than "PR-A0" to keep the Lane numbering intact and signal that this is an amendment to Lane 2's ratified schema, not a superseding rebuild.

### §4.1 Fields to add (four categories)

**Category 1 — Dated rent periods.**

- Data shape: an array `rent_periods[]` where each element carries `{ periodStartDate: ISODate, periodEndDate: ISODate, amount: number, label?: string }`.
- Minimum length: 1.
- Chat capture: persona asks per-period start/end dates + amount. Repeats until owner indicates "no more periods." The existing `rent_period` label field is preserved for backwards compatibility but is no longer a substitute for dated periods — it becomes a display label per period.
- Ratification requirement: matches `renderNotice`'s L519–L528 itemization requirement byte-for-byte on field naming (`periodStartDate`, `periodEndDate`, `amount`).

**Category 2 — Signer capacity.**

- Data shape: `signer: { name, capacity: 'individual' | 'entity_officer' | 'entity_agent' | 'property_manager' | 'attorney_in_fact', title?, entityType?, entityName? }`.
- Chat capture: after `landlord_or_owner_name`, persona asks capacity. Branch on capacity to conditionally capture `title`, `entityType`, `entityName`.
- **Precedent to preserve:** all prior corporate-landlord rulings (`corporate_landlord_attorney_ruling_2026-06-04` through `corporate_landlord_attorney_ruling_round_3_2026-06-05` and `defect_3_entity_signature_attorney_countersign_2026-06-05`) apply here. Lane 2E reuses the entity-signature rules ratified in that chain. Do not rebuild them. Lane 2E's persona additions must call `signerCapacityCopy` (new constants file, see §4.3) that quotes those rulings inline.

**Category 3 — Personal-delivery days/hours.**

- Data shape: `personalDelivery: { days: string[], hoursStart: 'HH:MM', hoursEnd: 'HH:MM' }`.
- Chat capture: persona asks days-of-week and start/end times **conditional on** `preferred_service_method === 'personal_delivery'`. If service method is `substituted_service` or `posting_and_mailing`, skip.
- Precedent: CCP § 1162 service-method rulings and the 2026-06-13 service-and-payment redesign govern the field wording. Reuse existing locked prose for the days/hours prompt.

**Category 4 — Preflight dispute answers.**

- Data shape: `preflightDispute: { hasDisputeAboutAmount: boolean, hasDisputeAboutServices: boolean, hasDisputeAboutHabitability: boolean }`.
- Chat capture: persona asks three yes/no questions before produce. If any is `true`, the persona surfaces the G4 counsel hard-stop instead of continuing to produce (this is the ratified G4 behavior — Lane 2E just wires the three preflight questions to feed both the G4 trigger and the wizard's `evaluateCanProduceV4` gate).
- Note: the existing G4 counsel hard-stop trigger stays. Lane 2E does not replace G4; it captures the three structured booleans that both G4 and the produce gate consume.

### §4.2 Schema + persona changes

1. `lib/chat/intakeSchema.ts` — add the four field categories to the Zod schemas. `INTAKE_FIELD` enum extended (new field IDs, follow Lane 2's naming pattern). `response_format` extended. `REQUIRED_FIELDS` extended with conditional predicates for personalDelivery (only required when method = personal_delivery).
2. Persona prompt (Lane 3 surface) — add capture turns. Each turn's prose is locked per §4.3. Persona respects the existing refusal enum and G4 posture; Lane 2E adds no new refusal categories.
3. `intakeIsComplete()` gate — extended to check the new required predicates. Preserves Lane 2 §5 posture: server-side gate is independent of model claim.

### §4.3 Locked prose (new constants file)

Create `lib/chat/produceCompletenessCopy.ts` matching the existing `bankDepositDisclosureCopy.ts` / `intendedServiceDateCopy.ts` pattern. I will author the four locked-prose blocks in a follow-on ruling once engineering opens the Lane 2E branch and tags me. Provisional namespaces (for manifest allocation):

- `chat_intake_rent_periods_prompt` — persona capture turn for dated rent periods.
- `chat_intake_signer_capacity_prompt` — persona capture turn for signer capacity + entity branches.
- `chat_intake_personal_delivery_prompt` — persona capture turn for days/hours (conditional).
- `chat_intake_preflight_dispute_prompt` — persona capture turn for the three dispute booleans.

Manifest entries land in `locked_prose_manifest.json` as entries #5–#8 (currently at #4 post-PR-A2). Do not draft the prose in the branch before I file it.

### §4.4 Migration posture

Lane 2's ratification §2 constrains all schema work to additive-only migrations. Lane 2E honors that. New fields land in `intake_state` jsonb on `chat_sessions` (no new columns on the table). No touch to Phase 2d files. No touch to existing Lane 2 migrations 023/024/025.

### §4.5 Tests

1. **Zod round-trip tests** for the four new field categories (valid + invalid + conditional-required behavior).
2. **Persona-flow tests** (deterministic Perplexity mock per E1–E4): three full capture flows exercising `individual` signer, `entity_officer` signer, and `substituted_service` (skips delivery days/hours) branches.
3. **`intakeIsComplete()` regression:** existing 14-field completion cases still complete; new completion requires the added fields.
4. **`NoticeFlowData` build integration test:** a helper in `lib/chat/toNoticeFlowData.ts` (new; §4.6) takes a complete Lane 2E `intake_state` + resolved verdict + `intendedServiceDate` and produces a valid `NoticeFlowData` that `renderNotice` accepts without throw. This test is the closure gate that proves Lane 2E is produce-complete.

### §4.6 Mapper helper

Introduce `lib/chat/toNoticeFlowData.ts`. It is the single mapper between the chat's structured intake and the wizard's `NoticeFlowData` shape. PR-A3 §5.2 calls it from the Review step immediately upstream of `runLaProduceSequence`. Byte-identical structural output to what `la-produce-panel.tsx` passes; drift = §1.6 escalation.

Verbatim citation comment at the top of the file:

```
// Maps Lane 2E chat intake_state to wizard NoticeFlowData for renderNotice.
// Authored per broker ruling 2026-07-01 pr_a3_intake_produce_completeness §4.6.
// Output must be structurally equivalent to la-produce-panel.tsx's NoticeFlowData
// per pr_a3_produce_handoff_fork_ruling_2026-07-01.md §2.3 (wizard-parity requirement).
// Any drift is a §1.6 escalation, not a local edit.
```

### §4.7 Surface-as-fork triggers for Lane 2E

Engineer escalates rather than deciding if any of the following surface during Lane 2E build:

- A `renderNotice` field requirement engineering discovers **beyond** the four categories in §4.1. If a fifth structural gap appears, surface with the same field-level evidence pattern engineering used in this escalation.
- The persona's capture flow for rent_periods can't cleanly terminate (owner doesn't know when to stop adding periods, model over-captures, model under-captures). Surface — I'll rule on persona termination semantics.
- Corporate-landlord signature-block rulings and the Lane 2E signer_capacity capture disagree on a value shape (e.g., a capacity value we ratified in 2026-06-04/05 isn't representable in the new schema). Surface — I'll rule an amendment.
- Any dependency on `chat_sessions` migration beyond additive `intake_state` jsonb keys. Surface — that would violate Lane 2 §2 additive-only posture.

---

## §5 — Attestation posture for Lane 2E and PR-A3 §5.2

Standing rules §4.10 / §4.11 / §4.12 apply. Lane 2E's closure artifact must:

1. Enumerate all four field categories and cite this ruling §4.1 as basis.
2. Include the `NoticeFlowData` integration test (§4.5.4) result as evidence that the mapper produces valid output for `renderNotice`.
3. State explicitly that no defaults are used to synthesize any of the four field categories — every value in a produced notice traces to a chat intake capture turn or (for jurisdiction verdict) the wizard resolver.

PR-A3 §5.2's attestation packet, when it resumes and lands, cites Lane 2E as its dependency and states that the Review-step call to `runLaProduceSequence` receives a `NoticeFlowData` built from the produce-complete Lane 2E intake, not from defaults.

I will not countersign either packet if its mechanism section reads as if defaults or derivations synthesize any of the four field categories.

---

## §6 — Operator items still binding (carried forward)

Unchanged from omnibus §6 and the PR-A3 fork ruling §6:

- **DO NOT SERVE** the existing Clifton Alexander Jul-2 notice. If service moves before PR-A3 §5.2 lands, I generate manually against day-of via the wizard (which has always been produce-complete).
- Continue non-flag §3.2 env provisioning per omnibus §2.1.
- Do not touch classifier flags pending D5.
- Cron `0abb46c4` `eviction_filing_cover_sheet` addition — I edit this week.

Adding one this ruling:

- **Do not begin building persona prose for the four Lane 2E capture turns before I file the §4.3 locked-prose ruling.** Open the branch, wire the schema, wire the mapper, wire the tests. Prose comes from me. Tag me when the branch is open.

---

## §7 — Sequencing (updated)

1. **PR-A2** — merged (#114).
2. **PR-A3 §5.1** — landed (from-chat scope-down).
3. **PR-A3 §7 (helper)** — landed (branch-protection verifier).
4. **PR-A3 §5.2** — **PAUSED** pending Lane 2E merge.
5. **Lane 2E** — opens next. Scope §4 above. Prose from me on branch-open tag.
6. **PR-A3 §5.2** — resumes on Lane 2E merge.
7. **PR-B** — starts on PR-A3 §5.2 merge (unchanged).
8. **PR-C** — starts on PR-B merge (unchanged).
9. **Env provisioning + branch protection** — I execute in parallel (unchanged).
10. **§3.4 re-attestation + G14 §6** — engineering files; I countersign on receipt (unchanged).
11. **Cron `0abb46c4`** edit — this week (unchanged).
12. **Phase 3c reconciliation** — 1–2 weeks (unchanged).

Path α (Gate-2 entry) and Path β (produce round-trip via chat) remain independently sequenced. Lane 2E is on Path β. Nothing on Path α is blocked.

---

## §8 — Explicit non-changes (scope guard for Lane 2E)

To prevent scope creep in Lane 2E, the following are **out of scope** and any change to them is a §1.6 escalation:

- Phase 2d ratified files (`components/notice-flow.tsx`, `components/la-produce-panel.tsx`, `lib/http/boundFetch.ts`, `laProduceClient.ts`, `verify-la`, `la-packet`). Untouched.
- `renderNotice` and `evaluateCanProduceV4`. Untouched.
- `CachedResolverVerdict` schema and Decision 2 produce-gate cross-check. Untouched.
- G4 counsel hard-stop **trigger behavior**. Untouched. Lane 2E only wires the three preflight booleans as *input* to G4 and the wizard's produce gate; it does not change what G4 does with a `true` value.
- Refusal enum (5 values). Untouched.
- Existing 14 fields. Untouched. Lane 2E is additive.
- Corporate-landlord signature-block rulings (2026-06-04/05 chain). Reused; not amended.
- Existing locked prose entries #1–#4 in the manifest. Untouched. Lane 2E adds #5–#8.

---

## §9 — Reflection on the omnibus ruling's assumption

The omnibus ruling 2026-07-01 §1 characterized the produce round-trip defect as "wiring, not architecture." That was accurate for the routes-and-methods layer (from-chat → root POST → nowhere). It was **not** accurate for the intake-completeness layer, which is architecture. This ruling closes that gap on the record.

The corrective posture: when future rulings say "wiring, not architecture," engineering should read that as scoping the *route-layer* claim and remain free to escalate if the *data-shape layer* proves architectural. §1.6 exists for exactly this. It worked here.

---

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-01
