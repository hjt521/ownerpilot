---
constitutional_id: RCO-001
object_type: standard
title: Recommendation Object — Canonical Semantic Contract
status: Proposed
version: "0.1"
canonical_owner: Enterprise
governing_authority: EA-101
ratification_authority: Founder
lifecycle_state: Proposed
created: 2026-07-26
updated: 2026-07-26
depends_on: [EA-101, ADR-019, RPT-017, RPT-018, RIE-001, OCM-001, EA-102, ICOA-001, CS-001]
required_by: []
implements: [EA-101]
governed_by: [EA-101, EA-100]
validated_by: [CBS-001]
supersedes: []
superseded_by: []
related_artifacts: [DECG-001, BTRM-001, ResolutionOption, RP-006, RP-008, FIE-001]
registry_tags: [recommendation-object, semantic-contract, proposed, rco-001]
program_phase: enterprise-delivery
repository_path: constitution/standards/RCO-001_recommendation_object.md
checksum_scope: file
---

# RCO-001 — Recommendation Object: Canonical Semantic Contract (Proposed)

> **Lifecycle: Proposed** (per STD-002 — specification recorded, not yet designed/ratified). Drafted under the authority ADR-019 established: `RCO-001` (`standard`) is reserved as a separate constitutional identifier, and its own drafting pipeline (standard draft → self-critique → independent review-board challenge → ADR → Founder ratification) is required before any of the content below binds anything. **This document does not authorize implementation.** It reconciles RP-006's 14-field proposal and RP-008's 18-field proposal, using RPT-017 §1's finding (the disagreement between them is itself evidence a fixed list was the wrong instrument) and RPT-018 §2's recommended boundaries as its starting inputs — not as pre-ratified content. The existing `recommendation_object_spec_v0.1.md` implementation spec is treated the same way: a drafting input, superseded in role by this document, not silently adopted.

## 0. What this is, and what it is not

**RCO-001 is the canonical semantic contract for a recommendation OwnerPilot produces** — what is delivered to a decision-maker (owner, or a future reviewer), not how it was reasoned to. That reasoning trace is DECG-001's job (§4 below). RCO-001 does not itself compute, rank, or select a recommendation; it is the shape a recommendation takes once the Recommendation Synthesizer (EA-101 §3) has produced one.

RCO-001 is **not** a database schema, a TypeScript interface, or an API contract. Those are implementation artifacts that must satisfy RCO-001's invariants; they are not this document. Per ADR-019 §2 and RPT-018 §0, reservation of this identifier does not itself ratify any schema — this Proposed draft is the first step of RCO-001's own pipeline, not its conclusion.

## 1. Semantic invariants (binding on any future ratified implementation)

Any concrete Recommendation Object realization must satisfy all of the following. These carry forward and sharpen the ten invariants first stated in `recommendation_object_spec_v0.1.md`, using the same discipline EA-102 §2.0 established for its Normalized Learning Contract and the corrections the Founder required of that document (never a fixed field list; provenance kept as independently versioned identifiers; missing data stays missing; quarantine over silent admission).

