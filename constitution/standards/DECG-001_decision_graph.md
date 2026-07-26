---
constitutional_id: DECG-001
object_type: standard
title: Decision Graph — Canonical Traversal Contract
status: Proposed
version: "0.3"
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
related_artifacts: [RCO-001, CKG-001, BTRM-001, POL-001, RPT-019]
registry_tags: [decision-graph, traversal-contract, proposed, decg-001]
program_phase: enterprise-delivery
repository_path: constitution/standards/DECG-001_decision_graph.md
checksum_scope: file
---

# DECG-001 — Decision Graph: Canonical Traversal Contract (Proposed)

> **Lifecycle: Proposed** (per STD-002 — specification recorded, not yet designed/ratified). **Revision 3** (2026-07-26), incorporating the same genuine independent review-board challenge that produced RCO-001 Revision 4, since both artifacts were reviewed together and are headed to a single coordinated ADR. **Disposition: revision required before a coordinated ADR — granted via this revision.** The review authorized targeted drafting only; it does not authorize implementation, schema or persistence changes, ECAP Phase B, production use, merge, publication, ADR acceptance, or ratification.
>
> **Revision history:** Revision 1 (PR #301) first drafted DECG-001 as a query/traversal layer, already anticipating RCO-001's own revised state model. Revision 2 (PR #303) incorporated RPT-019's joint reconciliation, amending §3 invariant 8, §9, and §11 to distinguish content access from validity-state access. **Revision 3 (this revision)** incorporates the genuine independent review-board ruling: §3 invariant 1 rewritten to permit indexes/caches/projections/materialized views/a graph substrate without becoming an independent source of truth; trace-validity semantics (§1, §3 invariant 8) redefined relative to declared purpose (construction-valid/presentation-valid/historical/invalid) rather than a single "authoritative" framing; evidence lineage clarified (§3 invariant 4) as governed references owned by traversed source artifacts, not a new DECG-001 node family; §2's node list reframed as the initial governed node families, not an eternal closed universe; a new coherent-observation invariant added (§3 invariant 11); the access-parity guarantee (§9) expanded with the same access-security minimum guarantees added to RCO-001 §8; and stale cross-references to RCO-001's prior version and to the (now-complete) joint reconciliation corrected throughout.

## 0. What this is, and the naming collision it must not become

**DECG-001 is a query and traversal layer over already-real relationships** — objective through interests/constraints through resolution options through comparison through (once ratified) RCO-001 — not a new, separately-populated graph structure with its own write path. DECG-001 is the reasoning, dependency, alternative, evidence, risk, and lineage trace supporting a recommendation; RCO-001 is the recommendation itself. RCO-001 references its DECG-001 supporting trace by id; DECG-001 never embeds RCO-001's content (RCO-001 §5, restated as DECG-001's own binding rule in §3 invariant 9 below).

**DECG-001 is not CKG-001.** CKG-001 (P5.5, Proposed, not yet designed) connects constitutional/governance objects — books, doctrines, ADRs, EA documents, capabilities, AI organizations, trust/decision/behavioral models, CA-001, Founder decisions. It is meta-governance infrastructure describing the constitution's own artifacts. DECG-001 is scoped strictly to a single matter's own reasoning trace. No node or edge type in this document may represent a CKG-001 node (an ADR, an EA document, a capability, an AI organization), and no CKG-001 node/edge type may represent a DECG-001 node. The two graphs may cross-reference each other by id, but do not share a node/edge vocabulary. This distinction is carried forward unchanged from `decision_graph_spec_v0.1.md` §0's own warning and RPT-017 §2 — it is not reopened by this draft.

## 1. Definitions (normative)

DECG-001 is structurally different from RCO-001 — it is a derived, read-only traversal layer, not a produced, stateful object — so its governing concepts differ from RCO-001 §1's Draft/Candidate/Authoritative lifecycle, though they are designed to compose with it without contradiction.

