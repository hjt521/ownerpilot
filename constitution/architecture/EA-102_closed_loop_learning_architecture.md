---
constitutional_id: EA-102
object_type: enterprise_architecture
title: Closed-Loop Learning Architecture
status: Ratified
version: "0.2"
canonical_owner: Enterprise
governing_authority: EA-100
ratification_authority: Founder
lifecycle_state: Ratified
created: 2026-07-26
updated: 2026-07-26
depends_on: [EA-100, EA-012, BTRM-001, POL-001, IMR-001, ADR-015, ADR-016, ADR-017]
required_by: []
implements: [EA-100]
governed_by: [EA-100, EA-012]
validated_by: [CBS-001, CA-001]
supersedes: []
superseded_by: []
related_artifacts: [RP-006, RP-008, RPT-016, ADR-015, ADR-016, ADR-017, ADR-018, RQS, BTRM-001, POL-001, IMR-001, EA-012, ESL-005]
registry_tags: [learning, feedback, outcome, calibration, closed-loop, anti-corruption-boundary]
program_phase: enterprise-delivery
repository_path: constitution/architecture/EA-102_closed_loop_learning_architecture.md
checksum_scope: file
---

# EA-102 — Closed-Loop Learning Architecture (Ratified)

> **Lifecycle: Ratified** (Founder, 2026-07-26 · ADR-017). EA-102 is ratified in full as the controlling target-state Closed-Loop Learning Architecture. Ratification of the architecture and authorization of implementation are formally distinct: **implementation is authorized now only for Outcome Analysis (§2.2) and Recommendation Evaluation (§2.3)**, together with the minimum shared infrastructure, adapters, provenance, testing, observability, audit, and migration support reasonably necessary to implement and validate those two components — no additional new EA-102 capability is authorized by this ADR. Prediction/Confidence Calibration (§2.4), Strategy Comparison Retrospective (§2.5), and Knowledge Evolution (§2.7) remain ratified roadmap capabilities, activation-gated on a documented readiness review plus a separately recorded authorization — the review establishes eligibility only and never itself confers authority, and may never collapse into a composite score (OCM-001/ADR-015 remain controlling; no critical deficiency may be averaged away). EA-102 proceeds now against BTRM-001's existing shipped types only through the new §2.0 Anti-Corruption Boundary added by this amendment (version 0.1 → 0.2). RP-006/RP-008's reconciliation of EA-101, Recommendation Object, and Decision Graph is designated the next scheduled constitutional reconciliation following this ADR, subject only to intervening security, legal, production-critical, or Founder-directed priority. Authored by Engineering under a Founder directive following an external "chief architect" AI review; reviewed via a self-critique and an independent architecture-review-board challenge (§10–11) whose reduced-first-increment recommendation the Founder adopted. Ratification record: ADR-017. §13 below is preserved as the original pre-ratification record per DOC-003 §9 — see the closure note above it.
>
> **EDIC (Founder, 2026-07-26 · ADR-018):** the hybrid EDIC architecture is approved. The synthetic path (§2.11) is authorized now, subject to approved subject-matter, jurisdictional, provenance, safety, and evaluation constraints — this does not authorize indiscriminate corpus expansion, unreviewed external-source incorporation, or promotion of generated assertions into institutional knowledge. The real-matter path remains prohibited pending a separately approved governance package (lawful use, consent, confidentiality, ownership, provenance, de-identification, re-identification risk, access, security, retention, deletion, auditing, and qualified-counsel review). Full ruling: ADR-018.

## 0. What this is, and what it is not

EA-102 defines how OwnerPilot **learns from outcomes** — how a completed matter's actual result feeds back to improve future recommendations — while preserving explainability, governance, reproducibility, auditability, and human oversight. It is **learning architecture, not machine-learning architecture**: it is deliberately technology-agnostic about *how* any given model is retrained or recalibrated, and specifies instead *what evidence must exist*, *what review must occur*, and *what must remain explainable* before any reasoning behavior may change. This keeps it consistent with the constitutional governance model rather than introducing a parallel, opaque ML-ops track.