1. **Objective by reference, never restated.** The owner's objective is a reference into whatever produced it (ICOA-001 today); RCO-001 never invents or paraphrases an objective independently.
2. **Evidence and unknowns are separate, never merged into one narrative block.** Evidence cites specific resolved, provenance-classified items; unknowns and missing information are named as gaps, never silently omitted and never fabricated to appear resolved. A field with no resolvable value must remain explicitly unknown/missing, not defaulted, guessed, or interpolated.
3. **Legal analysis, financial analysis, behavioral/negotiation input, and confidence are each kept in their own reference field**, cross-referencing their source component, never flattened into prose. `financialAnalysisRef` may point to FIE-001's output once FIE-001 exists and is itself ratified; until then it remains explicitly absent, not fabricated or approximated from other fields.
4. **Confidence and predicted outcome are never combined into one value.** Restated verbatim from EA-102 §2.0's own rule because this is precisely the kind of object where the two are conflated if not stated explicitly and repeatedly.
5. **Risks and alternative strategies are references to already-produced structures** (RIE-001's `materialRisks`, OCM-001's compared alternatives), never re-derived or restated independently by RCO-001.
6. **A communication artifact reference, not inlined communication text.** CS-001 owns communication structuring; RCO-001 cites it.
7. **Execution steps and a review trigger are explicit, separate fields.** "What happens next" and "when should this be revisited" are different questions and must never share one field.
8. **An explainability reference is mandatory**, reusing BTRM-001's `ExplainabilityEnvelope` shape rather than inventing a parallel one.
9. **A human-review-required flag is inherited, never independently computed** by RCO-001 itself — it passes through unchanged from whatever upstream type (`ResolutionOption` or its successor) produced the recommendation, per BTRM-001 §6/§11.
10. **No field may be populated except from a resolved reference.** An unresolved, missing, or nonexistent referenced id contributes nothing — the same no-fabricated-support rule ICOA-001/RIE-001/OCM-001/EA-102 §2.0 already enforce, applied here without exception.
11. **Provenance is carried as independently versioned identifiers** — `source_system`, `source_artifact_type`, `source_schema_version`, and RCO-001's own `contract_version` are four separate concepts, never collapsed into one field, mirroring EA-102 §2.0's corrected provenance discipline (per the Founder's required revision to that document).
12. **A DECG-001 reference, never an embedded trace.** RCO-001 carries a reference to its supporting Decision Graph; it never inlines DECG-001's node/edge structure. This is the one RCO-001/DECG-001 boundary rule RPT-018 §3 treats as settled rather than merely recommended.
13. **Records failing validation against these invariants must be quarantined or rejected**, never silently admitted as a partial or best-effort Recommendation Object — the same rule EA-102 §2.0 established for its Normalized Learning Contract, applied here because RCO-001 is the more consequential, user-facing type.
14. **Original timestamps are preserved; corrections are append-only and traceable**, never silent overwrites — the same discipline the Founder required of EA-102's Normalized Learning Contract, extended here because a Recommendation Object may itself later be corrected, reclassified, or superseded (e.g., after a human reviewer intervenes).

## 2. What this document deliberately does not fix

Consistent with the correction the Founder required of EA-102 §2.0 (no fixed field list) and with RPT-018 §2's explicit framing, this document does **not** enumerate a binding field-by-field schema. The illustrative mapping in `recommendation_object_spec_v0.1.md` remains available as a non-binding drafting reference — useful for engineers building a first implementation — but no field name, type, or structure in that document is itself a constitutional invariant. Only §1 above binds.

## 3. Relationship to what already exists

RCO-001 does not replace `ResolutionOption` (RIE-001), `OutcomeComparison` (OCM-001), or EA-102 §2.0's Normalized Learning Contract. All three remain the real, shipped or ratified types today, and continue operating exactly as ratified. RCO-001 is the future canonical unification those would migrate toward once RCO-001 is itself ratified and a compatibility/migration specification (per ADR-019 §6) is separately approved — not a fourth parallel shape built independently of them, and not a retroactive invalidation of any of them before that migration is approved.

## 4. Relationship to DECG-001

RCO-001 is the recommendation; DECG-001 (§ own future document) is the reasoning, dependency, alternative, evidence, risk, and lineage trace supporting it. RCO-001 references its DECG-001 trace; it never embeds DECG-001's structure. This boundary is settled per RPT-018 §3 and restated here as RCO-001's own binding statement of it (invariant 12, §1).

## 5. Versioning discipline

RCO-001's own document version (this draft: v0.1) is independent of EA-101's document version, EA-102's document version, DECG-001's document version, and any adapter/source-schema version. None of these are interchangeable, per the versioning-separation discipline the Founder required in ADR-017's final drafting controls and restated in ADR-019.

## 6. Governance and validation posture

- No component may treat an RCO-001 realization as authoritative until RCO-001 itself is ratified via its own ADR.
- Any future implementation must reject or quarantine (never silently repair or admit) a candidate Recommendation Object that fails §1's invariants.
- RCO-001 may not become a policy engine: it carries references and inherited flags, and computes nothing itself. Any logic that selects a strategy, alters recommendation substance, approves execution, or determines correctness belongs upstream (Recommendation Synthesizer, RIE-001, OCM-001), never inside RCO-001's own contract.
- FIE-001 (once it exists) may populate `financialAnalysisRef` only; it may not, through that reference or any other mechanism, cause RCO-001 to treat a composite financial score as an automatic winner-selector — this restates FIE-001's own anti-de-facto-control clause (ADR-019 §5) as a constraint RCO-001 itself must also enforce on the consuming side.

## 7. What remains undecided by this draft (for self-critique / review-board / Founder attention)

- The precise field-level schema (deliberately deferred, §2).
- Whether RCO-001 requires its own dedicated persistence/table structure or can be materialized as a read-time projection over `ResolutionOption`/EA-102's Normalized Learning Contract/DECG-001 (an ECAP Phase B question, per ADR-019 §6, not this document's).
- The exact compatibility/migration specification mapping `ResolutionOption`/`OutcomeComparison`/the Normalized Learning Contract onto RCO-001 — required before ECAP Phase B per ADR-019, not authored here.
- Whether `financialAnalysisRef` should be a required-but-nullable field or an optional field entirely absent until FIE-001 ratifies — left open pending FIE-001's own Architecture Draft.

