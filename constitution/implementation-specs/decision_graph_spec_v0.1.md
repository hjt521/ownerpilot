# Decision Graph — Implementation Specification v0.1

**Status: subordinate implementation specification, not a constitutional artifact.** No CRID, no CBS-001 registration, no Founder ratification required to evolve, per the same posture as the Recommendation Object spec alongside this file. Does not authorize any code, schema, or runtime change.

**Versioning discipline (per ADR-017):** this document's version (v0.1) is independent of EA-102's document version, any future EA-101 document version, and CKG-001's own eventual version once designed.

## 0. What this is, and the naming collision it must not become

RPT-017 §2 found that Decision Graph is "already most of a decision graph" once ICOA-001, RIE-001, and OCM-001 are read together — a set of typed, evidence-cited relationships from objective through interests/constraints through resolution options through comparison. This spec defines Decision Graph as a **query and traversal layer over those already-real relationships**, not a new, separately-populated graph structure with its own write path.

**Decision Graph is not CKG-001.** CKG-001 (P5.5, Proposed, not yet designed) connects constitutional/governance objects — books, doctrines, ADRs, EA documents, capabilities, AI organizations, trust/decision/behavioral models, CA-001, Founder decisions. It is meta-governance infrastructure describing the constitution's own artifacts. Decision Graph is scoped strictly to a single matter's own reasoning trace — objective through evidence through recommendation through outcome. No node or edge type below may represent a CKG-001 node (an ADR, an EA document, a capability, an AI organization). If a future need arises to connect a specific matter's decision to a governing constitutional artifact (e.g. "which ADR authorized the recommendation logic used here"), that is a CKG-001 edge type reaching into product data, not a Decision Graph node — the two graphs may cross-reference each other by id, but do not share a node/edge vocabulary. This distinction is the single most important thing this spec establishes, per RPT-017 §2's explicit warning about the naming collision risk.

## 1. Node types (all already-real, already-shipped or ratified — no new node type is introduced)

| Node type | Source | Notes |
|---|---|---|
| Matter / Objective | Caller-supplied context | Not itself a BTRM-001 type; the root of every trace |
| InterestConstraint | ICOA-001 | Labelled Confirmed/Likely/Possible/Unknown |
| ResolutionOption | RIE-001 | Carries `requiredConditions`/`missingInformation`/`materialRisks`/`relianceAssumptions` — already-existing edges into InterestConstraint and TM-001/CM-001 assessments |
| OutcomeComparison | OCM-001 | References the compared `ResolutionOption`s |
| NormalizedLearningRecord | EA-102 §2.0 | References `ResolutionOption`, `OutcomeComparison`, `OutcomeRecord` |
| OutcomeRecord | POL-001 | Terminal node of a completed trace |

## 2. Edge types (read directly off existing fields — no new write path required)

```text
Matter --has_interest--> InterestConstraint
InterestConstraint --supports--> ResolutionOption          (via requiredConditions / relianceAssumptions)
ResolutionOption --compared_in--> OutcomeComparison
OutcomeComparison --normalized_into--> NormalizedLearningRecord
NormalizedLearningRecord --references--> OutcomeRecord
```

Every edge above already exists as a field reference in shipped or ratified BTRM-001/EA-102 types. Decision Graph adds no new column, table, or write path — it is a traversal specification over data these components already produce when their first-increment implementation (per ADR-017) lands.

## 3. Traversal contract

- **Read-only.** Decision Graph queries reconstruct a trace; they never mutate the underlying `ResolutionOption`/`OutcomeComparison`/`NormalizedLearningRecord`/`OutcomeRecord` records.
- **No fabricated edges.** An edge may only be materialized from a reference that actually resolves — an unresolved id contributes nothing, the same rule every BTRM-001 component already enforces (ICOA-001, RIE-001, OCM-001, EA-102 §2.0).
- **Explainability-preserving.** A full trace for a given `ResolutionOption` or `NormalizedLearningRecord` must be reconstructable end-to-end back to the `InterestConstraint`s and evidence that supported it — this is what makes the trace an explainability tool, not merely a data diagram.
- **No cross-matter traversal by default.** A trace is scoped to one matter unless a future, separately-authorized capability (e.g. an Evaluation Lab comparing traces across matters, per RPT-016 §6) explicitly requires otherwise.

## 4. What this spec does not decide

Whether Decision Graph becomes its own CRID or remains a section of EA-101's own text describing how to traverse ICOA-001/RIE-001/OCM-001/EA-102 is an EA-101 Architecture Draft decision. Whether a dedicated graph substrate is ever needed (versus querying the existing relational structures directly) is also deferred — CKG-001's own "governed-relationships-first, no graph DB assumed" design stance (P5.5 proposal) is the precedent this spec follows: begin as governed relationships in the existing structures, treat a dedicated graph database as a possible later optimization decided on evidence, not a precondition.
