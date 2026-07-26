---
constitutional_id: RPT-017
object_type: report
title: RP-006/RP-008 Reconciliation — EA-101, OPOS, Recommendation Object, Decision Graph
status: Concept
version: "0.1"
canonical_owner: Enterprise
governing_authority: EA-100
ratification_authority: n/a
lifecycle_state: Concept
created: 2026-07-26
updated: 2026-07-26
depends_on: [RP-006, RP-008, ADR-016, ADR-017, ADR-018, BTRM-001, EA-102, ICOA-001, RIE-001, IMR-001]
required_by: []
implements: []
governed_by: [EA-100]
validated_by: [CBS-001]
supersedes: []
superseded_by: []
related_artifacts: [RP-005, RP-006, RP-007, RP-008, RPT-012, RPT-013, RPT-014, RPT-015, RPT-016, ADR-014, ADR-015, ADR-016, ADR-017, ADR-018, BTRM-001, EA-102, ICOA-001, RIE-001, CKG-001, IMR-001, DOC-003]
registry_tags: [reconciliation, ea-101, opos, recommendation-object, decision-graph, non-constitutional]
program_phase: research
repository_path: constitution/research/RPT-017_RP-006_RP-008_reconciliation_ea101_opos_recommendation_object_decision_graph.md
checksum_scope: file
---

# RPT-017 — RP-006/RP-008 Reconciliation: EA-101, OPOS, Recommendation Object, Decision Graph

> **NON-CONSTITUTIONAL.** Per ADR-017 §6, this is the designated next scheduled constitutional reconciliation. Mints no CRID and ratifies nothing. Its job is to resolve what remains genuinely unsettled across RP-006/RP-008 now that ADR-016 (naming/layering), ADR-015 (RQS), ADR-017 (EA-102), and ADR-018 (EDIC) have already closed everything else this pair of directives raised — and to recommend a concrete path for the one artifact still missing: EA-101 itself.

## 0. What's already closed (not re-litigated here)

RQS/OCM-001 — closed by ADR-015. EA-101/OPOS/OPIL-EA-012 naming — closed by ADR-016 (three-layer stack, boundary provisional). EA-102's scope, first-increment authorization, and anti-corruption boundary — closed by ADR-017. EDIC's data-sourcing posture — closed by ADR-018. Decision Engineering Lab / Testing Program / Evaluation Lab consolidation — closed by RPT-016 §6 (reused verbatim by EA-102 §2.9). IMR-001's four-state model-validation lifecycle folding into `maturity` — recommended by RPT-016 §8, not yet applied to IMR-001's own spec (a small mechanical follow-up, not a live conflict). None of this is reopened below.

## 1. Recommendation Object — one canonical schema, defined as invariants, not a fixed field list