**First principle (load-bearing, per the Founder's own framing):** OwnerPilot does not learn because time has passed. It learns because evidence has accumulated. See §9 (Constitutional Learning Principle).

**EA-102 does not itself define POL-001, IMR-001, EA-012, RQS, or ESL-005** — it governs how they compose into a loop. Every one of those artifacts already exists (Ratified, Proposed, or shipped-in-code) and is reused here, not restated. §6 is the load-bearing section for this reason and should be read before any of §§1–5.

## 1. Core philosophy — the learning cycle

```text
Owner Objective → Facts → Evidence → Behavior (BAE-001) → Reliance (TM-001) → Confidence (CM-001)
        → Interests/Constraints (ICOA-001) → Resolution Options (RIE-001) → Comparison (OCM-001)
        → Communication (CS-001) → Recommendation → Execution → Actual Outcome (POL-001)
        → Outcome Analysis (new, §2.2) → Model Evaluation (new, §2.6, under EA-012 §5)
        → Knowledge Update (new, §2.7) → back to Facts/Evidence for the NEXT matter
```

Everything left of "Recommendation" is BTRM-001's existing, shipped (dark) pipeline — unchanged by this draft. Everything from "Execution" onward is what EA-102 adds: a **feedback half** closing what is currently an open-ended pipeline (BTRM-001 spec §1 ends at "Recommended Next Action... POL-001 Post-Outcome Learning (records actual outcome; recency-weighted feedback → ENR/BAE)" — POL-001 already produces the record; EA-102 is what actually *analyzes* it and decides, under governance, whether and how it should change future reasoning).

Learning never terminates for the *platform*; it is explicitly bounded and reviewed for any *individual model* (§8, §9) — "closed-loop" describes the data flow, not an autonomous, ungated retraining process.

## 2. Component specifications

Each component below states what it reuses before what it adds — per the reconciliation rule this whole program has enforced since RPT-011. Per ADR-017, only §2.2 (Outcome Analysis) and §2.3 (Recommendation Evaluation) are presently authorized for implementation, together with the minimum supporting infrastructure described in §2.0. §2.4, §2.5, and §2.7 remain ratified roadmap, activation-gated per ADR-017's readiness-review-and-separate-authorization rule.

### 2.0 Anti-Corruption Boundary (Learning Representation Adapter)

No EA-102 component — present or future — may consume `ResolutionOption`, `OutcomeComparison`, or `OutcomeRecord` directly, nor contain source-schema-specific translation logic. All source-specific translation shall occur behind **one governed logical translation boundary** — not necessarily one literal function; multiple adapter implementations may exist for distinct source schemas or versions, provided each conforms to the same normalized contract and governance controls.

Components consume a versioned **Normalized Learning Contract**, defined by semantic invariants rather than a fixed field list. The contract shall preserve, at minimum: source and schema provenance — kept as independently versioned identifiers distinguishing source system, source artifact type, source schema version, and normalization-contract version, each separate from EA-102's own document version (this amendment is EA-102 v0.2; that numbers the document only, never the contract, an adapter implementation, or a source schema); stable correlation identifiers; a recommendation/strategy reference; predicted outcome information; confidence information kept separately represented from prediction (no adapter may combine them into a single composite value); execution or chosen-action information where available; observed outcome information where available; observation status and temporal scope; known unknowns, completeness limitations, and dispute status; governing authorization and data-classification metadata where applicable; and original event/capture timestamps preserved as first recorded — corrections, supplements, or reclassifications must be append-only or otherwise historically traceable through version lineage, never a silent overwrite of the original record. The precise field schema is maintained in a subordinate, version-controlled implementation specification (authored at implementation time) and may evolve without amending EA-102 so long as these invariants hold.

The boundary shall support explicit schema versioning, backward-compatible reading where reasonably practicable, deterministic migration or replay testing, and preservation of original source provenance; historical records may not be silently reinterpreted under a newer schema. Records that fail normalization, provenance, required-field, or authorization validation must be quarantined or rejected — they may not silently enter Outcome Analysis, Recommendation Evaluation, calibration, retrospective analysis, or knowledge evolution. Missing data must remain represented as missing, unknown, pending, disputed, or not applicable; the adapter may not invent, infer, or fabricate absent source facts to satisfy the contract.

The adapter is a semantic translation and validation boundary only. It may normalize, classify, validate, and preserve provenance, but it may not independently select a winning strategy, alter the substance of a recommendation, approve execution, determine recommendation correctness, or manufacture an observed outcome. When Recommendation Object and/or Decision Graph are later ratified (§6, RP-006/RP-008), migration should ordinarily be confined to this adapter/contract layer — any required downstream change to an analytical component must be documented, compatibility-tested, and justified as an exception, not assumed away.

### 2.1 Outcome Capture
**Already exists.** This is POL-001 (BTRM-001 §3.9, shipped dark in `lib/btrm/pol/record.ts`, Stage 7): `record()` already produces an `OutcomeRecord` (result, contextNotes preserved verbatim, `recencyWeight` recomputed from a caller-supplied `asOf` reference time, `relevantToCurrentClaim` gating). **EA-102 adds no new capture engine.** Any additional outcome states the Founder's directive names (settlement, judgment entered, tenant vacated, etc.) are values within POL-001's existing closed `OutcomeResult` enum (`lib/btrm/types.ts`) or a ratified amendment to it — not a new component.

### 2.2 Outcome Analysis (new)
Consumes a stream of `OutcomeRecord`s (POL-001) plus the `ResolutionOption`/`OutcomeComparison` the matter actually acted on (RIE-001/OCM-001, already shipped) and produces a structured comparison: predicted band/level vs. actual `OutcomeResult`, contributing factors (cited from the original `ResolutionOption.materialRisks`/`missingInformation`, never invented after the fact), and which of RIE-001/OCM-001's inputs were subsequently confirmed or contradicted by what happened. **Non-goal:** this component never re-scores the original recommendation as if hindsight were available at the time it was made — it records what the outcome *was*, and how it compares, not whether the original recommendation was "wrong" in a way that implies fault.

### 2.3 Recommendation Evaluation
For each `ResolutionOption` with a linked `OutcomeRecord`, classify: followed / modified / ignored, and outcome-vs-expectation (better/as-expected/worse than the `OutcomeComparison.supportBand` implied). This is a deterministic classification over already-structured fields (mirroring the house "grade what's referenced, never invent" pattern from RIE-001/ICOA-001) — it does not require reading free text.

### 2.4 Prediction & Confidence Calibration
**Distinct from CM-001, and must stay distinct.** CM-001 (BTRM-001 §3.4, shipped) measures evidence sufficiency *at the time of an assessment*. This component measures, **after the fact and only in aggregate**, whether CM-001's/TM-001's/OCM-001's historical output bands correlated with what actually happened — e.g., "assessments this component classified as `high` confidence were followed by a materially different outcome in what fraction of matters." This is retrospective calibration telemetry, produced under the same RQS §3.7.1 posture as everything else in this platform's recommendation-assurance layer: **internal-use, never surfaced as a number that itself approves, ranks, or executes anything** (ADR-015 applies here without modification — this is not a fifth occurrence of the numeric-probability conflict, it is diagnostic telemetry about past qualitative bands, not a new predictive probability).

### 2.5 Decision Quality & Strategy Comparison
**Distinct from OCM-001, and must stay distinct in time.** OCM-001 compares a negotiated path against a likely alternative *before* execution (ex ante, qualitative bands, no fabricated probabilities — spec §3.7). This component performs the equivalent comparison *after* execution, ex post, against what is now known: did the chosen `ResolutionOption` outperform, underperform, or match the alternative(s) OCM-001 considered, per the same qualitative-band posture. It never produces a numeric score any more than OCM-001 does.

### 2.6 Model Evaluation & Improvement
**This is EA-012's stated mandate (§5, §8 of EA-012 — "how models are evaluated," "how models are versioned"), not a new one.** EA-102 does not define a separate evaluation or versioning framework. §2.2–§2.5 above produce the *evidence* EA-012's evaluation-suite contract consumes; EA-012 (once its own Architecture Draft proceeds) defines the contract itself. Any reasoning-engine version change remains gated by §8/§9 below regardless.

### 2.7 Knowledge Evolution
Updates to the P5.5 Knowledge Graph, and to any Decision Graph once that construct is itself ratified (see §6), must be versioned (never mutated in place) and must cite the specific `OutcomeRecord`(s) that justified the update. No update may retroactively alter a past matter's own recorded assessment (BTRM-001's "assessments versioned, never mutated" rule, spec §4, applies identically here).

