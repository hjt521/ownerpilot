---
constitutional_id: TM-001
governed_by: [EA-012]
lifecycle_state: Proposed
object_type: constitutional_intelligence_model
title: Enterprise Trust Model
status: PROPOSED
authority_source: Founder (design + canonical mapping authorized; final architecture NOT ratified)
canonical_owner: Constitutional Intelligence
ratification_authority: Founder
implementation_posture: architecture-and-evidence-model-first; no automated adverse decisions
program_priority: 6 (Phase II, after CKL/metadata/capability-registry, before EA-011 governance)
---

# TM-001 — Enterprise Trust Model™ (PROPOSED)

> **Recorded, not designed.** The Founder authorized TM-001's design + canonical mapping and placed it at Phase II priority 6. This file **preserves the Founder's specification**; the canonical-architecture mapping, schema design, and evaluation suites are **priority-6 work not performed in this task** (P1). The implementation agent shall not declare the final architecture ratified. **Not binding until Founder ratification of the completed canonical artifact.**

## Purpose
Determine the level of reliance OwnerPilot may reasonably place on a person, organization, claim, document, system, data source, AI provider, or AI output **in a defined context** — evidence-based, contextual, time-bounded, explainable, reversible, and domain-separated. **It must never reduce trust to one global personality/"trust score."**

Trust Intelligence asks *"how much reliance should the enterprise place, and why?"* — distinct from Behavioral Intelligence (*"what will this person likely do?"*).

## Required distinctions
**Trust** (permissible reliance in a decision) vs **credibility** (is a statement believable) vs **reliability** (does an actor/system perform consistently) vs **confidence** vs **evidence quality** vs **risk if reliance is misplaced**.

## Trust dimensions (independent — no single global score)
identity confidence · factual reliability · commitment reliability · financial reliability · documentation quality · communication reliability · procedural compliance · technical integrity · constitutional reliability · conflict-of-interest risk.

## Evidence classes (record source class per assessment)
direct verified · first-party statement · third-party statement · contractual/financial record · system-generated · corroborated · contradictory · missing · inference · AI-generated interpretation. **AI interpretation must never be represented as source evidence.**

## Reliance levels
No reliance · Limited · Conditional · Operational · Elevated · **Indeterminate** (mandatory when evidence is insufficient).

## Assessment fields
`trust_assessment_id · subject_type · subject_id · context · decision_use · assessment_date · valid_until · dimensions · evidence_items · contradictions · missing_evidence · confidence · reliance_level · risk_if_wrong · recommended_controls · human_review_required · assessor · model_version · supersedes · created_at`

## Constitutional prohibitions (safeguards)
No permanent character judgments · no protected-class inference · no hidden adverse scoring · no conclusion based solely on tone/sentiment/emotion · no assumption that missing evidence proves dishonesty · no treating AI confidence as factual certainty · **no eviction/denial/legal-escalation/financial-penalty or other material adverse action based solely on TM-001** · no universal score combining unrelated contexts · no self-certified or purchased trust · **no autonomous ratification by AI**. Every material trust conclusion must be evidence-backed and explainable.

## Relationships
Behavioral Intelligence predicts likely behavior · **Trust Intelligence determines permissible reliance** · Negotiation Intelligence selects engagement strategy · Decision Intelligence compares actions · **CA-001 audits governance + evidence integrity** (TM-001 should be among the first models CA-001 reviews — a badly-designed trust system can become a hidden reputation/adverse-decision engine).

## Canonical placement intent (mapping is priority-6 work; NOT done here)
Audit + extend, do not duplicate: trust-model identity → `constitution.intelligence_model_registry` (Extend); trust capability → `constitution.capabilities` (Extend); assessments → existing intelligence-assessment model (Audit then Extend); evidence refs → artifact/event/reference models (Extend); evaluation suites → `constitution.intelligence_evaluation_suites` (Extend); constitutional review → CA-001 (Extend). **A new table only if no current assessment structure can represent multidimensional, time-bounded trust without semantic distortion.**

## Evaluation-suite design targets (priority-6)
consistent-truthful-but-financially-weak actor · financially-reliable-but-contradictory actor · unverified interpersonal allegations · forged/altered documents · stale evidence · model-provider reliability · repo-vs-runtime conflicts · AI hallucination / unsupported citation · conflict of interest · rehabilitation after prior nonperformance · contradictory multi-source evidence.

## Status in program
PROPOSED · priority 6 · design + canonical mapping authorized · **no schema, no DB change, no ratification** until the priority-6 work completes and the Founder ratifies the completed canonical artifact.
