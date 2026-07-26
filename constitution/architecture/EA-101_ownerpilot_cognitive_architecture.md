---
constitutional_id: EA-101
object_type: enterprise_architecture
title: OwnerPilot Cognitive Architecture — How OwnerPilot Thinks
status: Ratified
version: "0.2"
canonical_owner: Enterprise
governing_authority: EA-100
ratification_authority: Founder
lifecycle_state: Ratified
created: 2026-07-26
updated: 2026-07-26
depends_on: [EA-100, EA-012, BTRM-001, EA-102, IMR-001, ADR-015, ADR-016, ADR-017, ADR-018, ADR-019]
required_by: []
implements: [EA-100]
governed_by: [EA-100, EA-012]
validated_by: [CBS-001, CA-001]
supersedes: []
superseded_by: []
related_artifacts: [RP-005, RP-006, RP-007, RP-008, RPT-012, RPT-013, RPT-015, RPT-016, RPT-017, RPT-018, CKG-001, ICOA-001, RIE-001, OCM-001, CS-001, POL-001, ENR-001, BAE-001, TM-001, CM-001, DOC-003, OPOS-001, RCO-001, DECG-001, FIE-001]
registry_tags: [cognitive-architecture, ea-101, opos, reasoning-pipeline, ratified]
program_phase: enterprise-delivery
repository_path: constitution/architecture/EA-101_ownerpilot_cognitive_architecture.md
checksum_scope: file
---

# EA-101 — OwnerPilot Cognitive Architecture: How OwnerPilot Thinks (Ratified)

> **Lifecycle: Ratified** (Founder, 2026-07-26 · ADR-019). **EA-101 version 0.2, incorporating the conforming amendments below, is the ratified controlling text.** Version 0.1 (the original Architecture Draft, authored per RP-008's directive and RPT-017's reconciliation) is preserved as the historical predecessor — it was not independently ratified. Four future constitutional identifiers are separately governed and reserved by ADR-019 (namespace and drafting intent only — none is created, ratified, or authorized for implementation by this reservation): **`OPOS-001`** (`doctrine` — proceeds via a Doctrine Draft, not an Architecture Draft, per §2), **`RCO-001`** and **`DECG-001`** (`standard` — proceed via standard drafts, per §4–5), and **`FIE-001`** (`enterprise_architecture` — proceeds via its own Architecture Draft, per §3). All five of v0.1's §16 open items are closed by ADR-019; §16 below is preserved as the original pre-ratification record per DOC-003 §9 — see the closure note above it.

## 0. What this is, and what it is not

EA-101 is the top-level, human-readable statement of how OwnerPilot reasons — per ADR-016's three-layer boundary: **EA-101** is this document, the conceptual/descriptive layer; **OPOS** is the reasoning kernel it describes (§2); **OPIL, i.e. the already-Proposed EA-012**, is the runtime-facing intelligence layer that exposes OPOS's reasoning to product capabilities and needs no new CRID for that role. EA-101 does not re-litigate anything ADR-015 (RQS), ADR-017 (EA-102), ADR-018 (EDIC), or RPT-016 §6 (Decision Engineering Lab/Testing/Evaluation Lab) already settled — it cites each, per §6–9 below, exactly as EA-102 already cited POL-001/IMR-001/EA-012/RPT-016 rather than restating them.

**First principle, inherited from BTRM-001 and EA-102 without modification:** no runtime path may reach an adverse action without `human_review_required`; no component may invent a recommendation from anything other than a resolved, cited reference; AI never self-ratifies a change to how OwnerPilot reasons.

## 1. Core philosophy — the three-layer stack (ADR-016)

```text
EA-101 (this document — architecture, principles, posture)
   describes
        ▼
OPOS (the reasoning kernel — §2 — the operational ruleset implementing EA-101's principles)
   exposed to workflows via
        ▼
OPIL / EA-012 (the runtime intelligence layer — unchanged, already-Proposed)
   consumed by
        ▼
BTRM-001 (the first, already-shipped reasoning pipeline: ENR→BAE→TM/CM→ICOA→RIE→OCM/CS→POL)
   feeding
        ▼
EA-102 (the closed learning loop — already ratified — that lets the pipeline improve itself, under governance)
```

