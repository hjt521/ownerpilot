---
constitutional_id: DECG-001
object_type: standard
title: Decision Graph — Canonical Traversal Contract
status: Proposed
version: "0.1"
canonical_owner: Enterprise
governing_authority: EA-101
ratification_authority: Founder
lifecycle_state: Proposed
created: 2026-07-26
updated: 2026-07-26
depends_on: [EA-101, ADR-019, RPT-017, RPT-018, RCO-001, ICOA-001, RIE-001, OCM-001, EA-102]
required_by: []
implements: [EA-101]
governed_by: [EA-101, EA-100]
validated_by: [CBS-001]
supersedes: []
superseded_by: []
related_artifacts: [RCO-001, CKG-001, BTRM-001, POL-001]
registry_tags: [decision-graph, traversal-contract, proposed, decg-001]
program_phase: enterprise-delivery
repository_path: constitution/standards/DECG-001_decision_graph.md
checksum_scope: file
---

# DECG-001 — Decision Graph: Canonical Traversal Contract (Proposed)

> **Lifecycle: Proposed** (per STD-002 — specification recorded, not yet designed/ratified). Drafted under the authority ADR-019 established: `DECG-001` (`standard`) is reserved as a separate constitutional identifier, and its own drafting pipeline (standard draft → self-critique → a genuine independent review-board challenge → ADR → Founder ratification) is required before any of the content below binds anything. **This document does not authorize implementation.** It reconciles RPT-017 §2's finding (Decision Graph is "already most of a decision graph" once ICOA-001, RIE-001, and OCM-001 are read together) and RPT-018 §3's recommended boundaries, using the existing `decision_graph_spec_v0.1.md` implementation spec as a drafting input only — not pre-ratified content. Drafted immediately after RCO-001's own Revision 2 (PR #300) and deliberately built to the same rigor from the outset: labeled derivations, a genuine-vs-simulated review distinction, and explicit lifecycle/staleness handling are present in this first draft rather than added in a later correction round.

## 0. What this is, and the naming collision it must not become

**DECG-001 is a query and traversal layer over already-real relationships** — objective through interests/constraints through resolution options through comparison through (once ratified) RCO-001 — not a new, separately-populated graph structure with its own write path. DECG-001 is the reasoning, dependency, alternative, evidence, risk, and lineage trace supporting a recommendation; RCO-001 is the recommendation itself. RCO-001 references its DECG-001 trace by id; DECG-001 never embeds RCO-001's content (RCO-001 §5, restated as DECG-001's own binding rule in §2 invariant 9 below).

**DECG-001 is not CKG-001.** CKG-001 (P5.5, Proposed, not yet designed) connects constitutional/governance objects — books, doctrines, ADRs, EA documents, capabilities, AI organizations, trust/decision/behavioral models, CA-001, Founder decisions. It is meta-governance infrastructure describing the constitution's own artifacts. DECG-001 is scoped strictly to a single matter's own reasoning trace. No node or edge type in this document may represent a CKG-001 node (an ADR, an EA document, a capability, an AI organization), and no CKG-001 node/edge type may represent a DECG-001 node. The two graphs may cross-reference each other by id, but do not share a node/edge vocabulary. This distinction is carried forward unchanged from `decision_graph_spec_v0.1.md` §0's own warning and RPT-017 §2 — it is not reopened by this draft.

## 1. Definitions (normative)

DECG-001 is structurally different from RCO-001 — it is a derived, read-only traversal layer, not a produced, stateful object — so its governing concepts differ from RCO-001 §1's Draft/Candidate/Authoritative lifecycle, though they are designed to compose with it without contradiction.