### 2.8 Model Registry integration
**Reuses IMR-001's exact schema, does not redefine it.** IMR-001 (Proposed) already specifies the entry fields: `canonical_id`, `owner`, `purpose`, `evidence_inputs`, `outputs`, `evaluation_suite`, `governing_ea`, `governing_doctrine`, `constitutional_constraints`, `maturity`, `current_version`, `superseded_by`. EA-102's only proposed addition is a *history* attached to each entry — calibration history and evaluation-suite results over time — not new top-level fields, and not a parallel registry. RPT-016 §8's finding (the four-state model-validation lifecycle "should fold into IMR-001's existing `maturity` field") is adopted here unchanged: EA-102 does not reintroduce that lifecycle as its own construct.

### 2.9 Decision Engineering Lab / Testing / Evaluation
**Reuses RPT-016's own consolidation, verbatim.** RPT-016 §6 already resolved the exact overlap the Founder's directive raises: Decision Engineering Lab = pre-production stress-testing and sensitivity analysis, built on ESL-005's already-accepted Monte Carlo design (RPT-016 §5); Testing Program = ongoing regression/replay testing; Evaluation Lab = the comparative, model-vs-model and model-vs-human-expert calibration layer sitting above both, able to run post-production. EA-102's §2.4/§2.5 outputs are exactly the post-production inputs the Evaluation Lab layer consumes. No fourth capability is introduced.