## 8. Self-critique

This draft's greatest risk is invariant creep disguised as clarification: each invariant above was checked against the question "does this bind a semantic property, or does it smuggle in an implementation detail?" Invariants 11 and 14 (provenance identifiers, timestamp/correction handling) were the closest calls — they were retained because EA-102 §2.0 already established them as constitutional-level concerns for a less consequential object (a learning record) than RCO-001 (a user-facing recommendation), so omitting them here would be an inconsistency, not a simplification. The illustrative mapping's continued presence (via reference to the v0.1 spec) risks readers treating it as binding despite §2's disclaimer; a future revision should consider whether to strip that reference entirely rather than repeat the disclaimer pattern.

## 9. Independent review-board challenge (self-administered, pending real board review)

A reviewer applying the same scrutiny ADR-019's own architect-review rounds applied to EA-101/EA-102 would likely ask: (a) does invariant 12's "reference, never embed" rule pre-decide DECG-001's own shape before DECG-001 has been drafted? — answered: no, it constrains only how RCO-001 points at DECG-001, not what DECG-001 contains. (b) Does §6's FIE-001 restatement improperly reach into FIE-001's own governance? — answered: no, it states a constraint on RCO-001's consumption side only, and defers entirely to FIE-001's own ADR-019 §5 clause for FIE-001's own obligations. (c) Is "Proposed" the correct lifecycle state, or should this already be "Architecture Draft"? — per STD-002, "Architecture Draft" is described as canonical architecture/mapping being authored; RCO-001 is a `standard`, not an `architecture`, so "Proposed" (specification recorded) is the correct STD-002 stage pending Founder Review, consistent with STD-003/STD-004's own precedent as ratified `standard`-type artifacts.

## 10. What requires Founder decision before this can be ratified

1. Ratify or revise this draft's fourteen semantic invariants (§1).
2. Confirm "Proposed" is the correct interim lifecycle state, or direct a different one.
3. Direct whether the illustrative field mapping (§2, via the v0.1 spec) should remain referenced, be inlined, or be removed entirely from RCO-001's drafting materials.
4. Authorize (or defer) the joint RCO-001/DECG-001 reconciliation and ratification sequencing the Founder has already specified (RCO-001 draft → DECG-001 draft → joint reconciliation and ratification).
5. Direct whether persistence/materialization strategy (§7) should be scoped now as part of ratification or left fully to a future ECAP Phase B migration specification.