RP-006 proposed a 14-field Recommendation Object (Objective, Winning Strategy, Facts, Unknown Facts, Confidence, Legal Analysis, Negotiation Analysis, Outcome Projection, Financial Projection, Risks, Alternative Strategies, Communication Strategy, Contingency Plan, Execution Plan, Review Trigger). RP-008 restated it with a materially different field list (owner objective, summary, Winning Strategy, evidence, unknowns, assumptions, legal analysis, financial analysis, behavioral observations, negotiation strategy, projected outcomes, alternative strategies, confidence, risks, review triggers, execution steps, communications, explainability). RPT-016 §7 already flagged this as real schema-drift risk and recommended one canonical schema. Two documents disagreeing on a fixed field list in five weeks is itself evidence that a fixed field list is the wrong instrument at this stage — precisely the failure mode ADR-017 just corrected for EA-102's own boundary type by defining a **semantic contract** instead. The same discipline applies here, more strongly: **EA-101's eventual Architecture Draft should define Recommendation Object as a set of semantic invariants** (an objective reference, an evidence/unknowns distinction, legal and financial analysis kept separately represented, behavioral/negotiation input kept traceable to its source engine, a confidence representation distinct from prediction — consistent with EA-102 §2.0's own prediction/confidence separation rule — risks, alternatives, a communication artifact, an execution/review trigger, and an explainability reference), with the precise field schema held in a subordinate, version-controlled implementation specification that can evolve without amending EA-101, exactly as EA-102 §2.0 now does for the Normalized Learning Contract. **Recommendation:** do not adopt either RP's literal field list. Until EA-101 exists, BTRM-001's `ResolutionOption`/`OutcomeComparison` (already real, already shipped) and EA-102's Normalized Learning Contract (already ratified, §2.0) remain the working types — Recommendation Object, once ratified, becomes the canonical unification both would migrate toward, not a third parallel shape built independently of them.

## 2. Decision Graph — an extension of ICOA-001/RIE-001/OCM-001's existing relationships, and explicitly distinct from CKG-001

RPT-013 already found Decision Graph "overlapping, not identical" with ICOA-001 (Interest, Constraint & Objective Analysis, BTRM-001 §3.5, shipped Stage 4). Looking at what's shipped now that wasn't shipped when RPT-013 was written: ICOA-001 already produces labelled (Confirmed/Likely/Possible/Unknown) interests and constraints tied to a matter; RIE-001 already produces `ResolutionOption`s that cite specific ICOA-001/TM-001/CM-001 references as `requiredConditions`/`missingInformation`/`materialRisks`/`relianceAssumptions`; OCM-001 already produces `OutcomeComparison`s citing the options being compared. **This is already most of a decision graph** — a set of typed, evidence-cited relationships from objective through interests/constraints through resolution options through comparison through (per EA-102) outcome. **Recommendation:** Decision Graph should be specified as a query/visualization layer over these already-real relationships (ICOA-001 → RIE-001 → OCM-001 → EA-102's Normalized Learning Contract), not a new, separately-populated graph structure requiring its own write path. This is the same "reuse before duplicate" discipline RPT-011 established for BTRM-001 and every reconciliation since.

A second, easily-missed collision: **CKG-001 (the P5.5 "Constitutional Knowledge Graph") is a different thing wearing a confusingly similar name.** CKG-001 connects books, doctrines, ADRs, EA documents, capabilities, AI organizations, trust/decision/behavioral models, CA-001, and Founder decisions — it is **meta-governance infrastructure describing the constitution's own artifacts**, not a per-matter reasoning trace. Decision Graph is the opposite: a per-matter, per-recommendation explainability chain (Goal → Evidence → ... → Recommendation → Execution → Learning per RP-008 §2). Nothing here conflicts, but the naming is close enough that a future reader could easily conflate "the Knowledge Graph" with "the Decision Graph." **Recommendation:** EA-101 should state this distinction explicitly and by name the first time either term appears, rather than let two differently-scoped "graph" constructs coexist under similar names without a cross-reference — the same mitigation this program applied to Prediction/Confidence Calibration (EA-102 §2.4) and Strategy Comparison Retro (EA-102 §2.5) against their ex-ante namesakes.

## 3. EA-101 and OPOS — recommend OPOS as EA-101's own internal specification, not a fourth CRID

ADR-016 deliberately left this mechanical question open: "provisional boundary definition... to be formalized in each artifact's own future Architecture Draft, not created by this ADR." Two paths exist. **(a)** OPOS becomes its own registered CRID, a distinct artifact EA-101 depends on. **(b)** OPOS is EA-101's own internal specification section — a subordinate part of the same document, not a separate constitutional object. This program has just set a direct precedent for (b) twice: BTRM-001 governs its component CRIDs (ENR-001, BAE-001, etc. — reserved, but each did eventually graduate to its own real CRID once shipped) and EA-102 §2.0 holds its Normalized Learning Contract as "a subordinate, version-controlled implementation specification," explicitly not a new CRID, precisely to avoid prematurely constitutionalizing something still taking shape. OPOS ("the reasoning kernel EA-101 describes") reads as exactly this kind of subordinate concept — it doesn't have its own inputs/outputs distinct from what EA-101 would already need to state to describe how OwnerPilot reasons. **Recommendation:** treat OPOS as EA-101's own internal specification (option b), with the explicit option to split it into its own CRID later, the same way BTRM-001's components did, if and when OPOS accumulates enough independent surface area (its own versioning needs, its own audit trail, consumers outside EA-101) to justify it. This is a **Founder decision**, not something this memo can settle on engineering judgment alone, since it directly bears on how many future CRIDs this stack requires — flagged in §5 below.

## 4. Nine Foundational Questions / Internal Recommendation Framework — fold into RQS, retire the third checklist

RP-005's "Internal Recommendation Framework" and RP-006's "Nine Foundational Questions" were flagged as a duplicate pair by RPT-013 and never reconciled. Neither RP spells out its nine items verbatim in the captured text, so a literal diff isn't possible from the repository as it stands — but both are described identically in purpose: a checklist a recommendation should silently satisfy before being delivered. **That purpose is already served by RQS**, ratified at BTRM-001 §3.7.1 (ADR-015): seven dimensions — factual grounding, legal analysis, objective alignment, alternative consideration, risk analysis, communication strategy, execution readiness — evaluated individually, no composite score. **Recommendation:** retire both the "Nine Foundational Questions" and "Internal Recommendation Framework" names. EA-101 should state that pre-response quality assurance is RQS, full stop — not a third, separately-maintained checklist that could drift from RQS's own seven dimensions over time. If a genuine gap exists between what the two checklists ask and what RQS's seven dimensions cover, that gap should be proposed as an addition to RQS itself (through the normal ADR path), not preserved as a parallel construct.

## 5. Optionality Engine — already substantially exists inside RIE-001, not a new engine

RPT-016 §9 left this as an open design question: pipeline stage or cross-cutting principle? Looking at what RIE-001 already ships (Stage 5): every `ResolutionOption` already carries a `reversibility` classification and a `materialConsequence` flag, fixed by a closed lookup table keyed on option type (`lib/btrm/rie/catalog.ts`). "Preserve future strategic options... maximize flexibility until evidence justifies commitment" is, concretely, a preference for options RIE-001 already labels more reversible over options it labels less reversible or material-consequence. **Recommendation:** Optionality is a cross-cutting scoring principle OCM-001 and the future Decision Quality/Strategy Comparison components (EA-102 §2.5, currently roadmap) apply when weighing `ResolutionOption`s against each other — using `reversibility`/`materialConsequence`, which already exist — not a tenth pipeline engine with its own inputs and outputs. This closes RPT-016 §9 without waiting for EA-101.

## 6. What EA-101 still needs to scope for real (not resolved here)

- **Financial Intelligence Engine** — RPT-016 §4's own finding stands: this is the one genuinely new component in either directive, with no existing BTRM-001-adjacent owner. It needs real design work (expected value, cash flow, collection probability under the existing ADR-015/BTRM-001 §3.7.1 qualitative-first discipline — RPT-016 §2 already governs this) once EA-101's Architecture Draft begins. Whether it gets its own reserved component CRID (mirroring ENR-001/BAE-001/etc.) is a Founder-level naming decision at that time, not this memo's to make.
- **ECAP Wave-1 refactor sequencing** (RPT-016 §10) — still an open, real future cost (ECAP-001/002/003/010 were shipped before any of this pipeline existed and would need rework once EA-101/OPOS exist). Recommend EA-101's own roadmap section schedule this explicitly, per RPT-16's recommendation, rather than treat the engine build as additive-only.
- **Evidence Engine vs. Facts Engine** (RPT-016 §4) — RP-008 names both; RPT-016 already flagged they may be one engine (ENR-001) under two names in the same directive. EA-101 should resolve this the same way it resolves Recommendation Object and Decision Graph naming: name it once, cite ENR-001, move on.

## 7. Recommendation

1. Author **EA-101** ("How OwnerPilot Thinks") as the next real CRID and Architecture Draft, following the same lifecycle every other artifact in this program has (Architecture Draft → Founder Review → self-critique → independent review-board challenge → ADR → Ratification), mirroring BTRM-001 and EA-102's own process.
2. Define **Recommendation Object** as semantic invariants in a subordinate implementation spec, not a fixed constitutional field list — reconciling RP-006's and RP-008's divergent lists rather than adopting either.
3. Define **Decision Graph** as a query/explainability layer over ICOA-001 → RIE-001 → OCM-001 → EA-102's already-real relationships, explicitly distinguished by name from CKG-001 (meta-governance graph, unrelated in kind).
4. Resolve **OPOS's status** — this memo recommends treating it as EA-101's own internal specification rather than a fourth CRID, but this is flagged as a Founder decision, not settled here.
5. Retire the **Nine Foundational Questions / Internal Recommendation Framework** in favor of RQS (already ratified, ADR-015) as the single pre-response quality gate.
6. Close the **Optionality Engine** question: a cross-cutting principle applied via RIE-001's existing `reversibility`/`materialConsequence` fields, not a new pipeline stage.
7. Scope the **Financial Intelligence Engine** as genuinely new design work once EA-101's Architecture Draft begins; schedule the **ECAP Wave-1 refactor** explicitly in that same draft's roadmap section; resolve the **Evidence Engine/Facts Engine** naming as one thing (ENR-001).

## 8. Status

Findings and recommendations only. No CRID is assigned by this memo. RP-006 and RP-008 remain `Concept`. The one open item requiring a Founder decision before EA-101's Architecture Draft is authored is §3 (OPOS: subordinate specification vs. its own CRID) — everything else in this memo is an engineering recommendation ready to be applied when that drafting begins.