### 2.10 Recommendation Quality (RQS) integration
Unchanged from ADR-015/BTRM-001 §3.7.1. Recommendation quality under EA-102 may be *informed* by §2.2–§2.5's outcome evidence, but remains a qualitative, seven-dimension, no-composite-score framework. Numeric calibration metrics from §2.4 are internal telemetry only, exactly as ADR-015 already requires industry-wide across this platform — EA-102 adds no exception.

### 2.11 EDIC integration
Every completed matter is a *candidate* EDIC case, subject to the pipeline: de-identification → fact extraction → generalization → variant generation → expert review → corpus inclusion. **Resolved by ADR-018 (hybrid architecture):** the synthetic path (schema design, provenance, scenario generation, adversarial testing, evaluation, versioning, benchmarking) is authorized now, subject to approved subject-matter/jurisdictional/provenance/safety/evaluation constraints. The real-matter path (any record-level or matter-derived real client/tenant/financial/litigation/communication/operational/outcome data, including anything described as de-identified, pseudonymized, redacted, summarized, transformed, embedded, or aggregated from a small population) remains prohibited pending a separately approved governance package with qualified-counsel review. Synthetic scenarios must be expressly labeled synthetic and are never empirical evidence of real-world effectiveness — see ADR-018 for the full ruling, superseding this section's original "still-open" framing (RPT-013).

### 2.12 Governance, oversight, and the Constitutional Learning Principle
See §8 and §9.

## 3. Data model (draft, additive only)

```text
OutcomeAnalysis      { id, matter_id, outcome_record_id, resolution_option_id, predicted_band,
                       actual_result, contributing_factors[], confirmed_inputs[], contradicted_inputs[] }
RecommendationEvaluation { id, matter_id, resolution_option_id, adherence: followed|modified|ignored,
                          outcome_vs_expectation: better|as_expected|worse }
CalibrationRecord     { id, model_ref, assessed_band, sample_size, outcome_correlation, computed_at,
                        internal_only: true }
StrategyComparisonRetro { id, matter_id, chosen_option_id, alternative_option_ids[], support_band,
                          rationale, envelope }
ModelRegistryHistoryEntry { id, imr_entry_ref, evaluation_suite_result, calibration_ref, recorded_at }
```

All four new types requiring an explainability envelope under spec §5's existing rule (`StrategyComparisonRetro`, being an OCM-001-shaped advisory conclusion) carry one; the others are internal analysis/telemetry records, same posture as `ConfidenceAssessment` (BTRM-001 §4) which does not carry one either.

**No schema is applied by this document.** Migration is a future ratified, repository-first step, per the same posture BTRM-001 §4 declared at its own Architecture Draft stage.

## 4. Interfaces (draft)

```text
OutcomeAnalysis.analyze(OutcomeRecord, ResolutionOption, OutcomeComparison) -> OutcomeAnalysis
RecommendationEvaluation.classify(ResolutionOption, OutcomeRecord)         -> RecommendationEvaluation
Calibration.compute(modelRef, ConfidenceAssessment[] | RelianceAssessment[], OutcomeRecord[]) -> CalibrationRecord
StrategyComparison.retro(chosenOption, alternativeOptions[], OutcomeRecord[])                  -> StrategyComparisonRetro
```