Nothing above the "BTRM-001" line changes any behavior of what is already shipped. EA-101/OPOS formalize, in one place, the shape BTRM-001's pipeline and EA-102's learning loop already exhibit — they are being **named and governed as an architecture**, not redesigned.

## 2. OPOS — the reasoning kernel

**Per ADR-019, OPOS is separately governed as `OPOS-001` (`object_type: doctrine`), overriding RPT-017 §3's recommendation that it be held as EA-101's internal specification — a conscious Founder override, not a silent contradiction of that memo.** This reservation establishes namespace and drafting intent only; it does not create, ratify, or authorize implementation of OPOS-001. OPOS-001's future document is a **proposed constitutional doctrine — a Doctrine Draft, not an Architecture Draft** — consistent with existing canonical usage for `doctrine`-classified artifacts (direct precedent: DOC-001, a ratified operating doctrine standing beside its architecture counterpart EA-012, exactly as OPOS-001 will stand beside EA-101).

**OPOS-001's scope is broader than the reasoning sequence below.** EA-101 defines *what* the Cognitive Architecture is; OPOS-001 will define the *rules under which it operates*: operating principles, mandatory reasoning stages, engine coordination rules, authority boundaries, failure and abstention behavior, human-review escalation, constitutional precedence, state transitions, auditability, learning restrictions, and how products/workflows invoke the intelligence layer. Neither document may restate the other's content — EA-101 references OPOS-001's existence and role; OPOS-001, once drafted, references EA-101 as the architecture it operationalizes.

Until OPOS-001's own Doctrine Draft exists, EA-101 states the one piece of that ruleset already implied by BTRM-001/EA-102's shipped behavior — the fixed operational sequence every recommendation passes through — as descriptive context, not as OPOS-001's specification:

```text
Objective (caller-supplied) → Facts & Evidence (ENR-001) → Behavior (BAE-001) → Reliance (TM-001)
   → Confidence (CM-001) → Interests/Constraints (ICOA-001) → Resolution Options (RIE-001)
   → Comparison (OCM-001) → Communication (CS-001) → Recommendation Object (§4)
   → Execution → Outcome (POL-001) → Outcome Analysis (EA-102) → Knowledge Update (EA-102, roadmap)
```

This is BTRM-001's own pipeline (§1) with EA-102's feedback half appended — OPOS does not add a step that does not already exist; it is the name for the sequence as a whole, so that a future engine (§3) has one place to say "I sit between step N and step N+1" rather than describing its position relative to BTRM-001 in one document and EA-102 in another.

**A hard rule that OPOS-001 will formalize as its own:** no engine in §3 may skip a step, invent an upstream step's output, or bypass `human_review_required` once any upstream step has set it. This is not new — it restates BTRM-001 §6/§11 and EA-102 §8 — but it becomes the reasoning kernel's rule to enforce, not each engine's to individually remember, once OPOS-001 is drafted.

## 3. The reasoning-engine pipeline: reuse before new

Per RPT-016 §4's engine-by-engine mapping, restated here as EA-101's own disposition table rather than re-derived:

| Engine (as named in RP-008) | Disposition |
|---|---|
| Goal Engine | Caller-supplied objective context, referenced by Recommendation Object (§4) — not a new component. |
| Facts Engine / Evidence Engine | **One engine, not two** (RPT-017 §6) — this is ENR-001, already shipped. EA-101 retires the "Facts Engine" / "Evidence Engine" naming split. |
| Legal & Compliance Engine | Existing application-layer capability (ECAP-002/003), referenced by Recommendation Object's `legalAnalysisRef` — not a new BTRM-001-adjacent component. |
| **Financial Intelligence Engine** | **Genuinely new** (RPT-016 §4). No existing owner. Reserved as **`FIE-001`** (`enterprise_architecture`, per ADR-019) — a separate Architecture Draft is authorized (research/drafting only, no implementation), covering financial projection, expected value, cost/cash-flow consequences, time horizons, sensitivity, uncertainty, assumptions/provenance, scenario comparison, tax/accounting boundaries, professional-review routing, and safeguards against false precision. Any probability/expected-value output (e.g. "collection probability") is built under ADR-015/BTRM-001 §3.7.1's qualitative-first disposition, unmodified, per RPT-016 §2. **FIE-001 may not achieve de facto control of the Winning Strategy** by assigning a composite financial score, mandatory ranking, veto, or optimization output the Recommendation Synthesizer must accept without qualitative, multidimensional review — financial expected value is one input among several, contributed only to RCO-001's future `financialAnalysisRef`, never an automatic winner-selector. |
| Negotiation Intelligence Engine | RP-004 — reuse, expand under RIE-001/CS-001's existing shape, not a parallel structure. |
| Tenant Behavioral Intelligence Engine | RP-007 / BAE-001 — reuse, per RPT-015's own finding that RP-007 already self-reconciled against BAE-001. |
| Case Evolution Engine | RP-007's CEE — reuse; per RPT-015, has no existing BTRM-001 owner and should be scoped as its own genuinely separate model when RP-007 itself is drafted, not duplicated here. |
| Outcome Projection Engine | RP-005/OCM-001 territory — built strictly under ADR-015/BTRM-001 §3.7.1, unmodified. Not reopened by EA-101. |
| Optionality Engine | **Closed, not a new engine** (RPT-017 §5) — a cross-cutting principle applied via RIE-001's already-shipped `reversibility`/`materialConsequence` fields when OCM-001 or a future Strategy Comparison component (EA-102 §2.5, roadmap) weighs alternatives. |
| Strategic Communication Engine | CS-001, already shipped — reuse. |
| Recommendation Synthesizer | RIE-001, already shipped, producing the Recommendation Object (§4) — reuse. |
| Learning Engine | POL-001 + EA-102 in full, already shipped/ratified — reuse, not restated. |

Only the Financial Intelligence Engine is genuinely new architecture. Everything else in RP-008's pipeline is a naming/framing exercise over components this program has already built or already reserved.

## 4. Recommendation Object

**Per ADR-019, separately governed as `RCO-001` (`object_type: standard`)** — the closest existing valid registry classification for a canonical semantic contract dependent artifacts must conform to (no `constitutional_semantic_contract` type exists in the registry today; none is created by this document). Reservation establishes namespace and drafting intent only. **`constitution/implementation-specs/recommendation_object_spec_v0.1.md` remains a drafting input and migration reference only — its ten invariants are not adopted as constitutional merely through RCO-001's reservation.** Each invariant remains subject to its own dedicated self-critique, independent challenge, reconciliation (RPT-018), and Founder ratification when RCO-001 is itself drafted.

## 5. Decision Graph

**Per ADR-019, separately governed as `DECG-001` (`object_type: standard`)**, same reservation-only posture as RCO-001. **`constitution/implementation-specs/decision_graph_spec_v0.1.md` remains a drafting input and migration reference only.** DECG-001 will define a read-only query/traversal layer over ICOA-001 → RIE-001 → OCM-001 → EA-102's already-real relationships, no new write path — explicitly distinct from **CKG-001** (the P5.5 Constitutional Knowledge Graph): CKG-001 connects constitutional/governance objects platform-wide; DECG-001 traces one matter's own reasoning. The two never share a node/edge vocabulary. RCO-001 and DECG-001 remain distinct but interoperable: RCO-001 is the recommendation itself; DECG-001 is the reasoning/dependency/alternative/evidence/risk/lineage structure supporting it — RCO-001 carries a reference to its DECG-001 trace, never an embedded copy.

## 6. Recommendation Quality (RQS) — unchanged

RQS remains exactly what ADR-015/BTRM-001 §3.7.1 ratified: seven qualitative dimensions, no composite score, numeric telemetry internal-only. EA-101 adds nothing here. Per RPT-017 §4, EA-101 formally **retires** RP-005's "Internal Recommendation Framework" and RP-006's "Nine Foundational Questions" — both were pre-response checklists serving the purpose RQS already serves, ratified. Pre-response quality assurance is RQS, not a third parallel construct.

## 7. EDIC — unchanged

EDIC's governing ruling is ADR-018 in full: hybrid architecture, synthetic path authorized now under bounded constraints, real-matter path prohibited pending a separately-approved governance package with qualified-counsel review. EA-101 cites this, does not restate or reopen it.

## 8. Decision Engineering Lab / Testing Program / Evaluation Lab — unchanged