- **Trace** — a reconstructed path through DECG-001's node/edge types (§2) from a Matter/Objective to a given terminal or intermediate node (e.g., a `ResolutionOption`, an `OutcomeComparison`, or once ratified, an `RCO-001` instance).
- **Trace completeness** — whether every edge in a trace resolves to an existing node. An unresolved reference means the trace is incomplete at that point, never fabricated to appear complete.
- **Trace validity (defined relative to declared purpose, per the independent review-board ruling)** — a trace's validity is never asserted in the abstract; it is always asserted relative to the purpose for which the trace was reconstructed, since a node's permitted lifecycle state differs depending on that purpose:
  - **Construction-valid** — every traversed node is in a state permitted for internal construction or iteration purposes (e.g., Draft or Candidate, per that node type's own governing standard).
  - **Presentation-valid** — every traversed node is in a state permitted for presentation to a decision-maker (e.g., Candidate or Authoritative, per RCO-001 §1 for RCO-001 nodes and each other node type's own equivalent states).
  - **Historical** — the trace reflects a prior, superseded state of one or more traversed nodes, retained for audit only (trace currency, below); never presented as current.
  - **Invalid** — the trace fails the validity criteria for its declared purpose (e.g., a presentation-purpose trace resolving to a Quarantined or Draft node). This must be flagged, never silently treated as supporting an Authoritative recommendation.

  Stated as a rule: **trace validity means that each traversed node is in a lifecycle state permitted for the trace's declared purpose under that node type's governing standard.**
- **Trace currency** — whether a previously reconstructed trace still reflects the current, active version of every node it passed through. Because underlying node types are append-only and correctable (RCO-001 §2 invariant 14; EA-102 §2.0's correction handling), a trace reconstructed at one point in time may become **stale** if a node it traversed is later corrected or superseded. A stale trace is, by definition, historical (above) and may still be served for audit purposes, but must be explicitly labeled as such, never presented as current without qualification.
- **Version-awareness** — every node a trace passes through must expose which version of that node (per that node type's own versioning discipline) was traversed. A trace must never silently mix current and superseded node versions without indicating which is which.
- **Coherent observation boundary** — an as-of time, version vector, or equivalent consistency marker declared for a served trace, sufficient to determine which node versions were traversed. If coherent reconstruction cannot be established, the trace must be marked indeterminate or stale and may not be represented as current (see §3 invariant 11).

## 2. Node types (the initial governed node families — not an eternal closed universe)

The node types below are the initial governed node families DECG-001 recognizes. **This is not a closed, permanent universe.** Additional node families require their own separate governance, versioning, and reconciliation before DECG-001 may traverse them, and may never be invented by DECG-001 itself as an independent source of truth. All node types below are already-real, already-shipped or ratified — no new node type is introduced by this document.

| Node type | Source | Notes |
|---|---|---|
| Matter / Objective | Caller-supplied context | Not itself a BTRM-001 type; the root of every trace |
| InterestConstraint | ICOA-001 | Labelled Confirmed/Likely/Possible/Unknown |
| ResolutionOption | RIE-001 | Carries `requiredConditions`/`missingInformation`/`materialRisks`/`relianceAssumptions` |
| OutcomeComparison | OCM-001 | References the compared `ResolutionOption`s |
| NormalizedLearningRecord | EA-102 §2.0 | References `ResolutionOption`, `OutcomeComparison`, `OutcomeRecord` |
| OutcomeRecord | POL-001 | Terminal node of a completed trace |
| RCO-001 (once ratified) | RCO-001 | Referenced by id only, per §0; never embedded |

## 3. Semantic invariants (binding on any future ratified implementation)

1. **DECG-001 relationships derive from authoritative references owned by their governing source components.** An implementation may create indexes, caches, projections, materialized views, or a graph substrate for performance or traversal, but **none may become an independent source of substantive truth or introduce ungoverned relationships.** (Revised per the independent review-board ruling, replacing an earlier absolute "no new column, no new table" framing that improperly foreclosed reasonable performance optimizations.)
2. **No fabricated edges or nodes.** An edge may only be materialized from a reference that actually resolves (§1, trace completeness); an unresolved or nonexistent id contributes nothing — the same rule ICOA-001/RIE-001/OCM-001/EA-102 §2.0/RCO-001 already enforce, applied here without exception.
3. **No cross-matter traversal by default.** A trace is scoped to one matter unless a future, separately-authorized capability (e.g. an Evaluation Lab comparing traces across matters, per RPT-016 §6) explicitly requires and authorizes otherwise. Cross-matter traversal is never a default DECG-001 capability.
4. **Explainability-preserving.** A full trace for a given `ResolutionOption`, `NormalizedLearningRecord`, or `RCO-001` instance must be reconstructable end-to-end back to the `InterestConstraint`s and evidence that supported it — this is what makes the trace an explainability tool, not merely a data diagram. **Evidence itself remains a governed reference owned by its traversed source artifact** (ICOA-001, RIE-001, etc.), not a new, standalone DECG-001 node family; DECG-001 must preserve evidence provenance and must never fabricate or duplicate source evidence into its own parallel record.
5. **CKG-001 non-collision.** No CKG-001 node/edge vocabulary may appear in a DECG-001 trace, and no DECG-001 node/edge vocabulary may appear in CKG-001. Cross-reference by id only (§0).
6. **Trace version-awareness is mandatory** (§1). A trace must expose, for every node it passes through, which version of that node was traversed. This is what makes RCO-001 §2 invariant 14's correction/supersession lineage meaningful in practice — a correction is only traceable if DECG-001 can show which version a given trace actually used.
7. **Staleness must be surfaced, never hidden.** If a node in a previously reconstructed trace is later corrected or superseded (§1, trace currency), DECG-001 must be able to indicate the trace is stale (and therefore historical, §1) relative to that node's current state. A stale trace may still be served for audit purposes but must be explicitly labeled as historical.
8. **Trace completeness and trace validity are distinguished, never conflated** (§1). Validity is always relative to the trace's declared purpose (construction-valid/presentation-valid/historical/invalid, §1) — a presentation-purpose trace resolving to a Quarantined or Draft node is invalid for that purpose and must be flagged, never silently treated as supporting an Authoritative recommendation. Flagging uses only the traversed node's lifecycle-state metadata (e.g., RCO-001 §1's states, per RCO-001 §8 as amended) — never that node's substantive content when the node is Quarantined or Draft.
9. **A DECG-001 trace is referenced by RCO-001 as its supporting trace; it is never embedded inline.** This restates RCO-001 §2 invariant 12 and RCO-001 §5 as DECG-001's own binding statement of the same boundary. The supporting trace's terminal support node (per RCO-001 §2 invariant 12) exists independently of, and prior to, the Recommendation Object that references it. Once RCO-001 exists as a node type (§2), DECG-001 may include a given Recommendation Object as a separately linked terminal or result node within a broader trace, referenced by id, never with RCO-001's own content duplicated inline — and any such link is derivative, never required to construct the supporting trace itself.
10. **Governed relationships first; no graph database is assumed.** Per CKG-001's own P5.5 "governed-relationships-first" precedent, a dedicated graph substrate is a possible future optimization decided on evidence, not a precondition of this standard. DECG-001 may be satisfied entirely by querying existing relational structures directly.
11. **Coherent-observation semantics are mandatory (new, per the independent review-board ruling).** Every served trace must declare a coherent observation boundary (§1) — such as an as-of time, version vector, or equivalent consistency marker — sufficient to determine which node versions were traversed. If coherent reconstruction cannot be established, the trace must be marked indeterminate or stale and may not be represented as current. This invariant does not prescribe the storage or concurrency mechanism used to achieve it.

## 4. What this document deliberately does not fix

This document does not specify a query language, API shape, or storage substrate. Whether DECG-001 is realized as SQL joins over existing tables, a dedicated graph database, or an in-memory traversal computed at read time is left entirely open (§3 invariants 1 and 10) — a decision to be made on evidence during implementation, not fixed here as a constitutional invariant. The precise mechanism for achieving coherent observation (§1, §3 invariant 11) is likewise left to implementation.

## 5. Relationship to what already exists

DECG-001 does not replace ICOA-001, RIE-001, OCM-001, EA-102 §2.0, or POL-001's existing shipped or ratified data. It is a read-only lens over their already-real reference fields (§2, §3 invariant 1), and evidence remains owned by those same source artifacts (§3 invariant 4). It does not replace CKG-001 either — the two remain distinct graphs over distinct subject matter (§0).

## 6. Relationship to RCO-001

RCO-001 is the recommendation; DECG-001 is the reasoning, dependency, alternative, evidence, risk, and lineage trace supporting it. RCO-001 references its DECG-001 **supporting trace** by id (RCO-001 §2 invariant 12); DECG-001 never embeds RCO-001's own content (§3 invariant 9). The supporting trace's terminal support node — an `OutcomeComparison`, `ResolutionOption`, the Recommendation Synthesizer's output, or another governed pre-recommendation terminal — exists before and independently of the Recommendation Object that references it, which is what makes the reference non-circular (RCO-001 §2 invariant 12). A Recommendation Object may later appear as a separately linked terminal within a broader DECG-001 trace, but any such reverse link is derivative and is never required to construct the supporting trace itself (§3 invariant 9). This boundary is the one rule both RPT-018 §3 and RCO-001 §5 already treat as settled, restated here as DECG-001's own binding statement of it.

## 7. Versioning discipline

DECG-001's own document version (this revision: v0.3, still Proposed) is independent of EA-101's document version, EA-102's document version, RCO-001's document version, and any adapter/source-schema version. None of these are interchangeable, per the versioning-separation discipline the Founder required in ADR-017's final drafting controls and restated in ADR-019. At the instance level, a given trace's version-awareness (§1, §3 invariant 6) is independent of DECG-001's own document version — a corrected node does not imply a new document version of this standard.

## 8. Governance and validation posture

- No component may treat a DECG-001 trace as authoritative until DECG-001 itself is ratified via its own ADR.
- DECG-001 may not become a policy engine: it reconstructs and exposes references; it computes and decides nothing. Any logic that selects a strategy, alters recommendation substance, approves execution, or determines correctness belongs upstream (Recommendation Synthesizer, RIE-001, OCM-001, RCO-001), never inside DECG-001's own traversal contract.
- A DECG-001 trace must never be used to justify bypassing RCO-001's own governance (e.g., presenting a trace as if it were itself an Authoritative recommendation, or using a trace's completeness to paper over a Quarantined node it passes through, per §3 invariant 8).
- Any future implementation must surface, never hide, incomplete (§1), invalid (§1), or stale/historical (§1) traces, and must declare the coherent observation boundary (§1, §3 invariant 11) a served trace relies on.

## 9. Constitutional-minimum guarantees

Physical persistence, query mechanics, and storage substrate (§4) are deliberately left open. This section states only the minimum guarantees any eventual DECG-001 implementation must provide, regardless of how it is physically realized:

- **Traceability** — a full trace is reconstructable end-to-end from any terminal node back to its originating Matter/Objective (§3 invariant 4).
- **Reproducibility** — reconstructing the same trace against the same node versions yields the same result.
- **Version-awareness** — every traversed node exposes which version was used (§1, §3 invariant 6).
- **Non-fabrication** — no edge or node is materialized without a resolving reference (§3 invariant 2).
- **Explainability preservation** — a trace remains usable as an explainability tool, not merely a data diagram (§3 invariant 4).
- **Non-collision enforcement** — CKG-001 and DECG-001 vocabularies never mix (§3 invariant 5).
- **Coherent observation** — every served trace declares a coherent observation boundary sufficient to identify the traversed node versions (§1, §3 invariant 11); incoherent traces are marked indeterminate/stale, never current.
- **Access parity (expanded per the independent review-board ruling).** "Validity-state access is a purpose-limited, authorization-controlled metadata operation. It does not automatically authorize disclosure of the node's existence, exact lifecycle state, identifiers, substantive fields, diagnostics, or correction reason to the requesting consumer. Implementations must prevent substantive disclosure through metadata, errors, logs, timing, identifiers, or other side channels and must preserve the node version and observation time used for classification." Concretely, mirroring RCO-001 §8's own expanded access-control guarantee: a trace must never expose a node's *substantive content* to a requester who could not otherwise access that content directly through its own governing component; a trace's validity-state flag (derived from lifecycle-state metadata alone, per §3 invariant 8) is purpose-limited, discloses only the minimum necessary metadata (subject to an access-policy decision on exact-state vs. generic invalid/unavailable disclosure), must never leak substantive content through side channels (errors, logs, timing, identifiers, counts), must never enable privilege escalation through traversal, and every restricted-state read is itself auditable and tied to a specific node version and observation time.
- **Auditability** — which nodes and node versions a given trace traversed is itself inspectable by a human reviewer or CA-001-equivalent process.

These are constitutional minimums, not a schema or API contract. Implementation determines how they are physically satisfied.

## 10. What remains undecided by this draft (for self-critique / review-board / Founder attention)

- The exact query language, API shape, or storage substrate (§4).
- Whether a dedicated graph database is ever adopted, and on what evidentiary basis (§3 invariant 10).
- The precise mechanics of authorizing a future cross-matter capability (e.g. an Evaluation Lab, per RPT-016 §6) — left to that capability's own future authorization, not fixed here beyond "never a default" (§3 invariant 3).
- How staleness notifications (§1, §3 invariant 7) are surfaced to a consumer in practice (push notification, pull-time check, etc.) — an implementation detail, not a constitutional invariant.
- The precise mechanism for establishing a coherent observation boundary (§1, §3 invariant 11) — an implementation detail, not fixed here beyond the requirement that one be declared.
- The precise access-policy mechanism governing lifecycle-state disclosure granularity (§9) — mirrors RCO-001 §9's own open item, an implementation and policy-configuration question.

## 11. Self-critique

> **Closed per RPT-019 (2026-07-26), subject to the access-security minimum guarantees added by the independent review-board ruling (2026-07-26).** The tension described below — between RCO-001 §8's access-control guarantee and DECG-001 §3 invariant 8/§9's access-parity guarantee — is resolved by distinguishing content access from validity-state access. RCO-001 §8 and DECG-001 §3 invariant 8/§9 were first amended per RPT-019, and the independent review-board ruling subsequently required — and this revision incorporates — a fuller set of access-security minimum guarantees (purpose limitation, minimum-necessary metadata, no side-channel disclosure, no privilege escalation, auditable restricted-state reads, version-specific/atomic observation) before the original tension is considered fully closed rather than merely nominally resolved. The original self-critique is preserved below per DOC-003 §9, as the record of the open question before its resolution.

The largest structural risk in this draft is asserting that DECG-001's lifecycle concepts (§1: completeness, validity, currency, version-awareness) compose cleanly with RCO-001's own lifecycle states (Draft/Quarantined/Candidate/Authoritative/Superseded/Archived) without having yet run a genuine joint reconciliation to confirm it. The claim in §3 invariant 8 — that a trace can be "complete but invalid" if it resolves to a Quarantined RCO-001 node — assumes RCO-001's quarantine state is itself visible to a DECG-001 traversal; this has not been checked against how RCO-001's access-control guarantee (RCO-001 §8: "Quarantined and Draft-state candidates are never exposed through the same access path as Candidate/Authoritative material") might restrict DECG-001 from even seeing a quarantined node to flag it as invalid in the first place — this is a genuine open tension between RCO-001 §8 and DECG-001 §3 invariant 8/§9's access-parity guarantee, flagged here rather than resolved at the time this paragraph was first written. A second risk: §3 invariant 7's staleness-surfacing rule is stated as a strong "must," but this draft does not define what happens to a trace that becomes stale mid-reconstruction (a node is corrected while a trace is being computed) — a timing/concurrency question this document is not positioned to resolve and does not attempt to; the new coherent-observation invariant (§3 invariant 11) narrows, but does not fully close, this second risk by requiring a declared observation boundary rather than by resolving the underlying concurrency question.

**Record of the genuine independent review-board challenge (this revision):** conducted jointly with RCO-001's own review (see RCO-001 §10's own record). The review found §3 invariant 1's absolute "no new column, no new table" framing improperly foreclosed reasonable performance optimizations (revised to permit indexes/caches/projections/materialized views/a graph substrate, so long as none becomes an independent source of truth); found trace-validity semantics conflated "authoritative" with a single absolute state rather than a purpose-relative concept (redefined via construction-valid/presentation-valid/historical/invalid, §1); found evidence lineage underspecified against the risk of DECG-001 becoming a shadow evidence store (clarified as governed references owned by traversed source artifacts, §3 invariant 4); found §2's node list read as a closed, permanent universe (reframed as the initial governed node families); found no explicit requirement that a served trace declare what point-in-time/version state it reflects (added as a new coherent-observation invariant, §3 invariant 11); and required the same access-security minimum guarantees added to RCO-001 §8 be mirrored here (§9, above). This revision's disposition is: revision required before a coordinated ADR, granted by the changes above; a further genuine review of this revision itself has not yet occurred and remains a prerequisite before any ADR.

## 12. Simulated/preparatory review-board challenge (drafting history — not a substitute for the genuine review already received)

**This section is retained as drafting history.** It was a self-administered rehearsal only, written before DECG-001 received its first genuine, independent architecture-review-board challenge (recorded in §11 above, conducted jointly with RCO-001's own review).

A genuine reviewer would likely ask: (a) does §3 invariant 9's "RCO-001 as a node type once ratified" pre-decide anything about RCO-001's own shape? — answered: no, DECG-001 only references RCO-001 by id; it asserts nothing about RCO-001's internal content. (b) Is the RCO-001/DECG-001 access-parity tension flagged in §11 disqualifying, or a normal joint-reconciliation item? — this was in fact resolved through RPT-019 and then strengthened by the genuine review's access-security guarantees, rather than remaining merely a normal item. (c) Is "Proposed" the correct lifecycle state? — per STD-002, "Architecture Draft" describes canonical architecture/mapping being authored; DECG-001 is a `standard`, not an `architecture`, so "Proposed" is the correct STD-002 stage pending Founder Review — this was explicitly reconfirmed by the genuine review (RCO-001 §10, ruling item 16: "Retain Proposed for both artifacts").

## 13. Status and next steps

This Revision 3 incorporates the genuine independent review-board ruling received jointly with RCO-001. RPT-019's joint reconciliation is complete (not a future step); its recommendations are incorporated into both documents as of their prior revisions, and this revision incorporates the subsequent, more demanding genuine review on top of that. It is submitted, alongside RCO-001's own corresponding revision and a joint change matrix, for confirmation that the ruling has been correctly and completely incorporated. **The coordinated ADR is not drafted by this revision and must not be drafted until these revisions are reviewed and confirmed**, per the ruling's explicit instruction. This document does not authorize implementation, persistence changes, schema changes, ECAP Phase B, production use, merge, publication, ADR acceptance, or ratification.