Consistent with every other BTRM-001-family component: each function grades/analyzes *referenced, already-resolved* records; none infers from free text; none produces a number that itself approves, ranks, or executes anything (§2.10).

## 5. State machine addition

```text
... RECOMMENDED → ACTED → OUTCOME_RECORDED (POL-001, existing)
        → OUTCOME_ANALYZED → EVALUATION_CLASSIFIED → (periodic, batched) CALIBRATION_COMPUTED
        → (governed, §8/§9) MODEL_VERSION_PROPOSED → (Founder/ADR gate) MODEL_VERSION_RATIFIED
        → loop: new evidence re-enters COLLECTED for the next matter (BTRM-001 §6, unchanged)
```

No transition past `OUTCOME_RECORDED` is automatic in the sense of changing production reasoning — `MODEL_VERSION_PROPOSED → RATIFIED` always requires the §9 four-question gate and, per §8, an ADR for any material reasoning change.

## 6. Dependencies & repository-impact analysis (the reconciliation this draft is built around)

- **POL-001 (shipped, Stage 7):** is the Outcome Capture layer. EA-102 does not re-specify it — §2.1.
- **IMR-001 (Proposed):** owns the model-registry schema. EA-102 extends it with history fields only — §2.8.
- **EA-012 (Proposed):** owns model evaluation and versioning. EA-102 supplies evidence *into* that mandate, does not duplicate it — §2.6.
- **OCM-001 (shipped, Stage 6) and RQS/ADR-015:** EA-102's ex-post comparison (§2.5) and calibration telemetry (§2.4) are temporally and functionally distinct from OCM-001's ex-ante comparison and RQS's qualitative-assurance role, and inherit the same no-fabricated-probability, no-composite-score constraints without modification.
- **RPT-016 §5/§6 (Decision Engineering Lab / Testing Program / Evaluation Lab consolidation):** adopted verbatim — §2.9.
- **ESL-005 (Ratified design, draft not applied):** the Decision Engineering Lab's simulation substrate, per RPT-016 — no second Monte Carlo capability is proposed here.
- **A real blocking gap, flagged rather than papered over:** this draft's front matter cannot honestly declare `depends_on: [EA-101]` or reference a ratified "Recommendation Object" / "Decision Graph," because **none of the three exist as registered constitutional artifacts today.** ADR-016 resolved only the *naming* question (EA-101/OPOS/OPIL-EA-012 are a real three-layer stack) — it minted no CRID. RP-006 and RP-008 (where Recommendation Object and Decision Graph originate) are still bare `Concept`, unreconciled. **Until EA-101 and Recommendation Object/Decision Graph are captured as real artifacts** (the next step STATUS.md already names for RP-006/RP-008), EA-102's own integration points with them (§0, §2.7) are necessarily forward-looking and non-binding — this draft integrates today against BTRM-001's own already-ratified, already-shipped types (`ResolutionOption`, `OutcomeComparison`, `OutcomeRecord`) and would re-target Recommendation Object/Decision Graph only once those are themselves real. `EA-101` is added to CBS-001's `PLANNED_CRIDS` (reserved, ungoverned by this document) alongside this draft, mirroring the exact precedent BTRM-001 itself set for its own then-unratified component CRIDs.
- **Existing app surfaces (consumers, not modified by this draft):** none — this is documentation only, per BTRM-001's own precedent at Architecture Draft (spec §8: "documentation + build-config only... zero application code, zero schema, zero runtime wiring").

## 7. Testing strategy (draft)

- **Outcome Analysis / Recommendation Evaluation:** golden-fixture tests asserting no field is populated except from a resolved `OutcomeRecord`/`ResolutionOption` reference (same "no fabricated support" contract test pattern as ICOA-001/RIE-001).
- **Calibration:** property tests asserting `CalibrationRecord.internal_only` is always `true` and that no call site can surface a calibration number as if it were a recommendation's confidence or quality (a lint, mirroring the existing prohibited-inference test set BTRM-001 §9 already specifies).
- **Strategy Comparison Retro:** assert only qualitative `SupportBand` values are ever produced (reuses OCM-001's own test posture).

## 8. Learning governance & human oversight (hard constraints)

- **Learning is controlled, never automatic.** No component in this draft may change production reasoning behavior on its own. A model-version change proposed from calibration evidence requires: research → architecture review → validation → Founder approval where required → ADR → ratification — the exact same pipeline every other constitutional change in this repository already requires (STD-002).
- **No silent reasoning changes.** Any change to a reasoning engine's behavior (not just its registry entry) requires documentation, review, approval, versioning, and an audit trail, full stop.
- **AI never self-ratifies a model-version change**, consistent with the platform's standing rule (BTRM-001 §11, DOC-003, this entire program's practice to date).