RPT-016 §6's consolidation is adopted verbatim, exactly as EA-102 §2.9 already adopted it: Decision Engineering Lab = pre-production stress-testing on ESL-005; Testing Program = ongoing regression/replay testing; Evaluation Lab = the comparative, model-vs-model and model-vs-human-expert calibration layer sitting above both. One coherent capability, three names, not three systems.

## 9. Model Registry and Model Validation — extends IMR-001, does not stand beside it

Per RPT-016 §8, the four-state model-validation lifecycle (Research/Experimental/Validated/Production) folds directly into **IMR-001's existing `maturity` field** as its concrete enumeration — not a new, parallel construct. This is a small mechanical amendment to IMR-001's own spec, to be applied when IMR-001 itself is next touched, not performed by this document. EA-101 does not otherwise modify IMR-001's schema (`canonical_id, owner, purpose, evidence_inputs, outputs, evaluation_suite, governing_ea, governing_doctrine, constitutional_constraints, maturity, current_version, superseded_by`).

## 10. Learning — EA-102, in full

Everything RP-008's "Learning Engine" describes is EA-102's already-ratified scope. EA-101 does not restate it; it depends on it (front matter).

## 11. ECAP refactor — scheduled and gated, not additive-only

Per RPT-016 §10, the four already-delivered Wave-1 capabilities (ECAP-001 AI Assistant, ECAP-002 Document Generation, ECAP-003 Serve & Track, ECAP-010 Evidence Management) were built and released before this pipeline existed. Per ADR-019, the refactor proceeds in two gated phases:

- **Phase A (may begin now):** read-only analysis, documentation, interface mapping, and non-production characterization testing only. May add non-production tests and written documentation. **May not alter production decision behavior, schemas, persistence, or interfaces.**
- **Phase B (blocked):** production refactoring of any ECAP to consume RCO-001/DECG-001. Remains blocked until both are themselves ratified and a compatibility/migration specification (mapping BTRM-001's `ResolutionOption`/`OutcomeComparison` and EA-102's Normalized Learning Contract to RCO-001/DECG-001) is separately approved.

Relatedly, **Chat-first BTRM-001 integration scoping is partially ready, not fully independent**: discovery, current-state mapping, interface inventory, user-flow definition, test characterization, and reversible prototype planning may proceed now; final target interfaces, canonical object mappings, production migration commitments, and implementation authorization remain dependent on RCO-001/DECG-001 ratification.

## 12. Governance and human oversight

Inherited without modification from BTRM-001 §6/§11 and EA-102 §8: no automated adverse action without `human_review_required`; no silent reasoning change; AI never self-ratifies. Any change to OPOS's sequencing (§2) is a material architecture change under STD-004 and requires the same EA-version + ADR + Founder-ratification path as any other Foundation-adjacent artifact.

## 13. Self-critique (Engineering)

1. **This document defines almost no new architecture.** Of everything RP-006/RP-008 proposed, only the Financial Intelligence Engine is genuinely new; everything else is a naming/consolidation exercise over BTRM-001, EA-102, RPT-016, ADR-015/018. *Mitigation:* that is the correct outcome of a reconciliation-first program — inventing new structure where none is needed would be the actual failure mode, not this document's restraint.
2. **OPOS-as-internal-specification is this document's own recommendation, not a neutral finding.** A future reader could reasonably argue OPOS deserves its own CRID once it accumulates independent surface area. *Mitigation:* §16 flags this explicitly as unresolved rather than asserting it.
3. **The Financial Intelligence Engine is under-specified here.** §3 names it as new but does not design it. *Mitigation:* by design — EA-101's job is to place it correctly in the pipeline and under the correct qualitative-first disposition (ADR-015), not to design a component this document didn't originate.
4. **"How OwnerPilot Thinks" is an ambitious title for a document that mostly cites other documents.** *Mitigation:* that is intentional — the ambition is in the reconciliation discipline (reuse before invent), consistent with every prior artifact in this program, not in novel content volume.

## 14. Independent architecture-review-board challenge

*Adopting the posture of a skeptical review board attempting to disprove this design.*

