---
constitutional_id: RPT-018
object_type: report
title: Recommendation Object / Decision Graph Reconciliation Addendum
status: Concept
version: "0.1"
canonical_owner: Enterprise
governing_authority: EA-100
ratification_authority: n/a
lifecycle_state: Concept
created: 2026-07-26
updated: 2026-07-26
depends_on: [RP-006, RP-008, RPT-017, ADR-019, EA-101, BTRM-001, EA-102]
required_by: []
implements: []
governed_by: [EA-100]
validated_by: [CBS-001]
supersedes: []
superseded_by: []
related_artifacts: [RP-005, RP-006, RP-007, RP-008, RPT-012, RPT-013, RPT-016, RPT-017, ADR-016, ADR-017, ADR-018, ADR-019, EA-101, BTRM-001, EA-102, ICOA-001, RIE-001, OCM-001, CKG-001, DOC-003]
registry_tags: [reconciliation, addendum, rco-001, decg-001, non-constitutional]
program_phase: research
repository_path: constitution/research/RPT-018_recommendation_object_decision_graph_reconciliation_addendum.md
checksum_scope: file
---

# RPT-018 — Recommendation Object / Decision Graph Reconciliation Addendum

> **NON-CONSTITUTIONAL ADDENDUM, per DOC-003 §9.** This is an addendum to RPT-017, not a rewrite of it — RPT-017 remains unmodified and is the original reconciliation record. This addendum exists solely because ADR-019 made a decision RPT-017 did not anticipate (OPOS's own CRID, overriding RPT-017 §3's internal-specification recommendation) and reserved two identifiers (RCO-001, DECG-001) RPT-017 left as an open question. This addendum records what changed and why, and states its own authority limits explicitly.

## 0. Authority and limits (read this section first)

**RPT-018 establishes the recommended constitutional boundaries and drafting requirements for the separate Recommendation Object (`RCO-001`) and Decision Graph (`DECG-001`) artifacts. It does not ratify RCO-001, DECG-001, or their implementation specifications, and it does not itself create any constitutional status for either.** The governing chain remains, unchanged from ADR-014's own standing pipeline:

```text
Existing concepts and reports (RP-006, RP-008, RPT-012/013/016/017)
   → RPT-018 (this addendum — reconciliation + drafting boundaries, non-binding)
   → proposed architecture/standard drafts (RCO-001, DECG-001, each its own document)
   → self-critique
   → independent architecture-review-board challenge
   → ADR
   → Founder ratification
```

RP-006 and RP-008 remain unmodified by this addendum, consistent with DOC-003 §9's "annotate, don't rewrite" rule already applied to RPT-013 and RPT-016.

## 1. What ADR-019 changed relative to RPT-017

RPT-017 §3 recommended OPOS be held as EA-101's own internal specification, reasoning that it had no independent inputs/outputs/versioning/consumer distinct from EA-101 itself. **The Founder ruled the opposite** — OPOS is separately governed as `OPOS-001` (`doctrine`) — a conscious override, not a defect in RPT-017's reasoning; the Founder judged OPOS's eventual scope (operating principles, engine coordination, authority boundaries, failure/abstention behavior, human-review escalation, precedence, state transitions, auditability, learning restrictions, invocation rules — see EA-101 §2, as amended) broad enough to warrant its own identifier and its own Doctrine Draft, distinct from EA-101's architecture-level content. This addendum records the override; it does not relitigate it.

For Recommendation Object and Decision Graph, ADR-019 **adopted** RPT-017 §1/§2's underlying recommendation (semantic invariants over a fixed schema; a query layer over already-real relationships, not a new write path) while resolving what RPT-017 §7 (implicitly, via §16) left open: both get their own separate identifiers (`RCO-001`, `DECG-001`, both `standard`) rather than remaining undecided or folded into EA-101's own text.

## 2. Recommended constitutional boundaries for RCO-001

- **Canonical role:** the semantic contract for a recommendation OwnerPilot produces — what is delivered to a decision-maker, not how it was reasoned to.
- **Drafting input, not adopted content:** `constitution/implementation-specs/recommendation_object_spec_v0.1.md`'s ten invariants (objective by reference; evidence/unknowns separate; legal/financial/behavioral/negotiation/confidence each their own field; confidence never merged with predicted outcome; risks/alternatives by reference; communication by reference; explicit execution/review-trigger fields; mandatory explainability reference; inherited human-review flag; no fabricated support) are **recommended starting material for RCO-001's own drafting process, not pre-ratified constitutional invariants.** RCO-001's own Architecture Draft-equivalent process (a `standard` draft, self-critique, independent challenge) may adopt, amend, or reject any of them.
- **Migration relationship:** `ResolutionOption` (RIE-001, shipped) and EA-102's Normalized Learning Contract (§2.0, ratified) are today's working types. They migrate toward RCO-001 once RCO-001 is itself ratified — RCO-001 does not retroactively invalidate them before that.
- **Ownership:** Enterprise, same as EA-101/EA-102/BTRM-001.
- **Versioning:** independent of EA-101's, EA-102's, BTRM-001's, and DECG-001's own version numbers, per the versioning-separation discipline ADR-017 already established.

## 3. Recommended constitutional boundaries for DECG-001

- **Canonical role:** the reasoning, dependency, alternative, evidence, risk, and lineage structure supporting a given RCO-001 recommendation — the explanatory trace, not the recommendation itself.
- **Drafting input, not adopted content:** `constitution/implementation-specs/decision_graph_spec_v0.1.md`'s node/edge types (Matter/Objective, InterestConstraint, ResolutionOption, OutcomeComparison, NormalizedLearningRecord, OutcomeRecord; edges read off already-existing fields) and traversal contract (read-only, no fabricated edges, explainability-preserving, no cross-matter traversal by default) are **recommended starting material only**, subject to the same drafting process as RCO-001.
- **Explicit non-collision with CKG-001:** unchanged from RPT-017 §2 — CKG-001 (P5.5, meta-governance graph connecting constitutional/governance objects) and DECG-001 (per-matter reasoning trace) never share a node/edge vocabulary. This finding is not reopened by this addendum.
- **Boundary with RCO-001:** RCO-001 is the recommendation; DECG-001 is the trace supporting it. RCO-001 carries a reference to its DECG-001 trace; it does not embed DECG-001's structure inline. This is what "distinct but interoperable" (the Founder's own phrase) means concretely, and is the one boundary rule this addendum treats as settled rather than merely recommended, since it follows directly from the two artifacts' own stated canonical roles above.
- **Ownership and versioning:** same posture as RCO-001.

## 4. What remains for RCO-001's and DECG-001's own future drafting process

Each requires, independently: its own draft document (a `standard`, not an Architecture Draft or Doctrine Draft); its own self-critique; its own independent review-board challenge; its own ADR; its own Founder ratification. Nothing in this addendum or in ADR-019 shortens that pipeline for either artifact. The recommended boundaries above are inputs to that process, not substitutes for it.

## 5. Status

Reconciliation and drafting-boundary recommendations only. RCO-001 and DECG-001 remain reserved identifiers with no draft content yet. RP-006 and RP-008 are unmodified. RPT-017 is unmodified. This addendum does not ratify anything.