## 9. The Constitutional Learning Principle (Founder-issued, adopted verbatim)

> OwnerPilot does not learn because time has passed. It learns because evidence has accumulated.

Every proposed model-version change must answer four questions before promotion; if any answer is "no," the change remains in research, not production:
1. What new evidence was observed?
2. What reasoning changed because of that evidence?
3. Does the new reasoning outperform the previous reasoning under controlled evaluation (the Evaluation Lab layer, §2.9)?
4. Can the change be explained and audited by a human reviewer?

This is the gate referenced throughout §8 — it is not a separate mechanism, it is the specific test that gate applies.

## 10. Self-critique (Engineering)

1. **This draft depends on artifacts that don't exist yet.** EA-101, Recommendation Object, and Decision Graph are all referenced conceptually but none is ratified. *Mitigation:* §6 states this explicitly and scopes EA-102's near-term integration against BTRM-001's already-real types instead; nothing here is blocked on those artifacts existing, but the long-term picture is.
2. **Retrospective components (§2.4, §2.5) are easy to confuse with their ex-ante counterparts (CM-001, OCM-001).** A future reader could conflate "confidence calibration" with CM-001's confidence, or "strategy comparison retro" with OCM-001's comparison. *Mitigation:* §2.4/§2.5 state the temporal distinction explicitly and this must remain a hard naming convention (a `Retro`/calibration suffix or namespace), not a documentation footnote alone, once implemented.
3. **Component proliferation, again.** This draft proposes five new named components (§2.2–§2.5, §2.7) on top of an already-large BTRM-001 surface. *Mitigation:* four of five are thin, deterministic classifiers over already-structured data (same posture as ICOA-001/RIE-001), not new models — the actual new surface area is small.
4. **The Founder's own directive text names far more sub-engines than this draft formalizes** (Outcome Capture, Outcome Analysis, Recommendation Evaluation, Prediction Calibration, Confidence Calibration, Decision Quality, Strategy Comparison, Model Improvement, Knowledge Evolution, Decision Graph Feedback — eleven names). *Mitigation:* this draft deliberately consolidates several of those names into fewer real components where the underlying responsibility is identical (e.g. "Prediction Calibration" and "Confidence Calibration" are one component, §2.4; "Model Improvement" is EA-012's mandate, not a new one, §2.6) — the same consolidation discipline RPT-016 already applied to Testing Program/Decision Engineering Lab/Evaluation Lab.

## 11. Independent architecture-review-board challenge

*Adopting the posture of a skeptical review board attempting to disprove this design.*

- **"This is premature — nothing has completed a full BTRM-001 matter cycle yet, so there's no outcome data to learn from."** Fair, and true today. *Board recommendation: ratify the architecture now (cheap, prevents divergent future implementations) but gate any actual `OutcomeAnalysis`/`CalibrationRecord` code behind evidence of real completed matters — this draft's own §6/§10 already argue for exactly this sequencing.*
- **"The EA-101/Recommendation Object/Decision Graph dependency gap makes this feel like building a roof before the walls exist."** The board's strongest objection. *Mitigation offered in §6 is real but partial — this draft is honest that it targets today's real types and will need a revision once those artifacts exist, which is future rework, not zero-cost.*
- **"RQS/OCM-001 already took four rounds (RP-005, RP-006, RP-007, RP-008) to stop reproducing the numeric-probability conflict under a new name. §2.4's 'calibration' is a fifth candidate for the same mistake if implemented carelessly."** *Mitigation: §2.4 is explicit that this is internal-only telemetry under the existing ADR-015 posture, not a new predictive number — but the board notes this is exactly what every prior occurrence also claimed for itself at the drafting stage, and the actual guarantee only holds if the CI safeguard in §7 ships before any code does, mirroring BTRM-001 §13's own condition.*
- **"Five new named components is still five things to build, test, and maintain, even if 'thin.'"** *Board recommendation: the minimum defensible increment is §2.2 (Outcome Analysis) and §2.3 (Recommendation Evaluation) only — both consume data POL-001 already produces and require no new governance decision. §2.4/§2.5/§2.7 can be held as an approved roadmap pending real outcome volume, the same "ship the core, hold the rest as roadmap" pattern the BTRM-001 board itself recommended (and was overridden on, by Founder choice, for BTRM-001 — this board flags that the same override risk exists here and should be a conscious Founder choice, not a default).*

