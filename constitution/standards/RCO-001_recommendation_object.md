---
constitutional_id: RCO-001
object_type: standard
title: Recommendation Object — Canonical Semantic Contract
status: Proposed
version: "0.2"
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

> **Lifecycle: Proposed** (per STD-002 — specification recorded, not yet designed/ratified). **Revision 2** (2026-07-26), incorporating a Founder/architect review of the v0.1 draft (PR #299). Still Proposed — this revision is not itself a ratification event; it is the second iteration of RCO-001's own drafting pipeline (standard draft → self-critique → independent review-board challenge → ADR → Founder ratification), which remains fully intact and unshortened. **This document does not authorize implementation.** It reconciles RP-006's 14-field proposal and RP-008's 18-field proposal, using RPT-017 §1's finding (the disagreement between them is itself evidence a fixed list was the wrong instrument) and RPT-018 §2's recommended boundaries as its starting inputs — not as pre-ratified content. The existing `recommendation_object_spec_v0.1.md` implementation spec is treated the same way: a drafting input, superseded in role by this document, not silently adopted.
>
> **What changed in Revision 2:** new §1 (normative definitions and lifecycle states, previously absent and required before invariants could distinguish draft/quarantined material from authoritative material); revised invariants distinguishing evidence/assumptions/unknowns/disputed-facts/inferences/judgment, permitting labeled derivative synthesis without displacing authoritative references, narrowing the no-unsupported-content rule to substantive claims only, expressing provenance as semantic concepts rather than literal field names, scoping the DECG-001 reference requirement to authoritative/material candidates only, and adding correction/active-version/supersession rules; a new §8 stating constitutional-minimum persistence guarantees (identity, reproducibility, version preservation, correction lineage, graph association, validation state, auditability, access control, historical retrieval) while leaving physical persistence to ECAP Phase B; the self-administered challenge renamed to make clear it is simulated/preparatory, not a substitute for a genuine independent review; an expanded self-critique. See the change matrix delivered alongside this revision for the full old-invariant-to-new-invariant mapping.

## 0. What this is, and what it is not

**RCO-001 is the canonical semantic contract for a recommendation OwnerPilot produces** — what is delivered to a decision-maker (owner, or a future reviewer), not how it was reasoned to. That reasoning trace is DECG-001's job (§5 below). RCO-001 does not itself compute, rank, or select a recommendation; it is the shape a recommendation takes once the Recommendation Synthesizer (EA-101 §3) has produced one.

RCO-001 is **not** a database schema, a TypeScript interface, or an API contract. Those are implementation artifacts that must satisfy RCO-001's invariants; they are not this document. Per ADR-019 §2 and RPT-018 §0, reservation of this identifier does not itself ratify any schema — this Proposed draft is one iteration of RCO-001's own pipeline, not its conclusion.

## 1. Definitions and lifecycle states (normative)

These terms are used throughout §2's invariants and bind exactly as defined here. A future implementation may use different internal names, but must preserve these distinctions.

- **Validity** — whether a candidate Recommendation Object satisfies §2's invariants. Validity is binary at any given moment (valid or not), but is re-evaluated on every correction (§6).
- **Completeness** — whether every field required for a given lifecycle state has either a resolved reference or an explicit unknown/missing marker (never a silent gap). Completeness is a precondition for advancing state, not a synonym for validity — a candidate can be complete (nothing silently missing) while still invalid (e.g., a required reference points to something that does not exist).
- **Review** — the human-review status inherited per invariant 9; a separate concept from validity/completeness. A Recommendation Object can be valid, complete, and still pending review.
- **Execution eligibility** — whether a Recommendation Object may be surfaced to a decision-maker or acted upon. Execution eligibility requires validity, completeness, and satisfaction of the inherited human-review-required flag (§2, invariant 9); it is never a state a Recommendation Object grants itself.
- **Lifecycle states:**
  1. **Draft** — a candidate under internal construction or iteration. May be incomplete or invalid. Never authoritative, never execution-eligible, never decision-maker-facing.
  2. **Quarantined** — a candidate that failed validation (§2, invariant 13). Held for diagnostic and correction purposes only. Confers no authority under any circumstance and is never execution-eligible.
  3. **Candidate** — valid and complete, not yet execution-eligible (e.g., pending review, or pending a resolved DECG-001 reference where one is required).
  4. **Authoritative** — valid, complete, and execution-eligible; the state in which a Recommendation Object may be presented to a decision-maker.
  5. **Corrected** — an Authoritative (or Candidate) Recommendation Object that has been amended via an append-only correction (§6). The correction is a new version; the record being corrected transitions to Superseded.
  6. **Superseded** — a prior version, preserved and retrievable, no longer active. Never deleted.
  7. **Archived** — retained for historical/audit retrieval only, outside normal operational access paths.

No implementation may skip a required state transition (e.g., Draft directly to Authoritative without passing through Candidate's completeness/validity checks), and no state may be self-assigned by the Recommendation Object itself — state transitions are governed by whatever upstream process (RIE-001, the Recommendation Synthesizer, or a human reviewer) is authoritative for that transition.

## 2. Semantic invariants (binding on any future ratified implementation)

Any concrete Recommendation Object realization must satisfy all of the following, using the lifecycle states and definitions in §1.

1. **Objective by authoritative reference, plus an optional immutable presentation snapshot.** The owner's objective is a reference into whatever produced it (ICOA-001 today). An implementation may additionally carry an immutable, point-in-time presentation snapshot of the objective's stated text for display purposes, provided the snapshot is explicitly labeled as a presentation copy — never a re-derivation or paraphrase substituting for the authoritative reference.
2. **Evidence, assumptions, unknowns, disputed facts, inferences, and judgment are each distinguished — never merged into one narrative block or conflated with each other.** Evidence cites specific resolved, provenance-classified items. Assumptions are explicitly labeled as assumptions, not evidence. Unknowns and missing information are named as gaps, never silently omitted and never fabricated to appear resolved. Disputed facts are preserved together with the dispute noted, never silently resolved in one direction. Inferences are labeled as derived, distinguishable from directly cited evidence. Judgment — a synthesizing assessment — is labeled as judgment, never presented as if it were fact or evidence.
3. **Legal analysis, financial analysis, behavioral/negotiation input, and confidence each retain their own separate analytical provenance**, cross-referencing their source component, while permitting a traceable, human-readable synthesis that draws on more than one of them — provided the synthesis is itself explicitly labeled as a synthesis, and each underlying reference remains independently resolvable and is never displaced by the synthesis. `financialAnalysisRef` may point to FIE-001's output once FIE-001 exists and is itself ratified; until then it remains explicitly absent, not fabricated or approximated from other fields.
4. **Confidence and predicted outcome are never combined into one value.** Restated verbatim from EA-102 §2.0's own rule because this is precisely the kind of object where the two are conflated if not stated explicitly and repeatedly.
5. **Risks and alternative strategies are grounded in references to already-produced structures** (RIE-001's `materialRisks`, OCM-001's compared alternatives). A derivative summary may accompany these references for presentation purposes, provided it is explicitly labeled as derivative and never replaces, overrides, or is resolvable independently of the authoritative reference.
6. **A communication artifact reference is authoritative; CS-001 owns communication structuring.** A derivative, clearly labeled summary may accompany the reference for presentation, but never substitutes for it.
7. **Execution steps and a review trigger are explicit, separate fields.** "What happens next" and "when should this be revisited" are different questions and must never share one field.
8. **An explainability reference is mandatory**, reusing BTRM-001's `ExplainabilityEnvelope` shape rather than inventing a parallel one.
9. **A human-review-required flag is inherited, never independently computed** by RCO-001 itself — it passes through unchanged from whatever upstream type (`ResolutionOption` or its successor) produced the recommendation, per BTRM-001 §6/§11.
10. **No field may assert unsupported substantive content.** Intrinsic metadata (identifiers, timestamps, lifecycle state, version numbers) and explicitly classified derivations expressly permitted under invariants 1, 3, 5, and 6 (labeled snapshots, syntheses, and summaries) are not subject to this rule — they are self-describing structure, not substantive claims requiring an external evidentiary reference. Any field asserting a substantive claim about the matter, the objective, evidence, or outcome must trace to a resolved reference or be explicitly marked unknown/missing (never defaulted, guessed, or interpolated).
11. **Provenance is carried as independently identifiable and versioned concepts** — the originating system, the originating artifact type, the schema version of the source, and RCO-001's own contract version are four distinct, separately trackable concepts. This invariant binds the semantic separation, not any literal field name — an implementation may name or structure these concepts however best fits its own schema, so long as all four remain distinguishable and independently versioned.
12. **An authoritative, material Recommendation Object — one that has reached Candidate or Authoritative state (§1) — must carry a resolved DECG-001 reference, never an embedded trace.** A Draft-state candidate, used for internal iteration or diagnostic purposes, is not required to carry a resolved DECG-001 reference, but may never advance to Candidate, be presented to a decision-maker, or reach an execution path without one.
13. **A candidate failing §2's invariants may exist only in Draft or Quarantined state (§1) and must never cross into Candidate, Authoritative, or execution-eligible state.** Quarantine exists for diagnostic and correction purposes only and confers no authority under any circumstance.
14. **Original timestamps are preserved permanently.** Any correction, reclassification, or amendment is applied as a new, append-only version — never a silent overwrite. Each Recommendation Object carries an explicit active-version marker; a corrected predecessor transitions to Superseded (§1), not deleted, and remains retrievable. Supersession is itself a traceable, timestamped event, distinguishable from ordinary version creation.

## 3. What this document deliberately does not fix

Consistent with the correction the Founder required of EA-102 §2.0 (no fixed field list) and with RPT-018 §2's explicit framing, this document does **not** enumerate a binding field-by-field schema. The illustrative mapping in `recommendation_object_spec_v0.1.md` remains an **external, informative, noncanonical, nonbinding** engineering reference — useful groundwork for a first implementation, but no field name, type, or structure in that document is itself a constitutional invariant, and it is neither inlined into this document nor deleted. Only §§1–2 above bind.

## 4. Relationship to what already exists

RCO-001 does not replace `ResolutionOption` (RIE-001), `OutcomeComparison` (OCM-001), or EA-102 §2.0's Normalized Learning Contract. All three remain the real, shipped or ratified types today, and continue operating exactly as ratified. RCO-001 is the future canonical unification those would migrate toward once RCO-001 is itself ratified and a compatibility/migration specification (per ADR-019 §6) is separately approved — not a fourth parallel shape built independently of them, and not a retroactive invalidation of any of them before that migration is approved.

## 5. Relationship to DECG-001

RCO-001 is the recommendation; DECG-001 (its own future document) is the reasoning, dependency, alternative, evidence, risk, and lineage trace supporting it. A Candidate- or Authoritative-state RCO-001 references its DECG-001 trace; it never embeds DECG-001's structure (invariant 12, §2). Draft-state candidates are exempt from this requirement (§1, §2 invariant 12), which resolves the prior draft's over-broad requirement that every candidate, including transient internal ones, carry a resolved DECG-001 reference.

## 6. Versioning discipline

RCO-001's own document version (this revision: v0.2, still Proposed) is independent of EA-101's document version, EA-102's document version, DECG-001's document version, and any adapter/source-schema version. None of these are interchangeable, per the versioning-separation discipline the Founder required in ADR-017's final drafting controls and restated in ADR-019. This applies equally at the instance level: an individual Recommendation Object's active-version/correction/supersession lineage (§2, invariant 14) is independent of RCO-001's own document version — correcting a single recommendation does not imply or require a new document version of this standard.

## 7. Governance and validation posture

- No component may treat an RCO-001 realization as authoritative until RCO-001 itself is ratified via its own ADR.
- Any future implementation must reject or quarantine (never silently repair or admit) a candidate Recommendation Object that fails §2's invariants; a quarantined or Draft-state candidate must never cross into Candidate, Authoritative, or execution-eligible state (§1, §2 invariant 13).
- RCO-001 may not become a policy engine: it carries references, labeled derivations, and inherited flags, and computes nothing itself. Any logic that selects a strategy, alters recommendation substance, approves execution, or determines correctness belongs upstream (Recommendation Synthesizer, RIE-001, OCM-001), never inside RCO-001's own contract.
- FIE-001 (once it exists) may populate `financialAnalysisRef` only; it may not, through that reference or any other mechanism, cause RCO-001 to treat a composite financial score as an automatic winner-selector — this restates FIE-001's own anti-de-facto-control clause (ADR-019 §5) as a constraint RCO-001 itself must also enforce on the consuming side.

## 8. Constitutional-minimum persistence guarantees

Physical persistence and materialization strategy (whether RCO-001 requires its own dedicated storage or can be materialized as a read-time projection over already-shipped types) is deliberately left to the future ECAP Phase B migration specification (ADR-019 §6) and is **not** decided by this document. This section states only the minimum guarantees any eventual persistence approach must provide, regardless of how it is physically implemented:

- **Stable identity** — a Recommendation Object's identifier is stable across corrections and supersession; correcting a record never changes its identity, only its active version.
- **Reproducibility** — given the same upstream inputs and the same contract version, a Recommendation Object's derivation is reproducible for audit purposes.
- **Version preservation** — every version (original and corrected) is retrievable, per invariant 14.
- **Correction lineage** — the chain from an original Recommendation Object through any corrections to its currently active version is traceable end to end.
- **Graph association** — the DECG-001 reference (invariant 12) remains resolvable for the life of the Recommendation Object, including superseded versions.
- **Validation state** — a Recommendation Object's lifecycle state (§1) is itself persisted and auditable, not re-derived on demand from other fields.
- **Auditability** — every state transition and correction is logged in a form a human reviewer or CA-001-equivalent process can inspect.
- **Access control** — Quarantined and Draft-state candidates are never exposed through the same access path as Candidate/Authoritative material.
- **Historical retrieval** — Superseded and Archived records remain retrievable for audit, even though they are excluded from normal operational access paths.

These are constitutional minimums, not a schema. ECAP Phase B's migration specification determines how they are physically satisfied.

## 9. What remains undecided by this draft (for self-critique / review-board / Founder attention)

- The precise field-level schema (deliberately deferred, §3).
- The exact compatibility/migration specification mapping `ResolutionOption`/`OutcomeComparison`/the Normalized Learning Contract onto RCO-001 — required before ECAP Phase B per ADR-019, not authored here.
- Whether `financialAnalysisRef` should be a required-but-nullable field or an optional field entirely absent until FIE-001 ratifies — left open pending FIE-001's own Architecture Draft.
- The precise mechanics of state-transition authority (§1) — which upstream process is authoritative for each transition (Draft→Candidate, Candidate→Authoritative, Authoritative→Corrected) — left to the eventual implementation and migration specification, not fixed here as a constitutional invariant beyond "never self-assigned" (§1).

## 10. Self-critique

This revision's greatest risk remains invariant creep disguised as clarification, now compounded by the opposite risk introduced in fixing Revision 1: loosening an invariant too far in the name of flexibility. Each change was checked against both directions. Invariant 2's split into six distinguished categories (evidence/assumptions/unknowns/disputed-facts/inferences/judgment) is more operationally demanding than Revision 1's simple "evidence and unknowns separate," and a future implementer may find some of the six collapse naturally in practice (e.g., assumptions and inferences may be hard to distinguish in some source data) — this is flagged rather than resolved, since collapsing them prematurely in this document would repeat Revision 1's own error of over-fixing shape too early. Invariants 3, 5, and 6's new allowance for "labeled derivative synthesis" is the revision most likely to be exploited as a loophole for smuggling unlabeled inference back in as if it were a reference; §2 invariant 10's narrowed no-unsupported-content rule is written to close that gap, but a review board should specifically stress-test whether "explicitly labeled" is itself enforceable or merely aspirational without a concrete labeling mechanism, which this document does not specify (deliberately — that is schema, not invariant). §1's lifecycle states are new scaffolding load-bearing enough that an error there would propagate through every invariant that references it (9, 12, 13); they were modeled after BTRM-001's own human-review-gate discipline and OCM-001's confidence-band precedent rather than invented from scratch, but have not yet been checked against DECG-001's own future state model, which does not yet exist — this is a genuine open dependency, not fully closeable until DECG-001 is drafted.

## 11. Simulated/preparatory review-board challenge (not a substitute for genuine independent review)

**This section is a self-administered rehearsal only.** A genuine, independent architecture-review-board challenge — conducted by a reviewer without authorship stake in this draft — remains mandatory before any ADR or Founder ratification, per RCO-001's own drafting pipeline (§0) and per the Founder's explicit direction that this round's ruling authorizes continued drafting and joint reconciliation work only, not ratification. The questions below are the kind such a review would likely raise, offered here only to sharpen the draft before it reaches that genuine review, not to discharge the requirement for one.

A genuine reviewer would likely ask: (a) does invariant 12's narrowed DECG-001-reference requirement (Candidate/Authoritative only, not Draft) create a gap where an internal system could keep a candidate perpetually in "Draft" to avoid ever resolving a DECG-001 reference? — flagged as a real risk requiring either a maximum Draft dwell-time rule or an escalation trigger in a future revision or in DECG-001's own reconciliation, not resolved here. (b) Does §8's list of "constitutional minimums" for persistence risk becoming a de facto schema despite §8's own disclaimer? — the list was kept to guarantees (properties), not fields or structures, specifically to avoid this, but a genuine review should confirm each bullet is truly a property and not an implicit field name in disguise. (c) Is "Proposed" still the correct lifecycle state after this much substantive change? — per STD-002, "Architecture Draft" describes canonical architecture/mapping being authored; RCO-001 is a `standard`, not an `architecture`, so "Proposed" remains the correct STD-002 stage pending Founder Review, consistent with STD-003/STD-004's own precedent — this is unchanged from Revision 1 and was reconfirmed, not merely carried over, in this revision.

## 12. Status and next steps

This Revision 2 is submitted for Founder/architect confirmation that it correctly incorporates the ruling on Revision 1. Pending that confirmation, the sequence remains: this revised RCO-001 → DECG-001 draft → a genuine independent review-board challenge (§11) for both → their joint reconciliation → a coordinated ADR and Founder ratification covering both artifacts together. This document does not authorize implementation, persistence changes, schema changes, ECAP Phase B, or production use — consistent with every prior statement of that boundary in this drafting pipeline.