- **Trace** — a reconstructed path through DECG-001's node/edge types (§2) from a Matter/Objective to a given terminal or intermediate node (e.g., a `ResolutionOption`, an `OutcomeComparison`, or once ratified, an `RCO-001` instance).
- **Trace completeness** — whether every edge in a trace resolves to an existing node. An unresolved reference means the trace is incomplete at that point, never fabricated to appear complete.
- **Trace validity** — whether every node a trace passes through is itself in an authoritative, non-quarantined state per that node type's own governing standard (e.g., RCO-001 §1's Candidate/Authoritative states, once RCO-001 exists). A trace can be complete (every edge resolves) while still invalid (e.g., it resolves to a Quarantined RCO-001 candidate, per RCO-001 §1) — this must be flagged, never presented as if it supported an Authoritative recommendation.
- **Trace currency** — whether a previously reconstructed trace still reflects the current, active version of every node it passed through. Because underlying node types are append-only and correctable (RCO-001 §2 invariant 14; EA-102 §2.0's correction handling), a trace reconstructed at one point in time may become **stale** if a node it traversed is later corrected or superseded. A stale trace may still be served for historical/audit purposes, but must be explicitly labeled as historical, never presented as current without qualification.
- **Version-awareness** — every node a trace passes through must expose which version of that node (per that node type's own versioning discipline) was traversed. A trace must never silently mix current and superseded node versions without indicating which is which.

## 2. Node types (all already-real, already-shipped or ratified — no new node type is introduced)

| Node type | Source | Notes |
|---|---|---|
| Matter / Objective | Caller-supplied context | Not itself a BTRM-001 type; the root of every trace |
| InterestConstraint | ICOA-001 | Labelled Confirmed/Likely/Possible/Unknown |
| ResolutionOption | RIE-001 | Carries `requiredConditions`/`missingInformation`/`materialRisks`/`relianceAssumptions` |
| OutcomeComparison | OCM-001 | References the compared `ResolutionOption`s |
| NormalizedLearningRecord | EA-102 §2.0 | References `ResolutionOption`, `OutcomeComparison`, `OutcomeRecord` |
| OutcomeRecord | POL-001 | Terminal node of a completed trace |
| RCO-001 (once ratified) | RCO-001 | Referenced by id only, per §0; never embedded |

No node type above is invented by this document — all are already-real per BTRM-001/EA-102's own ratified or shipped status, or (for RCO-001) already separately reserved and drafted. DECG-001 introduces no new node type of its own.

## 3. Semantic invariants (binding on any future ratified implementation)

1. **Edges are read-only projections of already-existing reference fields.** DECG-001 introduces no new write path, no new column, no new table — a trace is reconstructed from fields these components already produce, never a separately maintained graph store of record.
2. **No fabricated edges or nodes.** An edge may only be materialized from a reference that actually resolves (§1, trace completeness); an unresolved or nonexistent id contributes nothing — the same rule ICOA-001/RIE-001/OCM-001/EA-102 §2.0/RCO-001 already enforce, applied here without exception.
3. **No cross-matter traversal by default.** A trace is scoped to one matter unless a future, separately-authorized capability (e.g. an Evaluation Lab comparing traces across matters, per RPT-016 §6) explicitly requires and authorizes otherwise. Cross-matter traversal is never a default DECG-001 capability.
4. **Explainability-preserving.** A full trace for a given `ResolutionOption`, `NormalizedLearningRecord`, or `RCO-001` instance must be reconstructable end-to-end back to the `InterestConstraint`s and evidence that supported it — this is what makes the trace an explainability tool, not merely a data diagram.
5. **CKG-001 non-collision.** No CKG-001 node/edge vocabulary may appear in a DECG-001 trace, and no DECG-001 node/edge vocabulary may appear in CKG-001. Cross-reference by id only (§0).
6. **Trace version-awareness is mandatory** (§1). A trace must expose, for every node it passes through, which version of that node was traversed. This is what makes RCO-001 §2 invariant 14's correction/supersession lineage meaningful in practice — a correction is only traceable if DECG-001 can show which version a given trace actually used.
7. **Staleness must be surfaced, never hidden.** If a node in a previously reconstructed trace is later corrected or superseded (§1, trace currency), DECG-001 must be able to indicate the trace is stale relative to that node's current state. A stale trace may still be served for audit purposes but must be explicitly labeled as historical.
8. **Trace completeness and trace validity are distinguished, never conflated** (§1). A complete-but-invalid trace (every edge resolves, but a traversed node is itself Quarantined or otherwise non-authoritative per its own governing standard) must be flagged as invalid, never silently treated as supporting an Authoritative recommendation.
9. **A DECG-001 trace is referenced by RCO-001; it is never embedded inline.** This restates RCO-001 §2 invariant 12 and RCO-001 §5 as DECG-001's own binding statement of the same boundary. Once RCO-001 exists as a node type (§2), DECG-001 may include it, referenced by id, never with RCO-001's own content duplicated inline.
10. **Governed relationships first; no graph database is assumed.** Per CKG-001's own P5.5 "governed-relationships-first" precedent, a dedicated graph substrate is a possible future optimization decided on evidence, not a precondition of this standard. DECG-001 may be satisfied entirely by querying existing relational structures directly.

## 4. What this document deliberately does not fix

This document does not specify a query language, API shape, or storage substrate. Whether DECG-001 is realized as SQL joins over existing tables, a dedicated graph database, or an in-memory traversal computed at read time is left entirely open (§3 invariant 10) — a decision to be made on evidence during implementation, not fixed here as a constitutional invariant.

## 5. Relationship to what already exists

DECG-001 does not replace ICOA-001, RIE-001, OCM-001, EA-102 §2.0, or POL-001's existing shipped or ratified data. It is a read-only lens over their already-real reference fields (§2, §3 invariant 1). It does not replace CKG-001 either — the two remain distinct graphs over distinct subject matter (§0).

## 6. Relationship to RCO-001

RCO-001 is the recommendation; DECG-001 is the reasoning, dependency, alternative, evidence, risk, and lineage trace supporting it. RCO-001 references its DECG-001 trace by id (RCO-001 §2 invariant 12); DECG-001 never embeds RCO-001's own content (§3 invariant 9). This boundary is the one rule both RPT-018 §3 and RCO-001 §5 already treat as settled, restated here as DECG-001's own binding statement of it.

## 7. Versioning discipline

DECG-001's own document version (this draft: v0.1) is independent of EA-101's document version, EA-102's document version, RCO-001's document version, and any adapter/source-schema version. None of these are interchangeable, per the versioning-separation discipline the Founder required in ADR-017's final drafting controls and restated in ADR-019. At the instance level, a given trace's version-awareness (§1, §3 invariant 6) is independent of DECG-001's own document version — a corrected node does not imply a new document version of this standard.

## 8. Governance and validation posture

- No component may treat a DECG-001 trace as authoritative until DECG-001 itself is ratified via its own ADR.
- DECG-001 may not become a policy engine: it reconstructs and exposes references; it computes and decides nothing. Any logic that selects a strategy, alters recommendation substance, approves execution, or determines correctness belongs upstream (Recommendation Synthesizer, RIE-001, OCM-001, RCO-001), never inside DECG-001's own traversal contract.
- A DECG-001 trace must never be used to justify bypassing RCO-001's own governance (e.g., presenting a trace as if it were itself an Authoritative recommendation, or using a trace's completeness to paper over a Quarantined node it passes through, per §3 invariant 8).
- Any future implementation must surface, never hide, incomplete (§1), invalid (§1), or stale (§1) traces.

## 9. Constitutional-minimum guarantees

Physical persistence, query mechanics, and storage substrate (§4) are deliberately left open. This section states only the minimum guarantees any eventual DECG-001 implementation must provide, regardless of how it is physically realized:

- **Traceability** — a full trace is reconstructable end-to-end from any terminal node back to its originating Matter/Objective (§3 invariant 4).
- **Reproducibility** — reconstructing the same trace against the same node versions yields the same result.
- **Version-awareness** — every traversed node exposes which version was used (§1, §3 invariant 6).
- **Non-fabrication** — no edge or node is materialized without a resolving reference (§3 invariant 2).
- **Explainability preservation** — a trace remains usable as an explainability tool, not merely a data diagram (§3 invariant 4).
- **Non-collision enforcement** — CKG-001 and DECG-001 vocabularies never mix (§3 invariant 5).
- **Access parity** — a trace must never expose a node to a requester who could not otherwise access that node directly through its own governing component.
- **Auditability** — which nodes and node versions a given trace traversed is itself inspectable by a human reviewer or CA-001-equivalent process.

These are constitutional minimums, not a schema or API contract. Implementation determines how they are physically satisfied.

## 10. What remains undecided by this draft (for self-critique / review-board / Founder attention)

- The exact query language, API shape, or storage substrate (§4).
- Whether a dedicated graph database is ever adopted, and on what evidentiary basis (§3 invariant 10).
- The precise mechanics of authorizing a future cross-matter capability (e.g. an Evaluation Lab, per RPT-016 §6) — left to that capability's own future authorization, not fixed here beyond "never a default" (§3 invariant 3).
- How staleness notifications (§1, §3 invariant 7) are surfaced to a consumer in practice (push notification, pull-time check, etc.) — an implementation detail, not a constitutional invariant.
- The exact joint reconciliation content between RCO-001 and DECG-001 beyond the boundary already stated in §6 — reserved for the joint reconciliation step the Founder has specified next.

## 11. Self-critique

The largest structural risk in this draft is asserting that DECG-001's lifecycle concepts (§1: completeness, validity, currency, version-awareness) compose cleanly with RCO-001's own lifecycle states (Draft/Quarantined/Candidate/Authoritative/Corrected/Superseded/Archived) without having yet run a genuine joint reconciliation to confirm it. The claim in §3 invariant 8 — that a trace can be "complete but invalid" if it resolves to a Quarantined RCO-001 node — assumes RCO-001's quarantine state is itself visible to a DECG-001 traversal; this has not been checked against how RCO-001's access-control guarantee (RCO-001 §8: "Quarantined and Draft-state candidates are never exposed through the same access path as Candidate/Authoritative material") might restrict DECG-001 from even seeing a quarantined node to flag it as invalid in the first place — this is a genuine open tension between RCO-001 §8 and DECG-001 §3 invariant 8/§9's access-parity guarantee, flagged here rather than resolved, and is exactly the kind of question the joint reconciliation (§10, last bullet) exists to settle. A second risk: §3 invariant 7's staleness-surfacing rule is stated as a strong "must," but this draft does not define what happens to a trace that becomes stale mid-reconstruction (a node is corrected while a trace is being computed) — a timing/concurrency question this document is not positioned to resolve and does not attempt to.

## 12. Simulated/preparatory review-board challenge (not a substitute for genuine independent review)

**This section is a self-administered rehearsal only.** A genuine, independent architecture-review-board challenge — conducted by a reviewer without authorship stake in this draft — remains mandatory before any ADR or Founder ratification, per DECG-001's own drafting pipeline (§0) and consistent with the Founder's direction on RCO-001 that continued drafting and joint reconciliation work is authorized, not ratification. The questions below are offered only to sharpen the draft before it reaches that genuine review.

A genuine reviewer would likely ask: (a) does §3 invariant 9's "RCO-001 as a node type once ratified" pre-decide anything about RCO-001's own shape? — answered: no, DECG-001 only references RCO-001 by id; it asserts nothing about RCO-001's internal content. (b) Is the RCO-001/DECG-001 access-parity tension flagged in §11 disqualifying, or a normal joint-reconciliation item? — flagged as the latter, but a genuine review should confirm this document has not silently under-stated the tension's severity by calling it merely an "open question" in §10 while §11 more directly calls it "a genuine open tension." (c) Is "Proposed" the correct lifecycle state? — per STD-002, "Architecture Draft" describes canonical architecture/mapping being authored; DECG-001 is a `standard`, not an `architecture`, so "Proposed" is the correct STD-002 stage pending Founder Review — consistent with RCO-001's own reconfirmed reasoning.

## 13. Status and next steps

This draft is submitted for Founder/architect review alongside RCO-001 v0.2. Per the Founder-specified sequence, the next steps are: a genuine independent review-board challenge for both RCO-001 and DECG-001, their joint reconciliation (which must specifically resolve the access-parity/quarantine-visibility tension flagged in §11), and a coordinated ADR and Founder ratification covering both artifacts together. This document does not authorize implementation, persistence changes, schema changes, ECAP Phase B, or production use.