**Board disposition:** the *intent* is sound and closes a real gap (BTRM-001's own pipeline diagram ends at POL-001 without ever specifying what analyzes what POL-001 records). The board does **not** treat this as ready to build in full. It recommends the reduced increment above (§2.2/§2.3 first), with §2.4/§2.5/§2.7 held as ratified roadmap pending the EA-101/Recommendation-Object/Decision-Graph gap closing and real outcome volume existing to calibrate against. This is a material change to scope and is flagged for Founder decision (§13).

## 12. Final architecture objects

| ID | Component | Responsibility | Disposition |
|---|---|---|---|
| EA-102 | Closed-Loop Learning Architecture | Governing architecture for outcome-driven learning | New (this draft) |
| — | Outcome Capture | Record actual outcomes | **Reuse — POL-001, already shipped** |
| — | Outcome Analysis | Predicted-vs-actual comparison | New — board recommends **first increment** |
| — | Recommendation Evaluation | Adherence + outcome-vs-expectation classification | New — board recommends **first increment** |
| — | Prediction/Confidence Calibration | Retrospective band-accuracy telemetry, internal-only | New — roadmap (board-held) |
| — | Decision Quality / Strategy Comparison Retro | Ex-post comparison vs. alternatives | New — roadmap (board-held) |
| — | Model Evaluation & Improvement | Reasoning-engine evaluation/versioning | **Not new — EA-012's existing mandate** |
| — | Knowledge Evolution | Versioned Knowledge/Decision Graph updates | New — roadmap, blocked on Decision Graph ratification |
| — | Model Registry history | Calibration/evaluation history per model | Extension of **IMR-001**, not new |
| — | Decision Engineering Lab / Testing / Evaluation Lab | Pre/post-production model testing | **Not new — RPT-016's existing consolidation, reused** |
| — | Recommendation Quality (RQS) | Qualitative recommendation assurance | **Not new — ADR-015/§3.7.1, unmodified** |
| — | EDIC integration | De-identified case corpus pipeline | Recommendation only — **EDIC itself remains blocked** (§2.11) |

## 13. What requires Founder decision before any code

> **All five items below are CLOSED by Founder ruling, 2026-07-26 (ADR-017 resolves items 1, 2, 3, and 5; ADR-018 resolves item 4).** This section is preserved unmodified below as the original pre-ratification record, per DOC-003 §9. See ADR-017/ADR-018 for the controlling text, the ratification blockquote at the top of this document, and the §2.0 Anti-Corruption Boundary added by ADR-017.

1. **Ratify** EA-102 to advance past Architecture Draft (STD-002), or direct revisions first.
2. **Choose the build scope:** the review board's reduced first increment (Outcome Analysis + Recommendation Evaluation only) versus the Founder's full eleven-component directive. This is the same "board recommends less, Founder may override" decision point BTRM-001 itself had (ADR-013) — precedent exists either way, but the choice is the Founder's, not engineering's.
3. **Confirm sequencing against EA-101/Recommendation Object/Decision Graph:** should EA-102 wait for those to be captured as real artifacts, or proceed now against BTRM-001's existing types with an acknowledged future migration?
4. **Decide EDIC separately** — EA-102's §2.11 is a recommendation, not an answer to the still-open data-sourcing/privacy/IP prerequisite (RPT-013). That Founder decision remains outstanding regardless of what happens here.
5. **Authorize (or not) adding `EA-101` to CBS-001's `PLANNED_CRIDS`** as a reserved, ungoverned placeholder — a low-stakes registry bookkeeping step this draft performs concurrently (§6), distinct from ratifying EA-101 itself.

Until those decisions, this remains an authored draft — no schema, no runtime, no model-version path.