- **"If this is mostly citations, why does it need to be a ratified Enterprise Architecture at all, rather than just a STATUS.md index?"** Fair. *Board recommendation: ratify it anyway — the value is a single, stable, human-readable statement of the reasoning pipeline's shape (§1–2) that every future engine and every new hire can be pointed to, exactly the role EA-100 plays for the application layer. An index in STATUS.md would drift; a ratified architecture document is the thing STATUS.md points to.*
- **"OPOS-as-internal-spec is convenient for minimizing CRID count, but convenient isn't the same as correct."** *Mitigation: agreed — this is exactly why §16 asks the Founder to confirm rather than treating §2's framing as settled.*
- **"The Financial Intelligence Engine is the one real gap here, and this document doesn't close it."** *Board recommendation: EA-101 should not be blocked on designing the Financial Intelligence Engine — that is legitimately separate, larger work. Ratify EA-101's pipeline placement of it now; scope its actual design as its own future Architecture Draft, the same way BTRM-001's components each got their own build stage.*
- **"Retiring the Nine Foundational Questions/Internal Recommendation Framework in favor of RQS is a judgment call, not a proof of equivalence — nobody has actually diffed the nine questions against RQS's seven dimensions, because the RPs never spelled the nine questions out."** The board's strongest objection. *Mitigation: correct, and stated honestly in RPT-017 §4 already — if either checklist's specific items are ever recovered from the Founder's original notes and found to name something RQS's seven dimensions don't cover, that gap should be proposed as an ADR-015 amendment, not silently reintroduced as a third construct.*

**Board disposition:** ratify EA-101 as the stable architecture statement it is — a reconciliation and naming exercise, correctly modest in new content. The one place the board would push back on treating anything as settled is §2 (OPOS's CRID status), which this document itself already defers to §16.

## 15. Final architecture objects

| ID | Component | Responsibility | Disposition |
|---|---|---|---|
| EA-101 | OwnerPilot Cognitive Architecture | Top-level statement of how OwnerPilot reasons | Ratified, v0.2 |
| OPOS-001 | OPOS (reasoning kernel/operating doctrine) | Operating principles, coordination, precedence, escalation | Reserved (`doctrine`) — Doctrine Draft next |
| FIE-001 | Financial Intelligence Engine | Cost/value/portfolio reasoning | Reserved (`enterprise_architecture`) — Architecture Draft (research only) next |
| RCO-001 | Recommendation Object | Canonical recommendation semantic contract | Reserved (`standard`) — standard draft next, drafting input: `recommendation_object_spec_v0.1.md` |
| DECG-001 | Decision Graph | Reasoning/dependency/evidence/lineage structure | Reserved (`standard`) — standard draft next, drafting input: `decision_graph_spec_v0.1.md` |
| — | Every other named engine (Goal, Facts/Evidence, Legal, Negotiation, TBIE, CEE, Outcome Projection, Optionality, Strategic Comm, Synthesizer, Learning) | — | **Not new — reuses ENR-001/BAE-001/TM-001/CM-001/ICOA-001/RIE-001/OCM-001/CS-001/POL-001/EA-102/RP-004/RP-007 as already disposed in §3** |
| — | RQS, EDIC, Decision Engineering Lab/Testing/Evaluation Lab, IMR-001 maturity | — | **Not new — ADR-015, ADR-018, RPT-016 §6, RPT-016 §8, unmodified** |

## 16. What requires Founder decision before ratification

> **All five items below are CLOSED by ADR-019 (2026-07-26, Founder ruling).** This section is preserved unmodified below as the original pre-ratification record, per DOC-003 §9. See ADR-019 for the controlling text and §2/§3/§4/§5/§11 above for the resulting conforming amendments.

1. **Ratify** EA-101, or direct revisions first.
2. **Confirm OPOS's status** (§2, §13-2): EA-101's own internal specification (this draft's working assumption) versus its own separate CRID. RPT-017 recommended the former; this remains the Founder's call.
3. **Confirm Recommendation Object's and Decision Graph's CRID status** (§4, §5): defined entirely inside EA-101's text, or promoted to their own component CRIDs the way BTRM-001's ENR-001/BAE-001/etc. eventually were. Both currently live as non-constitutional implementation specs regardless of this answer.
4. **Authorize (or defer) Financial Intelligence Engine design** as its own future Architecture Draft — not designed here, per §13-3/§14.
5. **Confirm ECAP Wave-1 refactor sequencing** (§11) — scheduled after the reasoning pipeline exists, per RPT-016 §11, unless the Founder wants a different order.

Until those decisions, this remains an authored draft — no schema, no runtime, no new CRID beyond EA-101 itself.
